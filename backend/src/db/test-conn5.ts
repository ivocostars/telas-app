import "dotenv/config";
import postgres from "postgres";

// Try pooler port 6543 without extra params
const url = "postgresql://postgres:DeniTelas2026@db.auymohbawcsglzplvwtf.supabase.co:6543/postgres?sslmode=require";
console.log("Testing pooler...");
const sql = postgres(url);
try {
  const r = await sql`SELECT 1 as connected`;
  console.log("OK!", r[0]);
} catch (e: any) {
  console.error("Error:", e.code || "?", e.message?.slice(0, 200));
}
await sql.end();
