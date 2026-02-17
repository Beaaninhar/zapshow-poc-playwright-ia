import type { RunRequest, Step, StepResult, TestDefinition } from "./apiClient";

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
  | {
      type: "goto";
      url: string;
      urlSource?: ValueSource;
      urlVar?: string;
    }
  | {
      type: "fill";
      selectorType?: SelectorType;
      selector: string;
      value: string;
      valueSource?: ValueSource;
      valueVar?: string;
    }
  | {
      type: "click";
      selectorType?: SelectorType;
      selector: string;
    }
  | {
      type: "expectText";
      selectorType?: SelectorType;
      selector: string;
      text: string;
      textSource?: ValueSource;
      textVar?: string;
    }
  | {
      type: "expectVisible";
      selectorType?: SelectorType;
      selector: string;
    }
  | {
      type: "waitForTimeout";
      ms: number;
    }
  | {
      type: "waitForSelector";
      selectorType?: SelectorType;
      selector: string;
    }
  | {
      type: "hover";
      selectorType?: SelectorType;
      selector: string;
    }
  | {
      type: "print";
      message: string;
      messageSource?: ValueSource;
      messageVar?: string;
    }
  | {
      type: "screenshot";
      name?: string;
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

const STORAGE_KEY = "zapshow-local-tests";
const REPORTS_KEY = "zapshow-run-reports";

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
  failedStep?: Step;
  artifacts?: RunRequest["artifacts"] & {
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

function buildIdentifierFallback(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function loadLocalTests(): LocalTest[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as LocalTest[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((test) => ({
      ...test,
      identifier: test.identifier || buildIdentifierFallback(test.name),
    }));
  } catch {
    return [];
  }
}

export function saveLocalTests(tests: LocalTest[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
}

export function getLocalTest(testId: string): LocalTest | undefined {
  return loadLocalTests().find((t) => t.id === testId);
}

export function upsertLocalTest(test: LocalTest): LocalTest[] {
  const tests = loadLocalTests();
  const index = tests.findIndex((t) => t.id === test.id);
  if (index === -1) {
    tests.push(test);
  } else {
    tests[index] = test;
  }
  saveLocalTests(tests);
  return tests;
}

export function deleteLocalTest(testId: string): LocalTest[] {
  const tests = loadLocalTests().filter((t) => t.id !== testId);
  saveLocalTests(tests);
  return tests;
}

export function buildSelector(selectorType: SelectorType | undefined, value: string): string {
  const trimmed = value.trim();
  if (!selectorType || selectorType === "css") return trimmed;
  if (selectorType === "testid") return `data-testid=${trimmed}`;
  return `${selectorType}=${trimmed}`;
}

function resolveValue(
  value: string,
  source: ValueSource | undefined,
  variableName: string | undefined,
  variables: Record<string, string>,
): string {
  if (source !== "variable") return value;
  if (!variableName || !(variableName in variables)) {
    throw new Error("Variable not found");
  }
  return variables[variableName];
}

export function buildTestDefinition(test: LocalTest): TestDefinition {
  return {
    name: test.name,
    steps: test.steps.map((step): Step => {
      switch (step.type) {
        case "goto":
          return {
            type: "goto",
            url: resolveValue(step.url, step.urlSource, step.urlVar, test.variables),
          };
        case "fill":
          return {
            type: "fill",
            selector: buildSelector(step.selectorType, step.selector),
            value: resolveValue(step.value, step.valueSource, step.valueVar, test.variables),
          };
        case "click":
          return {
            type: "click",
            selector: buildSelector(step.selectorType, step.selector),
          };
        case "expectText":
          return {
            type: "expectText",
            selector: buildSelector(step.selectorType, step.selector),
            text: resolveValue(step.text, step.textSource, step.textVar, test.variables),
          };
        case "expectVisible":
          return {
            type: "expectVisible",
            selector: buildSelector(step.selectorType, step.selector),
          };
        case "waitForTimeout":
          return {
            type: "waitForTimeout",
            ms: step.ms,
          };
        case "waitForSelector":
          return {
            type: "waitForSelector",
            selector: buildSelector(step.selectorType, step.selector),
          };
        case "hover":
          return {
            type: "hover",
            selector: buildSelector(step.selectorType, step.selector),
          };
        case "print":
          return {
            type: "print",
            message: resolveValue(step.message, step.messageSource, step.messageVar, test.variables),
          };
        case "screenshot":
          return {
            type: "screenshot",
            name: step.name?.trim() || undefined,
          };
      }
    }),
  };
}

export function buildRunRequest(test: LocalTest): RunRequest {
  return {
    baseURL: test.baseURL,
    test: buildTestDefinition(test),
    artifacts: test.artifacts,
  };
}

export function loadRunReports(): RunReport[] {
  const raw = localStorage.getItem(REPORTS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as RunReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRunReports(reports: RunReport[]) {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

export function addRunReport(report: RunReport): RunReport[] {
  const existing = loadRunReports();
  const ordered = [report, ...existing].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const perTestCount = new Map<string, number>();
  const allowed = new Set<string>();

  for (const item of ordered) {
    let include = false;
    for (const entry of item.tests) {
      const count = perTestCount.get(entry.testId) ?? 0;
      if (count < 2) {
        include = true;
        perTestCount.set(entry.testId, count + 1);
      }
    }
    if (include) allowed.add(item.id);
  }

  const filtered = ordered.filter((item) => allowed.has(item.id));
  saveRunReports(filtered);
  return filtered;
}

export function updateRunReport(reportId: string, updater: (report: RunReport) => RunReport): RunReport[] {
  const existing = loadRunReports();
  const index = existing.findIndex((item) => item.id === reportId);
  if (index === -1) return existing;

  const next = [...existing];
  next[index] = updater(existing[index]);
  const ordered = next.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  saveRunReports(ordered);
  return ordered;
}
