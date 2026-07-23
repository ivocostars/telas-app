import { Router, Request, Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { escaneos, espectadores } from "../db/schema.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

// GET /api/escaneos
router.get("/", authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        id: escaneos.id,
        espectadorId: escaneos.espectadorId,
        espectadorNombre: espectadores.nombreCompleto,
        scannerNombre: escaneos.scannerNombre,
        resultado: escaneos.resultado,
        creadoEn: escaneos.creadoEn,
      })
      .from(escaneos)
      .leftJoin(espectadores, eq(escaneos.espectadorId, espectadores.id))
      .orderBy(desc(escaneos.creadoEn))
      .limit(100);

    res.json(rows);
  } catch (err) {
    console.error("Error listing escaneos:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// DELETE /api/escaneos/:id
router.delete("/:id", authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    await db.delete(escaneos).where(eq(escaneos.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting escaneo:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
