import cors from "cors";
import express from "express";

const app = express();
app.use(cors());
app.use(express.json());

type UserRole = "MASTER" | "USER";

type User = {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

type Event = {
  id: number;
  title: string;
  description?: string;
  date: string;
  price: number;
  createdByUserId: number;
  createdByName: string;
};

const initialUsers: User[] = [
  {
    id: 1,
    name: "Ana",
    email: "qa_ana@empresa.com",
    password: "123456",
    role: "MASTER",
  },
  {
    id: 2,
    name: "João",
    email: "qa_joao@empresa.com",
    password: "123456",
    role: "MASTER",
  },
];

let users: User[] = [...initialUsers];
let events: Event[] = [];
let nextUserId = 3;
let nextEventId = 1;

function getRequestRole(req: express.Request): UserRole | null {
  const role = req.header("x-user-role");
  if (role === "MASTER" || role === "USER") return role;
  return null;
}

function getRequestUserId(req: express.Request): number | null {
  const userId = Number(req.header("x-user-id"));
  return Number.isFinite(userId) && userId > 0 ? userId : null;
}

function getRequestUserName(req: express.Request): string | null {
  const userName = req.header("x-user-name");
  return userName ? String(userName) : null;
}

function requireMaster(req: express.Request, res: express.Response): boolean {
  if (getRequestRole(req) !== "MASTER") {
    res.status(403).json({ error: "access denied" });
    return false;
  }

  return true;
}

app.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  const user = users.find(
    (item) => item.email === String(email).toLowerCase() && item.password === password,
  );

  if (!user) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

app.post("/users", (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email and password are required" });
  }

  const normalizedEmail = String(email).toLowerCase();
  if (users.some((user) => user.email === normalizedEmail)) {
    return res.status(409).json({ error: "email already exists" });
  }

  const userRole: UserRole = role === "MASTER" ? "MASTER" : "USER";

  const user: User = {
    id: nextUserId++,
    name: String(name),
    email: normalizedEmail,
    password: String(password),
    role: userRole,
  };

  users.push(user);

  return res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

app.get("/users", (req, res) => {
  if (!requireMaster(req, res)) return;

  const usersWithEventCount = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    eventsCount: events.filter((event) => event.createdByUserId === user.id).length,
  }));

  res.json(usersWithEventCount);
});

app.put("/users/:id", (req, res) => {
  if (!requireMaster(req, res)) return;

  const id = Number(req.params.id);
  const index = users.findIndex((item) => item.id === id);

  if (index < 0) {
    return res.status(404).json({ error: "user not found" });
  }

  const { name, email, password, role } = req.body || {};
  const normalizedEmail = String(email).toLowerCase();

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email and password are required" });
  }

  const duplicateEmail = users.some(
    (item) => item.email === normalizedEmail && item.id !== id,
  );

  if (duplicateEmail) {
    return res.status(409).json({ error: "email already exists" });
  }

  const currentRole = users[index].role;

  users[index] = {
    ...users[index],
    name: String(name),
    email: normalizedEmail,
    password: String(password),
    role: currentRole === "MASTER" ? "MASTER" : role === "MASTER" ? "MASTER" : "USER",
  };

  return res.json({
    id: users[index].id,
    name: users[index].name,
    email: users[index].email,
    role: users[index].role,
  });
});

app.delete("/users/:id", (req, res) => {
  if (!requireMaster(req, res)) return;

  const id = Number(req.params.id);
  const index = users.findIndex((item) => item.id === id);

  if (index < 0) {
    return res.status(404).json({ error: "user not found" });
  }

  if (users[index].role === "MASTER") {
    return res.status(400).json({ error: "cannot delete master user" });
  }

  users.splice(index, 1);
  events = events.filter((event) => event.createdByUserId !== id);

  return res.sendStatus(204);
});

app.get("/events", (req, res) => {
  const role = getRequestRole(req);
  const userId = getRequestUserId(req);

  if (!role || !userId) {
    return res.status(401).json({ error: "missing user context" });
  }

  if (role === "MASTER") {
    return res.json(events);
  }

  return res.json(events.filter((event) => event.createdByUserId === userId));
});

app.post("/events", (req, res) => {
  const userId = getRequestUserId(req);
  const userName = getRequestUserName(req);
  const role = getRequestRole(req);
  const { title, description, date, price } = req.body || {};

  if (!role || !userId || !userName) {
    return res.status(401).json({ error: "missing user context" });
  }

  if (!title || !date || typeof price !== "number" || price <= 0) {
    return res
      .status(400)
      .json({ error: "title, date and price (greater than 0) are required" });
  }

  const event: Event = {
    id: nextEventId++,
    title,
    description,
    date,
    price,
    createdByUserId: userId,
    createdByName: userName,
  };

  events.push(event);
  return res.status(201).json(event);
});

app.post("/test/reset", (_req, res) => {
  users = [...initialUsers];
  events = [];
  nextUserId = 3;
  nextEventId = 1;
  res.sendStatus(200);
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on ${port}`);
});
