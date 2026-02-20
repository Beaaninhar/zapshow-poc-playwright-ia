import { prisma } from "../lib/prisma";
import { UserRole as PrismaUserRole } from "@prisma/client";
import type { CreateUserBody, UpdateUserBody } from "../http/dto";
import type { UserRole } from "../domain/model";

export class UsersService {
  async reset() {
    // Delete all users and events (cascade will handle events)
    await prisma.user.deleteMany();
  }

  async login(email: unknown, password: unknown) {
    const e = String(email ?? "").toLowerCase();
    const p = String(password ?? "");
    
    const user = await prisma.user.findUnique({
      where: { email: e },
    });

    if (!user || user.password !== p) return null;
    
    return { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role as UserRole 
    };
  }

  async create(body: CreateUserBody) {
    const { name, email, password, role } = body || {};

    if (!name || !email || !password) {
      return { status: 400 as const, data: { error: "name, email and password are required" } };
    }

    const normalizedEmail = String(email).toLowerCase();
    
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return { status: 409 as const, data: { error: "email already exists" } };
    }

    const userRole: PrismaUserRole = role === "MASTER" ? PrismaUserRole.MASTER : PrismaUserRole.USER;

    const user = await prisma.user.create({
      data: {
        name: String(name),
        email: normalizedEmail,
        password: String(password),
        role: userRole,
      },
    });

    return {
      status: 201 as const,
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async listWithEventCount(getCount: (userId: number) => Promise<number>) {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const usersWithCount = await Promise.all(
      users.map(async (u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as UserRole,
        eventsCount: await getCount(u.id),
      }))
    );

    return usersWithCount;
  }

  async update(id: number, body: UpdateUserBody) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return { status: 404 as const, data: { error: "user not found" } };

    const { name, email, password, role } = body || {};
    if (!name || !email || !password) {
      return { status: 400 as const, data: { error: "name, email and password are required" } };
    }

    const normalizedEmail = String(email).toLowerCase();
    
    const duplicate = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (duplicate && duplicate.id !== id) {
      return { status: 409 as const, data: { error: "email already exists" } };
    }

    const currentRole = user.role;
    const newRole = currentRole === PrismaUserRole.MASTER 
      ? PrismaUserRole.MASTER 
      : role === "MASTER" ? PrismaUserRole.MASTER : PrismaUserRole.USER;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: String(name),
        email: normalizedEmail,
        password: String(password),
        role: newRole,
      },
    });

    return { 
      status: 200 as const, 
      data: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role } 
    };
  }

  async delete(id: number) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return { status: 404 as const, data: { error: "user not found" } };
    
    if (user.role === PrismaUserRole.MASTER) {
      return { status: 400 as const, data: { error: "cannot delete master user" } };
    }

    await prisma.user.delete({ where: { id } });
    return { status: 204 as const, data: null };
  }
}
