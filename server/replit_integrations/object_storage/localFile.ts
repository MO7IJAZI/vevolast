
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { safeJsonParse } from "../../utils/safeJson";

type StoredFileMetadata = {
  contentType: string;
  size: number;
  metadata: Record<string, unknown>;
  updated: string;
};

type StoredFileMetadataPayload = {
  contentType?: string;
  metadata?: Record<string, unknown>;
};

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

  async getMetadata(): Promise<[StoredFileMetadata]> {
    try {
      const stats = await fs.promises.stat(this.filePath);
      let metadata: StoredFileMetadataPayload = {};
      try {
        const metaContent = await fs.promises.readFile(this.metaPath, "utf-8");
        metadata = safeJsonParse<StoredFileMetadataPayload>(metaContent, {});
      } catch {
        // No metadata file, that's fine
      }

      return [{
        contentType: metadata.contentType || "application/octet-stream",
        size: stats.size,
        metadata: metadata.metadata || {},
        updated: stats.mtime.toISOString(),
      }];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error("File not found");
      }
      throw err;
    }
  }

  async setMetadata(options: { metadata: Record<string, unknown> }): Promise<void> {
    const currentMeta = await this.getMetadata().then(r => r[0]).catch<StoredFileMetadata>(() => ({
      contentType: "application/octet-stream",
      size: 0,
      metadata: {},
      updated: new Date(0).toISOString(),
    }));
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
