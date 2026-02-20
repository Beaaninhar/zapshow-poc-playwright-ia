const STORAGE_KEY = "zapshow-local-tests";
const REPORTS_KEY = "zapshow-run-reports";
function buildIdentifierFallback(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
}
export function loadLocalTests() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw)
        return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed.map((test) => ({
            ...test,
            identifier: test.identifier || buildIdentifierFallback(test.name),
        }));
    }
    catch {
        return [];
    }
}
export function saveLocalTests(tests) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
}
export function getLocalTest(testId) {
    return loadLocalTests().find((t) => t.id === testId);
}
export function upsertLocalTest(test) {
    const tests = loadLocalTests();
    const index = tests.findIndex((t) => t.id === test.id);
    if (index === -1) {
        tests.push(test);
    }
    else {
        tests[index] = test;
    }
    saveLocalTests(tests);
    return tests;
}
export function deleteLocalTest(testId) {
    const tests = loadLocalTests().filter((t) => t.id !== testId);
    saveLocalTests(tests);
    return tests;
}
export function buildSelector(selectorType, value) {
    const trimmed = value.trim();
    if (!selectorType || selectorType === "css")
        return trimmed;
    if (selectorType === "testid")
        return `data-testid=${trimmed}`;
    return `${selectorType}=${trimmed}`;
}
function resolveValue(value, source, variableName, variables) {
    if (source !== "variable")
        return value;
    if (!variableName || !(variableName in variables)) {
        throw new Error("Variable not found");
    }
    return variables[variableName];
}
export function buildTestDefinition(test) {
    return {
        name: test.name,
        steps: test.steps.map((step) => {
            switch (step.type) {
                case "goto":
                    return {
                        type: "goto",
                        url: resolveValue(step.url, step.urlSource, step.urlVar, test.variables),
                    };
                case "fill":
                    return {
                        type: "fill",
                        selector: buildSelector(step.selectorType, step.selector),
                        value: resolveValue(step.value, step.valueSource, step.valueVar, test.variables),
                    };
                case "click":
                    return {
                        type: "click",
                        selector: buildSelector(step.selectorType, step.selector),
                    };
                case "expectText":
                    return {
                        type: "expectText",
                        selector: buildSelector(step.selectorType, step.selector),
                        text: resolveValue(step.text, step.textSource, step.textVar, test.variables),
                    };
                case "expectVisible":
                    return {
                        type: "expectVisible",
                        selector: buildSelector(step.selectorType, step.selector),
                    };
                case "waitForTimeout":
                    return {
                        type: "waitForTimeout",
                        ms: step.ms,
                    };
                case "waitForSelector":
                    return {
                        type: "waitForSelector",
                        selector: buildSelector(step.selectorType, step.selector),
                    };
                case "hover":
                    return {
                        type: "hover",
                        selector: buildSelector(step.selectorType, step.selector),
                    };
                case "print":
                    return {
                        type: "print",
                        message: resolveValue(step.message, step.messageSource, step.messageVar, test.variables),
                    };
                case "screenshot":
                    return {
                        type: "screenshot",
                        name: step.name?.trim() || undefined,
                    };
                case "apiRequest":
                    return {
                        type: "apiRequest",
                        method: step.method,
                        url: resolveValue(step.url, step.urlSource, step.urlVar, test.variables),
                        headers: step.headers?.trim()
                            ? JSON.parse(step.headers)
                            : undefined,
                        body: resolveValue(step.body ?? "", step.bodySource, step.bodyVar, test.variables),
                        expectedStatus: step.expectedStatus,
                        expectedBodyContains: step.expectedBodyContains?.trim() || undefined,
                    };
            }
        }),
    };
}
export function buildLocalStepFromStep(step) {
    switch (step.type) {
        case "goto":
            return { type: "goto", url: step.url };
        case "fill":
            return { type: "fill", selector: step.selector, value: step.value };
        case "click":
            return { type: "click", selector: step.selector };
        case "expectText":
            return { type: "expectText", selector: step.selector, text: step.text };
        case "expectVisible":
            return { type: "expectVisible", selector: step.selector };
        case "waitForTimeout":
            return { type: "waitForTimeout", ms: step.ms };
        case "waitForSelector":
            return { type: "waitForSelector", selector: step.selector };
        case "hover":
            return { type: "hover", selector: step.selector };
        case "print":
            return { type: "print", message: step.message };
        case "screenshot":
            return { type: "screenshot", name: step.name };
        case "apiRequest":
            return {
                type: "apiRequest",
                method: step.method,
                url: step.url,
                headers: step.headers ? JSON.stringify(step.headers, null, 2) : "",
                body: step.body ?? "",
                expectedStatus: step.expectedStatus,
                expectedBodyContains: step.expectedBodyContains ?? "",
            };
    }
}
export function buildRunRequest(test) {
    return {
        baseURL: test.baseURL,
        test: buildTestDefinition(test),
        artifacts: {
            screenshot: test.artifacts?.screenshot ?? "on",
            video: test.artifacts?.video ?? "on",
            trace: test.artifacts?.trace ?? "retain-on-failure",
        },
    };
}
export function loadRunReports() {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (!raw)
        return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
export function saveRunReports(reports) {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}
export function addRunReport(report) {
    const existing = loadRunReports();
    const ordered = [report, ...existing].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const perTestCount = new Map();
    const allowed = new Set();
    for (const item of ordered) {
        let include = false;
        for (const entry of item.tests) {
            const count = perTestCount.get(entry.testId) ?? 0;
            if (count < 2) {
                include = true;
                perTestCount.set(entry.testId, count + 1);
            }
        }
        if (include)
            allowed.add(item.id);
    }
    const filtered = ordered.filter((item) => allowed.has(item.id));
    saveRunReports(filtered);
    return filtered;
}
export function updateRunReport(reportId, updater) {
    const existing = loadRunReports();
    const index = existing.findIndex((item) => item.id === reportId);
    if (index === -1)
        return existing;
    const next = [...existing];
    next[index] = updater(existing[index]);
    const ordered = next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    saveRunReports(ordered);
    return ordered;
}
