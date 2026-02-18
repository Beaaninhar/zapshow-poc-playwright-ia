import type { JobsRepo } from "../repos/jobsRepo";
import type { Job, JobLogin } from "../domain/model";
import { startJobWorker } from "../runner/jobWorker";

export class JobsService {
  constructor(private repo: JobsRepo) {}

  async createJob(url: string, objective: string, options?: { routes?: string[]; login?: JobLogin }): Promise<Job> {
    const job = await this.repo.create(url, objective, options);
    // Dispara worker em background (não aguarda)
    startJobWorker(job.id, this.repo).catch((err) => {
      console.error(`Worker error for job ${job.id}:`, err);
    });
    return job;
  }

  async getJob(id: string): Promise<Job | null> {
    return this.repo.getById(id);
  }

  async listJobs(): Promise<Job[]> {
    return this.repo.list();
  }
}
