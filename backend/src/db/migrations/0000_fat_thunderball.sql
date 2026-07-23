CREATE TABLE IF NOT EXISTS "escaneos" (
	"id" serial PRIMARY KEY NOT NULL,
	"espectador_id" integer NOT NULL,
	"scanner_nombre" varchar(100) NOT NULL,
	"resultado" varchar(10) NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "espectadores" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre_completo" varchar(200) NOT NULL,
	"dni" varchar(15),
	"email" varchar(255),
	"telefono" varchar(30),
	"silla" boolean DEFAULT false NOT NULL,
	"alumna_invitada" varchar(200),
	"vendido_en_puerta" boolean DEFAULT false NOT NULL,
	"qr_hash" varchar(64) NOT NULL,
	"ingresado" boolean DEFAULT false NOT NULL,
	"ingresado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "espectadores_dni_unique" UNIQUE("dni"),
	CONSTRAINT "espectadores_qr_hash_unique" UNIQUE("qr_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recovery_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"code" varchar(64) NOT NULL,
	"expires_en" timestamp with time zone NOT NULL,
	"usado" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"device_type" varchar(20) DEFAULT 'web' NOT NULL,
	"device_name" varchar(100),
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255),
	"rol" varchar(20) NOT NULL,
	"pending_setup" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "escaneos" ADD CONSTRAINT "escaneos_espectador_id_espectadores_id_fk" FOREIGN KEY ("espectador_id") REFERENCES "public"."espectadores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
