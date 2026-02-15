import type { Event, UserRole } from "../domain/model";
import type { CreateEventBody } from "../http/dto";

export class EventsService {
  private events: Event[] = [];
  private nextEventId = 1;

  reset() {
    this.events = [];
    this.nextEventId = 1;
  }

  list(role: UserRole, userId: number) {
    if (role === "MASTER") return this.events;
    return this.events.filter(e => e.createdByUserId === userId);
  }

  countByUserId(userId: number) {
    return this.events.filter(e => e.createdByUserId === userId).length;
  }

  deleteByUserId(userId: number) {
    this.events = this.events.filter(e => e.createdByUserId !== userId);
  }

  create(input: {
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

    const event: Event = {
      id: this.nextEventId++,
      title,
      description,
      date,
      price,
      createdByUserId: userId,
      createdByName: userName,
    };

    this.events.push(event);
    return { status: 201 as const, data: event };
  }
}
