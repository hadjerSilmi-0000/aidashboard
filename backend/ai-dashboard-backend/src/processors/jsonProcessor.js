import fs from "fs";

import pkg from "stream-chain";
const { chain } = pkg;

import streamJson from "stream-json";
const { parser } = streamJson;

import streamArrayPkg from "stream-json/streamers/StreamArray.js";
const { streamArray } = streamArrayPkg;

import { insertDataPoints } from "../services/dataPointService.js";


export async function processJSONStream(file, job) {
    return new Promise((resolve, reject) => {
        const pipeline = chain([
            fs.createReadStream(file.path),
            parser(),
            streamArray(),
        ]);

        let batch = [];
        let processed = 0;
        const batchSize = 1000;

        pipeline.on("data", async ({ value }) => {
            batch.push(value);
            processed++;

            if (batch.length >= batchSize) {
                await insertDataPoints(file._id, batch);
                batch = [];
            }

            if (job) {
                const progress = Math.round((processed / file.size) * 100);
                job.updateProgress(progress);
            }
        });

        pipeline.on("end", async () => {
            if (batch.length > 0) {
                await insertDataPoints(file._id, batch);
            }
            resolve({ success: true, rows: processed });
        });

        pipeline.on("error", (err) => reject(err));
    });
}
