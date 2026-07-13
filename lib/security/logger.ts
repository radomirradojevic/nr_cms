const SENSITIVE_FIELD = /authorization|cookie|secret|token|license.?key|private.?key|signature|password|encrypted|webhook/i;

export function redactForLog(value: unknown): unknown {
  if (typeof value === "string") return value.replace(/[\r\n\u0000-\u001f]/g, " ").slice(0, 500);
  if (Array.isArray(value)) return value.map(redactForLog);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, SENSITIVE_FIELD.test(key) ? "[REDACTED]" : redactForLog(entry)]));
}

export const securityLogger = {
  error(event: string, fields: Record<string, unknown> = {}) { console.error(JSON.stringify({ event, level: "error", ...(redactForLog(fields) as Record<string, unknown>) })); },
  info(event: string, fields: Record<string, unknown> = {}) { console.info(JSON.stringify({ event, level: "info", ...(redactForLog(fields) as Record<string, unknown>) })); },
  warn(event: string, fields: Record<string, unknown> = {}) { console.warn(JSON.stringify({ event, level: "warn", ...(redactForLog(fields) as Record<string, unknown>) })); },
};
