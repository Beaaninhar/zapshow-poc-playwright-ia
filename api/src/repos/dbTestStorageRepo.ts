import { prisma } from "../lib/prisma";
import type { LocalTest, LocalRunInfo } from "../domain/testTypes";

export class DbTestStorageRepo {
  async saveTest(test: LocalTest): Promise<LocalTest> {
    const saved = await prisma.test.upsert({
      where: { id: test.id },
      create: {
        id: test.id,
        identifier: test.identifier,
        name: test.name,
        baseURL: test.baseURL,
        steps: JSON.stringify(test.steps),
        variables: JSON.stringify(test.variables),
        artifacts: test.artifacts ? JSON.stringify(test.artifacts) : null,
        lastRunStatus: test.lastRun?.status ?? null,
        lastRunStartedAt: test.lastRun?.startedAt ? new Date(test.lastRun.startedAt) : null,
        lastRunFinishedAt: test.lastRun?.finishedAt ? new Date(test.lastRun.finishedAt) : null,
        lastRunDurationMs: test.lastRun?.durationMs ?? null,
        lastRunStepsTotal: test.lastRun?.stepsTotal ?? null,
        lastRunStepsCompleted: test.lastRun?.stepsCompleted ?? null,
        createdAt: test.createdAt ? new Date(test.createdAt) : undefined,
        updatedAt: test.updatedAt ? new Date(test.updatedAt) : new Date(),
      },
      update: {
        identifier: test.identifier,
        name: test.name,
        baseURL: test.baseURL,
        steps: JSON.stringify(test.steps),
        variables: JSON.stringify(test.variables),
        artifacts: test.artifacts ? JSON.stringify(test.artifacts) : null,
        lastRunStatus: test.lastRun?.status ?? null,
        lastRunStartedAt: test.lastRun?.startedAt ? new Date(test.lastRun.startedAt) : null,
        lastRunFinishedAt: test.lastRun?.finishedAt ? new Date(test.lastRun.finishedAt) : null,
        lastRunDurationMs: test.lastRun?.durationMs ?? null,
        lastRunStepsTotal: test.lastRun?.stepsTotal ?? null,
        lastRunStepsCompleted: test.lastRun?.stepsCompleted ?? null,
        updatedAt: test.updatedAt ? new Date(test.updatedAt) : new Date(),
      },
    });

    return this.rowToLocalTest(saved);
  }

  async getTest(testId: string): Promise<LocalTest | null> {
    const row = await prisma.test.findUnique({
      where: { id: testId },
    });

    if (!row) return null;
    return this.rowToLocalTest(row);
  }

  async listTests(): Promise<LocalTest[]> {
    const rows = await prisma.test.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return rows.map((row) => this.rowToLocalTest(row));
  }

  async deleteTest(testId: string): Promise<boolean> {
    try {
      await prisma.test.delete({
        where: { id: testId },
      });
      return true;
    } catch {
      return false;
    }
  }

  async clearAll(): Promise<void> {
    await prisma.test.deleteMany({});
  }

  private rowToLocalTest(row: any): LocalTest {
    const lastRun: LocalRunInfo | undefined = row.lastRunStatus
      ? {
          status: row.lastRunStatus as "passed" | "failed" | "running",
          startedAt: row.lastRunStartedAt?.toISOString(),
          finishedAt: row.lastRunFinishedAt?.toISOString() || new Date().toISOString(),
          durationMs: row.lastRunDurationMs ?? undefined,
          stepsTotal: row.lastRunStepsTotal ?? undefined,
          stepsCompleted: row.lastRunStepsCompleted ?? undefined,
        }
      : undefined;

    return {
      id: row.id,
      identifier: row.identifier,
      name: row.name,
      baseURL: row.baseURL,
      steps: JSON.parse(row.steps || "[]"),
      variables: JSON.parse(row.variables || "{}"),
      artifacts: row.artifacts ? JSON.parse(row.artifacts) : undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt?.toISOString(),
      lastRun,
    };
  }
}
