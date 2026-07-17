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

// GET /api/apk/descargar - descarga protegida (redirige al archivo estático)
app.get("/api/apk/descargar", async (req, res) => {
  let authorized = false;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) { try { jwt.verify(authHeader.slice(7), JWT_SECRET); authorized = true; } catch {} }
  const token = req.query.token as string | undefined;
  if (token) { try { jwt.verify(token, JWT_SECRET); authorized = true; } catch {} }
  if (!authorized) { res.status(401).json({ error: "No autorizado" }); return; }
  res.redirect("/telas-app.apk");
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", tz: process.env.TZ });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

export default app;
