import cors from "cors";
import express from "express";

const app = express();
app.use(cors());
app.use(express.json());

type Event = {
  id: number;
  title: string;
  description?: string;
  date: string;
  price: number;
};

type Profile = {
  name: string;
  email: string;
  phone: string;
};

const initialProfile: Profile = {
  name: "QA User",
  email: "qa@empresa.com",
  phone: "11999999999",
};

let events: Event[] = [];
let nextId = 1;
let profile: Profile = { ...initialProfile };

app.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (email === "qa@empresa.com" && password === "123456") {
    return res.json({ token: "ok" });
  }
  return res.status(401).json({ error: "invalid credentials" });
});

app.get("/events", (_req, res) => {
  res.json(events);
});

app.post("/events", (req, res) => {
  const { title, description, date, price } = req.body || {};
  if (!title || !date || typeof price !== "number") {
    return res.status(400).json({ error: "title, date and price are required" });
  }

  const event: Event = {
    id: nextId++,
    title,
    description,
    date,
    price,
  };

  events.push(event);
  return res.status(201).json(event);
});

app.put("/events/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = events.findIndex((event) => event.id === id);
  if (index < 0) return res.status(404).json({ error: "event not found" });

  const { title, description, date, price } = req.body || {};
  if (!title || !date || typeof price !== "number") {
    return res.status(400).json({ error: "title, date and price are required" });
  }

  const updated: Event = { id, title, description, date, price };
  events[index] = updated;
  return res.json(updated);
});

app.delete("/events/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = events.findIndex((event) => event.id === id);
  if (index < 0) return res.status(404).json({ error: "event not found" });

  events.splice(index, 1);
  return res.sendStatus(204);
});

app.get("/profile", (_req, res) => {
  res.json(profile);
});

app.put("/profile", (req, res) => {
  const { name, email, phone } = req.body || {};
  if (!name || !email || !phone) {
    return res.status(400).json({ error: "name, email and phone are required" });
  }

  profile = { name, email, phone };
  return res.json(profile);
});

app.post("/test/reset", (_req, res) => {
  events = [];
  nextId = 1;
  profile = { ...initialProfile };
  res.sendStatus(200);
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on ${port}`);
});
