-- Local/dev bootstrap. `relayos` owns the schema and runs migrations.
-- `relayos_app` is what the app and worker connect as: no superuser, no BYPASSRLS,
-- so row-level security policies always apply to it.
CREATE ROLE relayos LOGIN PASSWORD 'relayos' CREATEDB;
CREATE ROLE relayos_app LOGIN PASSWORD 'relayos_app' NOSUPERUSER NOBYPASSRLS;
CREATE DATABASE relayos OWNER relayos;
