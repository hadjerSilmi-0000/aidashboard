import File from "../models/File.js";
import { cleanupOrphanFiles } from "../utils/securityUtils.js";
import path from "path";

export async function cleanupJob() {
    const files = await File.find().select("path");
    const validPaths = files.map(f => f.path);

    const uploadDir = path.join(process.cwd(), "uploads");
    const removed = cleanupOrphanFiles(uploadDir, validPaths);

    console.log(`[CLEANUP] Removed ${removed.length} orphaned files`);
}
