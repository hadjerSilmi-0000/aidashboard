import { fileTypeFromFile } from "file-type";
import fs from "fs";
import path from "path";


// Verify actual MIME type using file-type (magic numbers).
// Prevents attacks where user renames .exe → .csv.
export async function verifyMimeType(filePath, expectedMime) {
    try {
        const detected = await fileTypeFromFile(filePath);
        if (!detected) return false;
        return detected.mime === expectedMime;
    } catch (err) {
        return false;
    }
}

// Simulated malware scan hook.
// (In production, integrate ClamAV or an AV API)
export async function scanForMalware(filePath) {
    // For now, just simulate with simple rules
    const ext = path.extname(filePath).toLowerCase();
    const dangerous = [".exe", ".bat", ".sh"];
    if (dangerous.includes(ext)) {
        return { isClean: false, threats: [`Dangerous extension: ${ext}`] };
    }
    return { isClean: true, threats: [] };
}

// Cleanup orphaned files (exist in disk but not in DB)
export function cleanupOrphanFiles(uploadDir, validPaths) {
    const removed = [];
    const files = fs.readdirSync(uploadDir);
    for (const f of files) {
        const fullPath = path.join(uploadDir, f);
        if (!validPaths.includes(fullPath)) {
            fs.unlinkSync(fullPath);
            removed.push(fullPath);
        }
    }
    return removed;
}
