import { promises as fs } from "fs";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import type { TestsRepo, TestVersion } from "./testsRepo";
import type { TestDefinition } from "../runner/types";

type LocalFile = {
  tests: Record<string, TestVersion[]>;
};

export class LocalTestsRepo implements TestsRepo {
  private cache: LocalFile | null = null;

  constructor(private filePath = join(process.cwd(), ".tmp", "tests-db.json")) {}

  private async load(): Promise<LocalFile> {
    if (this.cache) return this.cache;
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      this.cache = JSON.parse(raw) as LocalFile;
      return this.cache;
    } catch {
      this.cache = { tests: {} };
      return this.cache;
    }
  }

  private async save(data: LocalFile) {
    await fs.mkdir(dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf-8");
    this.cache = data;
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
    const existing = data.tests[key] ?? [];
    data.tests[key] = [...existing, item].slice(-2);
    await this.save(data);

    return item;
  }

  async getLatest(testId: string): Promise<TestVersion | null> {
    const data = await this.load();
    const list = data.tests[testId];
    return list?.at(-1) ?? null;
  }

  async listLatest(): Promise<TestVersion[]> {
    const data = await this.load();
    return Object.values(data.tests)
      .map((list) => list.at(-1))
      .filter((item): item is TestVersion => Boolean(item));
  }
}
