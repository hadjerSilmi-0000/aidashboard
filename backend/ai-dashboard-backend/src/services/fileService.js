import File, { FILE_STATUS } from "../models/File.js";
import { generateFileHash, deleteFile, getFileExtension } from "../utils/fileUtils.js";
import { verifyMimeType, scanForMalware } from "../utils/securityUtils.js";

//  Handle new file upload
export async function handleFileUpload(file, userId) {
    // Extract multer file properties
    const { originalname, filename, mimetype, size, path: filePath } = file;

    // 1. Generate SHA-256 hash for deduplication
    const sha256 = await generateFileHash(filePath);

    // 2. Check if this file (by hash) already exists for this user
    const existing = await File.findOne({ "hash.sha256": sha256, uploadedBy: userId });
    if (existing) {
        await deleteFile(filePath); // delete duplicate from disk
        throw new Error("Duplicate file already exists");
    }

    // 3. Verify MIME type using magic numbers
    const validMime = await verifyMimeType(filePath, mimetype);
    if (!validMime) {
        await deleteFile(filePath);
        throw new Error("File MIME type mismatch");
    }

    // 4. Run malware scan (basic simulated)
    const scanResults = await scanForMalware(filePath);
    if (!scanResults.isClean) {
        await deleteFile(filePath);
        throw new Error(`Malicious file detected: ${scanResults.threats.join(", ")}`);
    }

    // 5. Detect file type from extension
    const fileType = getFileExtension(originalname) || "unknown";

    // 6. Save file metadata into MongoDB
    return File.create({
        filename,
        originalName: originalname,
        fileType,
        mimeType: mimetype,
        size,
        path: filePath,
        hash: { sha256 },
        status: FILE_STATUS.UPLOADED,
        uploadedBy: userId,
        permissions: { owner: userId },
        security: { scanResults: { ...scanResults, scannedAt: new Date() } },
    });
}

//  Fetch user files with pagination and filters
export async function getUserFiles(userId, { page = 1, limit = 10, type, status }) {
    // Convert query params to numbers
    const skip = (page - 1)//
    limit;

    // Build query object
    const query = { uploadedBy: userId };
    if (type) query.fileType = type;
    if (status) query.status = status;

    // Fetch paginated files and total count
    const [files, total] = await Promise.all([
        File.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        File.countDocuments(query),
    ]);

    return { files, total, page, totalPages: Math.ceil(total / limit) };
}

//  Get file details with permission check
export async function getFileById(fileId, userId) {
    // 1. Fetch file from DB
    const file = await File.findById(fileId);
    if (!file) throw new Error("File not found");

    // 2. Check access permissions
    const isOwner = file.uploadedBy.equals(userId);
    const isPublic = file.permissions.isPublic;
    const isCollaborator = file.permissions.collaborators.some(c => c.user.equals(userId));

    if (!(isOwner || isPublic || isCollaborator)) {
        throw new Error("Access denied");
    }

    // 3. Log access into file security info
    await file.logAccess(userId, "view", "server");

    return file;
}

//  Delete a file by ID (owner only)
export async function deleteFileById(fileId, userId) {
    // 1. Fetch file
    const file = await File.findById(fileId);
    if (!file) throw new Error("File not found");

    // 2. Only owner can delete
    if (!file.uploadedBy.equals(userId)) {
        throw new Error("Only owner can delete file");
    }

    // 3. Remove from disk
    await deleteFile(file.path);

    // 4. Remove from DB
    await file.deleteOne();

    return true;
}
