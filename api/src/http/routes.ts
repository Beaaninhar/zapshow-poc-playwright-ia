import { Router } from "express";
import { resolve, sep } from "path";
import { requireMaster } from "./middleware/requireMaster";
import { getRequestRole, getRequestUserId, getRequestUserName } from "./middleware/userContext";
import { UsersService } from "../services/userService";
import { EventsService } from "../services/eventsService";
import { TestsService } from "../services/testsService";
import { JobsService } from "../services/jobsService";
import { createTestsRepo } from "../repos/createTestsRepo";
import { DbJobsRepo } from "../repos/dbJobsRepo";
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
  const localRunsRoot = resolve(process.cwd(), "tests", "test-results", "local-runs");

  function isWithinLocalRuns(targetPath: string): boolean {
    const normalizedRoot = `${localRunsRoot}${sep}`;
    return targetPath === localRunsRoot || targetPath.startsWith(normalizedRoot);
  }

  const users = new UsersService();
  const events = new EventsService();
  const tests = new TestsService(createTestsRepo());
  
  // Usa DbJobsRepo se DATABASE_URL está configurado, senão LocalJobsRepo
  const jobsRepo = process.env.DATABASE_URL ? new DbJobsRepo() : new LocalJobsRepo();
  const jobs = new JobsService(jobsRepo);

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

  router.post("/login", async (req, res) => {
    try {
      const body = req.body as LoginBody;
      const user = await users.login(body?.email, body?.password);
      if (!user) return res.status(401).json({ error: "invalid credentials" });
      return res.json(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : "login failed";
      res.status(500).json({ error: message });
    }
  });

  router.post("/users", async (req, res) => {
    try {
      const out = await users.create(req.body as CreateUserBody);
      return res.status(out.status).json(out.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to create user";
      res.status(500).json({ error: message });
    }
  });

  router.get("/users", requireMaster, async (req, res) => {
    try {
      const list = await users.listWithEventCount(async (userId) => await events.countByUserId(userId));
      res.json(list);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to list users";
      res.status(500).json({ error: message });
    }
  });

  router.put("/users/:id", requireMaster, async (req, res) => {
    try {
      const out = await users.update(Number(req.params.id), req.body as UpdateUserBody);
      return res.status(out.status).json(out.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to update user";
      res.status(500).json({ error: message });
    }
  });

  router.delete("/users/:id", requireMaster, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const out = await users.delete(id);
      if (out.status !== 204) return res.status(out.status).json(out.data);

      await events.deleteByUserId(id);
      return res.sendStatus(204);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to delete user";
      res.status(500).json({ error: message });
    }
  });

  router.get("/events", async (req, res) => {
    try {
      const role = getRequestRole(req);
      const userId = getRequestUserId(req);

      if (!role || !userId) return res.status(401).json({ error: "missing user context" });
      const eventsList = await events.list(role, userId);
      return res.json(eventsList);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to list events";
      res.status(500).json({ error: message });
    }
  });

  router.post("/events", async (req, res) => {
    try {
      const out = await events.create({
        role: getRequestRole(req),
        userId: getRequestUserId(req),
        userName: getRequestUserName(req),
        body: req.body as CreateEventBody,
      });
      return res.status(out.status).json(out.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to create event";
      res.status(500).json({ error: message });
    }
  });

  router.post("/test/reset", async (_req, res) => {
    try {
      await users.reset();
      await events.reset();
      res.sendStatus(200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to reset";
      res.status(500).json({ error: message });
    }
  });

  //  NOVO: salvar versão do teste (no-code)
  router.post("/tests/:testId/versions", requireMaster, async (req, res) => {
    try {
      const saved = await tests.saveVersion(req.params.testId, req.body as SaveTestVersionBody);
      res.status(201).json(saved);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to save test version";
      res.status(500).json({ error: message });
    }
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
    try {
      const out = await writeGeneratedSpec(req.params.testId, req.body as PublishTestBody);
      res.status(201).json(out);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to publish test";
      res.status(500).json({ error: message });
    }
  });

  router.get("/tests/spec-files", requireMaster, async (_req, res) => {
    try {
      const specs = await readSpecsFromTestsDir();
      res.json(specs as ListSpecsResponseItem[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to read spec files";
      res.status(500).json({ error: message });
    }
  });

  router.get("/tests", requireMaster, async (_req, res) => {
    try {
      const list = await tests.listLatest();
      res.json(list);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to list tests";
      res.status(500).json({ error: message });
    }
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
