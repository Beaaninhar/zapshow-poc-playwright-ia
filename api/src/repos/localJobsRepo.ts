import { promises as fs } from "fs";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import type { Job, JobStatus, JobPhase, JobLogin } from "../domain/model";
import type { JobsRepo } from "./jobsRepo";

type LocalJobsFile = {
  jobs: Record<string, Job>;
};

export class LocalJobsRepo implements JobsRepo {
  private cache: LocalJobsFile | null = null;

  constructor(private filePath = join(process.cwd(), ".tmp", "jobs-db.json")) {}

  private async load(): Promise<LocalJobsFile> {
    if (this.cache) return this.cache;
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      this.cache = JSON.parse(raw) as LocalJobsFile;
      return this.cache;
    } catch {
      this.cache = { jobs: {} };
      return this.cache;
    }
  }

  private async save(data: LocalJobsFile) {
    await fs.mkdir(dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf-8");
    this.cache = data;
  }

  async create(url: string, objective: string, options?: { routes?: string[]; login?: JobLogin }): Promise<Job> {
    const data = await this.load();
    const job: Job = {
      id: randomUUID(),
      url,
      objective,
      routes: options?.routes,
      login: options?.login,
      status: "pending",
      phase: {
        name: "pending",
        percentage: 0,
        logs: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      artifacts: {},
    };

    data.jobs[job.id] = job;
    await this.save(data);
    return job;
  }

  async getById(id: string): Promise<Job | null> {
    const data = await this.load();
    return data.jobs[id] ?? null;
  }

  async list(): Promise<Job[]> {
    const data = await this.load();
    return Object.values(data.jobs);
  }

  async updateStatus(id: string, status: JobStatus, phase?: Partial<JobPhase>, error?: string): Promise<Job> {
    const data = await this.load();
    const job = data.jobs[id];
    if (!job) throw new Error(`Job ${id} not found`);

    job.status = status;
    job.updatedAt = new Date().toISOString();
    if (phase) {
      job.phase = {
        name: phase.name ?? job.phase.name,
        percentage: phase.percentage ?? job.phase.percentage,
        logs: phase.logs ?? job.phase.logs,
      };
    }
    if (error) {
      job.error = error;
    }

    await this.save(data);
    return job;
  }

  async updatePhase(id: string, phase: Partial<JobPhase>): Promise<Job> {
    const data = await this.load();
    const job = data.jobs[id];
    if (!job) throw new Error(`Job ${id} not found`);

    job.phase = {
      name: phase.name ?? job.phase.name,
      percentage: phase.percentage ?? job.phase.percentage,
      logs: phase.logs ?? job.phase.logs,
    };
    job.updatedAt = new Date().toISOString();

    await this.save(data);
    return job;
  }

  async updateArtifacts(id: string, artifacts: Partial<Job["artifacts"]>): Promise<Job> {
    const data = await this.load();
    const job = data.jobs[id];
    if (!job) throw new Error(`Job ${id} not found`);

    job.artifacts = {
      ...job.artifacts,
      ...artifacts,
    };
    job.updatedAt = new Date().toISOString();

    await this.save(data);
    return job;
  }
}
