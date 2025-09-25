import crypto from "crypto";
import fs from "fs";
import path from "path";

// Generate SHA-256 hash for file contents
export async function generateFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const stream = fs.createReadStream(filePath);

        stream.on("data", chunk => hash.update(chunk));
        stream.on("end", () => resolve(hash.digest("hex")));
        stream.on("error", reject);
    });
}

// Delete a file from storage safely
export function deleteFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.unlink(filePath, err => {
            if (err && err.code !== "ENOENT") return reject(err);
            resolve(true);
        });
    });
}

// Get file extension safely
export function getFileExtension(filename) {
    return path.extname(filename).replace(".", "").toLowerCase();
}
