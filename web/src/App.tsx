import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loginLoading, setLoginLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    if (token) fetchEvents();
  }, [token]);

  async function fetchEvents() {
    try {
      const res = await fetch(`${API_BASE}/events`);
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      toast.error("Error fetching events");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loginLoading) return;
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const email = formData.get("email")?.toString() || "";
    const password = formData.get("password")?.toString() || "";
    if (!email.trim() && !password.trim()) {
      toast.error(<span data-testid="toast-login-empty">Preencha email e senha</span>);
      return;
    }
    if (!email.trim()) {
      toast.error(<span data-testid="toast-login-email">Preencha o email</span>);
      return;
    }
    if (!password.trim()) {
      toast.error(<span data-testid="toast-login-password">Preencha a senha</span>);
      return;
    }
    setLoginLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const body = await res.json();
        setToken(body.token);
        form.reset();
      } else {
        toast.error(<span data-testid="toast-login-invalid">Email ou senha inválidos</span>);
      }
    } catch (err) {
      toast.error(<span data-testid="toast-login-network">Network error during login</span>);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (createLoading) return;
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const title = formData.get("title")?.toString() || "";
    const description = formData.get("description")?.toString() || "";
    if (!title.trim() && !description.trim()) {
      console.log("DEBUG: create validation - both empty");
      toast.error(<span data-testid="toast-create-both">Preencha título e descrição</span>);
      return;
    }
    if (!title.trim()) {
      console.log("DEBUG: create validation - title empty");
      toast.error(<span data-testid="toast-create-title">Preencha o título</span>);
      return;
    }
    if (!description.trim()) {
      console.log("DEBUG: create validation - description empty");
      toast.error(<span data-testid="toast-create-description">Preencha a descrição</span>);
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch(`${API_BASE}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (res.status === 201) {
        form.reset();
        fetchEvents();
        toast.success(<span data-testid="toast-create-success">Event created</span>);
      } else {
        toast.error(<span data-testid="toast-create-error">Error creating event</span>);
      }
    } catch (err) {
      toast.error(<span data-testid="toast-create-network">Network error creating event</span>);
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <main>
      <ToastContainer position="top-right" autoClose={8000} />
      {!token ? (
        <>
          <h1>Login</h1>
          <form onSubmit={handleLogin}>
            <label>
              Email
              <input name="email" type="email" aria-label="Email" />
            </label>
            <label>
              Password
              <input name="password" type="password" aria-label="Password" />
            </label>
            <button type="submit" disabled={loginLoading}>
              {loginLoading ? "Logging..." : "Login"}
            </button>
          </form>
        </>
      ) : (
        <>
          <h1>Events</h1>
          <form onSubmit={handleCreate} aria-label="create-event-form">
            <label>
              Title
              <input name="title" aria-label="Title" />
            </label>
            <label>
              Description
              <input name="description" aria-label="Description" />
            </label>
            <button type="submit" disabled={createLoading}>
              {createLoading ? "Creating..." : "Create Event"}
            </button>
          </form>

          <ul>
            {events.map((e) => (
              <li key={e.id}>
                {e.title} — {e.description}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
