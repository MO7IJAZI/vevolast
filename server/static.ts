import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


export function serveStatic(app: Express) {
  // In production, we expect to be running from the project root
  // The client build is in dist/public
  // We try multiple paths to be robust across different deployment structures
  const possiblePaths = [
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve(process.cwd(), "public"),
    // Passenger often sets the root to the domain folder
    path.resolve("/home/u884871213/domains/vevoline.space/public_html/dist/public"),
  ];

  // Try to use __dirname if available (it is in CJS)
  try {
    if (typeof __dirname !== 'undefined') {
      possiblePaths.push(path.join(__dirname, "..", "dist", "public"));
      possiblePaths.push(path.join(__dirname, "public"));
    }
  } catch (e) {
    // Ignore if __dirname is not available
  }

  // Safely try import.meta.url only if not in a CJS context that would crash
  try {
    // @ts-ignore - this might not exist in some environments
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      possiblePaths.push(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist", "public"));
    }
  } catch (e) {
    // Ignore if import.meta.url is not available
  }

  let distPath = "";
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      distPath = p;
      break;
    }
  }

  if (!distPath) {
    console.error("Checked paths:", possiblePaths);
    throw new Error(
      `Could not find the build directory. Checked: ${possiblePaths.join(", ")}`,
    );
  }

  console.log(`[Static] Serving files from: ${distPath}`);
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
