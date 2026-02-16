function toMessage(value: unknown, depth = 0): string | undefined {
  if (depth > 2) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object") {
    const record = value as { message?: unknown; error?: unknown };
    if (record.message !== undefined) return toMessage(record.message, depth + 1);
    if (record.error !== undefined) return toMessage(record.error, depth + 1);
  }
  return undefined;
}

function tryParseJsonMessage(message: string): string | undefined {
  if (!message.trim().startsWith("{")) return undefined;
  try {
    const parsed = JSON.parse(message) as { message?: unknown; error?: unknown };
    return toMessage(parsed) ?? undefined;
  } catch {
    return undefined;
  }
}

function decodePlaywrightMessage(message: string): string {
  const trimmed = message.trim();
  const jsonMessage = tryParseJsonMessage(trimmed);
  const source = jsonMessage ?? trimmed;

  const timeoutMatch = source.match(/Timeout\s*(\d+)ms\s*exceeded/i);
  if (timeoutMatch) {
    const seconds = Math.round(Number(timeoutMatch[1]) / 1000);
    return `Timeout after ${seconds}s. Check the selector or increase timeout.`;
  }

  if (/strict mode violation/i.test(source)) {
    return "Selector matched multiple elements. Make the selector more specific.";
  }

  const locatorMatch = source.match(/locator\.(\w+):\s*(.+)/i);
  if (locatorMatch) {
    return `${locatorMatch[1]} failed. ${locatorMatch[2]}`;
  }

  const expectMatch = source.match(/expect\(.*\):\s*(.+)/i);
  if (expectMatch) {
    return `Expectation failed. ${expectMatch[1]}`;
  }

  return source;
}

export function formatErrorMessage(value: unknown): string {
  let message = toMessage(value) ?? String(value);
  if (message.startsWith("Error: ")) {
    message = message.slice("Error: ".length);
  }
  const nestedJson = tryParseJsonMessage(message);
  if (nestedJson) {
    message = nestedJson;
  }
  if (!message || message === "[object Object]") {
    return "Unknown error";
  }
  return decodePlaywrightMessage(message);
}
