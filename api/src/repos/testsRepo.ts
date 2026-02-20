import type { TestDefinition } from "../runner/types";

export type TestVersion = {
  testId: string;
  version: number;
  definition: TestDefinition;
  createdAt: string;
  storage: "db" | "local";
};

export interface TestsRepo {
  saveNewVersion(testId: string, definition: TestDefinition): Promise<TestVersion>;
  getLatest(testId: string): Promise<TestVersion | null>;
  listLatest(): Promise<TestVersion[]>;
}
