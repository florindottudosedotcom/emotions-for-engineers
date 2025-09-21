/**
 * Puter AI Provider - Following CLAUDE.md Guidelines
 * Free access to 200+ AI models through Puter.js
 */

import { BaseProvider } from './BaseProvider.js';
import { DOM, Events } from '../core/dom.js';
import { logger } from '../core/utils.js';

export class PuterProvider extends BaseProvider {
    constructor() {
        super('Puter AI (Free)', {
            defaultModel: 'openrouter:openai/gpt-4o',
            models: [
                'openrouter:anthropic/claude-3.5-sonnet',
                'openrouter:openai/gpt-4o',
                'openrouter:openai/gpt-4o-mini',
                'openrouter:meta-llama/llama-3.1-70b-instruct',
                'openrouter:google/gemini-pro-1.5',
                'openrouter:mistralai/mistral-large',
                'openrouter:anthropic/claude-3-haiku'
            ],
            maxTokens: 4000
        });

        this.currentModel = this.config.defaultModel;
        this.puterLoaded = false;
    }

    async getTemplate() {
        return `
            <fieldset>
                <legend>🚀 Free AI Provider</legend>
                <div class="puter-info" style="background: var(--primary-color); color: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 1.1em;">✨ No Setup Required!</h3>
                    <p style="margin: 0; font-size: 0.9em; opacity: 0.9;">Access 200+ AI models from OpenAI, Anthropic, Google, Meta, and more - completely free with no API keys needed.</p>
                    <p style="margin: 8px 0 0 0; font-size: 0.85em; opacity: 0.8;"><strong>Note:</strong> First-time users may see a Puter.js authentication popup - this is normal and only happens once for free access setup.</p>
                </div>

                <div class="input-group">
                    <label for="puter-model-select" class="label-no-shrink-no-margin">AI Model:</label>
                    <select id="puter-model-select" class="select-no-margin">
                        <option value="openrouter:anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Anthropic)</option>
                        <option value="openrouter:openai/gpt-4o" selected>GPT-4o (OpenAI)</option>
                        <option value="openrouter:openai/gpt-4o-mini">GPT-4o Mini (OpenAI)</option>
                        <option value="openrouter:meta-llama/llama-3.1-70b-instruct">Llama 3.1 70B (Meta)</option>
                        <option value="openrouter:google/gemini-pro-1.5">Gemini Pro 1.5 (Google)</option>
                        <option value="openrouter:mistralai/mistral-large">Mistral Large</option>
                        <option value="openrouter:anthropic/claude-3-haiku">Claude 3 Haiku (Anthropic)</option>
                    </select>
                </div>

                <div class="puter-status" style="background: #f8f9fa; border-radius: 6px; padding: 12px; border-left: 4px solid #28a745;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: #28a745; font-weight: bold;">●</span>
                        <span style="color: #666; font-size: 0.9em;">Ready to generate content!</span>
                    </div>
                </div>

                <div id="connection-status" class="status-display"></div>
            </fieldset>
        `;
    }

    async onInit() {
        // Load Puter.js if not already loaded
        if (!window.puter) {
            await this.loadPuterJS();
        }

        // Cache DOM elements
        this.dom.puterModelSelect = DOM.query('#puter-model-select');
        this.dom.connectionStatus = DOM.query('#connection-status');

        // Set default model
        this.currentModel = this.dom.puterModelSelect?.value || this.config.defaultModel;
        if (this.appState) {
            this.appState.set('puterModel', this.currentModel);
        }

        // Set up event listeners
        this.setupEventListeners();

        // Initialize status
        this.updateProviderStatus();
    }

    setupEventListeners() {
        if (this.dom.puterModelSelect) {
            Events.on(this.dom.puterModelSelect, 'change', () => {
                this.handleModelChange();
            });
        }
    }

    handleModelChange() {
        this.currentModel = this.dom.puterModelSelect.value;
        const modelName = this.getModelDisplayName(this.currentModel);

        if (this.appState) {
            this.appState.set('puterModel', this.currentModel);
        }

        this.updateConnectionStatus(
            `✅ Ready with ${modelName}`,
            'success'
        );

        // Save state if available
        if (this.appState && typeof this.appState.save === 'function') {
            this.appState.save();
        }
    }

    updateProviderStatus() {
        const modelName = this.getModelDisplayName(this.currentModel);
        this.updateConnectionStatus(
            `✅ Ready with ${modelName}`,
            'success'
        );
        this.isConnected = true;
    }

