import path from "path";
import File, { FILE_TYPES } from "../models/File.js";
import fs from "fs";


// Upload file
export async function uploadFile(req, res) {
    try {

        if (!req.file) {
            return res.status(400).json({ success: false, error: "No file uploaded" });
        }

        const fileType = detectFileType(req.file.mimetype);

        const file = await File.create({
            filename: req.file.filename,
            originalName: req.file.originalname,
            fileType,
            mimeType: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
            uploadedBy: req.user?._id,
        });

        res.status(201).json({ success: true, file });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
}

// List files
export async function listFiles(req, res) {
    try {
        const files = await File.findByUser(req.user._id);
        res.json({ success: true, files });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// Get file details
export async function getFileDetails(req, res) {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ success: false, error: "File not found" });
        }
        res.json({ success: true, file });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// Delete file
export async function deleteFileById(req, res) {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ success: false, error: "File not found" });
        }

        // delete file from disk
        fs.unlink(file.path, (err) => {
            if (err) console.error("Error deleting file:", err.message);
        });

        await file.deleteOne();

        res.json({ success: true, message: "File deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}
// Helper: normalize fileType based on MIME
function detectFileType(mimeType) {
    if (mimeType === "application/pdf") return FILE_TYPES.PDF;
    if (mimeType.startsWith("image/")) return FILE_TYPES.IMAGE;
    if (mimeType === "text/csv" || mimeType === "application/vnd.ms-excel")
        return FILE_TYPES.CSV;
    if (mimeType === "application/json") return FILE_TYPES.JSON;
    if (
        mimeType.includes("spreadsheet") ||
        mimeType.includes("excel")
    )
        return FILE_TYPES.EXCEL;
    if (mimeType.startsWith("text/")) return FILE_TYPES.TEXT;

    return FILE_TYPES.TEXT;
}