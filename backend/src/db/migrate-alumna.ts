import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

await sql`ALTER TABLE espectadores ALTER COLUMN alumna_invitada DROP NOT NULL`;
await sql`UPDATE espectadores SET alumna_invitada = NULL WHERE alumna_invitada = 'false' OR alumna_invitada = false`;
await sql`ALTER TABLE espectadores ALTER COLUMN alumna_invitada TYPE varchar(200) USING 
  CASE WHEN alumna_invitada::text = 'true' THEN 'Alumna invitada' ELSE NULL END`;

console.log("Column migrated successfully");
await sql.end();
