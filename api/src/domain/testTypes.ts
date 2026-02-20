// Types for no-code tests and reports storage
// Shared types between web and API

export type SelectorType = "css" | "xpath" | "text" | "role" | "testid";
export type ValueSource = "literal" | "variable";

export type ArtifactSettings = {
  screenshot?: "off" | "only-on-failure" | "on";
  video?: "on" | "off" | "retain-on-failure" | "on-first-retry";
  trace?: "on" | "off" | "retain-on-failure" | "on-first-retry";
};

export type LocalRunInfo = {
  status: "passed" | "failed" | "running";
  startedAt?: string;
  finishedAt: string;
  durationMs?: number;
  stepsTotal?: number;
  stepsCompleted?: number;
};

export type LocalStep =
  | { type: "goto"; url: string; urlSource?: ValueSource; urlVar?: string }
  | { type: "fill"; selectorType?: SelectorType; selector: string; value: string; valueSource?: ValueSource; valueVar?: string }
  | { type: "click"; selectorType?: SelectorType; selector: string }
  | { type: "expectText"; selectorType?: SelectorType; selector: string; text: string; textSource?: ValueSource; textVar?: string }
  | { type: "expectVisible"; selectorType?: SelectorType; selector: string }
  | { type: "waitForTimeout"; ms: number }
  | { type: "waitForSelector"; selectorType?: SelectorType; selector: string }
  | { type: "hover"; selectorType?: SelectorType; selector: string }
  | { type: "print"; message: string; messageSource?: ValueSource; messageVar?: string }
  | { type: "screenshot"; name?: string }
  | {
      type: "apiRequest";
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      url: string;
      urlSource?: ValueSource;
      urlVar?: string;
      headers?: string;
      body?: string;
      bodySource?: ValueSource;
      bodyVar?: string;
      expectedStatus?: number;
      expectedBodyContains?: string;
    };

export type LocalTest = {
  id: string;
  identifier: string;
  name: string;
  baseURL: string;
  steps: LocalStep[];
  variables: Record<string, string>;
  artifacts?: ArtifactSettings;
  createdAt: string;
  updatedAt?: string;
  lastRun?: LocalRunInfo;
};

export type StepResult = {
  index: number;
  status: "passed" | "failed";
  durationMs?: number;
  errorMessage?: string;
};

export type TestRunReportEntry = {
  testId: string;
  testIdentifier?: string;
  testName: string;
  status: "passed" | "failed" | "running" | "queued";
  startedAt?: string;
  finishedAt: string;
  durationMs?: number;
  stepsTotal?: number;
  stepsCompleted?: number;
  stepResults?: StepResult[];
  errorMessage?: string;
  failedStepIndex?: number;
  failedStep?: LocalStep;
  artifacts?: {
    screenshot?: "off" | "only-on-failure" | "on";
    video?: "on" | "off" | "retain-on-failure" | "on-first-retry";
    trace?: "on" | "off" | "retain-on-failure" | "on-first-retry";
    screenshotPaths?: string[];
    videoPath?: string;
    tracePath?: string;
  };
  logs?: string[];
};

export type RunReport = {
  id: string;
  kind: "single" | "batch";
  createdAt: string;
  finishedAt: string;
  tests: TestRunReportEntry[];
};
