/**
 * Ollama Provider - Following CLAUDE.md Guidelines
 * Local AI model execution via Ollama server
 */

import { BaseProvider } from './BaseProvider.js';
import { DOM, Events } from '../core/dom.js';
import { logger } from '../core/utils.js';

export class OllamaProvider extends BaseProvider {
    constructor() {
        super('Ollama', {
            apiUrl: 'http://localhost:11434',
            maxTokens: 4000,
            models: [] // Will be populated from server
        });

        this.availableModels = [];
        this.currentModel = null;
    }

    async getTemplate() {
        return `
            <fieldset>
                <legend>AI Provider</legend>
                <p>Ollama (Local)</p>
                <div class="input-group" id="ai-model-selection-group">
                    <label for="ai-model-select" class="label-no-shrink-no-margin">Model:</label>
                    <select id="ai-model-select" class="select-no-margin"></select>
                    <button type="button" id="refresh-models-btn" class="btn btn-secondary">Refresh List</button>
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

        this.updateConnectionStatus();

        if (this.appState && typeof this.appState.save === 'function') {
            this.appState.save();
        }
    }

    updateConnectionStatus() {
        if (this.currentModel && this.isConnected) {
            this.updateConnectionStatus(
                `✅ Ready with ${this.currentModel}`,
                'success'
            );
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
            this.updateConnectionStatus();
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