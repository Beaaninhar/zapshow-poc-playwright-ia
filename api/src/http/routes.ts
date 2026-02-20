import { Router } from "express";
import { resolve, sep } from "path";
import { requireMaster } from "./middleware/requireMaster";
import { getRequestRole, getRequestUserId, getRequestUserName } from "./middleware/userContext";
import { UsersService } from "../services/userService";
import { EventsService } from "../services/eventsService";
import { TestsService } from "../services/testsService";
import { JobsService } from "../services/jobsService";
import { createTestsRepo } from "../repos/createTestsRepo";
import { LocalJobsRepo } from "../repos/localJobsRepo";
import { writeGeneratedSpec } from "../runner/specWriter";
import { readSpecsFromTestsDir } from "../runner/specReader";

import type {
  LoginBody,
  CreateUserBody,
  UpdateUserBody,
  CreateEventBody,
  RunBody,
  RunBatchBody,
  SaveTestVersionBody,
  PublishTestBody,
  ListSpecsResponseItem,
  CreateJobBody,
} from "./dto";


export function buildRoutes() {
  const router = Router();
  const localRunsRoot = resolve(process.cwd(), ".tmp", "no-code-tests", "runs");

  function isWithinLocalRuns(targetPath: string): boolean {
    const normalizedRoot = `${localRunsRoot}${sep}`;
    return targetPath === localRunsRoot || targetPath.startsWith(normalizedRoot);
  }

  const users = new UsersService();
  const events = new EventsService();
  const tests = new TestsService(createTestsRepo());
  const jobs = new JobsService(new LocalJobsRepo());

  router.get("/health", (_req, res) => res.json({ status: "ok" }));

  router.get("/artifacts", async (req, res) => {
    const value = req.query.path;
    if (typeof value !== "string" || !value.trim()) {
      return res.status(400).json({ error: "path query parameter is required" });
    }

    const resolvedPath = resolve(value);
    if (!isWithinLocalRuns(resolvedPath)) {
      return res.status(403).json({ error: "artifact path is not allowed" });
    }

    return res.sendFile(resolvedPath, (error) => {
      if (error) {
        if (!res.headersSent) {
          res.status(404).json({ error: "artifact not found" });
        }
      }
    });
  });

  router.post("/login", (req, res) => {
    const body = req.body as LoginBody;
    const user = users.login(body?.email, body?.password);
    if (!user) return res.status(401).json({ error: "invalid credentials" });
    return res.json(user);
  });

  router.post("/users", (req, res) => {
    const out = users.create(req.body as CreateUserBody);
    return res.status(out.status).json(out.data);
  });

  router.get("/users", requireMaster, (req, res) => {
    const list = users.listWithEventCount((userId) => events.countByUserId(userId));
    res.json(list);
  });

  router.put("/users/:id", requireMaster, (req, res) => {
    const out = users.update(Number(req.params.id), req.body as UpdateUserBody);
    return res.status(out.status).json(out.data);
  });

  router.delete("/users/:id", requireMaster, (req, res) => {
    const id = Number(req.params.id);
    const out = users.delete(id);
    if (out.status !== 204) return res.status(out.status).json(out.data);

    events.deleteByUserId(id);
    return res.sendStatus(204);
  });

  router.get("/events", (req, res) => {
    const role = getRequestRole(req);
    const userId = getRequestUserId(req);

    if (!role || !userId) return res.status(401).json({ error: "missing user context" });
    return res.json(events.list(role, userId));
  });

  router.post("/events", (req, res) => {
    const out = events.create({
      role: getRequestRole(req),
      userId: getRequestUserId(req),
      userName: getRequestUserName(req),
      body: req.body as CreateEventBody,
    });
    return res.status(out.status).json(out.data);
  });

  router.post("/test/reset", (_req, res) => {
    users.reset();
    events.reset();
    res.sendStatus(200);
  });

  //  NOVO: salvar versão do teste (no-code)
  router.post("/tests/:testId/versions", requireMaster, async (req, res) => {
    const saved = await tests.saveVersion(req.params.testId, req.body as SaveTestVersionBody);
    res.status(201).json(saved);
  });

  //  NOVO: rodar um teste (opção 1 – runner programático)
  router.post("/runs", requireMaster, async (req, res) => {
    try {
      // Espera: { baseURL, test: { name, steps: [...] } }
      // Um teste pode falhar de forma esperada; o retorno HTTP deve permanecer 200
      // para o front exibir o relatório com detalhes do passo que falhou.
      const result = await tests.run(req.body as RunBody);
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to run test";
      res.status(500).json({ error: message });
    }
  });

  router.post("/runs/batch", requireMaster, async (req, res) => {
    try {
      const result = await tests.runBatch(req.body as RunBatchBody);
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to run batch";
      res.status(500).json({ error: message });
    }
  });

  router.post("/tests/:testId/publish", requireMaster, async (req, res) => {
    const out = await writeGeneratedSpec(req.params.testId, req.body as PublishTestBody);
    res.status(201).json(out);
  });

  router.get("/tests/spec-files", requireMaster, async (_req, res) => {
    const specs = await readSpecsFromTestsDir();
    res.json(specs as ListSpecsResponseItem[]);
  });

  // ===== JOBS ENDPOINTS =====
  router.post("/jobs", async (req, res) => {
    try {
      const body = req.body as CreateJobBody;
      if (!body.url) return res.status(400).json({ error: "url is required" });
      if (!body.objective) return res.status(400).json({ error: "objective is required" });

      const routes = Array.isArray(body.routes)
        ? body.routes.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : undefined;

      const job = await jobs.createJob(body.url, body.objective, {
        routes,
        login: body.login,
      });
      res.status(201).json(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to create job";
      res.status(500).json({ error: message });
    }
  });

  router.get("/jobs/:id", async (req, res) => {
    try {
      const job = await jobs.getJob(req.params.id);
      if (!job) return res.status(404).json({ error: "job not found" });
      res.json(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to get job";
      res.status(500).json({ error: message });
    }
  });

  router.get("/jobs", async (req, res) => {
    try {
      const jobList = await jobs.listJobs();
      res.json(jobList);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to list jobs";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
