import type { UserRole } from "../domain/model";
import type { RunRequest, Step, TestDefinition, BatchRunRequest } from "../runner/types";

export type LoginBody = {
  email?: string;
  password?: string;
};

export type CreateUserBody = {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
};

export type UpdateUserBody = CreateUserBody;

export type CreateEventBody = {
  title?: string;
  description?: string;
  date?: string;
  price?: number;
};

// salvar versão: body é o TestDefinition do no-code
export type SaveTestVersionBody = TestDefinition;

// run: body é o RunRequest
export type RunBody = RunRequest;

// run batch: body é o BatchRunRequest
export type RunBatchBody = BatchRunRequest;

export type PublishTestBody = RunRequest;

export type ListSpecsResponseItem = {
  id: string;
  name: string;
  path: string;
  baseURL: string;
  steps: Step[];
  warnings: string[];
};

// Jobs
export type CreateJobBody = {
  url?: string;
  objective?: string;
  routes?: string[];
  login?: {
    url?: string;
    username?: string;
    password?: string;
    usernameSelector?: string;
    passwordSelector?: string;
    submitSelector?: string;
  };
};

export type GetJobArtifactQuery = {
  type?: "testPlan" | "specs" | "zip";
};
