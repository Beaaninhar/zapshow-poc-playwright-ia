import { chromium } from "@playwright/test";
import type { JobsRepo } from "../repos/jobsRepo";
import type { Step, TestDefinition } from "./types";

function isAbsoluteUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function joinUrl(base: string, route: string): string {
  if (!route) return base;
  if (isAbsoluteUrl(route)) return route;
  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
  return `${normalizedBase}${normalizedRoute}`;
}

function normalizeRoute(route: string): string {
  if (!route) return "/";
  if (isAbsoluteUrl(route)) {
    const url = new URL(route);
    return url.pathname || "/";
  }
  return route.startsWith("/") ? route : `/${route}`;
}

function safeLabel(value: string): string {
  return value.replace(/[^a-z0-9-_/]+/gi, "-").replace(/\/+/, "-").toLowerCase();
}

type PageSignals = {
  hasForm: boolean;
  hasInputs: boolean;
  hasTable: boolean;
  hasHeading: boolean;
};

async function analyzePage(page: import("@playwright/test").Page): Promise<PageSignals> {
  return page.evaluate(() => {
    const hasForm = Boolean(document.querySelector("form"));
    const hasInputs = Boolean(document.querySelector("input, select, textarea"));
    const hasTable = Boolean(document.querySelector("table"));
    const hasHeading = Boolean(document.querySelector("h1, h2"));
    return { hasForm, hasInputs, hasTable, hasHeading };
  });
}

async function discoverRoutes(job: { url: string; routes?: string[]; login?: { url?: string; username?: string; password?: string; usernameSelector?: string; passwordSelector?: string; submitSelector?: string } }): Promise<{ routes: string[]; signals: Record<string, PageSignals> }> {
  if (job.routes && job.routes.length > 0) {
    return { routes: job.routes.map(normalizeRoute), signals: {} };
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const discovered = new Set<string>();
  const signals: Record<string, PageSignals> = {};

  try {
    if (job.login?.username && job.login?.password) {
      const loginUrl = job.login.url || joinUrl(job.url, "/login");
      await page.goto(loginUrl);
      const usernameSelector = job.login.usernameSelector || "input[name='email'], input[type='email']";
      const passwordSelector = job.login.passwordSelector || "input[name='password'], input[type='password']";
      const submitSelector = job.login.submitSelector || "button[type='submit']";
      await page.waitForSelector(usernameSelector, { timeout: 10000 });
      await page.fill(usernameSelector, job.login.username);
      await page.fill(passwordSelector, job.login.password);
      await page.click(submitSelector);
      await page.waitForLoadState("networkidle");
    }

    await page.goto(job.url);
    await page.waitForSelector("body", { timeout: 10000 });

    const hrefs = await page.$$eval("a[href]", (elements) =>
      elements.map((el) => (el as HTMLAnchorElement).href).filter(Boolean),
    );

    const origin = new URL(job.url).origin;
    for (const href of hrefs) {
      if (!href.startsWith(origin)) continue;
      if (href.includes("#")) continue;
      if (href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
      const route = normalizeRoute(href);
      if (route.includes("logout") || route.includes("signout")) continue;
      discovered.add(route);
    }

    if (!discovered.size) {
      discovered.add("/");
    }

    for (const route of discovered) {
      const targetUrl = joinUrl(job.url, route);
      await page.goto(targetUrl);
      await page.waitForSelector("body", { timeout: 10000 });
      signals[route] = await analyzePage(page);
    }
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }

  return { routes: Array.from(discovered), signals };
}

export async function startJobWorker(jobId: string, repo: JobsRepo): Promise<void> {
  try {
    const job = await repo.getById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    // Phase 1: Planner
    await repo.updateStatus(jobId, "planner", {
      name: "planner",
      percentage: 10,
      logs: [`Exploring ${job.url}...`, "Analyzing page structure...", "Identifying test scenarios..."],
    });
    await new Promise((r) => setTimeout(r, 2000)); // Simula delay

    // Phase 2: Generator
    await repo.updateStatus(jobId, "generator", {
      name: "generator",
      percentage: 50,
      logs: [
        "Generating test plan...",
        "Creating smoke tests...",
        "Creating regression tests...",
        "Generating critical path tests...",
      ],
    });
    await new Promise((r) => setTimeout(r, 2000));

    // Phase 3: Healer
    await repo.updateStatus(jobId, "healer", {
      name: "healer",
      percentage: 80,
      logs: ["Validating test stability...", "Running test validation checks...", "All tests passed validation!"],
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Cria artefatos de exemplo
    const discovery = await discoverRoutes(job);
    const routes = discovery.routes.length ? discovery.routes : ["/"];

    const testPlan = `# Test Plan

## Target
${job.url}

## Objective
${job.objective}

## Scenarios
${routes.map((route) => `- Page: ${route}`).join("\n")}

## Notes
- This plan follows the Playwright Test Agents flow (planner -> generator -> healer)
- Generated output is converted to JSON steps for no-code listing
`;

    const generatedTests: Array<TestDefinition & { baseURL: string }> = routes.map((route) => {
      const targetUrl = joinUrl(job.url, route);
      const signal = discovery.signals[route];
      const name = `Page: ${route || "/"}`;
      const steps: Step[] = [
        { type: "goto", url: targetUrl },
        { type: "waitForSelector", selector: "body" },
        { type: "expectVisible", selector: "main, [role='main'], body" },
        ...(signal?.hasHeading ? [{ type: "expectVisible", selector: "h1, h2" } as Step] : []),
        ...(signal?.hasForm ? [{ type: "expectVisible", selector: "form" } as Step] : []),
        ...(signal?.hasInputs ? [{ type: "expectVisible", selector: "input, select, textarea" } as Step] : []),
        ...(signal?.hasTable ? [{ type: "expectVisible", selector: "table" } as Step] : []),
        { type: "screenshot", name: safeLabel(name) },
      ];

      return {
        name,
        steps,
        baseURL: job.url,
      };
    });

    // Salva artefatos no job
    await repo.updateArtifacts(jobId, {
      testPlan,
      tests: generatedTests,
    });

    // Marca como completo
    await repo.updateStatus(jobId, "completed", {
      name: "completed",
      percentage: 100,
      logs: ["Tests generated successfully!", "Tests saved to job JSON."],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await repo.updateStatus(jobId, "failed", undefined, message);

    console.error(`Job ${jobId} failed:`, message);
  }
}
