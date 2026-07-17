import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

// Add new column
await sql`ALTER TABLE espectadores ADD COLUMN IF NOT EXISTS nombre_completo varchar(200)`;

// Migrate data: combine nombre + apellido
await sql`UPDATE espectadores SET nombre_completo = TRIM(nombre || ' ' || apellido) WHERE nombre_completo IS NULL`;

// Make dni optional
await sql`ALTER TABLE espectadores ALTER COLUMN dni DROP NOT NULL`;

// Drop old columns
await sql`ALTER TABLE espectadores DROP COLUMN IF EXISTS nombre`;
await sql`ALTER TABLE espectadores DROP COLUMN IF EXISTS apellido`;

console.log("Migration complete");
await sql.end();
