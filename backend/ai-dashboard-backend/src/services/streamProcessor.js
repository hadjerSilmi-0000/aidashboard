import fs from "fs";
import path from "path";
import csvParser from "csv-parser"; // npm i csv-parser
import { chain } from "stream-chain";
import { parser as jsonParser } from "stream-json"; // npm i stream-json
import { streamArray } from "stream-json/streamers/StreamArray";
import { validateWithSchema, csvRowSchema, jsonItemSchema } from "../validators/schemaValidators.js";
import { buildDataPoint, insertDataPointsBatch } from "./dataPointService.js";
import File from "../models/File.js";
import { getIO } from "../socket/socketHandler.js";

/**
 * Helper: emit progress to socket room for file
 */
function emitProgress(fileId, event, payload) {
    const io = getIO();
    if (!io) return;
    io.to(`user_${String(payload.userId || payload.uploadedBy || payload.user)}`).emit(event, { fileId, ...payload });
}

/**
 * CSV Stream Processor
 * - parse line-by-line
 * - validate rows with Joi schema
 * - batch insert DataPoints
 * - track progress by bytes read
 */
export async function processCSVFile(fileDoc, options = {}) {
    // 1. Options
    const { batchSize = 500, userId = fileDoc.uploadedBy } = options;

    // 2. Prepare file stream
    const filePath = fileDoc.path;
    const stat = fs.statSync(filePath);
    const totalBytes = stat.size;
    let processedBytes = 0;
    let rowIndex = 0;
    let validCount = 0;
    let invalidCount = 0;

    // 3. Update file processing stage to parsing
    await fileDoc.updateProcessingStage("parsing", { status: "in_progress", startedAt: new Date(), progress: 0 });

    // 4. Create read stream and parser
    const readStream = fs.createReadStream(filePath);
    const parser = csvParser({ skipLines: 0, mapHeaders: ({ header }) => header?.trim() });

    // 5. Batch buffer
    let buffer = [];

    return new Promise((resolve, reject) => {
        // 6. On data row
        readStream
            .pipe(parser)
            .on("data", async (row) => {
                // 6.1 increment index
                rowIndex++;

                // 6.2 validate row
                const { isValid, errors, value } = validateWithSchema(csvRowSchema, row);

                if (!isValid) {
                    // 6.3 record invalid row into file.validation.errors (not persisted here; caller should call file.addError or update)
                    invalidCount++;
                    // push a minimal record for auditing (could be saved to a separate collection)
                    buffer.push({ fileId: fileDoc._id, raw: row, normalized: { invalid: true, errors: errors.map(e => e.message) } });
                } else {
                    // 6.4 build datapoint and push into buffer
                    validCount++;
                    const dp = buildDataPoint(fileDoc._id, value);
                    buffer.push(dp);
                }

                // 6.5 Flush batch when it reaches batchSize
                if (buffer.length >= batchSize) {
                    // pause stream while inserting
                    readStream.pause();
                    try {
                        const { inserted, errors } = await insertDataPointsBatch(buffer);
                        buffer = [];
                        // resume stream after insert
                        readStream.resume();
                    } catch (err) {
                        // if insertion fails, emit error and continue (we continue to be resilient)
                        await fileDoc.addError("storage", "Batch insert failed", "BATCH_INSERT_ERROR", { message: err.message });
                        readStream.resume();
                    }
                }

                // 6.6 update progress by bytes read approximate
                processedBytes += Buffer.byteLength(JSON.stringify(row)); // approximate; not exact
                const progress = Math.min(100, Math.round((processedBytes / totalBytes) * 100));
                await fileDoc.updateProcessingStage("parsing", { progress });
                emitProgress(fileDoc._id, "file:processing", { progress, userId });
            })
            .on("end", async () => {
                // 7. flush remaining buffer
                if (buffer.length) {
                    try {
                        await insertDataPointsBatch(buffer);
                    } catch (err) {
                        await fileDoc.addError("storage", "Final batch insert failed", "BATCH_INSERT_FINAL_ERROR", { message: err.message });
                    }
                }

                // 8. finalize validation summary on file document
                fileDoc.validation = {
                    isValid: invalidCount === 0,
                    errors: [], // for simplicity, we stored invalid rows as datapoints; you can also persist detailed errors
                    summary: { totalRows: rowIndex, validRows: validCount, invalidRows: invalidCount },
                };
                await fileDoc.updateProcessingStage("parsing", { progress: 100, status: "completed", completedAt: new Date() });
                await fileDoc.save();

                // 9. emit final progress/completion
                emitProgress(fileDoc._id, "file:completed", { progress: 100, uploadedBy: fileDoc.uploadedBy, totalRows: rowIndex });
                resolve({ total: rowIndex, valid: validCount, invalid: invalidCount });
            })
            .on("error", async (err) => {
                // 10. handle parse errors gracefully
                await fileDoc.addError("parsing", err.message, "PARSING_ERROR");
                await fileDoc.updateProcessingStage("parsing", { status: "failed", error: { message: err.message } });
                emitProgress(fileDoc._id, "file:error", { error: err.message, uploadedBy: fileDoc.uploadedBy });
                reject(err);
            });
    });
}

