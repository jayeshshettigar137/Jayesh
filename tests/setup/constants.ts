/** Test database wiring. Override TEST_PG_HOST etc. to point at another server (e.g. CI service). */
const host = process.env.TEST_PG_HOST ?? "localhost:5432";
export const TEST_DB = process.env.TEST_DB_NAME ?? "relayos_test";
export const ADMIN_SERVER_URL = `postgres://relayos:relayos@${host}/postgres`;
export const ADMIN_URL = `postgres://relayos:relayos@${host}/${TEST_DB}`;
export const APP_URL = `postgres://relayos_app:relayos_app@${host}/${TEST_DB}`;
export const adminUrlFor = (db: string) => `postgres://relayos:relayos@${host}/${db}`;
