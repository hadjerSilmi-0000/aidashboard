import mongoose from "mongoose";

const aiJobSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
        dataset: { type: Object, required: true },
        type: {
            type: String,
            enum: ["analysis", "insights", "patterns", "question"],
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "running", "completed", "failed"],
            default: "pending",
        },
        result: { type: Object, default: null },
        error: { type: String, default: null },
    },
    { timestamps: true }
);

export default mongoose.model("AIJob", aiJobSchema);
