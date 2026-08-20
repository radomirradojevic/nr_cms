const SENSITIVE_FIELD =
  /authorization|cookie|secret|token|license.?key|private.?key|signature|password|encrypted|webhook/i;
const SENSITIVE_VALUE =
  /\bBearer\s+\S+|-----BEGIN (?:ENCRYPTED )?PRIVATE KEY-----|\bnrls_(?:secret|admin_reveal)_[A-Za-z0-9_-]+|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

export function redactForLog(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[TRUNCATED]";
  if (typeof value === "string") {
    const sanitized = value.replace(/[\r\n\u0000-\u001f]/g, " ").slice(0, 500);
    return SENSITIVE_VALUE.test(sanitized) ? "[REDACTED]" : sanitized;
  }
  if (value instanceof Error)
    return { name: value.name, message: "[REDACTED]" };
  if (Array.isArray(value))
    return value.slice(0, 64).map((entry) => redactForLog(entry, depth + 1));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 128)
      .map(([key, entry]) => [
        key.slice(0, 100),
        SENSITIVE_FIELD.test(key)
          ? "[REDACTED]"
          : redactForLog(entry, depth + 1),
      ]),
  );
}

export const securityLogger = {
  error(event: string, fields: Record<string, unknown> = {}) {
    console.error(
      JSON.stringify({
        event,
        level: "error",
        ...(redactForLog(fields) as Record<string, unknown>),
      }),
    );
  },
  info(event: string, fields: Record<string, unknown> = {}) {
    console.info(
      JSON.stringify({
        event,
        level: "info",
        ...(redactForLog(fields) as Record<string, unknown>),
      }),
    );
  },
  warn(event: string, fields: Record<string, unknown> = {}) {
    console.warn(
      JSON.stringify({
        event,
        level: "warn",
        ...(redactForLog(fields) as Record<string, unknown>),
      }),
    );
  },
};
