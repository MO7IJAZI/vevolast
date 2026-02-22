import fs from "fs";
import path from "path";
export class LocalFile {
    name;
    filePath;
    metaPath;
    constructor(filePath) {
        this.filePath = filePath;
        this.name = path.basename(filePath);
        this.metaPath = `${filePath}.meta.json`;
    }
    async exists() {
        try {
            await fs.promises.access(this.filePath);
            return [true];
        }
        catch {
            return [false];
        }
    }
    async getMetadata() {
        try {
            const stats = await fs.promises.stat(this.filePath);
            let metadata = {};
            try {
                const metaContent = await fs.promises.readFile(this.metaPath, "utf-8");
                metadata = JSON.parse(metaContent);
            }
            catch {
                // No metadata file, that's fine
            }
            return [{
                    contentType: metadata.contentType || "application/octet-stream",
                    size: stats.size,
                    metadata: metadata.metadata || {},
                    updated: stats.mtime.toISOString(),
                }];
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                throw new Error("File not found");
            }
            throw err;
        }
    }
    async setMetadata(options) {
        const currentMeta = await this.getMetadata().then(r => r[0]).catch(() => ({}));
        const newMeta = {
            ...currentMeta,
            metadata: {
                ...(currentMeta.metadata || {}),
                ...options.metadata,
            }
        };
        await fs.promises.writeFile(this.metaPath, JSON.stringify(newMeta, null, 2));
    }
    createReadStream() {
        return fs.createReadStream(this.filePath);
    }
}
