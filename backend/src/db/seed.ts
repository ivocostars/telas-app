import "dotenv/config";
import { db, sql } from "./index.js";
import { usuarios, espectadores } from "./schema.js";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

async function seed() {
  console.log("Seeding database...");

  const adminHash = await bcrypt.hash("admin123", 10);
  await db.insert(usuarios).values({
    email: "admin@telas.com",
    passwordHash: adminHash,
    rol: "admin",
  }).onConflictDoNothing({ target: usuarios.email });

  console.log("Admin user created: admin@telas.com / admin123");

  const names = [
    { nombre: "Lucía González", silla: true },
    { nombre: "Martín Rodríguez", silla: false },
    { nombre: "Camila Fernández", silla: true },
    { nombre: "Santiago López", silla: false },
    { nombre: "Valentina Martínez", silla: true },
    { nombre: "Mateo Pérez", silla: false },
    { nombre: "Sofía García", silla: true },
    { nombre: "Benjamín Díaz", silla: false },
    { nombre: "Isabella Torres", silla: true },
    { nombre: "Facundo Ramírez", silla: false },
  ];

  for (let i = 0; i < names.length; i++) {
    const n = names[i];
    const qrHash = crypto
      .createHash("sha256")
      .update(crypto.randomUUID() + Date.now() + i)
      .digest("hex");

    await db
      .insert(espectadores)
      .values({
        nombreCompleto: n.nombre,
        email: `espectador${i + 1}@email.com`,
        silla: n.silla,
        qrHash,
      })
      .onConflictDoNothing({ target: espectadores.id });
  }

  console.log(`10 spectators seeded`);
  console.log("Seed complete");
  await sql.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
