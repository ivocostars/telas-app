import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_URL || "";
console.log("Testing connection...");
const sql = postgres(url, { connection: { timeout: 5 } });
try {
  const r = await sql`SELECT 1 as ok`;
  console.log("Connected!", r[0]);
} catch (e: any) {
  console.error("Error:", e.code, e.message?.slice(0, 120));
}
await sql.end();
