import type { Express } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import fs from "fs";
import path from "path";

/**
 * Register object storage routes for file uploads.
 *
 * This provides example routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading
 * 2. The client then uploads directly to the presigned URL
 *
 * IMPORTANT: These are example routes. Customize based on your use case:
 * - Add authentication middleware for protected uploads
 * - Add file metadata storage (save to database after upload)
 * - Add ACL policies for access control
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload.
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "https://storage.googleapis.com/...",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   *
   * IMPORTANT: The client should NOT send the file to this endpoint.
   * Send JSON metadata only, then upload the file directly to uploadURL.
   */
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Extract object path from the presigned URL for later reference
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Serve uploaded objects.
   *
   * GET /objects/uploads/:objectId
   *
   * This serves files from object storage. For public files, no auth needed.
   * For protected files, add authentication middleware and ACL checks.
   */
  app.get("/objects/uploads/:objectId", async (req, res) => {
    try {
      const objectPath = `/objects/uploads/${req.params.objectId}`;
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });

  // Local upload handler
   app.put("/api/local-upload/:uuid", async (req, res) => {
     try {
       const { uuid } = req.params;
       const uploadsDir = path.resolve("uploads");
       const targetDir = path.join(uploadsDir, "uploads");
       
       // Ensure directory exists
       if (!fs.existsSync(targetDir)) {
         await fs.promises.mkdir(targetDir, { recursive: true });
       }
       
       const filePath = path.join(targetDir, uuid);
       const writeStream = fs.createWriteStream(filePath);
      
      req.pipe(writeStream);
      
      writeStream.on("finish", async () => {
        // Save metadata
        const metaPath = `${filePath}.meta.json`;
        const metadata = {
          contentType: req.headers["content-type"],
          metadata: {
             originalName: req.headers["x-original-name"] || "unknown",
          }
        };
        await fs.promises.writeFile(metaPath, JSON.stringify(metadata, null, 2));
        
        res.status(200).json({ success: true });
      });
      
      writeStream.on("error", (err) => {
        console.error("Error writing file:", err);
        res.status(500).json({ error: "Failed to upload file" });
      });
      
    } catch (error) {
      console.error("Error handling local upload:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

