import { Router } from "express";
import { requireMaster } from "./middleware/requireMaster";
import { getRequestRole, getRequestUserId, getRequestUserName } from "./middleware/userContext";
import { UsersService } from "../services/userService";
import { EventsService } from "../services/eventsService";
import { TestsService } from "../services/testsService";
import { createTestsRepo } from "../repos/createTestsRepo";
import { writeGeneratedSpec } from "../runner/specWriter";
import { readSpecsFromTestsDir } from "../runner/specReader";

import type {
  LoginBody,
  CreateUserBody,
  UpdateUserBody,
  CreateEventBody,
  RunBody,
  SaveTestVersionBody,
  PublishTestBody,
  ListSpecsResponseItem,
} from "./dto";


export function buildRoutes() {
  const router = Router();

  const users = new UsersService();
  const events = new EventsService();
  const tests = new TestsService(createTestsRepo());

  router.get("/health", (_req, res) => res.json({ status: "ok" }));

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
    // Espera: { baseURL, test: { name, steps: [...] } }
    const result = await tests.run(req.body as RunBody);
    res.status(result.status === "passed" ? 200 : 500).json(result);
  });

  router.post("/tests/:testId/publish", requireMaster, async (req, res) => {
    const out = await writeGeneratedSpec(req.params.testId, req.body as PublishTestBody);
    res.status(201).json(out);
  });

  router.get("/tests/spec-files", requireMaster, async (_req, res) => {
    const specs = await readSpecsFromTestsDir();
    res.json(specs as ListSpecsResponseItem[]);
  });

  return router;
}
