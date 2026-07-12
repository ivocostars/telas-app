import "dotenv/config";
import { db, sql } from "./index.js";
import { usuarios } from "./schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
  const email = "ivanmcr7@gmail.com";
  const password = "telas123";

  const hash = await bcrypt.hash(password, 10);

  await db.insert(usuarios).values({
    email,
    passwordHash: hash,
    rol: "admin",
  }).onConflictDoNothing({ target: usuarios.email });

  console.log("Usuario: " + email);
  console.log("Password: " + password);
  console.log("Rol: admin");

  await sql.end();
}

main().catch(console.error);
