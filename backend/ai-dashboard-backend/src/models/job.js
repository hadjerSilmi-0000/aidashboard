import mongoose from "mongoose";

const { Schema } = mongoose;

const JobSchema = new Schema(
    {
        jobId: { type: Number, required: true, unique: true }, // from in-memory queue
        fileId: { type: Schema.Types.ObjectId, ref: "File", required: false },
        status: {
            type: String,
            enum: ["waiting", "active", "completed", "failed"],
            default: "waiting",
        },
        progress: { type: Number, default: 0 },
        error: {
            message: String,
            code: String,
            details: Schema.Types.Mixed,
        },
    },
    { timestamps: true, collection: "jobs" }
);

const Job = mongoose.model("Job", JobSchema);
export default Job;
