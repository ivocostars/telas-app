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
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  rol: varchar("rol", { length: 20 }).notNull().$type<"admin" | "scanner">(),
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
