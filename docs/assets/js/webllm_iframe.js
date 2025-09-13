import * as webllm from "./webllm.js";

document.addEventListener('DOMContentLoaded', () => {
    // Signal to the parent window that the iframe is fully loaded and ready.
    console.log('[iframe] DOMContentLoaded, sending webllm-iframe-ready');
    parent.postMessage({ type: 'webllm-iframe-ready' }, '*');
});

let webllmEngine;
let currentModelId;

function logToParent(message) {
    console.log(`[iframe] ${message}`);
    parent.postMessage({ type: 'debug-log', message: message }, '*');
}

async function initializeWebLLM(modelId) {
    logToParent(`initializeWebLLM called with modelId: ${modelId}`);
    // If an engine for the same model already exists, do nothing.
    if (webllmEngine && currentModelId === modelId) {
        logToParent('Engine for this model already exists.');
        parent.postMessage({ type: 'webllm-ready', model: currentModelId }, '*');
        return;
    }

    // If a different engine exists, unload it first.
    if (webllmEngine) {
        logToParent('Unloading previous engine.');
        await webllmEngine.unload();
        webllmEngine = null;
        currentModelId = null;
    }

    try {
        logToParent(`Creating new MLC Engine for: ${modelId}`);
        currentModelId = modelId;

        // Add a timeout for engine creation
        const enginePromise = webllm.CreateMLCEngine(modelId, {});
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Model initialization timed out after 60 seconds.')), 60000)
        );

        const engine = await Promise.race([enginePromise, timeoutPromise]);

        webllmEngine = engine;
        logToParent('Engine created successfully.');
        parent.postMessage({ type: 'webllm-ready', model: modelId }, '*');
    } catch (err) {
        logToParent(`WebLLM Initialization Error: ${err.message}`);
        parent.postMessage({ type: 'webllm-error', error: err.message }, '*');
        currentModelId = null; // Reset on error
    }
}

async function generateText(prompt) {
    logToParent('generateText called.');
    if (!webllmEngine) {
        logToParent('Error: WebLLM engine is not initialized.');
        throw new Error("WebLLM engine is not initialized.");
    }
    logToParent('Calling webllmEngine.chat.completions.create...');
    const reply = await webllmEngine.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        stream: false
    });
    logToParent('Received reply from webllmEngine.');
    return reply.choices[0].message.content;
}

window.addEventListener('message', async (event) => {
    if (!event.data || !event.data.type) return;

    const { type, id, prompt, modelId } = event.data;
    logToParent(`Received message of type: ${type}`);

    if (type === 'initialize-webllm') {
        if (modelId) {
            await initializeWebLLM(modelId);
        } else {
            parent.postMessage({ type: 'webllm-error', error: 'No model ID provided for initialization.' }, '*');
        }
    } else if (type === 'generate-text') {
        try {
            const result = await generateText(prompt);
            console.log('[iframe] Sending generation-result:', { result, id });
            parent.postMessage({ type: 'generation-result', result: result, id: id }, '*');
        } catch (err) {
            console.error('[iframe] Error in generate-text:', err);
            parent.postMessage({ type: 'generation-error', error: err.message, id: id }, '*');
        }
    }
});
