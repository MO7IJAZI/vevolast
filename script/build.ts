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

async function ensureTables() {
  console.log("⏳ Ensuring all required database tables exist...");

  const tables: { name: string; sql: string }[] = [
    {
      name: "sessions",
      sql: `CREATE TABLE IF NOT EXISTS \`sessions\` (
        \`session_id\` varchar(128) COLLATE utf8mb4_bin NOT NULL,
        \`expires\` int(11) unsigned NOT NULL,
        \`data\` mediumtext COLLATE utf8mb4_bin,
        PRIMARY KEY (\`session_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,
    },
    {
      name: "roles",
      sql: `CREATE TABLE IF NOT EXISTS \`roles\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(50) NOT NULL,
        \`name_ar\` varchar(50) NOT NULL,
        \`description\` text,
        \`permissions\` json NOT NULL DEFAULT ('[]'),
        \`is_system\` tinyint(1) NOT NULL DEFAULT 0,
        \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`roles_name_unique\` (\`name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: "users",
      sql: `CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` varchar(36) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`password\` varchar(255) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`role_id\` varchar(36) DEFAULT NULL,
        \`permissions\` json DEFAULT ('[]'),
        \`avatar\` text,
        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
        \`name_en\` varchar(255) DEFAULT NULL,
        \`department\` varchar(100) DEFAULT NULL,
        \`employee_id\` varchar(100) DEFAULT NULL,
        \`last_login\` timestamp NULL DEFAULT NULL,
        \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`users_email_unique\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: "invitations",
      sql: `CREATE TABLE IF NOT EXISTS \`invitations\` (
        \`id\` varchar(36) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`role_id\` varchar(36) NOT NULL,
        \`permissions\` json DEFAULT ('[]'),
        \`token\` varchar(255) NOT NULL,
        \`expires_at\` timestamp NOT NULL,
        \`status\` varchar(50) NOT NULL DEFAULT 'pending',
        \`name\` varchar(255) DEFAULT NULL,
        \`name_en\` varchar(255) DEFAULT NULL,
        \`department\` varchar(100) DEFAULT NULL,
        \`employee_id\` varchar(100) DEFAULT NULL,
        \`profile_image\` text DEFAULT NULL,
        \`used_at\` datetime DEFAULT NULL,
        \`invited_by\` varchar(36) DEFAULT NULL,
        \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`invitations_token_unique\` (\`token\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: "password_resets",
      sql: `CREATE TABLE IF NOT EXISTS \`password_resets\` (
        \`id\` varchar(36) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`token\` varchar(255) NOT NULL,
        \`expires_at\` datetime NOT NULL,
        \`used_at\` datetime DEFAULT NULL,
        \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`password_resets_token_unique\` (\`token\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: "employees",
      sql: `CREATE TABLE IF NOT EXISTS \`employees\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`name_en\` varchar(255) DEFAULT NULL,
        \`email\` varchar(255) NOT NULL,
        \`phone\` varchar(50) DEFAULT NULL,
        \`role_id\` varchar(36) NOT NULL,
        \`role_ar\` varchar(50) DEFAULT NULL,
        \`department\` varchar(100) DEFAULT NULL,
        \`job_title\` varchar(100) DEFAULT NULL,
        \`profile_image\` text,
        \`salary_type\` varchar(50) NOT NULL DEFAULT 'monthly',
        \`salary_amount\` int DEFAULT NULL,
        \`rate\` int DEFAULT NULL,
        \`rate_type\` varchar(50) DEFAULT NULL,
        \`salary_currency\` varchar(10) NOT NULL DEFAULT 'USD',
        \`salary_notes\` text,
        \`start_date\` varchar(20) NOT NULL,
        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
        \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`employees_email_unique\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: "notifications",
      sql: `CREATE TABLE IF NOT EXISTS \`notifications\` (
        \`id\` varchar(36) NOT NULL,
        \`user_id\` varchar(36) NOT NULL,
        \`type\` varchar(50) NOT NULL,
        \`title_ar\` varchar(255) NOT NULL,
        \`title_en\` varchar(255) DEFAULT NULL,
        \`message_ar\` text NOT NULL,
        \`message_en\` text,
        \`read\` tinyint(1) NOT NULL DEFAULT 0,
        \`related_id\` varchar(36) DEFAULT NULL,
        \`related_type\` varchar(50) DEFAULT NULL,
        \`snoozed_until\` timestamp NULL DEFAULT NULL,
        \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: "system_settings",
      sql: `CREATE TABLE IF NOT EXISTS \`system_settings\` (
        \`id\` varchar(36) NOT NULL DEFAULT 'current',
        \`settings\` json NOT NULL,
        \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
  ];

  // Also handle ALTER TABLE for columns added after initial creation
  const alterations: { table: string; column: string; sql: string }[] = [
    {
      table: "invitations",
      column: "profile_image",
      sql: `ALTER TABLE \`invitations\` ADD COLUMN \`profile_image\` text DEFAULT NULL`,
    },
  ];

  for (const table of tables) {
    try {
      await db.execute(table.sql);
      console.log(`  ✔ Table \`${table.name}\` ready`);
    } catch (error: any) {
      console.error(`  ✘ Failed to create table \`${table.name}\`:`, error.message);
    }
  }

  for (const alt of alterations) {
    try {
      await db.execute(alt.sql);
      console.log(`  ✔ Column \`${alt.column}\` added to \`${alt.table}\``);
    } catch (error: any) {
      if (error.code === "ER_DUP_FIELDNAME") {
        // Column already exists — that's fine
      } else {
        console.error(`  ✘ Failed to alter \`${alt.table}\`:`, error.message);
      }
    }
  }

  console.log("✅ Database schema ensured!");
}

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  if (process.platform === "win32" && existsSync(gesbuildPath)) {
    process.env.ESBUILD_BINARY_PATH = gesbuildPath;
  }

  // Ensure all database tables exist before build
  console.log("Ensuring database schema...");
  await ensureTables();

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
