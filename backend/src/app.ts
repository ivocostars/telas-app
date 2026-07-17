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

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", tz: process.env.TZ });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

export default app;
