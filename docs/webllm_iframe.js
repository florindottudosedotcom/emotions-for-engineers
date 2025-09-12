import * as webllm from "./assets/vendor/webllm/webllm.js";

let webllmEngine;
const WEBLLM_MODEL_ID = "Phi-3-mini-4k-instruct-q4f16_1-MLC";

async function initializeWebLLM() {
    try {
        const engine = await webllm.CreateMLCEngine(WEBLLM_MODEL_ID, {});
        webllmEngine = engine;
        parent.postMessage({ type: 'webllm-ready' }, '*');
    } catch (err) {
        console.error("WebLLM Initialization Error in iframe:", err);
        parent.postMessage({ type: 'webllm-error', error: err.message }, '*');
    }
}

async function generateText(prompt) {
    if (!webllmEngine) {
        throw new Error("WebLLM engine is not initialized.");
    }
    const reply = await webllmEngine.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        stream: false
    });
    return reply.choices[0].message.content;
}

window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'generate-text') {
        try {
            const prompt = event.data.prompt;
            const result = await generateText(prompt);
            parent.postMessage({ type: 'generation-result', result: result, id: event.data.id }, '*');
        } catch (err) {
            parent.postMessage({ type: 'generation-error', error: err.message, id: event.data.id }, '*');
        }
    }
});

initializeWebLLM();
