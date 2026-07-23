import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  rol: varchar("rol", { length: 20 }).notNull().$type<"admin" | "scanner">(),
  pendingSetup: boolean("pending_setup").notNull().default(false),
  creadoEn: timestamp("creado_en", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  deviceType: varchar("device_type", { length: 20 }).notNull().default("web"),
  deviceName: varchar("device_name", { length: 100 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const recoveryCodes = pgTable("recovery_codes", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  code: varchar("code", { length: 64 }).notNull(),
  expiresEn: timestamp("expires_en", { withTimezone: true }).notNull(),
  usado: boolean("usado").notNull().default(false),
  creadoEn: timestamp("creado_en", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const espectadores = pgTable("espectadores", {
  id: serial("id").primaryKey(),
  nombreCompleto: varchar("nombre_completo", { length: 200 }).notNull(),
  dni: varchar("dni", { length: 15 }).unique(),
  email: varchar("email", { length: 255 }),
  telefono: varchar("telefono", { length: 30 }),
  silla: boolean("silla").notNull().default(false),
  alumnaInvitada: varchar("alumna_invitada", { length: 200 }),
  vendidoEnPuerta: boolean("vendido_en_puerta").notNull().default(false),
  qrHash: varchar("qr_hash", { length: 64 }).notNull().unique(),
  ingresado: boolean("ingresado").notNull().default(false),
  ingresadoEn: timestamp("ingresado_en", { withTimezone: true }),
  creadoEn: timestamp("creado_en", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const eventConfig = pgTable("event_config", {
  id: serial("id").primaryKey(),
  eventDate: timestamp("event_date", { withTimezone: true }),
  eventAddress: varchar("event_address", { length: 500 }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const escaneos = pgTable("escaneos", {
  id: serial("id").primaryKey(),
  espectadorId: integer("espectador_id")
    .notNull()
    .references(() => espectadores.id),
  scannerNombre: varchar("scanner_nombre", { length: 100 }).notNull(),
  resultado: varchar("resultado", { length: 10 })
    .notNull()
    .$type<"ok" | "rechazado" | "salida">(),
  creadoEn: timestamp("creado_en", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
