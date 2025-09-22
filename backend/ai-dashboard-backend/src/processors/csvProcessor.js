import fs from "fs";
import csvParser from "csv-parser";
import { insertDataPoints } from "../services/dataPointService.js";

export async function processCSVStream(file, job) {
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(file.path);

        let batch = [];
        let processed = 0;
        const batchSize = 1000;

        stream
            .pipe(csvParser())
            .on("data", async (row) => {
                batch.push(row);
                processed++;

                if (batch.length >= batchSize) {
                    await insertDataPoints(file._id, batch);
                    batch = [];
                }

                if (job) {
                    const progress = Math.round((processed / file.size) * 100);
                    job.updateProgress(progress);
                }
            })
            .on("end", async () => {
                if (batch.length > 0) {
                    await insertDataPoints(file._id, batch);
                }
                resolve({ success: true, rows: processed });
            })
            .on("error", (err) => reject(err));
    });
}
