import type { TestsRepo } from "../repos/testsRepo";
import type { RunRequest, TestDefinition } from "../runner/types";
import { compile } from "../runner/compiler";
import { execute } from "../runner/executor";

export class TestsService {
  constructor(private repo: TestsRepo) {}

  async saveVersion(testId: string, definition: TestDefinition) {
    return this.repo.saveNewVersion(testId, definition);
  }

  async run(req: RunRequest) {
    const { baseURL, actions } = compile(req);
    return execute(actions, baseURL);
  }
}