    async loadPuterJS() {
        return new Promise((resolve, reject) => {
            if (window.puter) {
                this.puterLoaded = true;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://js.puter.com/v2/';
            script.onload = () => {
                logger.info('Puter.js loaded successfully');
                this.puterLoaded = true;
                resolve();
            };
            script.onerror = () => {
                const error = new Error('Failed to load Puter.js');
                logger.error('Failed to load Puter.js');
                reject(error);
            };
            document.head.appendChild(script);
        });
    }

    getModelDisplayName(modelId) {
        const modelMap = {
            'openrouter:anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet',
            'openrouter:openai/gpt-4o': 'GPT-4o',
            'openrouter:openai/gpt-4o-mini': 'GPT-4o Mini',
            'openrouter:meta-llama/llama-3.1-70b-instruct': 'Llama 3.1 70B',
            'openrouter:google/gemini-pro-1.5': 'Gemini Pro 1.5',
            'openrouter:mistralai/mistral-large': 'Mistral Large',
            'openrouter:anthropic/claude-3-haiku': 'Claude 3 Haiku'
        };
        return modelMap[modelId] || modelId;
    }

    async generateText(prompt, options = {}) {
        if (!window.puter) {
            throw new Error('Puter.js not loaded');
        }

        try {
            // Use current model or fallback to default
            const model = options.model || this.currentModel || this.config.defaultModel;

            logger.info(`Generating text with Puter.js using model: ${model}`);

            // Check if user is already signed in to avoid unnecessary popup
            let isSignedIn = false;
            try {
                isSignedIn = await window.puter.auth.isSignedIn();
                logger.debug('Puter.js auth status:', isSignedIn);
            } catch (authError) {
                logger.debug('Auth check failed, proceeding with AI call:', authError);
            }

            // If not signed in, show a user-friendly message
            if (!isSignedIn) {
                this.updateConnectionStatus(
                    '🔐 First-time setup: Puter.js will open an authentication window...',
                    'info'
                );
            }

            const response = await window.puter.ai.chat(prompt, {
                model: model,
                stream: false,
                ...options
            });

            // Handle different response formats from Puter.js
            let extractedText = '';

            if (typeof response === 'string') {
                extractedText = response;
            } else if (response && response.message && typeof response.message.content === 'string') {
                extractedText = response.message.content;
            } else if (response && typeof response.text === 'string') {
                extractedText = response.text;
            } else if (response && typeof response.content === 'string') {
                extractedText = response.content;
            } else if (response && typeof response.message === 'string') {
                extractedText = response.message;
            } else if (response && typeof response.response === 'string') {
                extractedText = response.response;
            } else if (response && typeof response.data === 'string') {
                extractedText = response.data;
            } else {
                logger.warn('Unexpected response format from Puter.js, using fallback');
                extractedText = JSON.stringify(response);
            }

            return extractedText;
        } catch (error) {
            logger.error('Puter.js generation error:', error);

            // Provide user-friendly error message for auth issues
            if (error.message && error.message.includes('auth')) {
                throw new Error('Authentication required. Please allow the Puter.js popup to complete setup for free AI access.');
            }

            throw new Error(`AI generation failed: ${error.message}`);
        }
    }

    async generateStreamContent(prompt, onChunk, options = {}) {
        if (!window.puter) {
            throw new Error('Puter.js not loaded');
        }

        try {
            const model = options.model || this.currentModel || this.config.defaultModel;

            const response = await window.puter.ai.chat(prompt, {
                model: model,
                stream: true,
                ...options
            });

            let fullContent = '';
            for await (const part of response) {
                if (part?.text) {
                    fullContent += part.text;
                    if (onChunk) {
                        onChunk(part.text, fullContent);
                    }
                }
            }

            return fullContent;
        } catch (error) {
            logger.error('Puter.js streaming error:', error);
            throw new Error(`AI generation failed: ${error.message}`);
        }
    }

    validateConfiguration() {
        return this.puterLoaded && !!window.puter;
    }

    getCapabilities() {
        return {
            textGeneration: true,
            streaming: true,
            imageGeneration: false,
            codeGeneration: true,
            maxTokens: this.config.maxTokens
        };
    }

    getAvailableModels() {
        return this.config.models;
    }

    setModel(model) {
        if (this.config.models.includes(model)) {
            this.currentModel = model;
            if (this.dom.puterModelSelect) {
                this.dom.puterModelSelect.value = model;
            }
            this.emit('modelChanged', model);
        }
    }

    getCurrentModel() {
        return this.currentModel;
    }

    saveStateExtensions(state) {
        return {
            ...state,
            puterModel: this.currentModel
        };
    }

    loadStateExtensions(state) {
        if (state.puterModel && this.config.models.includes(state.puterModel)) {
            this.currentModel = state.puterModel;
            if (this.dom.puterModelSelect) {
                this.dom.puterModelSelect.value = state.puterModel;
            }
        }
    }

    refresh() {
        super.refresh();
        this.updateProviderStatus();
    }
}