/** Structured JSON logs (one object per line) so they can be shipped to any log backend. */
type Level = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
  child(fields: Record<string, unknown>): Logger;
}

export function createLogger(base: Record<string, unknown> = {}, sink: (line: string) => void = defaultSink): Logger {
  const emit = (level: Level, msg: string, fields?: Record<string, unknown>) => {
    if (level === "debug" && process.env.LOG_LEVEL !== "debug") return;
    sink(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...base, ...fields }));
  };
  return {
    debug: (m, f) => emit("debug", m, f),
    info: (m, f) => emit("info", m, f),
    warn: (m, f) => emit("warn", m, f),
    error: (m, f) => emit("error", m, f),
    child: (fields) => createLogger({ ...base, ...fields }, sink),
  };
}

function defaultSink(line: string) {
  if (process.env.NODE_ENV === "test" && process.env.LOG_LEVEL !== "debug") return;
  process.stdout.write(line + "\n");
}

export const logger = createLogger({ service: "relayos" });
