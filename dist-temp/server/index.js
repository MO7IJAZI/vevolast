import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function fileLog(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    const logs = [
        path.join(process.cwd(), "startup_debug.txt"),
    ];
    for (const logPath of logs) {
        try {
            fs.appendFileSync(logPath, logMessage);
        }
        catch (e) { /* ignore */ }
    }
    console.log(message);
}
fileLog("--- SERVER STARTUP SEQUENCE START ---");
import "dotenv/config";
import express from "express";
import session from "express-session";
// import connectPgSimple from "connect-pg-simple"; // Removed for MySQL
import MySQLSession from "express-mysql-session"; // Added for MySQL
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { registerAuthRoutes, seedAdminUser } from "./auth";
import { registerWorkTrackingRoutes } from "./workTracking";
import { registerClientPortalRoutes } from "./clientPortal";
import { initializeEmailTransporter } from "./email";
import { pool } from "./db";
const app = express();
const httpServer = createServer(app);
fileLog("Express and HTTP server initialized");
app.use(express.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
}));
app.use(express.urlencoded({ extended: false }));
app.set("trust proxy", 1);
// const PgSession = connectPgSimple(session); // Removed
const MySQLStore = MySQLSession(session);
const SESSION_MAX_AGE = parseInt(process.env.SESSION_MAX_AGE || String(8 * 60 * 60 * 1000));
const isProduction = process.env.NODE_ENV === "production";
fileLog(`Environment: ${isProduction ? "production" : "development"}`);
const sessionStore = new MySQLStore({
    expiration: SESSION_MAX_AGE,
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
}, pool);
app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "vevoline-dashboard-secret-key",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        secure: "auto",
        httpOnly: true,
        maxAge: SESSION_MAX_AGE,
        sameSite: "lax",
    },
}));
export function log(message, source = "express") {
    const formattedTime = new Date().toISOString();
    console.log(`${formattedTime} [${source}] ${message}`);
}
app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse = undefined;
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
            let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
            if (capturedJsonResponse) {
                logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
            }
            log(logLine);
        }
    });
    next();
});
(async () => {
    try {
        fileLog("Starting initialization sequence...");
        try {
            fileLog("Testing database connection...");
            // For MySQL2 Promise pool
            const connection = await pool.getConnection();
            fileLog("Database connection successful");
            connection.release();
        }
        catch (dbErr) {
            fileLog(`DATABASE CONNECTION FAILED: ${dbErr?.message || dbErr}`);
        }
        await initializeEmailTransporter();
        registerAuthRoutes(app);
        registerWorkTrackingRoutes(app);
        registerClientPortalRoutes(app);
        fileLog("Seeding admin user...");
        try {
            await seedAdminUser();
            fileLog("Admin user seeding checked");
        }
        catch (seedErr) {
            fileLog(`Seeding admin user failed: ${seedErr?.message || seedErr}`);
        }
        fileLog("Registering routes...");
        try {
            await registerRoutes(httpServer, app);
            fileLog("Routes registered");
        }
        catch (routeErr) {
            fileLog(`CRITICAL: Failed to register routes: ${routeErr?.message || routeErr}`);
        }
        app.use((err, _req, res, next) => {
            const status = err.status || err.statusCode || 500;
            const message = err.message || "Internal Server Error";
            console.error("Internal Server Error:", err);
            if (res.headersSent) {
                return next(err);
            }
            return res.status(status).json({ message });
        });
        if (isProduction) {
            fileLog("Setting up static file serving (Production Mode)");
            try {
                serveStatic(app);
                fileLog("Static files setup complete");
            }
            catch (staticErr) {
                fileLog(`Failed to setup static serving: ${staticErr?.message || staticErr}`);
            }
        }
        else {
            fileLog("Setting up Vite development server (Development Mode)");
            try {
                const { setupVite } = await import("./vite");
                await setupVite(httpServer, app);
                fileLog("Vite setup complete");
            }
            catch (viteErr) {
                fileLog(`Failed to setup Vite: ${viteErr?.message || viteErr}`);
                try {
                    serveStatic(app);
                    fileLog("Vite failed; serving static files as fallback");
                }
                catch { }
            }
        }
        const PORT = Number(process.env.PORT) || 5000;
        httpServer.listen(PORT, "0.0.0.0", () => {
            fileLog(`serving on port ${PORT}`);
        });
    }
    catch (err) {
        fileLog(`CRITICAL ERROR DURING STARTUP: ${err?.message || err}`);
        process.exit(1);
    }
})();
export default app;
