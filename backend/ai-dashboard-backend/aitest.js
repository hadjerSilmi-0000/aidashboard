import { runAnalysis, generateInsights } from "./src/services/aiService.js";

async function testAI() {
    const dataset = { age: [25, 30, 35], salary: [4000, 5000, 6000] };

    const analysis = await runAnalysis(dataset);
    console.log("Analysis:", analysis);

    const insights = await generateInsights(analysis);
    console.log("Insights:", insights);
}

testAI();
