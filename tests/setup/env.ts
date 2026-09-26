import { APP_URL, ADMIN_URL } from "./constants";

process.env.NODE_ENV = "test";
process.env.APP_SECRET ??= "test-secret-test-secret-test-secret-123";
process.env.DATABASE_URL = APP_URL;
process.env.DATABASE_ADMIN_URL = ADMIN_URL;
process.env.LLM_PROVIDER = "mock";
