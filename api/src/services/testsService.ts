import type { TestsRepo } from "../repos/testsRepo";
import type { RunRequest, TestDefinition } from "../runner/types";
import { compile } from "../runner/compiler";
import { execute } from "../runner/executor";

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

  async run(req: RunRequest) {
    const { baseURL, actions } = compile(req);
    return enqueueRun(() => execute(actions, baseURL, req.artifacts));
  }
}
