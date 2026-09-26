import { loadEnv } from "@relayos/shared";
import { seedDemo } from "./demo";

const env = loadEnv();
if (env.APP_ENV === "production") {
  console.error("refusing to seed demo data into production");
  process.exit(1);
}
const result = await seedDemo(env, { reset: process.argv.includes("--reset") });
console.log(`Demo workspace ready: ${result.leads} synthetic leads, ${result.pendingApprovals} awaiting approval.`);
console.log(`Log in at ${env.APP_BASE_URL}/login as ${result.ownerEmail} / ${result.password}`);
process.exit(0);
