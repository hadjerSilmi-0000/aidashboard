import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

// Allowed types 
const allowedMimeTypes = {
    csv: ["text/csv", "application/vnd.ms-excel"],
    json: ["application/json"],
    excel: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
    ],
    text: ["text/plain"],
    pdf: ["application/pdf"],
    image: ["image/png", "image/jpeg"],
};

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage strategy
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = crypto.randomBytes(16).toString("hex");
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${unique}${ext}`);
    },
});

// File filter
function fileFilter(req, file, cb) {
    console.log("📂 Uploaded file mimetype:", file.mimetype);

    const validTypes = Object.values(allowedMimeTypes).flat();

    // Accept normal types
    if (validTypes.includes(file.mimetype)) {
        return cb(null, true);
    }

    // Accept fallback type
    if (file.mimetype === "application/octet-stream") {
        // Guess based on extension
        const ext = path.extname(file.originalname).toLowerCase();
        console.log(` Fallback mimetype detected, guessing from extension: ${ext}`);

        const extMap = {
            ".pdf": "application/pdf",
            ".csv": "text/csv",
            ".json": "application/json",
            ".txt": "text/plain",
            ".xls": "application/vnd.ms-excel",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        };

        if (extMap[ext]) {
            file.mimetype = extMap[ext];
            console.log(`Mimetype corrected to: ${file.mimetype}`);
            return cb(null, true);
        }
    }

    // Reject otherwise
    return cb(new Error(`Invalid file type: ${file.mimetype}`), false);
}

// Multer instance
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

export default upload;
