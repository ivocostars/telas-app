import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import crypto from "node:crypto";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { usuarios, recoveryCodes } from "../db/schema.js";
import { JWT_SECRET, authenticate, requireAdmin } from "../middleware/auth.js";
import { sendSetupCodeEmail, sendRecoveryCodeEmail } from "../services/email.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await db.select().from(usuarios).where(eq(usuarios.email, body.email)).limit(1).then((rows) => rows[0]);
    if (!user) { res.status(401).json({ error: "Credenciales inválidas" }); return; }

    // Si está en pendingSetup, verificar contra código de recuperación
    if (user.pendingSetup || !user.passwordHash) {
      const codeRecord = await db
        .select()
        .from(recoveryCodes)
        .where(and(eq(recoveryCodes.email, body.email), eq(recoveryCodes.code, body.password), eq(recoveryCodes.usado, false)))
        .limit(1)
        .then((r) => r[0]);
      if (codeRecord) {
        // Código válido - loguear pero forzar cambio de contraseña
        const token = jwt.sign({ id: user.id, email: user.email, rol: user.rol, temp: true }, JWT_SECRET, { expiresIn: "1h" });
        res.json({ token, user: { id: user.id, email: user.email, rol: user.rol }, mustChangePassword: true });
        return;
      }
      res.status(401).json({ error: "Código inválido o ya usado. Revisá tu email o usá 'Olvidaste tu contraseña'." });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash!);
    if (!valid) { res.status(401).json({ error: "Credenciales inválidas" }); return; }
    const token = jwt.sign({ id: user.id, email: user.email, rol: user.rol }, JWT_SECRET, { expiresIn: (process.env.JWT_EXPIRES_IN || "24h") as SignOptions["expiresIn"] });
    res.json({ token, user: { id: user.id, email: user.email, rol: user.rol } });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    console.error("Login error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// PUT /api/auth/password
router.put("/password", authenticate, async (req: Request, res: Response) => {
  try {
    const schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8, "Mínimo 8 caracteres").regex(/[!@#$%^&*(),.?":{}|<>]/, "Debe contener al menos un carácter especial") });
    const body = schema.parse(req.body);
    const user = await db.select().from(usuarios).where(eq(usuarios.id, req.user!.id)).limit(1).then((r) => r[0]);
    if (!user) { res.status(404).json({ error: "Usuario no encontrado" }); return; }
    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash!);
    if (!valid) { res.status(400).json({ error: "La contraseña actual no es correcta" }); return; }
    const hash = await bcrypt.hash(body.newPassword, 10);
    await db.update(usuarios).set({ passwordHash: hash, pendingSetup: false }).where(eq(usuarios.id, user.id));
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    console.error("Password change error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /api/auth/usuarios
router.get("/usuarios", authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const rows = await db.select({ id: usuarios.id, email: usuarios.email, rol: usuarios.rol, pendingSetup: usuarios.pendingSetup }).from(usuarios).orderBy(desc(usuarios.creadoEn));
    res.json(rows);
  } catch (err) {
    console.error("Error listing users:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST /api/auth/usuarios - crear usuario SIN password, envía código por email
router.post("/usuarios", authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      email: z.string().email("Email inválido"),
      rol: z.enum(["admin", "scanner"]),
    });
    const body = schema.parse(req.body);
    const inserted = await db.insert(usuarios).values({ email: body.email, rol: body.rol, pendingSetup: true }).returning({ id: usuarios.id, email: usuarios.email, rol: usuarios.rol });

    const code = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
    await db.delete(recoveryCodes).where(and(eq(recoveryCodes.email, body.email), eq(recoveryCodes.usado, false)));
    await db.insert(recoveryCodes).values({ email: body.email, code, expiresEn: expires });

    await sendSetupCodeEmail(body.email, code);
    res.status(201).json({ ...inserted[0], emailSent: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    if (err?.code === "23505") { res.status(409).json({ error: "Ya existe un usuario con ese email" }); return; }
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// DELETE /api/auth/usuarios/:id
router.delete("/usuarios/:id", authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    const deleted = await db.delete(usuarios).where(eq(usuarios.id, id)).returning({ id: usuarios.id });
    if (!deleted[0]) { res.status(404).json({ error: "Usuario no encontrado" }); return; }
    res.json({ deleted: true });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST /api/auth/setup-password - primer ingreso con código
router.post("/setup-password", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      email: z.string().email("Email inválido"),
      code: z.string().min(1, "Código requerido"),
      newPassword: z.string().min(8, "Mínimo 8 caracteres").regex(/[!@#$%^&*(),.?":{}|<>]/, "Debe contener al menos un carácter especial"),
    });
    const body = schema.parse(req.body);

    const record = await db
      .select()
      .from(recoveryCodes)
      .where(and(eq(recoveryCodes.email, body.email), eq(recoveryCodes.code, body.code), eq(recoveryCodes.usado, false)))
      .limit(1)
      .then((r) => r[0]);

    if (!record) { res.status(401).json({ error: "Código inválido o expirado" }); return; }
    if (new Date() > record.expiresEn) { res.status(401).json({ error: "Código expirado" }); return; }

    const hash = await bcrypt.hash(body.newPassword, 10);
    await db.update(usuarios).set({ passwordHash: hash, pendingSetup: false }).where(eq(usuarios.email, body.email));
    await db.update(recoveryCodes).set({ usado: true }).where(eq(recoveryCodes.id, record.id));

    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    console.error("Setup password error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const schema = z.object({ email: z.string().email("Email inválido") });
    const body = schema.parse(req.body);
    const user = await db.select().from(usuarios).where(eq(usuarios.email, body.email)).limit(1).then((r) => r[0]);
    if (!user) { res.status(404).json({ error: "No existe una cuenta con ese email" }); return; }
    const code = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await db.delete(recoveryCodes).where(and(eq(recoveryCodes.email, body.email), eq(recoveryCodes.usado, false)));
    await db.insert(recoveryCodes).values({ email: body.email, code, expiresEn: expires });
    await sendRecoveryCodeEmail(body.email, code);
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      email: z.string().email("Email inválido"),
      code: z.string().min(1, "Código requerido"),
      newPassword: z.string().min(8, "Mínimo 8 caracteres").regex(/[!@#$%^&*(),.?":{}|<>]/, "Debe contener al menos un carácter especial"),
    });
    const body = schema.parse(req.body);
    const record = await db.select().from(recoveryCodes).where(and(eq(recoveryCodes.email, body.email), eq(recoveryCodes.code, body.code), eq(recoveryCodes.usado, false))).limit(1).then((r) => r[0]);
    if (!record) { res.status(401).json({ error: "Código inválido o expirado" }); return; }
    if (new Date() > record.expiresEn) { res.status(401).json({ error: "Código expirado" }); return; }
    const hash = await bcrypt.hash(body.newPassword, 10);
    await db.update(usuarios).set({ passwordHash: hash, pendingSetup: false }).where(eq(usuarios.email, body.email));
    await db.update(recoveryCodes).set({ usado: true }).where(eq(recoveryCodes.id, record.id));
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
