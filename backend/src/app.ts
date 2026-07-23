import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRouter from "./routes/auth.js";
import espectadoresRouter from "./routes/espectadores.js";
import validarRouter from "./routes/validar.js";
import salidaRouter from "./routes/salida.js";
import estadisticasRouter from "./routes/estadisticas.js";
import eventConfigRouter from "./routes/event-config.js";

import path from "node:path";
import jwt from "jsonwebtoken";
import { JWT_SECRET, authenticate, requireAdmin } from "./middleware/auth.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.set("trust proxy", 1);

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes, intentá de nuevo en un minuto" },
});
app.use("/api/", limiter);

app.use("/api/auth", authRouter);
app.use("/api/espectadores", espectadoresRouter);
app.use("/api/validar", validarRouter);
app.use("/api/salida", salidaRouter);
app.use("/api/estadisticas", estadisticasRouter);
app.use("/api/event-config", eventConfigRouter);

function checkApkAuth(req: express.Request): boolean {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) { try { jwt.verify(authHeader.slice(7), JWT_SECRET); return true; } catch {} }
  const token = req.query.token as string | undefined;
  if (token) { try { jwt.verify(token, JWT_SECRET); return true; } catch {} }
  return false;
}

// GET /api/apk/descargar - página de descarga protegida
app.get("/api/apk/descargar", async (req, res) => {
  if (!checkApkAuth(req)) { res.status(401).json({ error: "No autorizado" }); return; }

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Descargar APK - Telas App</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0D0A1A; color: #F8F8FF; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
    .card { background: #1A1530; border-radius: 24px; padding: 40px; max-width: 400px; border: 1px solid #2D2A4A; }
    h1 { font-size: 24px; margin: 0 0 8px; color: #D4A847; }
    p { color: #9CA3AF; margin: 8px 0 24px; font-size: 15px; line-height: 1.5; }
    .btn { display: block; background: #6C3CB5; color: #fff; text-decoration: none; padding: 16px 32px; border-radius: 14px; font-size: 18px; font-weight: 700; margin: 12px 0; }
    .btn2 { display: block; background: transparent; color: #D4A847; text-decoration: none; padding: 14px 32px; border-radius: 14px; font-size: 15px; font-weight: 600; border: 1px solid #D4A847; margin: 12px 0; }
    .note { margin-top: 16px; font-size: 13px; color: #6B7280; }
  </style>
</head>
<body>
  <div class="card">
    <h1>📲 Telas App</h1>
    <p>Descargá la aplicación para escanear los códigos QR de las entradas.</p>
    <a class="btn" href="/api/apk/download?token=${req.query.token || ''}" download>📥 Descargar APK</a>
    <a class="btn2" href="/api/apk/download?token=${req.query.token || ''}" target="_blank">🌐 Abrir en navegador externo</a>
    <p class="note">Si la descarga no inicia, usá el botón "Abrir en navegador externo" o mantené presionado "Descargar APK" y elegí "Guardar enlace".</p>
  </div>
</body>
</html>`);
});

// GET /api/apk/download - descarga directa del APK
app.get("/api/apk/download", async (req, res) => {
  if (!checkApkAuth(req)) { res.status(401).json({ error: "No autorizado" }); return; }

  const apkPath = process.env.APK_FILE_PATH;
  if (!apkPath) { res.status(500).json({ error: "APK no disponible" }); return; }

  res.download(apkPath, "telas-app.apk", (err) => {
    if (err) {
      console.error("Download error:", err);
      if (!res.headersSent) res.status(500).json({ error: "Error al descargar" });
    }
  });
});

// POST /api/apk/token - genera un link de descarga con token (admin only)
app.post("/api/apk/token", authenticate, requireAdmin, async (req, res) => {
  const downloadToken = jwt.sign(
    { email: req.user!.email, purpose: "apk_download" },
    JWT_SECRET,
    { expiresIn: "30d" },
  );

  const apiUrl = process.env.API_URL || `https://${req.hostname}`;
  const link = `${apiUrl}/api/apk/download?token=${encodeURIComponent(downloadToken)}`;
  res.json({ link, expiresIn: "30d" });
});

// GET /api/apk/version - versión actual del APK
app.get("/api/apk/version", (req, res) => {
  res.json({
    version: "1.1.0",
    versionCode: 3,
    apkUrl: `${process.env.API_URL || `https://${req.hostname}`}/api/apk/download`,
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", tz: process.env.TZ });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

export default app;
