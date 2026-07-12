import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { usuarios } from "./schema.js";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema: { usuarios } });

const r = await db.delete(usuarios).where(eq(usuarios.email, "admin@telas.com"));
console.log("Deleted:", r);
await client.end();
