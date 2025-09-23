/**
 * Ollama Provider - Following CLAUDE.md Guidelines
 * Local AI model execution via Ollama server
 */

import { BaseProvider } from './BaseProvider.js';
import { DOM, Events } from '../core/dom.js';
import { logger } from '../core/utils.js';

export class OllamaProvider extends BaseProvider {
    constructor() {
        super('Ollama - Private AI', {
            apiUrl: 'http://localhost:11434',
            maxTokens: 8000,
            models: [] // Will be populated from server
        });

        this.availableModels = [];
        this.currentModel = null;
    }

    async getTemplate() {
        return `
            <fieldset>
                <legend>🏠 Private AI</legend>

                <div class="ollama-info" style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 1.1em;">🔒 Your Own AI Models, Your Own Hardware</h3>
                    <p style="margin: 0 0 8px 0; font-size: 0.9em; opacity: 0.95;">Run powerful AI models locally with Ollama. Complete privacy and control over your data.</p>
                    <div style="display: flex; gap: 16px; margin-top: 8px; flex-wrap: wrap;">
                        <div style="font-size: 0.8em; opacity: 0.9;">🛡️ <strong>100% Private</strong></div>
                        <div style="font-size: 0.8em; opacity: 0.9;">⚡ <strong>No Usage Limits</strong></div>
                        <div style="font-size: 0.8em; opacity: 0.9;">💰 <strong>Free to Use</strong></div>
                    </div>
                </div>

                <div id="ollama-setup" style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-bottom: 16px; display: none;">
                    <div style="font-weight: 600; margin-bottom: 8px;">📋 Quick Setup</div>
                    <div style="font-size: 0.9em; margin-bottom: 8px;">
                        1. Install Ollama: <a href="https://ollama.ai" target="_blank" style="color: #d97706;">https://ollama.ai</a><br>
                        2. Download a model: <code style="background: rgba(0,0,0,0.1); padding: 2px 4px; border-radius: 3px;">ollama pull llama3.1</code><br>
                        3. Start Ollama server (it runs automatically on install)
                    </div>
                </div>

                <div class="input-group" id="ai-model-selection-group">
                    <label for="ai-model-select" class="label-no-shrink-no-margin">AI Model:</label>
                    <select id="ai-model-select" class="select-no-margin">
                        <option value="">Loading models...</option>
                    </select>
                    <button type="button" id="refresh-models-btn" class="btn btn-secondary">🔄 Refresh</button>
                </div>

                <div id="model-recommendations" style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 12px; margin: 8px 0; font-size: 0.85em; display: none;">
                    <div style="font-weight: 600; margin-bottom: 8px;">💡 Recommended Models</div>
                    <div style="margin-bottom: 4px;"><strong>Beginner:</strong> llama3.1:8b (Fast, 4.7GB)</div>
                    <div style="margin-bottom: 4px;"><strong>Balanced:</strong> llama3.1:70b (High quality, 40GB)</div>
                    <div style="margin-bottom: 4px;"><strong>Coding:</strong> codellama:13b (Code specialist, 7.4GB)</div>
                    <div style="margin-top: 8px; font-size: 0.9em; color: #0369a1;">
                        Download with: <code style="background: rgba(0,0,0,0.1); padding: 2px 4px; border-radius: 3px;">ollama pull &lt;model-name&gt;</code>
                    </div>
                </div>

                <div id="connection-status" class="status-display"></div>
            </fieldset>
        `;
    }

    async onInit() {
        // Cache DOM elements
        this.dom.aiModelSelect = DOM.query('#ai-model-select');
        this.dom.refreshModelsBtn = DOM.query('#refresh-models-btn');
        this.dom.connectionStatus = DOM.query('#connection-status');

        // Set up event listeners
        this.setupEventListeners();

        // Auto-load models on init
        await this.loadModels();
    }

    setupEventListeners() {
        if (this.dom.refreshModelsBtn) {
            Events.on(this.dom.refreshModelsBtn, 'click', () => {
                this.loadModels();
            });
        }

        if (this.dom.aiModelSelect) {
            Events.on(this.dom.aiModelSelect, 'change', () => {
                this.handleModelChange();
            });
        }
    }

    handleModelChange() {
        this.currentModel = this.dom.aiModelSelect?.value;

        if (this.appState) {
            this.appState.set('ollamaModel', this.currentModel);
        }

        this.updateProviderStatus();

        if (this.appState && typeof this.appState.save === 'function') {
            this.appState.save();
        }
    }

