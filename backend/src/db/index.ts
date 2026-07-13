import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

type PgClient = ReturnType<typeof postgres>;
type PgDb = ReturnType<typeof drizzle>;

let _client: PgClient | null = null;
let _db: PgDb | null = null;

function ensureClient() {
  if (!_client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL required");
    _client = postgres(url, { max: 3, prepare: false });
  }
  return _client;
}

function ensureDb() {
  if (!_db) _db = drizzle(ensureClient());
  return _db;
}

export const db = new Proxy<PgDb>({} as PgDb, {
  get(_, prop) { return (ensureDb() as any)[prop]; },
});

function _sql(strings: TemplateStringsArray, ...values: any[]) {
  return ensureClient()(strings, ...values);
}

_sql.end = async () => { if (_client) await _client.end(); };

export { _sql as sql };
