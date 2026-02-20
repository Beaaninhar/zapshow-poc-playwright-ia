import { prisma } from "../lib/prisma";
import type { Job, JobStatus, JobPhase, JobLogin } from "../domain/model";
import type { JobsRepo } from "./jobsRepo";

type PrismaJob = Awaited<ReturnType<typeof prisma.job.findUnique>>;

export class DbJobsRepo implements JobsRepo {
  private mapToJob(prismaJob: NonNullable<PrismaJob>): Job {
    return {
      id: prismaJob.id,
      url: prismaJob.url,
      objective: prismaJob.objective,
      routes: prismaJob.routes,
      status: prismaJob.status as JobStatus,
      phase: {
        name: prismaJob.phaseName,
        percentage: prismaJob.phasePercentage,
        logs: prismaJob.phaseLogs,
      },
      login: prismaJob.loginUrl ? {
        url: prismaJob.loginUrl,
        username: prismaJob.loginUsername || undefined,
        password: prismaJob.loginPassword || undefined,
        usernameSelector: prismaJob.loginUsernameSelector || undefined,
        passwordSelector: prismaJob.loginPasswordSelector || undefined,
        submitSelector: prismaJob.loginSubmitSelector || undefined,
      } : undefined,
      artifacts: {
        testPlan: prismaJob.testPlanArtifact ? JSON.parse(prismaJob.testPlanArtifact) : undefined,
        tests: prismaJob.testsArtifact ? JSON.parse(prismaJob.testsArtifact) : undefined,
      },
      error: prismaJob.error || undefined,
      createdAt: prismaJob.createdAt.toISOString(),
      updatedAt: prismaJob.updatedAt.toISOString(),
    };
  }

  async create(url: string, objective: string, options?: { routes?: string[]; login?: JobLogin }): Promise<Job> {
    const job = await prisma.job.create({
      data: {
        url,
        objective,
        routes: options?.routes || [],
        status: 'pending',
        phaseName: "pending",
        phasePercentage: 0,
        phaseLogs: [],
        loginUrl: options?.login?.url,
        loginUsername: options?.login?.username,
        loginPassword: options?.login?.password,
        loginUsernameSelector: options?.login?.usernameSelector,
        loginPasswordSelector: options?.login?.passwordSelector,
        loginSubmitSelector: options?.login?.submitSelector,
      },
    });

    return this.mapToJob(job);
  }

  async getById(id: string): Promise<Job | null> {
    const job = await prisma.job.findUnique({
      where: { id },
    });

    return job ? this.mapToJob(job) : null;
  }

  async list(): Promise<Job[]> {
    const jobs = await prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return jobs.map((job: NonNullable<PrismaJob>) => this.mapToJob(job));
  }

  async updateStatus(id: string, status: JobStatus, phase?: Partial<JobPhase>, error?: string): Promise<Job> {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) throw new Error(`Job ${id} not found`);

    const updated = await prisma.job.update({
      where: { id },
      data: {
        status,
        phaseName: phase?.name ?? job.phaseName,
        phasePercentage: phase?.percentage ?? job.phasePercentage,
        phaseLogs: phase?.logs ?? job.phaseLogs,
        error: error ?? job.error,
      },
    });

    return this.mapToJob(updated);
  }

  async updatePhase(id: string, phase: Partial<JobPhase>): Promise<Job> {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) throw new Error(`Job ${id} not found`);

    const updated = await prisma.job.update({
      where: { id },
      data: {
        phaseName: phase.name ?? job.phaseName,
        phasePercentage: phase.percentage ?? job.phasePercentage,
        phaseLogs: phase.logs ?? job.phaseLogs,
      },
    });

    return this.mapToJob(updated);
  }

  async updateArtifacts(id: string, artifacts: Partial<Job["artifacts"]>): Promise<Job> {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) throw new Error(`Job ${id} not found`);

    const updated = await prisma.job.update({
      where: { id },
      data: {
        testPlanArtifact: artifacts?.testPlan ? JSON.stringify(artifacts.testPlan) : job.testPlanArtifact,
        testsArtifact: artifacts?.tests ? JSON.stringify(artifacts.tests) : job.testsArtifact,
      },
    });

    return this.mapToJob(updated);
  }
}

