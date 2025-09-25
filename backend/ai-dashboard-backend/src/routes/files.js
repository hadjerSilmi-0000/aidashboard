import express from "express";
import upload from "../middleware/fileUpload.js";
import requireAuth from "../middleware/Auth/requireAuth.js";
import {
    uploadFile,
    listFiles,
    getFileDetails,
    deleteFileById,
} from "../controllers/fileController.js";

const router = express.Router();

// Upload file (admin + manager)
router.post(
    "/upload",
    requireAuth,
    (req, res, next) => {
        upload.single("file")(req, res, (err) => {
            if (err) {
                console.error("Multer error:", err.message);
                return res.status(400).json({
                    success: false,
                    error: `File upload error: ${err.message}`,
                });
            }
            next();
        });
    },
    uploadFile
);

// List files of logged-in user (admin + manager)
router.get("/", requireAuth, listFiles);

// Get file details (admin + manager)
router.get("/:id", requireAuth, getFileDetails);

// Delete file (admin + manager)
router.delete("/:id", requireAuth, deleteFileById);

export default router;
