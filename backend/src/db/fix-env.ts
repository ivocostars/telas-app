import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve("..", ".env");
let content = readFileSync(envPath, "utf-8");

const newUrl = "postgresql://postgres:DeniTelas2026@db.auymohbawcsglzplvwtf.supabase.co:5432/postgres?sslmode=require";

content = content.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${newUrl}`);
writeFileSync(envPath, content);
console.log("Updated DATABASE_URL in .env");
console.log("URL:", newUrl);
