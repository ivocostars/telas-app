import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(connectionString, {
  max: 3,
  prepare: false,
  connection: { attempts: 1 },
});
export const db = drizzle(client);
export const sql = client;
