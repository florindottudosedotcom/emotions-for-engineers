/**
 * WebLLM Provider - Following CLAUDE.md Guidelines
 * In-browser AI model execution
 */

import { BaseProvider } from './BaseProvider.js';
import { DOM, Events } from '../core/dom.js';
import { logger } from '../core/utils.js';

export class WebLLMProvider extends BaseProvider {
    constructor() {
        super('WebLLM - Browser AI', {
            models: [
                {
                    id: "Llama-3-8B-Instruct-q4f16_1-MLC",
                    name: "Llama 3 8B Instruct",
                    sizeGB: 4.8,
                    estimatedLoadTime: "2-5 minutes",
                    description: "Fast & capable, good for most tasks"
                },
                {
                    id: "Phi-3-mini-4k-instruct-q4f16_1-MLC",
                    name: "Phi 3 Mini",
                    sizeGB: 2.3,
                    estimatedLoadTime: "1-3 minutes",
                    description: "Lightweight, quick to load"
                },
                {
                    id: "Llama-3.1-8B-Instruct-q4f16_1-MLC",
                    name: "Llama 3.1 8B Instruct",
                    sizeGB: 5.1,
                    estimatedLoadTime: "3-6 minutes",
                    description: "Latest version with improved capabilities"
                }
            ],
            maxTokens: 8000
        });

        this.engine = null;
        this.currentModelId = null;
        this.isLoading = false;
        this.loadingModelId = null;
        this.currentProgressInterval = null;
        this.webllm = null;
    }

    async getTemplate() {
        return `
            <fieldset>
                <legend>🖥️ Browser AI</legend>

                <div class="webllm-info" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 1.1em;">🚀 Run AI Models Locally in Your Browser</h3>
                    <p style="margin: 0 0 8px 0; font-size: 0.9em; opacity: 0.95;">No server required! Models run entirely in your browser using WebAssembly.</p>
                    <div style="display: flex; gap: 16px; margin-top: 8px; flex-wrap: wrap;">
                        <div style="font-size: 0.8em; opacity: 0.9;">🔒 <strong>100% Private</strong></div>
                        <div style="font-size: 0.8em; opacity: 0.9;">⚡ <strong>No Internet Needed</strong></div>
                        <div style="font-size: 0.8em; opacity: 0.9;">💰 <strong>Completely Free</strong></div>
                    </div>
                </div>

                <div class="input-group" id="ai-model-selection-group">
                    <label for="ai-model-select" class="label-no-shrink-no-margin">AI Model:</label>
                    <select id="ai-model-select" class="select-no-margin">
                        <option value="">Select a model to download...</option>
                        <option value="Phi-3-mini-4k-instruct-q4f16_1-MLC">Phi 3 Mini - 2.3GB (Lightweight, 1-3 min load)</option>
                        <option value="Llama-3-8B-Instruct-q4f16_1-MLC">Llama 3 8B - 4.8GB (Balanced, 2-5 min load)</option>
                        <option value="Llama-3.1-8B-Instruct-q4f16_1-MLC">Llama 3.1 8B - 5.1GB (Latest, 3-6 min load)</option>
                    </select>
                </div>

                <div id="model-info" style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 8px 0; font-size: 0.85em; display: none;">
                    <div id="model-description"></div>
                    <div style="margin-top: 8px; font-size: 0.9em;">
                        <strong>💡 First-time setup:</strong> Model will download and cache in your browser. Subsequent uses are instant!
                    </div>
                </div>

                <div id="download-progress" style="background: #e0f2fe; border: 1px solid #0288d1; border-radius: 6px; padding: 12px; margin: 8px 0; display: none;">
                    <div style="font-weight: 600; margin-bottom: 8px;">📥 Downloading Model...</div>
                    <div id="progress-text" style="font-size: 0.9em; margin-bottom: 8px;"></div>
                    <div style="background: #fff; border-radius: 4px; height: 8px; overflow: hidden;">
                        <div id="progress-bar" style="background: #0288d1; height: 100%; width: 0%; transition: width 0.3s;"></div>
                    </div>
                </div>

                <div id="connection-status" class="status-display"></div>
            </fieldset>
        `;
    }

