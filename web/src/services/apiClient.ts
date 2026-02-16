const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:3001";

export type UserRole = "MASTER" | "USER";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export type UserPayload = {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
};

export type UserRecord = AuthUser & {
  eventsCount: number;
};

export type EventPayload = {
  title: string;
  description?: string;
  date: string;
  price: number;
};

export type EventRecord = EventPayload & {
  id: number;
  createdByUserId: number;
  createdByName: string;
};

function getAuthHeaders(user: AuthUser) {
  return {
    "x-user-id": String(user.id),
    "x-user-name": user.name,
    "x-user-role": user.role,
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return parseResponse<AuthUser>(response);
}

export async function registerUser(payload: UserPayload): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<AuthUser>(response);
}

export async function listUsers(currentUser: AuthUser): Promise<UserRecord[]> {
  const response = await fetch(`${API_BASE}/users`, {
    headers: getAuthHeaders(currentUser),
  });
  return parseResponse<UserRecord[]>(response);
}

export async function updateUser(
  currentUser: AuthUser,
  id: number,
  payload: UserPayload,
): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(currentUser),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<AuthUser>(response);
}

export async function deleteUser(currentUser: AuthUser, id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/users/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(currentUser),
  });

  return parseResponse<void>(response);
}

export async function listEvents(currentUser: AuthUser): Promise<EventRecord[]> {
  const response = await fetch(`${API_BASE}/events`, {
    headers: getAuthHeaders(currentUser),
  });
  return parseResponse<EventRecord[]>(response);
}

export async function createEvent(
  currentUser: AuthUser,
  payload: EventPayload,
): Promise<EventRecord> {
  const response = await fetch(`${API_BASE}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(currentUser),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<EventRecord>(response);
}

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

export type StepResult = {
  index: number;
  step: Step;
  status: "passed" | "failed";
  durationMs?: number;
  errorMessage?: string;
};

export type TestDefinition = {
  name: string;
  steps: Step[];
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

export async function saveTestVersion(
  currentUser: AuthUser,
  testId: string,
  definition: TestDefinition,
): Promise<TestDefinition> {
  const response = await fetch(`${API_BASE}/tests/${testId}/versions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(currentUser),
    },
    body: JSON.stringify(definition),
  });

  return parseResponse<TestDefinition>(response);
}

export async function runTest(
  currentUser: AuthUser,
  runRequest: RunRequest,
): Promise<RunResult> {
  const response = await fetch(`${API_BASE}/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(currentUser),
    },
    body: JSON.stringify(runRequest),
  });

  return parseResponse<RunResult>(response);
}
