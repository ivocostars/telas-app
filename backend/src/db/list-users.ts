import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { usuarios } from "./schema.js";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema: { usuarios } });

const users = await db.select().from(usuarios);
for (const u of users) {
  console.log(`  ${u.id}: ${u.email} (${u.rol})`);
}
await client.end();
