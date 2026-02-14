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
