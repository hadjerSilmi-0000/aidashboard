import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

// In-memory cache
const aiCache = new Map();

// Auto-clear cache every 10 minutes
setInterval(() => {
    aiCache.clear();
    console.log("[AI Service] Cache cleared");
}, 10 * 60 * 1000);

// Generic function with retry logic
async function requestWithRetry(fnName, fn, retries = 2) {
    let attempt = 0;
    while (attempt <= retries) {
        try {
            return await fn();
        } catch (err) {
            attempt++;
            if (attempt > retries) {
                console.error(`[AI Service] ${fnName} failed after retries:`, err.message);
                return { error: true, fn: fnName, message: err.message || "Error" };
            }
            console.warn(`[AI Service] ${fnName} retrying... (${attempt}/${retries})`);
        }
    }
}

// Helper: sanitize dataset
function sanitizeDataset(dataset) {
    if (!dataset || typeof dataset !== "object") return dataset;

    const copy = JSON.parse(JSON.stringify(dataset));
    for (const key of Object.keys(copy)) {
        if (Array.isArray(copy[key]) && copy[key].length > 1000) {
            copy[key] = copy[key].slice(0, 1000);
        }
    }
    return copy;
}

// ---- AI Service Functions ---- //

export async function runAnalysis(dataset) {
    const cacheKey = `analysis:${JSON.stringify(dataset)}`;
    if (aiCache.has(cacheKey)) return aiCache.get(cacheKey);

    const result = await requestWithRetry("runAnalysis", async () => {
        const response = await axios.post(`${AI_SERVICE_URL}/analysis/run`, {
            dataset: sanitizeDataset(dataset),
        }, { timeout: 60000000 });
        return response.data;
    });

    if (!result.error) aiCache.set(cacheKey, result);
    return result;
}

export async function generateInsights(analysisResult) {
    const cacheKey = `insights:${JSON.stringify(analysisResult)}`;
    if (aiCache.has(cacheKey)) return aiCache.get(cacheKey);

    const result = await requestWithRetry("generateInsights", async () => {
        const response = await axios.post(`${AI_SERVICE_URL}/insights/generate`, {
            analysis: sanitizeDataset(analysisResult),
        }, { timeout: 60000 });
        return response.data;
    });

    if (!result.error) aiCache.set(cacheKey, result);
    return result;
}

export async function detectPatterns(dataset) {
    const cacheKey = `patterns:${JSON.stringify(dataset)}`;
    if (aiCache.has(cacheKey)) return aiCache.get(cacheKey);

    const result = await requestWithRetry("detectPatterns", async () => {
        const response = await axios.post(`${AI_SERVICE_URL}/patterns/detect`, {
            dataset: sanitizeDataset(dataset),
        }, { timeout: 60000 });
        return response.data;
    });

    if (!result.error) aiCache.set(cacheKey, result);
    return result;
}

export async function askQuestion(question, context) {
    const cacheKey = `question:${question}:${JSON.stringify(context)}`;
    if (aiCache.has(cacheKey)) return aiCache.get(cacheKey);

    const result = await requestWithRetry("askQuestion", async () => {
        const response = await axios.post(`${AI_SERVICE_URL}/questions/ask`, {
            question,
            context: sanitizeDataset(context),
        }, { timeout: 60000 });
        return response.data;
    });

    if (!result.error) aiCache.set(cacheKey, result);
    return result;
}
