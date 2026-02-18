export type Step =
  | { type: "goto"; url: string }
  | { type: "fill"; selector: string; value: string }
  | { type: "click"; selector: string }
  | { type: "expectText"; selector: string; text: string }
  | { type: "expectVisible"; selector: string }
  | { type: "waitForTimeout"; ms: number }
  | { type: "waitForSelector"; selector: string }
  | { type: "hover"; selector: string }
  | { type: "print"; message: string }
  | { type: "screenshot"; name?: string };

export type TestDefinition = {
  name: string;
  steps: Step[];
};

export type StepResult = {
  index: number;
  step: Step;
  status: "passed" | "failed";
  durationMs?: number;
  errorMessage?: string;
};

export type RunRequest = {
  baseURL: string;
  test: TestDefinition;
  artifacts?: {
    screenshot?: "off" | "only-on-failure" | "on";
    video?: "on" | "off" | "retain-on-failure" | "on-first-retry";
    trace?: "on" | "off" | "retain-on-failure" | "on-first-retry";
  };
};

export type RunResult = {
  status: "passed" | "failed";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  summary: {
    stepsTotal: number;
    stepsCompleted: number;
  };
  stepResults?: StepResult[];
  failedStepIndex?: number;
  failedStep?: Step;
  artifacts?: {
    screenshotPaths?: string[];
    videoPath?: string;
    tracePath?: string;
  };
  logs?: string[];
  error?: { message: string };
};

export type BatchRunRequest = {
  baseURL: string;
  tests: TestDefinition[];
  sharedSteps?: Step[];
  artifacts?: RunRequest["artifacts"];
};

export type BatchRunResult = {
  status: "passed" | "failed";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  results: Array<{
    test: TestDefinition;
    result: RunResult;
  }>;
  error?: { message: string };
};

export type RunError = {
  message: string;
  failedStepIndex?: number;
  failedStep?: Step;
};
