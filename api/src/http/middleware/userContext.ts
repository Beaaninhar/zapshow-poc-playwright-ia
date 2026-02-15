import type { Request } from "express";
import type { UserRole } from "../../domain/model";

export function getRequestRole(req: Request): UserRole | null {
  const role = req.header("x-user-role");
  if (role === "MASTER" || role === "USER") return role;
  return null;
}

export function getRequestUserId(req: Request): number | null {
  const userId = Number(req.header("x-user-id"));
  return Number.isFinite(userId) && userId > 0 ? userId : null;
}

export function getRequestUserName(req: Request): string | null {
  const userName = req.header("x-user-name");
  return userName ? String(userName) : null;
}
