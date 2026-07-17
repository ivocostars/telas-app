import { Router, Request, Response } from "express";
import { z } from "zod";
import { eq, asc, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { espectadores, escaneos } from "../db/schema.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const validateSchema = z.object({
  qr_hash: z.string().min(1, "QR hash requerido"),
  scanner_nombre: z.string().min(1, "Nombre del scanner requerido"),
});

router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const body = validateSchema.parse(req.body);
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

    if (spectator.ingresado) {
      const firstScan = await db
        .select()
        .from(escaneos)
        .where(
          and(
            eq(escaneos.espectadorId, spectator.id),
            eq(escaneos.resultado, "ok"),
          ),
        )
        .orderBy(asc(escaneos.creadoEn))
        .limit(1)
        .then((r) => r[0]);

      res.json({
        valido: false,
        motivo: "QR ya utilizado",
        espectador: {
          nombreCompleto: spectator.nombreCompleto,
          silla: spectator.silla,
        },
        primer_ingreso: {
          scanner: firstScan?.scannerNombre ?? null,
          timestamp: firstScan?.creadoEn ?? null,
        },
      });
      return;
    }

    const now = new Date();
    await db
      .update(espectadores)
      .set({ ingresado: true, ingresadoEn: now })
      .where(eq(espectadores.id, spectator.id));

    await db.insert(escaneos).values({
      espectadorId: spectator.id,
      scannerNombre: body.scanner_nombre,
      resultado: "ok",
    });

    res.json({
      valido: true,
      espectador: {
        nombreCompleto: spectator.nombreCompleto,
        silla: spectator.silla,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Error validating QR:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
