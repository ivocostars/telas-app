import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getClient() {
  if (!_client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    _client = postgres(connectionString, { max: 5, connection: { timeout: 15 } });
  }
  return _client;
}

function getDb() {
  if (!_db) {
    const client = getClient();
    _db = drizzle(client);
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});

export const sql = new Proxy({} as ReturnType<typeof postgres>, {
  get(_, prop) {
    return (getClient() as any)[prop];
  },
});
