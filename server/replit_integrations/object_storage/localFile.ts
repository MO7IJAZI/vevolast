
import fs from "fs";
import path from "path";
import { Readable } from "stream";

export class LocalFile {
  public name: string;
  private filePath: string;
  private metaPath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.name = path.basename(filePath);
    this.metaPath = `${filePath}.meta.json`;
  }

  async exists(): Promise<[boolean]> {
    try {
      await fs.promises.access(this.filePath);
      return [true];
    } catch {
      return [false];
    }
  }

  async getMetadata(): Promise<[any]> {
    try {
      const stats = await fs.promises.stat(this.filePath);
      let metadata = {};
      try {
        const metaContent = await fs.promises.readFile(this.metaPath, "utf-8");
        metadata = JSON.parse(metaContent);
      } catch {
        // No metadata file, that's fine
      }

      return [{
        contentType: (metadata as any).contentType || "application/octet-stream",
        size: stats.size,
        metadata: (metadata as any).metadata || {},
        updated: stats.mtime.toISOString(),
      }];
    } catch (err) {
      if ((err as any).code === 'ENOENT') {
        throw new Error("File not found");
      }
      throw err;
    }
  }

  async setMetadata(options: { metadata: any }): Promise<void> {
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

  createReadStream(): Readable {
    return fs.createReadStream(this.filePath);
  }
}
