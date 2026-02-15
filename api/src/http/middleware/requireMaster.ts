import type { Request, Response, NextFunction } from "express";
import { getRequestRole } from "./userContext";

export function requireMaster(req: Request, res: Response, next: NextFunction) {
  if (getRequestRole(req) !== "MASTER") {
    return res.status(403).json({ error: "access denied" });
  }
  next();
}
