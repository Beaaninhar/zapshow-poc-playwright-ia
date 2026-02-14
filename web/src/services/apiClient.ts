const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:3001";

export type EventPayload = {
  title: string;
  description?: string;
  date: string;
  price: number;
};

export type EventRecord = EventPayload & {
  id: number;
};

export type Profile = {
  name: string;
  email: string;
  phone: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string }> {
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return parseResponse<{ token: string }>(response);
}

export async function listEvents(): Promise<EventRecord[]> {
  const response = await fetch(`${API_BASE}/events`);
  return parseResponse<EventRecord[]>(response);
}

export async function createEvent(payload: EventPayload): Promise<EventRecord> {
  const response = await fetch(`${API_BASE}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<EventRecord>(response);
}

export async function updateEvent(
  id: string,
  payload: EventPayload,
): Promise<EventRecord> {
  const response = await fetch(`${API_BASE}/events/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<EventRecord>(response);
}

export async function deleteEvent(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/events/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
}

export async function getProfile(): Promise<Profile> {
  const response = await fetch(`${API_BASE}/profile`);
  return parseResponse<Profile>(response);
}

export async function updateProfile(payload: Profile): Promise<Profile> {
  const response = await fetch(`${API_BASE}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<Profile>(response);
}
