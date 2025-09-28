/**
 * Ollama Provider - Following CLAUDE.md Guidelines
 * Local AI model execution via Ollama server
 */

import { BaseProvider } from './BaseProvider.js';
import { DOM, Events } from '../core/dom.js';
import { logger } from '../core/utils.js';
import { templateEngine } from '../core/TemplateEngine.js';

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
        try {
            return await templateEngine.loadProviderTemplate('ollama', {
                loadingText: this.availableModels?.length > 0 ? 'Select a model...' : 'Loading models...',
                models: this.availableModels || [],
                currentModel: this.currentModel
            });
        } catch (error) {
            console.error('Failed to load Ollama template:', error);
            // Fallback to minimal template
            return `
                <div class="card-header">
                    <h3>🦙 Ollama Provider</h3>
                    <p class="text-secondary">Local AI models running on your machine</p>
                </div>
                <div class="card-body">
                    <div class="provider-error">Template loading failed. Please refresh the page.</div>
                </div>
            `;
        }
    }

    /**
     * Get template data for rendering
     */
    getTemplateData() {
        return {
            models: this.availableModels || [],
            loadingText: this.availableModels?.length > 0 ? 'Select a model...' : 'Loading models...',
            showSetup: false,
            showRecommendations: false
        };
    }

    async onInit() {
        // Ensure dom object exists
        if (!this.dom) {
            this.dom = {};
        }

        // Wait a moment for DOM elements to be fully rendered
        await new Promise(resolve => setTimeout(resolve, 50));

        // Cache DOM elements
        this.dom.aiModelSelect = document.querySelector('#ai-model-select');
        this.dom.refreshModelsBtn = document.querySelector('#refresh-models-btn');
        this.dom.connectionStatus = document.querySelector('#connection-status');

        console.log('Ollama DOM elements found:', {
            aiModelSelect: !!this.dom.aiModelSelect,
            refreshModelsBtn: !!this.dom.refreshModelsBtn,
            connectionStatus: !!this.dom.connectionStatus
        });

        // Set up event listeners only if elements exist
        this.setupEventListeners();

        // Auto-load models on init
        try {
            await this.loadModels();
        } catch (error) {
            console.warn('Failed to load Ollama models:', error);
            this.updateConnectionStatus('Connection failed', 'error');
        }
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

    updateConnectionStatus(message, type = 'info') {
        if (this.dom.connectionStatus) {
            const statusIndicator = this.dom.connectionStatus.querySelector('.status-indicator');
            if (statusIndicator) {
                const iconMap = {
                    success: '✅',
                    error: '❌',
                    warning: '⚠️',
                    info: '🔍'
                };
                statusIndicator.textContent = `${iconMap[type] || '🔍'} ${message}`;
            }
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