import { Router, Request, Response } from "express";
import { eq, and, desc, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { espectadores, escaneos } from "../db/schema.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, async (_req: Request, res: Response) => {
  try {
    const [totalResult, ingresadosResult, sillasResult, sillasOcupadasResult, vendidosPuertaResult] = await Promise.all([
      db.select({ total: count() }).from(espectadores).then((r) => Number(r[0].total)),
      db.select({ total: count() }).from(espectadores).where(eq(espectadores.ingresado, true)).then((r) => Number(r[0].total)),
      db.select({ total: count() }).from(espectadores).where(eq(espectadores.silla, true)).then((r) => Number(r[0].total)),
      db.select({ total: count() }).from(espectadores).where(and(eq(espectadores.silla, true), eq(espectadores.ingresado, true))).then((r) => Number(r[0].total)),
      db.select({ total: count() }).from(espectadores).where(eq(espectadores.vendidoEnPuerta, true)).then((r) => Number(r[0].total)),
    ]);

    const total = totalResult;
    const ingresados = ingresadosResult;
    const sillas_otorgadas = sillasResult;
    const sillas_ocupadas = sillasOcupadasResult;
    const sillas_restantes = sillas_otorgadas - sillas_ocupadas;
    const vendidos_en_puerta = vendidosPuertaResult;
    const faltantes = total - ingresados;
    const ocupacion_pct =
      total > 0 ? Math.round((ingresados / total) * 1000) / 10 : 0;

    const ultimosIngresos = await db
      .select({
        id: escaneos.id,
        nombreCompleto: espectadores.nombreCompleto,
        silla: espectadores.silla,
        scanner_nombre: escaneos.scannerNombre,
        creado_en: escaneos.creadoEn,
      })
      .from(escaneos)
      .innerJoin(espectadores, eq(escaneos.espectadorId, espectadores.id))
      .where(eq(escaneos.resultado, "ok"))
      .orderBy(desc(escaneos.creadoEn))
      .limit(10);

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.json({
      total,
      ingresados,
      sillas_otorgadas,
      sillas_ocupadas,
      sillas_restantes,
      vendidos_en_puerta,
      faltantes,
      ocupacion_pct,
      ultimos_ingresos: ultimosIngresos,
    });
  } catch (err) {
    console.error("Error getting stats:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
