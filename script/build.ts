import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";
import path from "path";

// Import db for executing raw SQL
import { db } from "../server/db";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times and prevents missing dependency errors on Hostinger
const allowlist = [
  "@google/generative-ai",
  "axios",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "express-mysql-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
  "dotenv",
  // "bcrypt", // Native module - must be external
  "mysql2",
];

async function runMigrations() {
  console.log("⏳ Running MySQL migrations...");
  try {
    const migrationPath = path.join(process.cwd(), "migrations", "0000_mysql_migration.sql");
    const sql = await readFile(migrationPath, "utf-8");
    
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      try {
        await db.execute(statement);
      } catch (error: any) {
        if (error.code === "ER_TABLE_EXISTS_ERROR") {
          console.log("  - Table already exists, skipping...");
        }
      }
    }
    
    console.log("✅ MySQL Migrations completed!");
  } catch (error) {
    console.error("⚠️ Migration error:", error);
    // Continue even if migrations fail (tables might already exist)
  }
}

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  // Run migrations before build
  console.log("Running database migrations...");
  await runMigrations();

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: "dist/index.js",
    banner: {
      js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
    },
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
