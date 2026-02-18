import type { Step } from "../runner/types";

export type UserRole = "MASTER" | "USER";

export type User = {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

export type Event = {
  id: number;
  title: string;
  description?: string;
  date: string;
  price: number;
  createdByUserId: number;
  createdByName: string;
};

export type JobStatus = "pending" | "running" | "planner" | "generator" | "healer" | "completed" | "failed";

export type JobPhase = {
  name: string;
  percentage: number;
  logs: string[];
};

export type JobLogin = {
  url?: string;
  username?: string;
  password?: string;
  usernameSelector?: string;
  passwordSelector?: string;
  submitSelector?: string;
};

export type Job = {
  id: string;
  url: string;
  objective: string;
  routes?: string[];
  login?: JobLogin;
  status: JobStatus;
  phase: JobPhase;
  createdAt: string;
  updatedAt: string;
  artifacts?: {
    testPlan?: string;
    tests?: Array<{ name: string; steps: Step[]; baseURL: string }>;
  };
  error?: string;
};
