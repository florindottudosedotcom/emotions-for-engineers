// WebLLM Provider (In-browser AI)
import * as webllm from "../webllm.js";

export const WebLLMProvider = {
    name: 'WebLLM',
    engine: null,
    currentModelId: null,
    models: [
        {
            id: "Llama-3-8B-Instruct-q4f16_1-MLC",
            name: "Llama 3 8B Instruct",
            sizeGB: 4.8,
            estimatedLoadTime: "2-5 minutes"
        },
        {
            id: "Phi-3-mini-4k-instruct-q4f16_1-MLC",
            name: "Phi 3 Mini",
            sizeGB: 2.3,
            estimatedLoadTime: "1-3 minutes"
        }
    ],

    getTemplate() {
        return `
            <fieldset>
                <legend>AI Provider</legend>
                <p>WebLLM (In-Browser)</p>
                <div class="input-group" id="ai-model-selection-group">
                    <label for="ai-model-select" class="label-no-shrink-no-margin">Model:</label>
                    <select id="ai-model-select" class="select-no-margin"></select>
                </div>
                <div id="ollama-status" class="ollama-status-style"></div>
            </fieldset>
        `;
    },

    init(dom, appState) {
        // Set provider type
        appState.AI_PROVIDER = 'webllm';
        appState.isWebllmReady = false;
        appState.currentWebllmModel = '';

        // Get provider-specific DOM elements
        dom.aiModelSelect = document.getElementById('ai-model-select');
        dom.ollamaStatus = document.getElementById('ollama-status');

        // Load models
        this.loadModels(dom);

        // Event listeners
        dom.aiModelSelect.addEventListener('change', async () => {
            await this.initializeModel(dom.aiModelSelect.value, appState, dom);
            if (window.stateModule && window.stateModule.saveState) {
                window.stateModule.saveState();
            }
        });

        // Auto-initialize first model
        if (dom.aiModelSelect.options.length > 0) {
            this.initializeModel(dom.aiModelSelect.value, appState, dom);
        }
    },

    loadModels(dom) {
        if (!dom.aiModelSelect) return;

        const selectedModelBeforeUpdate = dom.aiModelSelect.value;
        dom.aiModelSelect.innerHTML = '';

        this.models.forEach(model => {
            dom.aiModelSelect.add(new Option(model.name, model.id));
        });

        if (this.models.some(m => m.id === selectedModelBeforeUpdate)) {
            dom.aiModelSelect.value = selectedModelBeforeUpdate;
        } else {
            dom.aiModelSelect.selectedIndex = 0;
        }
    },

    async initializeModel(modelId, appState, dom) {
        if (!modelId) return;

        // If same model already loaded, do nothing
        if (this.engine && this.currentModelId === modelId) {
            appState.isWebllmReady = true;
            const modelName = this.models.find(m => m.id === modelId)?.name || modelId;
            if (dom.ollamaStatus) {
                dom.ollamaStatus.textContent = `✅ WebLLM is ready. Loaded: ${modelName}`;
                dom.ollamaStatus.className = 'ollama-status-style ollama-status-ok';
            }
            return;
        }

        // Unload existing model if different
        if (this.engine && this.currentModelId !== modelId) {
            await this.engine.unload();
            this.engine = null;
            this.currentModelId = null;
        }

        // Variables accessible in both try and catch blocks
        const startTime = Date.now();
        const modelInfo = this.models.find(m => m.id === modelId);
        const selectedModelName = modelInfo?.name || modelId;
        let progressInterval;

        try {
            appState.isWebllmReady = false;
            const sizeInfo = modelInfo?.sizeGB ? `(~${modelInfo.sizeGB}GB)` : '';
            const timeEstimate = modelInfo?.estimatedLoadTime || '2-5 minutes';

            if (dom.ollamaStatus) {
                dom.ollamaStatus.textContent = `🔄 Loading ${selectedModelName} ${sizeInfo}...\nEstimated time: ${timeEstimate}\nFirst-time downloads may take longer depending on your internet speed.`;
                dom.ollamaStatus.className = 'ollama-status-style ollama-status-info';
            }

            // Start a timer to update progress every 10 seconds
            progressInterval = setInterval(() => {
                if (appState.isWebllmReady) {
                    clearInterval(progressInterval);
                    return;
                }
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

                if (dom.ollamaStatus) {
                    dom.ollamaStatus.textContent = `🔄 Loading ${selectedModelName} ${sizeInfo}...\nElapsed: ${timeStr} | Estimated: ${timeEstimate}\nDownloading and initializing model...`;
                }
            }, 10000);

            this.currentModelId = modelId;
            this.engine = await webllm.CreateMLCEngine(modelId, {
                initProgressCallback: (progress) => {
                    if (dom.ollamaStatus && progress.text) {
                        const elapsed = Math.floor((Date.now() - startTime) / 1000);
                        const minutes = Math.floor(elapsed / 60);
                        const seconds = elapsed % 60;
                        const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                        dom.ollamaStatus.textContent = `🔄 ${progress.text}\nElapsed: ${timeStr} | Estimated: ${timeEstimate}`;
                    }
                }
            });

            clearInterval(progressInterval);
            appState.isWebllmReady = true;
            appState.currentWebllmModel = modelId;

            const totalTime = Math.floor((Date.now() - startTime) / 1000);
            const finalMinutes = Math.floor(totalTime / 60);
            const finalSeconds = totalTime % 60;
            const finalTimeStr = finalMinutes > 0 ? `${finalMinutes}m ${finalSeconds}s` : `${finalSeconds}s`;

            if (dom.ollamaStatus) {
                dom.ollamaStatus.textContent = `✅ ${selectedModelName} ready! (loaded in ${finalTimeStr})`;
                dom.ollamaStatus.className = 'ollama-status-style ollama-status-ok';
            }
        } catch (err) {
            // Clear the progress interval on error
            if (progressInterval) {
                clearInterval(progressInterval);
            }

            console.error("WebLLM Initialization Error:", err);
            appState.isWebllmReady = false;
            this.currentModelId = null;

            const modelInfo = this.models.find(m => m.id === modelId);
            const selectedModelName = modelInfo?.name || modelId;

            if (dom.ollamaStatus) {
                dom.ollamaStatus.textContent = `❌ Error loading ${selectedModelName}: ${err.message}`;
                dom.ollamaStatus.className = 'ollama-status-style ollama-status-error';
            }
            throw err;
        }
    },

    async generateText(prompt) {
        if (!this.engine) {
            throw new Error("WebLLM engine is not initialized.");
        }

        const reply = await this.engine.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            stream: false
        });

        return reply.choices[0].message.content;
    },

    saveStateExtensions(state) {
        return {
            ...state,
            webllmModel: document.getElementById('ai-model-select')?.value || this.models[0]?.id
        };
    },

    loadStateExtensions(state) {
        if (state.webllmModel && document.getElementById('ai-model-select')) {
            document.getElementById('ai-model-select').value = state.webllmModel;
        }
    }
};