import * as analyticsService from "../services/analyticsService.js";

//  File Overview
export async function fileOverview(req, res, next) {
    try {
        const { fileId } = req.params;
        const data = await analyticsService.getFileOverview(fileId);
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
}

//  Trends (by day/week/month)
export async function fileTrends(req, res, next) {
    try {
        const { fileId } = req.params;
        const { range = "day" } = req.query;
        const data = await analyticsService.getTrends(fileId, range);
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
}

//  Errors
export async function fileErrors(req, res, next) {
    try {
        const { fileId } = req.params;
        const data = await analyticsService.getTopErrors(fileId);
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
}

// Trigger full analytics run (manual/admin call)
export async function runFileAnalytics(req, res, next) {
    try {
        const { fileId } = req.params;
        const data = await analyticsService.runAnalytics(fileId);
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
}
