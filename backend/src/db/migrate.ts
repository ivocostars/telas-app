import "dotenv/config";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../..");

async function runMigrations() {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn("npx", ["drizzle-kit", "push"], {
      cwd: projectRoot,
      stdio: "inherit",
      env: { ...process.env },
      shell: true,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`drizzle-kit push exited with code ${code}`));
      }
    });

    child.on("error", reject);
  });
}

runMigrations()
  .then(() => {
    console.log("Migration complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
