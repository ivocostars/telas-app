import "dotenv/config";
import { db } from "../db/index.js";
import { espectadores } from "../db/schema.js";

async function main() {
  try {
    console.log("Iniciando actualización masiva de espectadores...");
    
    // Set vendidoEnPuerta to false for all rows
    const result = await db.update(espectadores)
      .set({ vendidoEnPuerta: false });

    console.log("¡Actualización exitosa!");
    process.exit(0);
  } catch (error) {
    console.error("Error al actualizar espectadores:", error);
    process.exit(1);
  }
}

main();
