const fs = require('fs');
const path = require('path');

// Ultra-Robust Logger for Hostinger
const logFile = path.join(__dirname, 'startup_debug.txt');
function log(msg) {
    const logMsg = `${new Date().toISOString()} - [PASSENGER_BRIDGE] ${msg}\n`;
    try {
        fs.appendFileSync(logFile, logMsg);
    } catch (e) {}
    console.log(msg);
}

log(">>> PASSENGER ENTRY POINT INITIATED <<<");
log(`Current Dir: ${__dirname}`);
log(`Node Version: ${process.version}`);

try {
    log("Attempting to load built application from ./dist/index.js...");
    const appPath = path.join(__dirname, 'dist', 'index.js');
    
    if (!fs.existsSync(appPath)) {
        log(`CRITICAL: Build file NOT FOUND at ${appPath}`);
        throw new Error(`Missing build file: ${appPath}`);
    }

    const app = require(appPath);
    log("✅ Application loaded successfully from dist");

    // Export for Phusion Passenger
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = app;
        log("✅ Module exports assigned to Express app");
    } else {
        log("⚠️ WARNING: module.exports is not available");
    }
} catch (error) {
    log(`❌ CRITICAL LOADING ERROR: ${error.message}`);
    log(`Stack Trace: ${error.stack}`);
    
    // Fallback simple app to at least show something or keep passenger alive
    const express = require('express');
    const fallbackApp = express();
    fallbackApp.get('*', (req, res) => {
        res.status(500).send(`<h1>Server Startup Error</h1><p>Please check startup_debug.txt for details.</p><pre>${error.message}</pre>`);
    });
    module.exports = fallbackApp;
}
