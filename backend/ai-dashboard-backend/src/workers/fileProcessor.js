import File, { FILE_STATUS } from "../models/File.js";
import { processCSVStream } from "../processors/csvProcessor.js";
import { processJSONStream } from "../processors/jsonProcessor.js";

export async function processFileJob(job) {
    const { fileId } = job.data;

    const file = await File.findById(fileId);
    if (!file) throw new Error("File not found");

    try {
        file.status = FILE_STATUS.PROCESSING;
        await file.save();

        let result;
        if (file.fileType === "csv") {
            result = await processCSVStream(file, job);
        } else if (file.fileType === "json") {
            result = await processJSONStream(file, job);
        } else {
            throw new Error("Unsupported file type");
        }

        file.status = FILE_STATUS.COMPLETED;
        file.overallProgress = 100;
        await file.save();

        return result;
    } catch (err) {
        file.status = FILE_STATUS.FAILED;
        await file.addError("processing", err.message, "PROCESSING_ERROR");
        throw err;
    }
}
