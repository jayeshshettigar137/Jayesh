import { migrateDown, migrateUp } from "./migrate";

const url = process.env.DATABASE_ADMIN_URL;
if (!url) {
  console.error("DATABASE_ADMIN_URL is required (the schema-owner role, not the app role)");
  process.exit(1);
}
const [cmd, arg] = process.argv.slice(2);
if (cmd === "up") {
  const ran = await migrateUp(url);
  console.log(ran.length ? `applied: ${ran.join(", ")}` : "already up to date");
} else if (cmd === "down") {
  const rolled = await migrateDown(url, Number(arg ?? 1));
  console.log(rolled.length ? `rolled back: ${rolled.join(", ")}` : "nothing to roll back");
} else {
  console.error("usage: cli.ts up | down [steps]");
  process.exit(1);
}
