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

import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./middleware/auth.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

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

// GET /api/apk/descargar - página de descarga protegida
app.get("/api/apk/descargar", async (req, res) => {
  let authorized = false;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) { try { jwt.verify(authHeader.slice(7), JWT_SECRET); authorized = true; } catch {} }
  const token = req.query.token as string | undefined;
  if (token) { try { jwt.verify(token, JWT_SECRET); authorized = true; } catch {} }
  if (!authorized) { res.status(401).json({ error: "No autorizado" }); return; }

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
    .btn { display: inline-block; background: #6C3CB5; color: #fff; text-decoration: none; padding: 16px 32px; border-radius: 14px; font-size: 18px; font-weight: 700; }
    .btn:hover { background: #5a2d9e; }
    .note { margin-top: 16px; font-size: 13px; color: #6B7280; }
  </style>
</head>
<body>
  <div class="card">
    <h1>📲 Telas App</h1>
    <p>Descargá la aplicación para escanear los códigos QR de las entradas.</p>
    <a class="btn" href="/telas-app.apk" download>📥 Descargar APK</a>
    <p class="note">Si la descarga no inicia, mantené presionado el botón y elegí "Guardar enlace".</p>
  </div>
</body>
</html>`);
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", tz: process.env.TZ });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

export default app;
