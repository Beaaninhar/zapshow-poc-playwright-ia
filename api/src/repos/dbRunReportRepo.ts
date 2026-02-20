import { prisma } from "../lib/prisma";
import type { RunReport, TestRunReportEntry } from "../domain/testTypes";

export class DbRunReportRepo {
  async saveReport(report: RunReport): Promise<RunReport> {
    const saved = await prisma.runReport.create({
      data: {
        id: report.id,
        kind: report.kind,
        createdAt: new Date(report.createdAt),
        finishedAt: new Date(report.finishedAt),
        tests: JSON.stringify(report.tests),
      },
    });

    return {
      id: saved.id,
      kind: saved.kind as "single" | "batch",
      createdAt: saved.createdAt.toISOString(),
      finishedAt: saved.finishedAt.toISOString(),
      tests: JSON.parse(saved.tests) as TestRunReportEntry[],
    };
  }

  async getReport(reportId: string): Promise<RunReport | null> {
    const row = await prisma.runReport.findUnique({
      where: { id: reportId },
    });

    if (!row) return null;

    return {
      id: row.id,
      kind: row.kind as "single" | "batch",
      createdAt: row.createdAt.toISOString(),
      finishedAt: row.finishedAt.toISOString(),
      tests: JSON.parse(row.tests as string) as TestRunReportEntry[],
    };
  }

  async listReports(limit: number = 50): Promise<RunReport[]> {
    const rows = await prisma.runReport.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      kind: row.kind as "single" | "batch",
      createdAt: row.createdAt.toISOString(),
      finishedAt: row.finishedAt.toISOString(),
      tests: JSON.parse(row.tests as string) as TestRunReportEntry[],
    }));
  }

  async deleteReport(reportId: string): Promise<boolean> {
    try {
      await prisma.runReport.delete({
        where: { id: reportId },
      });
      return true;
    } catch {
      return false;
    }
  }

  async clearAll(): Promise<void> {
    await prisma.runReport.deleteMany({});
  }
}
