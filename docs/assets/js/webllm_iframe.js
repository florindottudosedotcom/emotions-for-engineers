import * as webllm from "./webllm.js";

let webllmEngine;
let currentModelId;

async function initializeWebLLM(modelId) {
    // If an engine for the same model already exists, do nothing.
    if (webllmEngine && currentModelId === modelId) {
        parent.postMessage({ type: 'webllm-ready', model: currentModelId }, '*');
        return;
    }

    // If a different engine exists, unload it first.
    if (webllmEngine) {
        await webllmEngine.unload();
        webllmEngine = null;
        currentModelId = null;
    }

    try {
        currentModelId = modelId;
        const engine = await webllm.CreateMLCEngine(modelId, {});
        webllmEngine = engine;
        parent.postMessage({ type: 'webllm-ready', model: modelId }, '*');
    } catch (err) {
        console.error("WebLLM Initialization Error in iframe:", err);
        parent.postMessage({ type: 'webllm-error', error: err.message }, '*');
        currentModelId = null; // Reset on error
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
    if (!event.data || !event.data.type) return;

    const { type, id, prompt, modelId } = event.data;

    if (type === 'initialize-webllm') {
        if (modelId) {
            await initializeWebLLM(modelId);
        } else {
            parent.postMessage({ type: 'webllm-error', error: 'No model ID provided for initialization.' }, '*');
        }
    } else if (type === 'generate-text') {
        try {
            const result = await generateText(prompt);
            parent.postMessage({ type: 'generation-result', result: result, id: id }, '*');
        } catch (err) {
            parent.postMessage({ type: 'generation-error', error: err.message, id: id }, '*');
        }
    }
});
