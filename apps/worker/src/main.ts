import { createServices } from "@relayos/domain";
import { loadEnv, logger } from "@relayos/shared";
import { runOnce } from "./worker";

const env = loadEnv();
const svc = createServices(env);
const log = logger.child({ component: "worker" });
let stopping = false;
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => (stopping = true));

log.info("worker started", { llm: svc.provider.name, model: svc.provider.model, app_env: env.APP_ENV });
while (!stopping) {
  try {
    const r = await runOnce(svc);
    if (r.processed || r.failed) log.info("batch", { ...r });
    if (!r.processed && !r.failed) await new Promise((res) => setTimeout(res, 2000));
  } catch (err) {
    log.error("worker loop error", { error: (err as Error).message });
    await new Promise((res) => setTimeout(res, 5000));
  }
}
await svc.db.close();
log.info("worker stopped");
