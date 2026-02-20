import { prisma } from "../lib/prisma";
import { UserRole as PrismaUserRole } from "@prisma/client";
import type { UserRole } from "../domain/model";
import type { CreateEventBody } from "../http/dto";

export class EventsService {
  async reset() {
    await prisma.event.deleteMany();
  }

  async list(role: UserRole, userId: number) {
    if (role === "MASTER") {
      return await prisma.event.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }
    return await prisma.event.findMany({
      where: { createdByUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countByUserId(userId: number) {
    return await prisma.event.count({
      where: { createdByUserId: userId },
    });
  }

  async deleteByUserId(userId: number) {
    await prisma.event.deleteMany({
      where: { createdByUserId: userId },
    });
  }

  async create(input: {
    role: UserRole | null;
    userId: number | null;
    userName: string | null;
    body: CreateEventBody;
  }) {
    const { role, userId, userName, body } = input;
    const { title, description, date, price } = body;

    if (!role || !userId || !userName) {
      return { status: 401 as const, data: { error: "missing user context" } };
    }

    if (!title || !date || typeof price !== "number" || price <= 0) {
      return {
        status: 400 as const,
        data: { error: "title, date and price (greater than 0) are required" },
      };
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date,
        price,
        createdByUserId: userId,
        createdByName: userName,
      },
    });

    return { status: 201 as const, data: event };
  }
}
