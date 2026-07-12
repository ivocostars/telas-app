import "dotenv/config";
import postgres from "postgres";
import bcrypt from "bcryptjs";

const url = "postgresql://postgres:DeniTelas2026@db.auymohbawcsglzplvwtf.supabase.co:6543/postgres?sslmode=require";
const sql = postgres(url, { max: 1 });

const hash1 = await bcrypt.hash("telas123", 10);
await sql`INSERT INTO usuarios (email, password_hash, rol) VALUES ('ivanmcr7@gmail.com', ${hash1}, 'admin') ON CONFLICT (email) DO NOTHING`;

const hash2 = await bcrypt.hash("scanner123", 10);
await sql`INSERT INTO usuarios (email, password_hash, rol) VALUES ('scanner@telas.com', ${hash2}, 'scanner') ON CONFLICT (email) DO NOTHING`;

const users = await sql`SELECT id, email, rol FROM usuarios`;
for (const u of users) console.log(`  ${u.id}: ${u.email} (${u.rol})`);

console.log("Done");
await sql.end();
