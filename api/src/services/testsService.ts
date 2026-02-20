import type { TestsRepo } from "../repos/testsRepo";
import type { RunRequest, TestDefinition, BatchRunRequest, BatchRunResult } from "../runner/types";
import { compile } from "../runner/compiler";
import { execute, executeBatch } from "../runner/executor";

const WORKERS = Math.max(1, Number(process.env.E2E_WORKERS ?? 1));
let activeRuns = 0;
const runQueue: Array<() => void> = [];

function enqueueRun<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      activeRuns += 1;
      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          activeRuns -= 1;
          const next = runQueue.shift();
          if (next) next();
        });
    };

    if (activeRuns < WORKERS) {
      run();
    } else {
      runQueue.push(run);
    }
  });
}

export class TestsService {
  constructor(private repo: TestsRepo) {}

  async saveVersion(testId: string, definition: TestDefinition) {
    return this.repo.saveNewVersion(testId, definition);
  }

  async listLatest() {
    return this.repo.listLatest();
  }

  async run(req: RunRequest) {
    const { baseURL, actions } = compile(req);
    return enqueueRun(() => execute(actions, baseURL, req.artifacts));
  }

  async runBatch(req: BatchRunRequest): Promise<BatchRunResult> {
    const tests = req.tests.map((test) => ({
      test,
      actions: compile({ baseURL: req.baseURL, test }).actions,
    }));
    const sharedActions = req.sharedSteps?.length
      ? compile({ baseURL: req.baseURL, test: { name: "shared", steps: req.sharedSteps } }).actions
      : undefined;
    return enqueueRun(() => executeBatch({ baseURL: req.baseURL, tests, sharedActions, artifacts: req.artifacts }));
  }
}
