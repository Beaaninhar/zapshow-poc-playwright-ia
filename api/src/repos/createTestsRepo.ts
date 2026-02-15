import type { TestsRepo } from "./testsRepo";
import { DbTestsRepo } from "./dbTestsRepo";
import { LocalTestsRepo } from "./localTestsRepo";

export function createTestsRepo(): TestsRepo {
  const cs = process.env.DB_URL;

  if (cs) {
    // tenta DB, mas com fallback
    const db = new DbTestsRepo(cs);
    return {
      async saveNewVersion(testId, def) {
        try {
          const v = await db.saveNewVersion(testId, def);
          return { ...v, storage: "db" as const };
        } catch {
          const local = new LocalTestsRepo();
          return local.saveNewVersion(testId, def);
        }
      },
      async getLatest(testId) {
        try {
          return await db.getLatest(testId);
        } catch {
          const local = new LocalTestsRepo();
          return local.getLatest(testId);
        }
      },
    };
  }

  return new LocalTestsRepo();
}
