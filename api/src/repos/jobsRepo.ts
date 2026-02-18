import type { Job, JobStatus, JobPhase, JobLogin } from "../domain/model";

export interface JobsRepo {
  create(url: string, objective: string, options?: { routes?: string[]; login?: JobLogin }): Promise<Job>;
  getById(id: string): Promise<Job | null>;
  list(): Promise<Job[]>;
  updateStatus(id: string, status: JobStatus, phase?: Partial<JobPhase>, error?: string): Promise<Job>;
  updatePhase(id: string, phase: Partial<JobPhase>): Promise<Job>;
  updateArtifacts(
    id: string,
    artifacts: Partial<Job["artifacts"]>
  ): Promise<Job>;
}
