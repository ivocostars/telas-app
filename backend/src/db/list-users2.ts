import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const users = await sql`SELECT id, email, rol FROM usuarios`;
if (users.length === 0) {
  console.log("No users found");
} else {
  for (const u of users) {
    console.log(`  ${u.id}: ${u.email} (${u.rol})`);
  }
}
await sql.end();
