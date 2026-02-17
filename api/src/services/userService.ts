import type { CreateUserBody, UpdateUserBody } from "../http/dto";
import type { User, UserRole } from "../domain/model";

const initialUsers: User[] = [
  { id: 1, name: "Ana",  email: "qa_ana@empresa.com",  password: "123456", role: "MASTER" },
  { id: 2, name: "João", email: "qa_joao@empresa.com", password: "123456", role: "MASTER" },
];

export class UsersService {
  private users: User[] = [...initialUsers];
  private nextUserId = 3;

  reset() {
    this.users = [...initialUsers];
    this.nextUserId = 3;
  }

  login(email: unknown, password: unknown) {
    const e = String(email ?? "").toLowerCase();
    const p = String(password ?? "");
    const user = this.users.find(u => u.email === e && u.password === p);
    if (!user) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  create(body: CreateUserBody) {
    const { name, email, password, role } = body || {};

    if (!name || !email || !password) {
      return { status: 400 as const, data: { error: "name, email and password are required" } };
    }

    const normalizedEmail = String(email).toLowerCase();
    if (this.users.some(u => u.email === normalizedEmail)) {
      return { status: 409 as const, data: { error: "email already exists" } };
    }

    const userRole: UserRole = role === "MASTER" ? "MASTER" : "USER";

    const user: User = {
      id: this.nextUserId++,
      name: String(name),
      email: normalizedEmail,
      password: String(password),
      role: userRole,
    };

    this.users.push(user);

    return {
      status: 201 as const,
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  listWithEventCount(getCount: (userId: number) => number) {
    return this.users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      eventsCount: getCount(u.id),
    }));
  }

  update(id: number, body: UpdateUserBody) {
    const index = this.users.findIndex(u => u.id === id);
    if (index < 0) return { status: 404 as const, data: { error: "user not found" } };

    const { name, email, password, role } = body || {};
    if (!name || !email || !password) {
      return { status: 400 as const, data: { error: "name, email and password are required" } };
    }

    const normalizedEmail = String(email).toLowerCase();
    const duplicate = this.users.some(u => u.email === normalizedEmail && u.id !== id);
    if (duplicate) return { status: 409 as const, data: { error: "email already exists" } };

    const currentRole = this.users[index].role;
    this.users[index] = {
      ...this.users[index],
      name: String(name),
      email: normalizedEmail,
      password: String(password),
      role: currentRole === "MASTER" ? "MASTER" : role === "MASTER" ? "MASTER" : "USER",
    };

    const u = this.users[index];
    return { status: 200 as const, data: { id: u.id, name: u.name, email: u.email, role: u.role } };
  }

  delete(id: number) {
    const index = this.users.findIndex(u => u.id === id);
    if (index < 0) return { status: 404 as const, data: { error: "user not found" } };
    if (this.users[index].role === "MASTER") {
      return { status: 400 as const, data: { error: "cannot delete master user" } };
    }
    this.users.splice(index, 1);
    return { status: 204 as const, data: null };
  }
}
