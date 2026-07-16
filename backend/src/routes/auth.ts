import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { usuarios } from "../db/schema.js";
import { JWT_SECRET, authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, body.email))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      JWT_SECRET,
      { expiresIn: (process.env.JWT_EXPIRES_IN || "24h") as SignOptions["expiresIn"] },
    );

    res.json({ token, user: { id: user.id, email: user.email, rol: user.rol } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Login error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// PUT /api/auth/password - cambiar propia contraseña
router.put("/password", authenticate, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6, "Mínimo 6 caracteres"),
    });
    const body = schema.parse(req.body);

    const user = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, req.user!.id))
      .limit(1)
      .then((r) => r[0]);

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: "La contraseña actual no es correcta" });
      return;
    }

    const hash = await bcrypt.hash(body.newPassword, 10);
    await db.update(usuarios).set({ passwordHash: hash }).where(eq(usuarios.id, user.id));

    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Password change error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /api/auth/usuarios - listar usuarios (admin)
router.get("/usuarios", authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({ id: usuarios.id, email: usuarios.email, rol: usuarios.rol })
      .from(usuarios)
      .orderBy(desc(usuarios.creadoEn));

    res.json(rows);
  } catch (err) {
    console.error("Error listing users:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST /api/auth/usuarios - crear usuario (admin)
router.post("/usuarios", authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      email: z.string().email("Email inválido"),
      password: z.string().min(6, "Mínimo 6 caracteres"),
      rol: z.enum(["admin", "scanner"]),
    });
    const body = schema.parse(req.body);

    const hash = await bcrypt.hash(body.password, 10);
    const inserted = await db
      .insert(usuarios)
      .values({ email: body.email, passwordHash: hash, rol: body.rol })
      .returning({ id: usuarios.id, email: usuarios.email, rol: usuarios.rol });

    res.status(201).json(inserted[0]);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    if (err?.code === "23505") {
      res.status(409).json({ error: "Ya existe un usuario con ese email" });
      return;
    }
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// DELETE /api/auth/usuarios/:id - eliminar usuario (admin)
router.delete("/usuarios/:id", authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const deleted = await db.delete(usuarios).where(eq(usuarios.id, id)).returning({ id: usuarios.id });
    if (!deleted[0]) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST /api/auth/recover - recuperar contraseña con código maestro
router.post("/recover", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      recoveryCode: z.string().min(1, "Código requerido"),
      newPassword: z.string().min(6, "Mínimo 6 caracteres"),
      email: z.string().email("Email inválido"),
    });
    const body = schema.parse(req.body);

    const masterCode = process.env.RECOVERY_CODE;
    if (!masterCode) {
      res.status(500).json({ error: "Código de recuperación no configurado en el servidor" });
      return;
    }

    if (body.recoveryCode !== masterCode) {
      res.status(401).json({ error: "Código de recuperación inválido" });
      return;
    }

    const user = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, body.email))
      .limit(1)
      .then((r) => r[0]);

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const hash = await bcrypt.hash(body.newPassword, 10);
    await db.update(usuarios).set({ passwordHash: hash }).where(eq(usuarios.id, user.id));

    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Recovery error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
