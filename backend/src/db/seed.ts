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
    { nombre: "Lucía", apellido: "González", silla: true },
    { nombre: "Martín", apellido: "Rodríguez", silla: false },
    { nombre: "Camila", apellido: "Fernández", silla: true },
    { nombre: "Santiago", apellido: "López", silla: false },
    { nombre: "Valentina", apellido: "Martínez", silla: true },
    { nombre: "Mateo", apellido: "Pérez", silla: false },
    { nombre: "Sofía", apellido: "García", silla: true },
    { nombre: "Benjamín", apellido: "Díaz", silla: false },
    { nombre: "Isabella", apellido: "Torres", silla: true },
    { nombre: "Facundo", apellido: "Ramírez", silla: false },
  ];

  for (let i = 0; i < names.length; i++) {
    const n = names[i];
    const dni = String(40000000 + i);
    const qrHash = crypto
      .createHash("sha256")
      .update(crypto.randomUUID() + Date.now() + i)
      .digest("hex");

    await db
      .insert(espectadores)
      .values({
        nombre: n.nombre,
        apellido: n.apellido,
        dni,
        email: `espectador${i + 1}@email.com`,
        silla: n.silla,
        qrHash,
      })
      .onConflictDoNothing({ target: espectadores.dni });
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