/**
 * JSON Stream Processor
 * - handles large JSON arrays efficiently using stream-json
 * - extracts nested structures and validates each item
 */
export async function processJSONFile(fileDoc, options = {}) {
    // 1. Options
    const { batchSize = 500, userId = fileDoc.uploadedBy } = options;

    // 2. Prepare file stream info
    const filePath = fileDoc.path;
    const stat = fs.statSync(filePath);
    const totalBytes = stat.size;
    let processedBytes = 0;
    let itemIndex = 0;
    let validCount = 0;
    let invalidCount = 0;

    // 3. Update file processing stage to parsing
    await fileDoc.updateProcessingStage("parsing", { status: "in_progress", startedAt: new Date(), progress: 0 });

    // 4. Create stream-json chain to stream array items
    const pipeline = chain([fs.createReadStream(filePath), jsonParser(), streamArray()]);

    // 5. Batch buffer
    let buffer = [];

    return new Promise((resolve, reject) => {
        pipeline.on("data", async ({ key, value }) => {
            // 5.1 value is each array element or streamed object
            itemIndex++;

            // 5.2 validate item
            const { isValid, errors, value: validated } = validateWithSchema(jsonItemSchema, value);

            if (!isValid) {
                invalidCount++;
                buffer.push({ fileId: fileDoc._id, raw: value, normalized: { invalid: true, errors: errors.map(e => e.message) } });
            } else {
                validCount++;
                const dp = buildDataPoint(fileDoc._id, validated);
                buffer.push(dp);
            }

            // 5.3 Batch insert if needed
            if (buffer.length >= batchSize) {
                pipeline.pause();
                try {
                    await insertDataPointsBatch(buffer);
                    buffer = [];
                } catch (err) {
                    await fileDoc.addError("storage", "Batch insert failed", "BATCH_INSERT_ERROR", { message: err.message });
                } finally {
                    pipeline.resume();
                }
            }

            // 5.4 Update approx progress based on bytes read
            processedBytes += Buffer.byteLength(JSON.stringify(value));
            const progress = Math.min(100, Math.round((processedBytes / totalBytes) * 100));
            await fileDoc.updateProcessingStage("parsing", { progress });
            emitProgress(fileDoc._id, "file:processing", { progress, userId });
        });

        pipeline.on("end", async () => {
            // 6. flush last buffer
            if (buffer.length) {
                try {
                    await insertDataPointsBatch(buffer);
                } catch (err) {
                    await fileDoc.addError("storage", "Final batch insert failed", "BATCH_INSERT_FINAL_ERROR", { message: err.message });
                }
            }

            // 7. finalize validation summary and stage
            fileDoc.validation = {
                isValid: invalidCount === 0,
                errors: [],
                summary: { totalRows: itemIndex, validRows: validCount, invalidRows: invalidCount },
            };
            await fileDoc.updateProcessingStage("parsing", { progress: 100, status: "completed", completedAt: new Date() });
            await fileDoc.save();

            emitProgress(fileDoc._id, "file:completed", { progress: 100, uploadedBy: fileDoc.uploadedBy, totalRows: itemIndex });
            resolve({ total: itemIndex, valid: validCount, invalid: invalidCount });
        });

        pipeline.on("error", async (err) => {
            await fileDoc.addError("parsing", err.message, "PARSING_ERROR");
            await fileDoc.updateProcessingStage("parsing", { status: "failed", error: { message: err.message } });
            emitProgress(fileDoc._id, "file:error", { error: err.message, uploadedBy: fileDoc.uploadedBy });
            reject(err);
        });
    });
}