    async onInit() {
        // Show loading message
        this.updateConnectionStatus('Loading WebLLM library...', 'info');

        // Load WebLLM module with local first, then CDN fallbacks
        const webllmUrls = [
            "./assets/js/vendor/webllm/0.2.46/index.js",
            "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.46/+esm",
            "https://unpkg.com/@mlc-ai/web-llm@0.2.46/dist/index.js",
            "https://esm.run/@mlc-ai/web-llm@0.2.46"
        ];

        let lastError;
        for (const url of webllmUrls) {
            try {
                logger.info(`Attempting to load WebLLM from: ${url}`);
                this.updateConnectionStatus(`Loading WebLLM from ${url.split('/')[2]}...`, 'info');
                this.webllm = await import(url);
                logger.info('WebLLM module loaded successfully');
                break;
            } catch (error) {
                logger.warn(`Failed to load WebLLM from ${url}:`, error.message);
                lastError = error;
                continue;
            }
        }

        if (!this.webllm) {
            const errorMsg = 'Failed to load WebLLM library. This may be due to network restrictions or CSP policies. Try refreshing or use a different provider.';
            this.updateConnectionStatus(errorMsg, 'error');
            logger.error('Failed to load WebLLM module from all sources:', lastError);
            throw new Error('Failed to load WebLLM module from any CDN source');
        }

        // Cache DOM elements
        this.dom.aiModelSelect = DOM.query('#ai-model-select');
        this.dom.connectionStatus = DOM.query('#connection-status');

        // Load models into select
        this.loadModels();

        // Set up event listeners
        this.setupEventListeners();

        // Auto-initialize first model if none selected
        if (this.dom.aiModelSelect && this.dom.aiModelSelect.options.length > 0 && !this.currentModelId) {
            setTimeout(() => {
                this.initializeModel(this.dom.aiModelSelect.value);
            }, 100);
        }
    }

    setupEventListeners() {
        if (this.dom.aiModelSelect) {
            Events.on(this.dom.aiModelSelect, 'change', async () => {
                const selectedModel = this.dom.aiModelSelect.value;
                logger.info('WebLLM model selection changed to:', selectedModel);
                await this.initializeModel(selectedModel);

                if (this.appState && typeof this.appState.save === 'function') {
                    this.appState.save();
                }
            });
        }
    }

    loadModels() {
        if (!this.dom.aiModelSelect) return;

        const selectedModelBeforeUpdate = this.dom.aiModelSelect.value;
        this.dom.aiModelSelect.innerHTML = '';

        this.config.models.forEach(model => {
            this.dom.aiModelSelect.add(new Option(model.name, model.id));
        });

        if (this.config.models.some(m => m.id === selectedModelBeforeUpdate)) {
            this.dom.aiModelSelect.value = selectedModelBeforeUpdate;
        } else {
            this.dom.aiModelSelect.selectedIndex = 0;
        }
    }

