import "dotenv/config";
import postgres from "postgres";

// Try pooler port 6543
const url = "postgresql://postgres:DeniTelas2026@db.auymohbawcsglzplvwtf.supabase.co:6543/postgres?sslmode=require&pgbouncer=true";
console.log("Testing pooler on 6543...");
const sql = postgres(url, { connection: { timeout: 10 } });
try {
  const r = await sql`SELECT 1 as connected`;
  console.log("OK!", r[0]);
} catch (e: any) {
  console.error("Error:", e.code || "?", e.message?.slice(0, 150));
}
await sql.end();
