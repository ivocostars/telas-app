import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { usuarios } from "./schema.js";
import { eq } from "drizzle-orm";

let _client: any = null;
let _db: any = null;

function getClient() {
  if (!_client) {
    const url = process.env.DATABASE_URL;
    _client = postgres(url, { max: 3, prepare: false, connection: { attempts: 1 } });
  }
  return _client;
}

function getDb() {
  if (!_db) _db = drizzle(getClient());
  return _db;
}

const db = new Proxy({} as any, {
  get(_, prop) { return (getDb() as any)[prop]; },
});

try {
  const user = await db.select().from(usuarios).where(eq(usuarios.email, "ivanmcr7@gmail.com")).limit(1).then((r: any) => r[0]);
  console.log("User found:", user?.email, user?.rol);
} catch (e: any) {
  console.error("Error:", e.code, e.message);
}
await getClient().end();