    updateProviderStatus() {
        if (this.currentModel && this.isConnected) {
        } else if (this.availableModels.length === 0) {
            this.updateConnectionStatus(
                '⚠ No Ollama models found. Please install some models first.',
                'warning'
            );
        } else if (!this.isConnected) {
            this.updateConnectionStatus(
                '❌ Cannot connect to Ollama. Make sure it\'s running on localhost:11434',
                'error'
            );
        }
    }

    async loadModels() {
        this.updateConnectionStatus('Loading Ollama models...', 'info');

        if (!this.dom.aiModelSelect) {
            logger.error('Cannot load models: aiModelSelect not found');
            return;
        }

        const selectedModelBeforeUpdate = this.dom.aiModelSelect.value;
        this.dom.aiModelSelect.innerHTML = '';

        try {
            const response = await fetch(`${this.config.apiUrl}/api/tags`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.models || data.models.length === 0) {
                this.dom.aiModelSelect.add(new Option('No models found', ''));
                this.availableModels = [];
                this.isConnected = false;
                this.updateConnectionStatus(
                    '⚠ No Ollama models found. Please install some models first.',
                    'warning'
                );
                return;
            }

            // Sort models alphabetically
            data.models.sort((a, b) => a.name.localeCompare(b.name));
            this.availableModels = data.models.map(model => model.name);

            data.models.forEach(model => {
                this.dom.aiModelSelect.add(new Option(model.name, model.name));
            });

            // Restore previous selection if possible
            if (data.models.some(model => model.name === selectedModelBeforeUpdate)) {
                this.dom.aiModelSelect.value = selectedModelBeforeUpdate;
                this.currentModel = selectedModelBeforeUpdate;
            } else {
                this.dom.aiModelSelect.selectedIndex = 0;
                this.currentModel = this.dom.aiModelSelect.value;
            }

            this.isConnected = true;
            this.updateConnectionStatus(
                `✅ Found ${data.models.length} Ollama model(s)`,
                'success'
            );

            if (this.appState) {
                this.appState.set('ollamaModel', this.currentModel);
            }

            logger.info(`Loaded ${data.models.length} Ollama models`);

        } catch (error) {
            logger.error('Error loading Ollama models:', error);
            this.dom.aiModelSelect.add(new Option('Ollama not available', ''));
            this.availableModels = [];
            this.isConnected = false;
            this.currentModel = null;

            this.updateConnectionStatus(
                '❌ Cannot connect to Ollama. Make sure it\'s running on localhost:11434',
                'error'
            );
        }
    }

    async generateText(prompt, options = {}) {
        const modelName = this.currentModel || this.dom.aiModelSelect?.value;

        if (!modelName) {
            throw new Error('No Ollama model selected');
        }

        if (!this.isConnected) {
            throw new Error('Ollama is not connected. Please check your Ollama installation.');
        }

        try {
            const response = await fetch(`${this.config.apiUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: modelName,
                    prompt: prompt,
                    stream: false,
                    ...options
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            logger.error('Ollama generation error:', error);
            throw new Error(`AI generation failed: ${error.message}`);
        }
    }

    async testConnection() {
        try {
            const response = await fetch(`${this.config.apiUrl}/api/tags`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    validateConfiguration() {
        return this.isConnected && !!this.currentModel;
    }

    getCapabilities() {
        return {
            textGeneration: true,
            streaming: true, // Ollama supports streaming
            imageGeneration: false,
            codeGeneration: true,
            maxTokens: this.config.maxTokens
        };
    }

    getAvailableModels() {
        return this.availableModels;
    }

    setModel(modelName) {
        if (this.availableModels.includes(modelName)) {
            this.currentModel = modelName;
            if (this.dom.aiModelSelect) {
                this.dom.aiModelSelect.value = modelName;
            }
            this.emit('modelChanged', modelName);
            this.updateProviderStatus();
        }
    }

    getCurrentModel() {
        return this.currentModel;
    }

    saveStateExtensions(state) {
        return {
            ...state,
            ollamaModel: this.currentModel || ''
        };
    }

    loadStateExtensions(state) {
        if (state.ollamaModel && this.availableModels.includes(state.ollamaModel)) {
            this.currentModel = state.ollamaModel;
            if (this.dom.aiModelSelect) {
                this.dom.aiModelSelect.value = state.ollamaModel;
            }
        }
    }

    refresh() {
        super.refresh();
        this.loadModels();
    }

    async destroy() {
        // Clean up any ongoing requests if needed
        this.availableModels = [];
        this.currentModel = null;
        this.isConnected = false;
        super.destroy();
    }
}