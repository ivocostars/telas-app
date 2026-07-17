import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

await sql`ALTER TABLE espectadores DROP COLUMN IF EXISTS dni`;

console.log("DNI column dropped");
await sql.end();
