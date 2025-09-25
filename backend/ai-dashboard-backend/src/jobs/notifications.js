import Notification from "../models/Notification.js";
import cron from "node-cron";

// Run daily at midnight
cron.schedule("0 0 * * *", async () => {
    const retentionDays = 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await Notification.updateMany(
        { createdAt: { $lt: cutoff }, isArchived: false },
        { $set: { isArchived: true, isActive: false } }
    );

    console.log(`🧹 Archived ${result.modifiedCount} old notifications`);
});
