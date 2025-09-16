// WebLLM Provider (In-browser AI)
import * as webllm from "../webllm.js";

export const WebLLMProvider = {
    name: 'WebLLM',
    engine: null,
    currentModelId: null,
    isLoading: false,
    loadingModelId: null,
    currentProgressInterval: null,
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
            const selectedModel = dom.aiModelSelect.value;
            console.log('Model selection changed to:', selectedModel);
            await this.initializeModel(selectedModel, appState, dom);
            if (window.stateModule && window.stateModule.saveState) {
                window.stateModule.saveState();
            }
        });

        // Auto-initialize first model only if no model is currently selected
        if (dom.aiModelSelect.options.length > 0 && !this.currentModelId) {
            // Small delay to ensure UI is ready
            setTimeout(() => {
                this.initializeModel(dom.aiModelSelect.value, appState, dom);
            }, 100);
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

        console.log(`Initializing model: ${modelId}, currently loading: ${this.isLoading}, current model: ${this.currentModelId}`);

        // If same model already loaded, do nothing
        if (this.engine && this.currentModelId === modelId && !this.isLoading) {
            appState.isWebllmReady = true;
            const modelName = this.models.find(m => m.id === modelId)?.name || modelId;
            if (dom.ollamaStatus) {
                dom.ollamaStatus.textContent = `✅ ${modelName} ready!`;
                dom.ollamaStatus.className = 'ollama-status-style ollama-status-ok';
            }
            return;
        }

        // If already loading the same model, ignore duplicate request
        if (this.isLoading && this.loadingModelId === modelId) {
            console.log('Already loading this model, ignoring duplicate request');
            return;
        }

        // Cancel any existing loading process
        if (this.isLoading) {
            console.log('Cancelling previous model loading:', this.loadingModelId);
            if (this.currentProgressInterval) {
                clearInterval(this.currentProgressInterval);
                this.currentProgressInterval = null;
            }
        }

        // Unload existing model if different
        if (this.engine && this.currentModelId !== modelId) {
            console.log('Unloading previous model:', this.currentModelId);
            await this.engine.unload();
            this.engine = null;
            this.currentModelId = null;
        }

        // Set loading state
        this.isLoading = true;
        this.loadingModelId = modelId;
        appState.isWebllmReady = false;

        // Variables accessible in both try and catch blocks
        const startTime = Date.now();
        const modelInfo = this.models.find(m => m.id === modelId);
        const selectedModelName = modelInfo?.name || modelId;

        try {
            appState.isWebllmReady = false;
            const sizeInfo = modelInfo?.sizeGB ? `(~${modelInfo.sizeGB}GB)` : '';
            const timeEstimate = modelInfo?.estimatedLoadTime || '2-5 minutes';

            if (dom.ollamaStatus) {
                dom.ollamaStatus.textContent = `⚬ Loading ${selectedModelName} ${sizeInfo}...\nEstimated time: ${timeEstimate}\nFirst-time downloads may take longer depending on your internet speed.`;
                dom.ollamaStatus.className = 'ollama-status-style ollama-status-info';
            }

            // Start a timer to update progress every 10 seconds
            this.currentProgressInterval = setInterval(() => {
                // Check if we're still loading the same model
                if (!this.isLoading || this.loadingModelId !== modelId) {
                    clearInterval(this.currentProgressInterval);
                    this.currentProgressInterval = null;
                    return;
                }
                if (appState.isWebllmReady) {
                    clearInterval(this.currentProgressInterval);
                    this.currentProgressInterval = null;
                    return;
                }
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

                if (dom.ollamaStatus) {
                    dom.ollamaStatus.textContent = `⚬ Loading ${selectedModelName} ${sizeInfo}...\nElapsed: ${timeStr} | Estimated: ${timeEstimate}\nDownloading and initializing model...`;
                }
            }, 10000);

            this.currentModelId = modelId;
            this.engine = await webllm.CreateMLCEngine(modelId, {
                initProgressCallback: (progress) => {
                    // Only show progress if we're still loading the same model
                    if (this.isLoading && this.loadingModelId === modelId && dom.ollamaStatus && progress.text) {
                        const elapsed = Math.floor((Date.now() - startTime) / 1000);
                        const minutes = Math.floor(elapsed / 60);
                        const seconds = elapsed % 60;
                        const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                        dom.ollamaStatus.textContent = `⚬ ${progress.text}\nElapsed: ${timeStr} | Estimated: ${timeEstimate}`;
                    }
                }
            });

            // Clear progress interval
            if (this.currentProgressInterval) {
                clearInterval(this.currentProgressInterval);
                this.currentProgressInterval = null;
            }

            // Only update state if we're still loading the same model (not cancelled)
            if (this.isLoading && this.loadingModelId === modelId) {
                this.isLoading = false;
                this.loadingModelId = null;
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
                console.log(`Successfully loaded model: ${selectedModelName}`);
            } else {
                console.log(`Model loading was cancelled: ${selectedModelName}`);
                // If loading was cancelled, clean up the engine
                if (this.engine) {
                    await this.engine.unload();
                    this.engine = null;
                }
                this.currentModelId = null;
            }
        } catch (err) {
            // Clear the progress interval on error
            if (this.currentProgressInterval) {
                clearInterval(this.currentProgressInterval);
                this.currentProgressInterval = null;
            }

            // Reset loading state
            this.isLoading = false;
            this.loadingModelId = null;

            console.error("WebLLM Initialization Error:", err);
            appState.isWebllmReady = false;
            this.currentModelId = null;

            const modelInfo = this.models.find(m => m.id === modelId);
            const selectedModelName = modelInfo?.name || modelId;

            if (dom.ollamaStatus) {
                dom.ollamaStatus.textContent = `❌ Error loading ${selectedModelName}: ${err.message}`;
                dom.ollamaStatus.className = 'ollama-status-style ollama-status-error';
            }
            console.error(`Failed to load model ${selectedModelName}:`, err);
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

    async generateSlideContent(topic, slideCount = 8) {
        const prompt = `Create a professional presentation about "${topic}" with exactly ${slideCount} slides.

Generate structured data in this exact JSON format:

{
  "title": "Presentation Title",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slide Title",
      "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
      "speakerNotes": "Additional context for this slide"
    }
  ]
}

Guidelines:
- First slide: Title slide with topic name
- Last slide: Conclusion/Thank you slide
- Content slides: Maximum 4 bullet points each
- Create rich, descriptive content with detailed explanations
- Include speaker notes for each slide

Return ONLY the JSON, no additional text.`;

        const response = await this.generateText(prompt);
        console.log('AI response received for slides:', response.substring(0, 200) + '...');

        // Try to parse JSON response
        try {
            return JSON.parse(response.trim());
        } catch (parseError) {
            // If JSON parsing fails, try to extract JSON from the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('AI response was not in valid JSON format');
            }
        }
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