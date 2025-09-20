/**
 * Cloud AI Provider - Following CLAUDE.md Guidelines
 * Supports OpenAI, Anthropic, and Google AI
 */

import { BaseProvider } from './BaseProvider.js';
import { DOM, Events } from '../core/dom.js';
import { sessionStorage, logger } from '../core/utils.js';

export class CloudProvider extends BaseProvider {
    constructor() {
        super('Cloud AI', {
            defaultProvider: 'openai',
            models: {
                openai: ['gpt-4', 'gpt-3.5-turbo'],
                anthropic: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
                google: ['gemini-pro', 'gemini-pro-vision']
            },
            maxTokens: 4000
        });

        this.currentSubProvider = 'openai';
        this.apiKeys = {};
    }

    async getTemplate() {
        return `
            <fieldset>
                <legend>AI Provider</legend>
                <div class="input-group">
                    <label for="ai-provider-select" class="label-no-shrink-no-margin">Provider:</label>
                    <select id="ai-provider-select" class="select-no-margin">
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="google">Google</option>
                    </select>
                </div>
                <div class="input-group">
                    <label for="api-key-input" class="label-no-shrink-no-margin">API Key:</label>
                    <input type="password" id="api-key-input" placeholder="Your API key" class="input-flex-grow">
                </div>
                <div id="connection-status" class="status-display"></div>
            </fieldset>
        `;
    }

    async onInit() {
        // Cache DOM elements
        this.dom.aiProviderSelect = DOM.query('#ai-provider-select');
        this.dom.apiKeyInput = DOM.query('#api-key-input');
        this.dom.connectionStatus = DOM.query('#connection-status');

        // Load API keys from session storage
        this.loadApiKeys();

        // Set up event listeners
        this.setupEventListeners();

        // Initialize provider status
        this.initializeProviderStatus();
    }

    setupEventListeners() {
        if (this.dom.aiProviderSelect) {
            Events.on(this.dom.aiProviderSelect, 'change', () => {
                this.handleProviderChange();
            });
        }

        if (this.dom.apiKeyInput) {
            Events.on(this.dom.apiKeyInput, 'input', () => {
                this.handleApiKeyChange();
            });
        }
    }

    handleProviderChange() {
        const provider = this.dom.aiProviderSelect.value;
        this.currentSubProvider = provider;

        // Clear API key input
        if (this.dom.apiKeyInput) {
            this.dom.apiKeyInput.value = '';
        }

        // Load saved API key for this provider
        const savedKey = this.apiKeys[provider];
        if (savedKey && this.dom.apiKeyInput) {
            this.dom.apiKeyInput.value = savedKey;
        }

        this.updateProviderStatus();
        this.appState?.set('currentSubProvider', provider);
    }

    handleApiKeyChange() {
        const provider = this.currentSubProvider;
        const key = this.dom.apiKeyInput?.value || '';

        // Store in memory
        this.apiKeys[provider] = key;

        // Store in session storage
        this.saveApiKeys();

        this.updateProviderStatus();
        this.appState?.setApiKey(provider, key);
    }

    updateProviderStatus() {
        const provider = this.currentSubProvider;
        const key = this.apiKeys[provider];

        if (key && key.length > 0) {
            this.updateConnectionStatus(
                `✅ ${provider.charAt(0).toUpperCase() + provider.slice(1)} is ready.`,
                'success'
            );
            this.isConnected = true;
        } else {
            this.updateConnectionStatus(
                `Provider set to ${provider}. Please enter an API key.`,
                'warning'
            );
            this.isConnected = false;
        }
    }

    initializeProviderStatus() {
        this.currentSubProvider = this.dom.aiProviderSelect?.value || 'openai';
        const apiKey = this.apiKeys[this.currentSubProvider];

        if (apiKey && this.dom.apiKeyInput) {
            this.dom.apiKeyInput.value = apiKey;
        }

        this.updateProviderStatus();
    }

    loadApiKeys() {
        try {
            const keys = sessionStorage.get('courseCreatorApiKeys', {});
            this.apiKeys = keys;
        } catch (error) {
            logger.error('Failed to load API keys:', error);
            this.apiKeys = {};
        }
    }

    saveApiKeys() {
        try {
            sessionStorage.set('courseCreatorApiKeys', this.apiKeys);
        } catch (error) {
            logger.error('Failed to save API keys:', error);
        }
    }

    async generateText(prompt) {
        const provider = this.currentSubProvider;
        const apiKey = this.apiKeys[provider];

        if (!apiKey) {
            throw new Error('API key is required for cloud providers');
        }

        // Truncate prompt if too long
        const truncatedPrompt = this.truncatePrompt(prompt);

        return await this.withRetry(async () => {
            let apiUrl, headers, body;

            switch (provider) {
                case 'openai':
                    apiUrl = 'https://api.openai.com/v1/chat/completions';
                    headers = {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    };
                    body = {
                        model: 'gpt-4',
                        messages: [{ role: 'user', content: truncatedPrompt }],
                        temperature: 0.7,
                        max_tokens: 4000
                    };
                    break;

                case 'anthropic':
                    apiUrl = 'https://api.anthropic.com/v1/messages';
                    headers = {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01'
                    };
                    body = {
                        model: 'claude-3-sonnet-20240229',
                        max_tokens: 4000,
                        messages: [{ role: 'user', content: truncatedPrompt }]
                    };
                    break;

                case 'google':
                    apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
                    headers = {
                        'Content-Type': 'application/json'
                    };
                    body = {
                        contents: [{ parts: [{ text: truncatedPrompt }] }]
                    };
                    break;

                default:
                    throw new Error('Unknown AI provider');
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
                error.status = response.status;
                throw error;
            }

            const data = await response.json();

            // Extract content based on provider
            switch (provider) {
                case 'openai':
                    return data.choices[0].message.content;
                case 'anthropic':
                    return data.content[0].text;
                case 'google':
                    return data.candidates[0].content.parts[0].text;
                default:
                    throw new Error('Unknown provider response format');
            }
        });
    }

    validateConfiguration() {
        const provider = this.currentSubProvider;
        const key = this.apiKeys[provider];
        return !!(provider && key && key.length > 0);
    }

    getCapabilities() {
        return {
            textGeneration: true,
            streaming: false,
            imageGeneration: this.currentSubProvider === 'openai',
            codeGeneration: true,
            maxTokens: this.config.maxTokens
        };
    }

    getAvailableModels() {
        return this.config.models[this.currentSubProvider] || [];
    }

    saveStateExtensions(state) {
        return {
            ...state,
            currentSubProvider: this.currentSubProvider
        };
    }

    loadStateExtensions(state) {
        if (state.currentSubProvider && this.dom.aiProviderSelect) {
            this.currentSubProvider = state.currentSubProvider;
            this.dom.aiProviderSelect.value = state.currentSubProvider;
        }
    }

    refresh() {
        super.refresh();
        this.loadApiKeys();
        this.updateProviderStatus();
    }
}