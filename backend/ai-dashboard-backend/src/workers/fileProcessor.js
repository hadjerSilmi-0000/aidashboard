import File, { FILE_STATUS } from "../models/File.js";
import { processCSVStream } from "../processors/csvProcessor.js";
import { processJSONStream } from "../processors/jsonProcessor.js";

// Main job processor for handling file processing
export async function processFileJob(job) {
    // Extract fileId from the job payload
    const { fileId } = job.data;

    // Find the file record in the database
    const file = await File.findById(fileId);
    if (!file) throw new Error("File not found");

    try {
        // Update file status to 'PROCESSING'
        file.status = FILE_STATUS.PROCESSING;
        await file.save();

        let result;

        // Route processing based on file type
        if (file.fileType === "csv") {
            result = await processCSVStream(file, job);
        } else if (file.fileType === "json") {
            result = await processJSONStream(file, job);
        } else {
            throw new Error("Unsupported file type");
        }

        // Mark the file as completed after successful processing
        file.status = FILE_STATUS.COMPLETED;
        file.overallProgress = 100;
        await file.save();

        return result;
    } catch (err) {
        // Mark the file as failed and log the error
        file.status = FILE_STATUS.FAILED;
        await file.addError("processing", err.message, "PROCESSING_ERROR");
        throw err;
    }
}
