import "dotenv/config";
import postgres from "postgres";
import bcrypt from "bcryptjs";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

// Create ivanmcr7 admin
const hash = await bcrypt.hash("telas123", 10);
await sql`
  INSERT INTO usuarios (email, password_hash, rol, creado_en)
  VALUES ('ivanmcr7@gmail.com', ${hash}, 'admin', NOW())
  ON CONFLICT (email) DO NOTHING
`;

// Also create a test scanner user
const hash2 = await bcrypt.hash("scanner123", 10);
await sql`
  INSERT INTO usuarios (email, password_hash, rol, creado_en)
  VALUES ('scanner@telas.com', ${hash2}, 'scanner', NOW())
  ON CONFLICT (email) DO NOTHING
`;

const users = await sql`SELECT id, email, rol FROM usuarios`;
for (const u of users) {
  console.log(`  ${u.id}: ${u.email} (${u.rol})`);
}
console.log("\nDone");
await sql.end();
