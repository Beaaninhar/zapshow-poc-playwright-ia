import type { TestsRepo } from "./testsRepo";
import { DbTestsRepo } from "./dbTestsRepo";
import { LocalTestsRepo } from "./localTestsRepo";

export function createTestsRepo(): TestsRepo {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Usa Prisma quando DATABASE_URL está configurado
    return new DbTestsRepo();
  }

  // Fallback para armazenamento local (desenvolvimento sem DB)
  return new LocalTestsRepo();
}

