import fs from "fs";
import path from "path";
import csvParser from "csv-parser";
import { chain } from "stream-chain";
import { parser as jsonParser } from "stream-json";
import { streamArray } from "stream-json/streamers/StreamArray";
import { validateWithSchema, csvRowSchema, jsonItemSchema } from "../validators/schemaValidators.js";
import { buildDataPoint, insertDataPointsBatch } from "./dataPointService.js";
import File from "../models/File.js";
import { getIO } from "../socket/socketHandler.js";


// Helper: emit progress to socket room for file

function emitProgress(fileId, event, payload) {
    const io = getIO();
    if (!io) return;
    io.to(`user_${String(payload.userId || payload.uploadedBy || payload.user)}`).emit(event, { fileId, ...payload });
}

export async function processCSVFile(fileDoc, options = {}) {
    // Options
    const { batchSize = 500, userId = fileDoc.uploadedBy } = options;

    //  Prepare file stream
    const filePath = fileDoc.path;
    const stat = fs.statSync(filePath);
    const totalBytes = stat.size;
    let processedBytes = 0;
    let rowIndex = 0;
    let validCount = 0;
    let invalidCount = 0;

    // Update file processing stage to parsing
    await fileDoc.updateProcessingStage("parsing", { status: "in_progress", startedAt: new Date(), progress: 0 });

    //  Create read stream and parser
    const readStream = fs.createReadStream(filePath);
    const parser = csvParser({ skipLines: 0, mapHeaders: ({ header }) => header?.trim() });

    //  Batch buffer
    let buffer = [];

    return new Promise((resolve, reject) => {
        //  On data row
        readStream
            .pipe(parser)
            .on("data", async (row) => {
                //  increment index
                rowIndex++;

                //  validate row
                const { isValid, errors, value } = validateWithSchema(csvRowSchema, row);

                if (!isValid) {
                    //  record invalid row into file.validation.errors (not persisted here; caller should call file.addError or update)
                    invalidCount++;
                    // push a minimal record for auditing (could be saved to a separate collection)
                    buffer.push({ fileId: fileDoc._id, raw: row, normalized: { invalid: true, errors: errors.map(e => e.message) } });
                } else {
                    // build datapoint and push into buffer
                    validCount++;
                    const dp = buildDataPoint(fileDoc._id, value);
                    buffer.push(dp);
                }

                // Flush batch when it reaches batchSize
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

                //  update progress by bytes read approximate
                processedBytes += Buffer.byteLength(JSON.stringify(row));
                const progress = Math.min(100, Math.round((processedBytes / totalBytes) * 100));
                await fileDoc.updateProcessingStage("parsing", { progress });
                emitProgress(fileDoc._id, "file:processing", { progress, userId });
            })
            .on("end", async () => {
                // flush remaining buffer
                if (buffer.length) {
                    try {
                        await insertDataPointsBatch(buffer);
                    } catch (err) {
                        await fileDoc.addError("storage", "Final batch insert failed", "BATCH_INSERT_FINAL_ERROR", { message: err.message });
                    }
                }

                // finalize validation summary on file document
                fileDoc.validation = {
                    isValid: invalidCount === 0,
                    errors: [], // for simplicity, we stored invalid rows as datapoints; you can also persist detailed errors
                    summary: { totalRows: rowIndex, validRows: validCount, invalidRows: invalidCount },
                };
                await fileDoc.updateProcessingStage("parsing", { progress: 100, status: "completed", completedAt: new Date() });
                await fileDoc.save();

                //  emit final progress/completion
                emitProgress(fileDoc._id, "file:completed", { progress: 100, uploadedBy: fileDoc.uploadedBy, totalRows: rowIndex });
                resolve({ total: rowIndex, valid: validCount, invalid: invalidCount });
            })
            .on("error", async (err) => {
                //  handle parse errors gracefully
                await fileDoc.addError("parsing", err.message, "PARSING_ERROR");
                await fileDoc.updateProcessingStage("parsing", { status: "failed", error: { message: err.message } });
                emitProgress(fileDoc._id, "file:error", { error: err.message, uploadedBy: fileDoc.uploadedBy });
                reject(err);
            });
    });
}

export async function processJSONFile(fileDoc, options = {}) {
    // Options
    const { batchSize = 500, userId = fileDoc.uploadedBy } = options;

    //  Prepare file stream info
    const filePath = fileDoc.path;
    const stat = fs.statSync(filePath);
    const totalBytes = stat.size;
    let processedBytes = 0;
    let itemIndex = 0;
    let validCount = 0;
    let invalidCount = 0;

    // Update file processing stage to parsing
    await fileDoc.updateProcessingStage("parsing", { status: "in_progress", startedAt: new Date(), progress: 0 });

    //  Create stream-json chain to stream array items
    const pipeline = chain([fs.createReadStream(filePath), jsonParser(), streamArray()]);

    //  Batch buffer
    let buffer = [];

    return new Promise((resolve, reject) => {
        pipeline.on("data", async ({ key, value }) => {
            //  value is each array element or streamed object
            itemIndex++;

            //  validate item
            const { isValid, errors, value: validated } = validateWithSchema(jsonItemSchema, value);

            if (!isValid) {
                invalidCount++;
                buffer.push({ fileId: fileDoc._id, raw: value, normalized: { invalid: true, errors: errors.map(e => e.message) } });
            } else {
                validCount++;
                const dp = buildDataPoint(fileDoc._id, validated);
                buffer.push(dp);
            }

            //  Batch insert if needed
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

            //  Update approx progress based on bytes read
            processedBytes += Buffer.byteLength(JSON.stringify(value));
            const progress = Math.min(100, Math.round((processedBytes / totalBytes) * 100));
            await fileDoc.updateProcessingStage("parsing", { progress });
            emitProgress(fileDoc._id, "file:processing", { progress, userId });
        });

        pipeline.on("end", async () => {
            // flush last buffer
            if (buffer.length) {
                try {
                    await insertDataPointsBatch(buffer);
                } catch (err) {
                    await fileDoc.addError("storage", "Final batch insert failed", "BATCH_INSERT_FINAL_ERROR", { message: err.message });
                }
            }

            // finalize validation summary and stage
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
