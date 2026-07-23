import { Router, Request, Response } from "express";
import { z } from "zod";
import { eq, desc, asc, ilike, count, sql } from "drizzle-orm";
import crypto from "node:crypto";
import QRCode from "qrcode";
import multer from "multer";
import * as XLSX from "xlsx";
import { db } from "../db/index.js";
import { espectadores, escaneos, eventConfig } from "../db/schema.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { sendQrEmail } from "../services/email.js";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

const createSchema = z.object({
  nombreCompleto: z.string().min(1, "Nombre requerido").max(200),
  email: z.string().email("Email inválido").max(255).optional().nullable(),
  telefono: z.string().max(30).optional().nullable(),
  silla: z.boolean().optional().default(false),
  alumnaInvitada: z.string().max(200).optional().nullable(),
  vendidoEnPuerta: z.boolean().optional().default(false),
});

const updateSchema = z.object({
  nombreCompleto: z.string().min(1).max(200).optional(),
  email: z.string().email().max(255).optional().nullable(),
  telefono: z.string().max(30).optional().nullable(),
  silla: z.boolean().optional(),
  alumnaInvitada: z.string().max(200).optional().nullable(),
  vendidoEnPuerta: z.boolean().optional(),
});

// GET /api/espectadores
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) || "";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClause = search
      ? ilike(espectadores.nombreCompleto, `%${search}%`)
      : undefined;

    const total = await db
      .select({ total: count() })
      .from(espectadores)
      .where(whereClause)
      .then((r) => Number(r[0].total));

    const rows = await db
      .select()
      .from(espectadores)
      .where(whereClause)
      .orderBy(
        sql`${espectadores.alumnaInvitada} ASC NULLS LAST`,
        asc(espectadores.nombreCompleto)
      )
      .limit(limit)
      .offset(offset);

    res.json({
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Error listing espectadores:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /api/espectadores/plantilla
router.get("/plantilla", authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "Telas App";
    wb.created = new Date();

    const ws = wb.addWorksheet("Espectadores");

    ws.columns = [
      { header: "nombre", key: "nombre", width: 30 },
      { header: "telefono", key: "telefono", width: 14 },
      { header: "email", key: "email", width: 28 },
      { header: "telefono", key: "telefono", width: 14 },
      { header: "silla", key: "silla", width: 10 },
      { header: "alumna_invitada", key: "alumna_invitada", width: 22 },
    ];

    ws.getRow(1).font = { bold: true, color: { argb: "FF6C3CB5" } };

    ws.addRow({ nombre: "Juan Pérez", email: "juan@email.com", telefono: "1144556677", silla: "SÍ", alumna_invitada: "" });
    ws.addRow({ nombre: "María García", email: "", telefono: "", silla: "NO", alumna_invitada: "Morena González" });
    ws.addRow({ nombre: "", email: "", telefono: "", silla: "", alumna_invitada: "" });

    const addValidation = (colIdx: number) => {
      const col = ws.getColumn(colIdx);
      col.eachCell((cell, rowNum) => {
        if (rowNum > 1) {
          cell.dataValidation = {
            type: "list",
            formulae: ['"SÍ,NO"'],
            showErrorMessage: true,
            errorTitle: "Valor inválido",
            error: "Seleccioná SÍ o NO",
          };
        }
      });
    };
    addValidation(5);
    addValidation(6);

    const buffer = await wb.xlsx.writeBuffer();

    res.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.set("Content-Disposition", 'attachment; filename="plantilla-espectadores.xlsx"');
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Error generating template:", err);
    res.status(500).json({ error: "Error al generar la plantilla" });
  }
});

