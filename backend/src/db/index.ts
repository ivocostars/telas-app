import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

type Db = ReturnType<typeof drizzle>;
type Sql = ReturnType<typeof postgres>;

let _client: Sql | null = null;
let _db: Db | null = null;

function getClient(): Sql {
  if (!_client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL required");
    _client = postgres(url, { max: 3, prepare: false });
  }
  return _client;
}

function getDb(): Db {
  if (!_db) _db = drizzle(getClient());
  return _db;
}

export const db = new Proxy<Db>({} as Db, {
  get(_, prop) { return (getDb() as any)[prop]; },
});

export const sql = new Proxy<Sql>({} as Sql, {
  get(_, prop) { return (getClient() as any)[prop]; },
  apply(_, thisArg, args) { return (getClient() as any)(...args); },
});
