import { prisma } from "../lib/prisma";
import type { TestsRepo, TestVersion } from "./testsRepo";
import type { TestDefinition } from "../runner/types";

export class DbTestsRepo implements TestsRepo {
  async saveNewVersion(testId: string, definition: TestDefinition): Promise<TestVersion> {
    // Buscar a última versão para incrementar
    const lastVersion = await prisma.testVersion.findFirst({
      where: { testId },
      orderBy: { version: 'desc' },
    });

    const newVersion = (lastVersion?.version ?? 0) + 1;

    const testVersion = await prisma.testVersion.create({
      data: {
        testId,
        version: newVersion,
        definition: JSON.stringify(definition),
      },
    });

    return {
      testId: testVersion.testId,
      version: testVersion.version,
      definition: JSON.parse(testVersion.definition) as TestDefinition,
      createdAt: testVersion.createdAt.toISOString(),
      storage: "db",
    };
  }

  async getLatest(testId: string): Promise<TestVersion | null> {
    const testVersion = await prisma.testVersion.findFirst({
      where: { testId },
      orderBy: { version: 'desc' },
    });

    if (!testVersion) return null;

    return {
      testId: testVersion.testId,
      version: testVersion.version,
      definition: JSON.parse(testVersion.definition) as TestDefinition,
      createdAt: testVersion.createdAt.toISOString(),
      storage: "db",
    };
  }

  async listLatest(): Promise<TestVersion[]> {
    const latest = await prisma.testVersion.groupBy({
      by: ["testId"],
      _max: { version: true },
    });

    if (!latest.length) return [];

    const records = await prisma.testVersion.findMany({
      where: {
        OR: latest.map((item) => ({
          testId: item.testId,
          version: item._max.version ?? 1,
        })),
      },
    });

    return records.map((testVersion) => ({
      testId: testVersion.testId,
      version: testVersion.version,
      definition: JSON.parse(testVersion.definition) as TestDefinition,
      createdAt: testVersion.createdAt.toISOString(),
      storage: "db",
    }));
  }
}