    async initializeModel(modelId) {
        if (!modelId) return;

        logger.info(`Initializing WebLLM model: ${modelId}, currently loading: ${this.isLoading}, current model: ${this.currentModelId}`);

        // If same model already loaded, do nothing
        if (this.engine && this.currentModelId === modelId && !this.isLoading) {
            const modelName = this.config.models.find(m => m.id === modelId)?.name || modelId;
            this.updateConnectionStatus(`✅ ${modelName} ready!`, 'success');
            this.isConnected = true;
            return;
        }

        // If already loading the same model, ignore duplicate request
        if (this.isLoading && this.loadingModelId === modelId) {
            logger.info('Already loading this model, ignoring duplicate request');
            return;
        }

        // Cancel any existing loading process
        if (this.isLoading) {
            logger.info('Cancelling previous model loading:', this.loadingModelId);
            if (this.currentProgressInterval) {
                clearInterval(this.currentProgressInterval);
                this.currentProgressInterval = null;
            }
        }

        // Unload existing model if different
        if (this.engine && this.currentModelId !== modelId) {
            logger.info('Unloading previous model:', this.currentModelId);
            await this.engine.unload();
            this.engine = null;
            this.currentModelId = null;
        }

        // Set loading state
        this.isLoading = true;
        this.loadingModelId = modelId;
        this.isConnected = false;

        const startTime = Date.now();
        const modelInfo = this.config.models.find(m => m.id === modelId);
        const selectedModelName = modelInfo?.name || modelId;

        try {
            const sizeInfo = modelInfo?.sizeGB ? `(~${modelInfo.sizeGB}GB)` : '';
            const timeEstimate = modelInfo?.estimatedLoadTime || '2-5 minutes';

            this.updateConnectionStatus(
                `⚬ Loading ${selectedModelName} ${sizeInfo}...\nEstimated time: ${timeEstimate}\nFirst-time downloads may take longer depending on your internet speed.`,
                'info'
            );

            // Start a timer to update progress every 10 seconds
            this.currentProgressInterval = setInterval(() => {
                if (!this.isLoading || this.loadingModelId !== modelId || this.isConnected) {
                    clearInterval(this.currentProgressInterval);
                    this.currentProgressInterval = null;
                    return;
                }

                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

                this.updateConnectionStatus(
                    `⚬ Loading ${selectedModelName} ${sizeInfo}...\nElapsed: ${timeStr} | Estimated: ${timeEstimate}\nDownloading and initializing model...`,
                    'info'
                );
            }, 10000);

            this.currentModelId = modelId;
            this.engine = await this.webllm.CreateMLCEngine(modelId, {
                initProgressCallback: (progress) => {
                    if (this.isLoading && this.loadingModelId === modelId && progress.text) {
                        const elapsed = Math.floor((Date.now() - startTime) / 1000);
                        const minutes = Math.floor(elapsed / 60);
                        const seconds = elapsed % 60;
                        const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

                        this.updateConnectionStatus(
                            `⚬ ${progress.text}\nElapsed: ${timeStr} | Estimated: ${timeEstimate}`,
                            'info'
                        );
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
                this.isConnected = true;

                const totalTime = Math.floor((Date.now() - startTime) / 1000);
                const finalMinutes = Math.floor(totalTime / 60);
                const finalSeconds = totalTime % 60;
                const finalTimeStr = finalMinutes > 0 ? `${finalMinutes}m ${finalSeconds}s` : `${finalSeconds}s`;

                this.updateConnectionStatus(
                    `✅ ${selectedModelName} ready! (loaded in ${finalTimeStr})`,
                    'success'
                );

                if (this.appState) {
                    this.appState.set('webllmReady', true);
                    this.appState.set('currentWebllmModel', modelId);
                }

                logger.info(`Successfully loaded WebLLM model: ${selectedModelName}`);
            } else {
                logger.info(`WebLLM model loading was cancelled: ${selectedModelName}`);
                if (this.engine) {
                    await this.engine.unload();
                    this.engine = null;
                }
                this.currentModelId = null;
            }
        } catch (error) {
            // Clear the progress interval on error
            if (this.currentProgressInterval) {
                clearInterval(this.currentProgressInterval);
                this.currentProgressInterval = null;
            }

            // Reset loading state
            this.isLoading = false;
            this.loadingModelId = null;
            this.isConnected = false;

            this.updateConnectionStatus(
                `❌ Error loading ${selectedModelName}: ${error.message}`,
                'error'
            );

            this.currentModelId = null;
            if (this.appState) {
                this.appState.set('webllmReady', false);
            }

            logger.error(`Failed to load WebLLM model ${selectedModelName}:`, error);
            throw error;
        }
    }

    async generateText(prompt, options = {}) {
        if (!this.engine) {
            throw new Error("WebLLM engine is not initialized.");
        }

        try {
            const reply = await this.engine.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                stream: false,
                ...options
            });

            return reply.choices[0].message.content;
        } catch (error) {
            logger.error('WebLLM generation error:', error);
            throw new Error(`AI generation failed: ${error.message}`);
        }
    }

    validateConfiguration() {
        return !!this.engine && this.isConnected;
    }

    getCapabilities() {
        return {
            textGeneration: true,
            streaming: false,
            imageGeneration: false,
            codeGeneration: true,
            maxTokens: this.config.maxTokens
        };
    }

    getAvailableModels() {
        return this.config.models.map(model => model.id);
    }

    setModel(modelId) {
        if (this.config.models.some(m => m.id === modelId)) {
            if (this.dom.aiModelSelect) {
                this.dom.aiModelSelect.value = modelId;
            }
            this.initializeModel(modelId);
            this.emit('modelChanged', modelId);
        }
    }

    getCurrentModel() {
        return this.currentModelId;
    }

    saveStateExtensions(state) {
        return {
            ...state,
            webllmModel: this.currentModelId || this.config.models[0]?.id
        };
    }

    loadStateExtensions(state) {
        if (state.webllmModel && this.config.models.some(m => m.id === state.webllmModel)) {
            if (this.dom.aiModelSelect) {
                this.dom.aiModelSelect.value = state.webllmModel;
            }
            // Don't auto-initialize here as it will be handled by onInit
        }
    }

    async testConnection() {
        try {
            if (!this.engine) {
                return false;
            }
            const result = await this.generateText('Hello', { max_tokens: 5 });
            return !!result;
        } catch (error) {
            return false;
        }
    }

    refresh() {
        super.refresh();
        if (this.currentModelId) {
            const modelName = this.config.models.find(m => m.id === this.currentModelId)?.name || this.currentModelId;
            if (this.isConnected) {
                this.updateConnectionStatus(`✅ ${modelName} ready!`, 'success');
            } else {
                this.updateConnectionStatus(`❌ ${modelName} connection lost`, 'error');
            }
        }
    }

    destroy() {
        // Clean up intervals
        if (this.currentProgressInterval) {
            clearInterval(this.currentProgressInterval);
            this.currentProgressInterval = null;
        }

        // Unload engine
        if (this.engine) {
            this.engine.unload().catch(error => {
                logger.error('Error unloading WebLLM engine:', error);
            });
            this.engine = null;
        }

        // Reset state
        this.currentModelId = null;
        this.isLoading = false;
        this.loadingModelId = null;

        super.destroy();
    }
}