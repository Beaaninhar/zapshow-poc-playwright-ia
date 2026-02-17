import type { TestsRepo, TestVersion } from "./testsRepo";
import type { TestDefinition } from "../runner/types";

export class DbTestsRepo implements TestsRepo {
  constructor(private connectionString: string) {}

  // Aqui entra Prisma/TypeORM depois.
  // Por enquanto, simula "sem conexão".
  async saveNewVersion(testId: string, definition: TestDefinition): Promise<TestVersion> {
    void testId;
    void definition;
    throw new Error("DB not connected");
  }

  async getLatest(testId: string): Promise<TestVersion | null> {
    void testId;
    throw new Error("DB not connected");
  }
}