// GET /api/espectadores/:id
router.get("/:id", authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const spectator = await db
      .select()
      .from(espectadores)
      .where(eq(espectadores.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!spectator) {
      res.status(404).json({ error: "Espectador no encontrado" });
      return;
    }

    res.json(spectator);
  } catch (err) {
    console.error("Error getting espectador:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST /api/espectadores
router.post("/", authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const body = createSchema.parse(req.body);

    const qrHash = crypto
      .createHash("sha256")
      .update(crypto.randomUUID() + Date.now())
      .digest("hex");

    const inserted = await db
      .insert(espectadores)
      .values({
        nombreCompleto: body.nombreCompleto,
        email: body.email ?? null,
        telefono: body.telefono ?? null,
        silla: body.silla ?? false,
        alumnaInvitada: body.alumnaInvitada || null,
        vendidoEnPuerta: body.vendidoEnPuerta ?? false,
        qrHash,
      })
      .returning();

    res.status(201).json(inserted[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }

    console.error("Error creating espectador:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// PUT /api/espectadores/:id
router.put("/:id", authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const body = updateSchema.parse(req.body);

    if (Object.keys(body).length === 0) {
      res.status(400).json({ error: "No hay campos para actualizar" });
      return;
    }

    const updated = await db
      .update(espectadores)
      .set(body)
      .where(eq(espectadores.id, id))
      .returning();

    if (!updated[0]) {
      res.status(404).json({ error: "Espectador no encontrado" });
      return;
    }

    res.json(updated[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Error updating espectador:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// DELETE /api/espectadores (todos)
router.delete("/", authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    await db.delete(escaneos);
    const deleted = await db.delete(espectadores).returning({ id: espectadores.id });
    res.json({ deleted: deleted.length });
  } catch (err) {
    console.error("Error deleting all espectadores:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// DELETE /api/espectadores/:id
router.delete("/:id", authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    await db.delete(escaneos).where(eq(escaneos.espectadorId, id));

    const deleted = await db
      .delete(espectadores)
      .where(eq(espectadores.id, id))
      .returning();

    if (!deleted[0]) {
      res.status(404).json({ error: "Espectador no encontrado" });
      return;
    }

    res.json({ deleted: true });
  } catch (err) {
    console.error("Error deleting espectador:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

function parseRowsFromBuffer(buffer: Buffer, mimeType: string): Record<string, string>[] {
  if (mimeType === "text/csv") {
    const content = buffer.toString("utf-8");
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const values = line.split(/[,;]/).map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || "";
      });
      return row;
    });
  }

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
  return rows;
}

// POST /api/espectadores/bulk
router.post("/bulk", authenticate, requireAdmin, upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Archivo requerido" });
      return;
    }

    const records = parseRowsFromBuffer(req.file.buffer, req.file.mimetype);

    const results: { created: number; errors: { row: number; reason: string }[] } = {
      created: 0,
      errors: [],
    };

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 1;

      const nombreCompleto = row.nombre || row.Nombre || row.nombreCompleto || "";
      const apellido = row.apellido || row.Apellido || "";
      const email = row.email || row.Email || "";
      const telefono = row.telefono || row.Telefono || row.Teléfono || "";
      const sillaRaw = String(row.silla || row.Silla || "").toLowerCase();
      try {
        const fullName = [nombreCompleto, apellido].filter(Boolean).join(" ") || nombreCompleto;
        const parsed = createSchema.parse({
          nombreCompleto: fullName,
          email: email || null,
          telefono: telefono || null,
          silla: sillaRaw === "true" || sillaRaw === "1" || sillaRaw === "sí" || sillaRaw === "si",
          alumnaInvitada: row.alumna_invitada || row["alumna invitada"] || row.Alumna || row.alumnaInvitada || null,
        });

        const qrHash = crypto
          .createHash("sha256")
          .update(crypto.randomUUID() + Date.now() + i)
          .digest("hex");

        await db.insert(espectadores).values({
          nombreCompleto: parsed.nombreCompleto,
          email: parsed.email ?? null,
          telefono: parsed.telefono ?? null,
          silla: parsed.silla ?? false,
          alumnaInvitada: parsed.alumnaInvitada ?? null,
          qrHash,
        });

        results.created++;
      } catch (err: any) {
        const msg = err instanceof z.ZodError
          ? err.errors[0].message
          : err?.message || "Error desconocido";
        results.errors.push({ row: rowNum, reason: msg });
      }
    }

    res.json(results);
  } catch (err) {
    console.error("Error in bulk import:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /api/espectadores/:id/qr
router.get("/:id/qr", authenticate, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const spectator = await db
      .select()
      .from(espectadores)
      .where(eq(espectadores.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!spectator) {
      res.status(404).json({ error: "Espectador no encontrado" });
      return;
    }

    const qrData = [
      spectator.qrHash,
      spectator.nombreCompleto,
      spectator.alumnaInvitada || "",
    ].join("|");

    const qrBuffer = await QRCode.toBuffer(qrData, {
      type: "png",
      width: 400,
      margin: 2,
    });

    res.set("Content-Type", "image/png");
    res.set("Content-Disposition", `attachment; filename="qr-${spectator.id}.png"`);
    res.send(qrBuffer);
  } catch (err) {
    console.error("Error generating QR:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST /api/espectadores/:id/email
router.post("/:id/email", authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const spectator = await db
      .select()
      .from(espectadores)
      .where(eq(espectadores.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!spectator) {
      res.status(404).json({ error: "Espectador no encontrado" });
      return;
    }

    if (!spectator.email) {
      res.status(400).json({ error: "El espectador no tiene email registrado" });
      return;
    }

    const qrBuffer = await QRCode.toBuffer(spectator.qrHash, {
      type: "png",
      width: 400,
      margin: 2,
    });

    const evCfg = await db.select().from(eventConfig).limit(1).then((r) => r[0]);

    await sendQrEmail(
      spectator.email,
      "Tu código QR para Acrobacia en Telas",
      qrBuffer,
      spectator.nombreCompleto,
      spectator.alumnaInvitada,
      spectator.silla,
      evCfg?.eventDate?.toISOString() || null,
      evCfg?.eventAddress || null
    );

    res.json({ sent: true });
  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).json({ error: "Error al enviar el email" });
  }
});

// POST /api/espectadores/:id/salida
router.post("/:id/salida", authenticate, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const spectator = await db
      .select()
      .from(espectadores)
      .where(eq(espectadores.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!spectator) {
      res.status(404).json({ error: "Espectador no encontrado" });
      return;
    }

    if (!spectator.ingresado) {
      res.json({ valido: false, motivo: "El espectador no está adentro" });
      return;
    }

    await db
      .update(espectadores)
      .set({ ingresado: false, ingresadoEn: null })
      .where(eq(espectadores.id, id));

    await db.insert(escaneos).values({
      espectadorId: id,
      scannerNombre: req.user?.email || "admin",
      resultado: "salida",
    });

    res.json({ valido: true });
  } catch (err) {
    console.error("Error marking exit:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

function isUniqueViolation(err: any): boolean {
  return err?.code === "23505" || err?.constraint?.includes?.("unique");
}

export default router;
