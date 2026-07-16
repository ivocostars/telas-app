import { Router, Request, Response } from "express";
import { z } from "zod";
import { eq, asc, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { espectadores, escaneos } from "../db/schema.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const salidaSchema = z.object({
  qr_hash: z.string().min(1, "QR hash requerido"),
  scanner_nombre: z.string().min(1, "Nombre del scanner requerido"),
});

router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const body = salidaSchema.parse(req.body);
    const qrHash = body.qr_hash.split("|")[0];

    const spectator = await db
      .select()
      .from(espectadores)
      .where(eq(espectadores.qrHash, qrHash))
      .limit(1)
      .then((r) => r[0]);

    if (!spectator) {
      res.json({ valido: false, motivo: "QR inválido" });
      return;
    }

    if (!spectator.ingresado) {
      res.json({ valido: false, motivo: "El espectador no está adentro" });
      return;
    }

    const now = new Date();
    await db
      .update(espectadores)
      .set({ ingresado: false, ingresadoEn: null })
      .where(eq(espectadores.id, spectator.id));

    await db.insert(escaneos).values({
      espectadorId: spectator.id,
      scannerNombre: body.scanner_nombre,
      resultado: "salida",
    });

    res.json({
      valido: true,
      espectador: {
        nombre: spectator.nombre,
        apellido: spectator.apellido,
        dni: spectator.dni,
        silla: spectator.silla,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Error registering exit:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
