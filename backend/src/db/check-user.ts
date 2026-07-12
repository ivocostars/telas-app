import "dotenv/config";
import { db, sql } from "./index.js";
import { usuarios } from "./schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
  const users = await db.select().from(usuarios);
  console.log("Usuarios en DB:", users.length);
  for (const u of users) {
    console.log(`  - ${u.email} (${u.rol}) hash: ${u.passwordHash.slice(0, 20)}...`);
    if (u.email === "ivanmcr7@gmail.com") {
      const valid = await bcrypt.compare("telas123", u.passwordHash);
      console.log(`    password "telas123" válida: ${valid}`);
    }
  }
  await sql.end();
}

main().catch(console.error);
