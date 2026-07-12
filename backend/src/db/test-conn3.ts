import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_URL || "";
console.log("Connecting...");
const sql = postgres(url, { connection: { timeout: 10 } });
try {
  const r = await sql`SELECT 1 as connected`;
  console.log("OK!", r[0]);
} catch (e: any) {
  console.error("Error:", e.code || "?", e.message?.slice(0, 150));
}
await sql.end();
