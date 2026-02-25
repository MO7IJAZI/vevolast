import "dotenv/config";
import { existsSync } from "fs";
import { rm, readFile } from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";

import type { BuildOptions } from "esbuild";

import { db } from "../server/db";

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
  "mysql2",
];

const wasmPath = path.join(process.cwd(), "node_modules", "esbuild-wasm", "esbuild.wasm");
const gesbuildPath = path.join(
  process.cwd(),
  "node_modules",
  "@esbuild",
  "win32-x64",
  "gesbuild.exe"
);

async function runMigrations() {
  console.log("⏳ Running MySQL migrations...");
  try {
    const migrationPath = path.join(process.cwd(), "migrations", "0000_mysql_migration.sql");
    const sql = await readFile(migrationPath, "utf-8");
    
    const statements = sql
      .replace(/--.*$/gm, "") // Remove comments
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log("Statements count:", statements.length);

    for (const statement of statements) {
      try {
        await db.execute(statement);
      } catch (error: any) {
        if (error.code === "ER_TABLE_EXISTS_ERROR") {
          console.log("  - Table already exists, skipping...");
        } else {
          console.error("  - Migration error:", error);
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

  if (process.platform === "win32" && existsSync(gesbuildPath)) {
    process.env.ESBUILD_BINARY_PATH = gesbuildPath;
  }

  // Run migrations before build
  console.log("Running database migrations...");
  await runMigrations();

  console.log("building client...");
  const { build: viteBuild } = await import("vite");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  const serverBuildOptions: BuildOptions = {
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
  };

  try {
    const { build: esbuild } = await import("esbuild");
    await esbuild(serverBuildOptions);
  } catch (error) {
    if (process.platform !== "win32" || !existsSync(wasmPath)) {
      throw error;
    }
    const { initialize, build: wasmBuild } = await import("esbuild-wasm");
    const wasmUrl = pathToFileURL(wasmPath).toString();
    await initialize({ wasmURL: wasmUrl });
    await wasmBuild(serverBuildOptions);
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
