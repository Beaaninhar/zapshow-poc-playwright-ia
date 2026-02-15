import { promises as fs } from "fs";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import type { TestsRepo, TestVersion } from "./testsRepo";
import type { TestDefinition } from "../runner/types";

type LocalFile = {
  tests: Record<string, TestVersion[]>;
};

export class LocalTestsRepo implements TestsRepo {
  constructor(private filePath = join(process.cwd(), ".tmp", "tests-db.json")) {}

  private async load(): Promise<LocalFile> {
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      return JSON.parse(raw) as LocalFile;
    } catch {
      return { tests: {} };
    }
  }

  private async save(data: LocalFile) {
    await fs.mkdir(dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  async saveNewVersion(testId: string, definition: TestDefinition): Promise<TestVersion> {
    const data = await this.load();
    const list = data.tests[testId] ?? [];

    const version = (list.at(-1)?.version ?? 0) + 1;
    const item: TestVersion = {
      testId: testId || randomUUID(),
      version,
      definition,
      createdAt: new Date().toISOString(),
      storage: "local",
    };

    const key = item.testId;
    data.tests[key] = [...(data.tests[key] ?? []), item];
    await this.save(data);

    return item;
  }

  async getLatest(testId: string): Promise<TestVersion | null> {
    const data = await this.load();
    const list = data.tests[testId];
    return list?.at(-1) ?? null;
  }
}
