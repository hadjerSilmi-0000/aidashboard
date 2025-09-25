import DataPoint from "../models/DataPoint.js";
import { Types } from "mongoose";

// ---------------- Overview ----------------
export async function getFileOverview(fileId) {
    console.log(" [analyticsService] getFileOverview called with fileId:", fileId);

    const result = await DataPoint.getFileAnalytics(fileId);

    console.log("[analyticsService] aggregation result:", JSON.stringify(result, null, 2));
    return result;
}

// ---------------- Trends ----------------
export async function getTrends(fileId, range = "day") {
    console.log("[analyticsService] getTrends", { fileId, range });

    const id = typeof fileId === "string" ? new Types.ObjectId(fileId) : fileId;

    const groupId =
        range === "day"
            ? { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }
            : range === "month"
                ? { $dateToString: { format: "%Y-%m", date: "$timestamp" } }
                : { $dateToString: { format: "%Y-%U", date: "$timestamp" } };

    const result = await DataPoint.aggregate([
        { $match: { fileId: id, $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] } },
        { $group: { _id: groupId, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);

    console.log("📈 [analyticsService] trends result:", result);
    return result;
}

// ---------------- Errors ----------------
export async function getTopErrors(fileId, limit = 10) {
    console.log("[analyticsService] getTopErrors", fileId);

    const id = typeof fileId === "string" ? new Types.ObjectId(fileId) : fileId;

    const result = await DataPoint.aggregate([
        { $match: { fileId: id, $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }], "quality.isValid": false } },
        { $unwind: "$quality.validationErrors" },
        {
            $group: {
                _id: "$quality.validationErrors.field",
                errorCount: { $sum: 1 },
                samples: { $push: "$quality.validationErrors.error" },
            },
        },
        { $sort: { errorCount: -1 } },
        { $limit: limit },
    ]);

    console.log("[analyticsService] top errors:", result);
    return result;
}

// ---------------- Full Run ----------------
export async function runAnalytics(fileId) {
    console.log(" [analyticsService] runAnalytics", fileId);

    const [overview, trends, errors] = await Promise.all([
        getFileOverview(fileId),
        getTrends(fileId, "day"),
        getTopErrors(fileId),
    ]);

    return {
        fileId,
        overview,
        trends,
        errors,
        timestamp: new Date(),
    };
}