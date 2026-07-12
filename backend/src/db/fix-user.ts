import "dotenv/config";
import { db, sql } from "./index.js";
import { usuarios } from "./schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
  const email = "ivanmcr7@gmail.com";
  const password = "telas123";

  // Test hash generation
  const hash = await bcrypt.hash(password, 10);
  console.log("Hash generated:", hash.slice(0, 20) + "...");
  
  // Verify hash works
  const testValid = await bcrypt.compare(password, hash);
  console.log("Hash self-test:", testValid);
  
  if (!testValid) {
    console.log("ERROR: bcrypt hash/compare no funciona correctamente");
    await sql.end();
    return;
  }

  // Delete existing user and recreate
  await db.delete(usuarios).where(eq(usuarios.email, email));
  console.log("Deleted existing user");

  await db.insert(usuarios).values({
    email,
    passwordHash: hash,
    rol: "admin",
  });
  console.log("User created");

  // Verify login works
  const user = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1).then(r => r[0]);
  const loginValid = await bcrypt.compare(password, user.passwordHash);
  console.log("Login test:", loginValid);

  await sql.end();
}

main().catch(console.error);
