import DataPoint from "../models/DataPoint.js";
import socketService from "./socketService.js";

export function validateDataPoint(rawObject) {
    if (!rawObject) return { valid: false, errors: ["Empty object"] };

    const errors = [];

    if (!rawObject.timestamp && !rawObject.receivedAt) {
        errors.push("Missing timestamp or receivedAt");
    }

    if (rawObject.value && typeof rawObject.value !== "number") {
        errors.push("Value must be a number if provided");
    }

    return { valid: errors.length === 0, errors };
}


export function buildDataPoint(fileId, rawObject) {
    const normalized = {
        timestamp: rawObject.timestamp || rawObject.receivedAt || new Date(),
        key: rawObject.id ?? rawObject.payload?.id ?? null,
        metrics: rawObject.value ?? rawObject.metrics ?? null,
    };

    return { fileId, raw: rawObject, normalized };
}

// Insert a single DataPoint (with validation)

export async function insertDataPoint(fileId, rawObject, userId = null) {
    const { valid, errors } = validateDataPoint(rawObject);
    if (!valid) {
        return { inserted: 0, errors };
    }

    const doc = buildDataPoint(fileId, rawObject);
    const saved = await DataPoint.create(doc);

    //  Broadcast real-time new data event
    socketService.broadcast("data:new", {
        fileId,
        userId,
        count: 1,
        dataPointId: saved._id,
        timestamp: new Date(),
    });

    return { inserted: 1, errors: [] };
}


// Insert batch of DataPoints (performant way)
//Uses insertMany with ordered: false so one bad doc doesn't stop the batch

export async function insertDataPointsBatch(docs = [], { fileId, userId } = {}) {
    if (!docs.length) return { inserted: 0, errors: [] };

    try {
        const res = await DataPoint.insertMany(docs, { ordered: false });

        //  Broadcast after bulk insert
        socketService.broadcast("data:new", {
            fileId,
            userId,
            count: res.length,
            timestamp: new Date(),
        });

        return { inserted: res.length, errors: [] };
    } catch (err) {
        return {
            inserted: err.result?.nInserted || 0,
            errors: [err.message || String(err)],
        };
    }
}
// Alias for compatibility with processors

export async function insertDataPoints(docs = [], opts = {}) {
    return insertDataPointsBatch(docs, opts);
}

// Fetch DataPoints by fileId with pagination

export async function getDataPointsByFile(fileId, { page = 1, limit = 100 } = {}) {
    const skip = (page - 1) * limit;
    const docs = await DataPoint.find({ fileId })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await DataPoint.countDocuments({ fileId });

    return {
        data: docs,
        pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
        },
    };
}

// Setup indexes for performance (run once at startup)

export async function ensureIndexes() {
    await DataPoint.collection.createIndex({ fileId: 1, "normalized.timestamp": -1 });
    await DataPoint.collection.createIndex({ "normalized.key": 1 });
    await DataPoint.collection.createIndex({ createdAt: -1 });
}

//Delete all DataPoints for a file

export async function deleteDataPointsByFile(fileId) {
    const res = await DataPoint.deleteMany({ fileId });
    return { deleted: res.deletedCount };
}

// Count DataPoints for a file

export async function countDataPoints(fileId) {
    return DataPoint.countDocuments({ fileId });
}
