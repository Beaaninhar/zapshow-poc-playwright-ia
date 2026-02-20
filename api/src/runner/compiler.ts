import type { RunRequest, Step } from "./types";

export type Action =
  | { type: "goto"; url: string }
  | { type: "fill"; selector: string; value: string }
  | { type: "click"; selector: string }
  | { type: "expectText"; selector: string; text: string }
  | { type: "expectVisible"; selector: string }
  | { type: "waitForTimeout"; ms: number }
  | { type: "waitForSelector"; selector: string }
  | { type: "hover"; selector: string }
  | { type: "print"; message: string }
  | { type: "screenshot"; name?: string }
  | {
      type: "apiRequest";
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      url: string;
      headers?: Record<string, string>;
      body?: string;
      expectedStatus?: number;
      expectedBodyContains?: string;
    };

function getUnknownType(value: unknown): string {
  if (!value || typeof value !== "object") return "unknown";
  const t = (value as Record<string, unknown>)["type"];
  return typeof t === "string" ? t : "unknown";
}

export function compile(req: RunRequest): { baseURL: string; actions: Action[] } {
  if (!req?.baseURL) throw new Error("baseURL is required");
  if (!req?.test?.steps?.length) throw new Error("test.steps is required");

  const actions: Action[] = req.test.steps.map((s: Step) => {
    switch (s.type) {
      case "goto":
      case "fill":
      case "click":
      case "expectText":
      case "expectVisible":
      case "waitForTimeout":
      case "waitForSelector":
      case "hover":
      case "print":
      case "screenshot":
      case "apiRequest":
        return s;
      default:
        throw new Error(`invalid step type: ${getUnknownType(s)}`);
    }
  });

  return { baseURL: req.baseURL, actions };
}
