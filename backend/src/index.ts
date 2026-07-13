process.env.TZ = "America/Argentina/Buenos_Aires";

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { sql } from "./db/index.js";

import authRouter from "./routes/auth.js";
import espectadoresRouter from "./routes/espectadores.js";
import validarRouter from "./routes/validar.js";
import estadisticasRouter from "./routes/estadisticas.js";

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/espectadores", espectadoresRouter);
app.use("/api/validar", validarRouter);
app.use("/api/estadisticas", estadisticasRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", tz: process.env.TZ });
});

app.get("/api/db-check", async (_req, res) => {
  try {
    const url = process.env.DATABASE_URL || "not set";
    const r = await (sql as any)`SELECT 1 as connected`;
    res.json({ ok: true, connected: r[0]?.connected, url: url.replace(/:[^:@]+@/, ':****@') });
  } catch (e: any) {
    res.json({ ok: false, error: e.message?.slice(0, 200), code: e.code });
  }
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Timezone: ${process.env.TZ}`);
});

export default app;
