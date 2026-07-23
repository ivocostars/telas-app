import { Router, Request, Response } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { eventConfig } from "../db/schema.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

const updateSchema = z.object({
  eventDate: z.string().datetime().nullable().optional(),
  eventAddress: z.string().max(500).nullable().optional(),
});

async function getConfig() {
  const rows = await db.select().from(eventConfig).limit(1);
  return rows[0] || null;
}

router.get("/", authenticate, async (_req: Request, res: Response) => {
  try {
    const config = await getConfig();
    res.json(config || {});
  } catch (err) {
    console.error("Error reading event config:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.put("/", authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const body = updateSchema.parse(req.body);
    const existing = await getConfig();

    const values: Record<string, unknown> = {};
    if (body.eventDate !== undefined) values.eventDate = body.eventDate ? new Date(body.eventDate) : null;
    if (body.eventAddress !== undefined) values.eventAddress = body.eventAddress;
    values.updatedAt = new Date();

    if (existing) {
      await db.update(eventConfig).set(values).where(eq(eventConfig.id, existing.id));
    } else {
      await db.insert(eventConfig).values(values as any);
    }

    const updated = await getConfig();
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    console.error("Error updating event config:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
