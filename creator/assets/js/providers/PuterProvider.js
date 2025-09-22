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

        // Usage tracking and limits
        this.usageTracker = this.initializeUsageTracking();
        this.dailyRequestLimit = 50; // Conservative estimate based on free tier
        this.lastLimitCheck = null;
        this.limitWarningShown = false;
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


        // Save state if available
        if (this.appState && typeof this.appState.save === 'function') {
            this.appState.save();
        }
    }

    initializeUsageTracking() {
        const today = new Date().toDateString();
        const storedData = localStorage.getItem('puterUsageTracker');

        if (storedData) {
            try {
                const parsed = JSON.parse(storedData);
                if (parsed.date === today) {
                    return parsed;
                }
            } catch (e) {
                logger.warn('Failed to parse stored usage data:', e);
            }
        }

        // Reset for new day or first time
        const newTracker = {
            date: today,
            requestCount: 0,
            lastRequest: null,
            errors: []
        };
        this.saveUsageData(newTracker);
        return newTracker;
    }

    saveUsageData(data) {
        try {
            localStorage.setItem('puterUsageTracker', JSON.stringify(data));
        } catch (e) {
            logger.warn('Failed to save usage data:', e);
        }
    }

    async checkUsageLimits() {
        const usage = this.usageTracker;
        const warningsShown = {
            approaching: usage.requestCount >= (this.dailyRequestLimit * 0.8), // 80% warning
            nearLimit: usage.requestCount >= (this.dailyRequestLimit * 0.9),   // 90% warning
            atLimit: usage.requestCount >= this.dailyRequestLimit
        };

        if (warningsShown.atLimit) {
            const error = new Error(`Daily limit reached (${this.dailyRequestLimit} requests). Puter.js has free usage limits. Try again tomorrow or consider using a different AI provider.`);
            error.code = 'DAILY_LIMIT_EXCEEDED';
            throw error;
        }

        if (warningsShown.nearLimit && !this.limitWarningShown) {
            this.showLimitWarning(usage.requestCount, this.dailyRequestLimit, 'near');
            this.limitWarningShown = true;
        } else if (warningsShown.approaching && !this.limitWarningShown) {
            this.showLimitWarning(usage.requestCount, this.dailyRequestLimit, 'approaching');
        }

        return {
            canProceed: !warningsShown.atLimit,
            warningLevel: warningsShown.nearLimit ? 'critical' : warningsShown.approaching ? 'warning' : 'ok',
            usage: usage.requestCount,
            limit: this.dailyRequestLimit
        };
    }

    showLimitWarning(current, limit, level) {
        const percentage = Math.round((current / limit) * 100);
        const remaining = limit - current;

        let message, bgColor;
        if (level === 'near') {
            message = `⚠️ Usage Warning: You've used ${current}/${limit} requests (${percentage}%) today. Only ${remaining} requests remaining before hitting daily limits.`;
            bgColor = '#f59e0b'; // amber
        } else {
            message = `📊 Usage Notice: You've used ${current}/${limit} requests (${percentage}%) today. ${remaining} requests remaining.`;
            bgColor = '#3b82f6'; // blue
        }

        // Show warning in UI
        this.displayUsageWarning(message, bgColor);

        // Log for debugging
        logger.warn(`Puter usage ${level}:`, { current, limit, percentage, remaining });
    }

    displayUsageWarning(message, bgColor) {
        // Create or update warning element
        let warningEl = document.getElementById('puter-usage-warning');
        if (!warningEl) {
            warningEl = DOM.create('div', {
                id: 'puter-usage-warning',
                className: 'usage-warning'
            });

            // Insert after provider section
            const providerSection = DOM.query('#provider-section');
            if (providerSection && providerSection.parentNode) {
                providerSection.parentNode.insertBefore(warningEl, providerSection.nextSibling);
            }
        }

        warningEl.style.cssText = `
            background: ${bgColor};
            color: white;
            padding: 12px 16px;
            margin: 10px 0;
            border-radius: 8px;
            font-size: 0.9em;
            line-height: 1.4;
            border-left: 4px solid rgba(255,255,255,0.3);
        `;
        warningEl.textContent = message;

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (warningEl && warningEl.parentNode) {
                warningEl.style.opacity = '0';
                setTimeout(() => {
                    if (warningEl && warningEl.parentNode) {
                        warningEl.parentNode.removeChild(warningEl);
                    }
                }, 500);
            }
        }, 10000);
    }

    recordRequest() {
        this.usageTracker.requestCount++;
        this.usageTracker.lastRequest = new Date().toISOString();
        this.saveUsageData(this.usageTracker);
    }

    recordError(error) {
        this.usageTracker.errors.push({
            timestamp: new Date().toISOString(),
            error: error.message || error.toString(),
            code: error.code || 'unknown'
        });
        this.saveUsageData(this.usageTracker);
    }

    updateProviderStatus() {
        const modelName = this.getModelDisplayName(this.currentModel);
        const usage = this.usageTracker;
        const percentage = Math.round((usage.requestCount / this.dailyRequestLimit) * 100);

        this.isConnected = true;

        // Update status with usage info
        if (usage.requestCount > 0) {
            logger.info(`Puter usage today: ${usage.requestCount}/${this.dailyRequestLimit} (${percentage}%)`);
        }
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

        // Check usage limits before making request
        try {
            await this.checkUsageLimits();
        } catch (limitError) {
            // Log the limit error and show user-friendly message
            this.recordError(limitError);
            throw limitError;
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

            // Check if Puter.js returned an error response
            if (response && response.success === false) {
                logger.warn('Puter.js API returned error response:', response);
                let errorMsg = 'Unknown Puter.js error';

                if (response.error) {
                    if (typeof response.error === 'string') {
                        errorMsg = response.error;
                    } else if (response.error.message) {
                        errorMsg = response.error.message;
                    } else {
                        errorMsg = JSON.stringify(response.error);
                    }
                } else if (response.message) {
                    errorMsg = response.message;
                }

                throw new Error(`Puter.js API error: ${errorMsg}`);
            }

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
                logger.warn('Unexpected response format from Puter.js:', response);
                throw new Error('Invalid response format from Puter.js API');
            }

            // Validate that we got actual content
            if (!extractedText || extractedText.trim().length === 0) {
                throw new Error('Received empty response from Puter.js API');
            }

            // Record successful request
            this.recordRequest();

            return extractedText;
        } catch (error) {
            logger.error('Puter.js generation error:', error);

            // Record the error for tracking
            this.recordError(error);

            // Extract error message safely
            let errorMessage = 'Unknown error';
            if (error && typeof error.message === 'string') {
                errorMessage = error.message;
            } else if (error && typeof error === 'string') {
                errorMessage = error;
            } else if (error && error.error) {
                // Handle nested error objects
                if (typeof error.error === 'string') {
                    errorMessage = error.error;
                } else if (error.error.message) {
                    errorMessage = error.error.message;
                } else {
                    errorMessage = JSON.stringify(error.error);
                }
            } else if (error && typeof error === 'object') {
                // Try to extract meaningful info from error object
                if (error.code) {
                    errorMessage = `Error ${error.code}: ${error.message || 'Unknown'}`;
                } else if (error.status) {
                    errorMessage = `HTTP ${error.status}: ${error.statusText || 'Request failed'}`;
                } else {
                    // Fallback to JSON representation
                    try {
                        errorMessage = JSON.stringify(error, null, 2);
                    } catch (e) {
                        errorMessage = 'Complex error object (cannot stringify)';
                    }
                }
            } else if (error && error.toString && error.toString !== Object.prototype.toString) {
                errorMessage = error.toString();
            }

            // Provide user-friendly error message for auth issues
            if (errorMessage.toLowerCase().includes('auth')) {
                throw new Error('Authentication required. Please allow the Puter.js popup to complete setup for free AI access.');
            }

            // Check for specific Puter.js error conditions
            if (errorMessage.toLowerCase().includes('network')) {
                throw new Error('Network connection error. Please check your internet connection and try again.');
            }

            if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('limit')) {
                throw new Error('API quota exceeded. Please try again later or check your Puter.js account limits.');
            }

            throw new Error(`AI generation failed: ${errorMessage}`);
        }
    }

    async generateStreamContent(prompt, onChunk, options = {}) {
        if (!window.puter) {
            throw new Error('Puter.js not loaded');
        }

        // Check usage limits before making request
        try {
            await this.checkUsageLimits();
        } catch (limitError) {
            // Log the limit error and show user-friendly message
            this.recordError(limitError);
            throw limitError;
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

            // Record successful request
            this.recordRequest();

            return fullContent;
        } catch (error) {
            logger.error('Puter.js streaming error:', error);

            // Record the error for tracking
            this.recordError(error);

            // Extract error message safely
            let errorMessage = 'Unknown error';
            if (error && typeof error.message === 'string') {
                errorMessage = error.message;
            } else if (error && typeof error === 'string') {
                errorMessage = error;
            } else if (error && error.error) {
                // Handle nested error objects
                if (typeof error.error === 'string') {
                    errorMessage = error.error;
                } else if (error.error.message) {
                    errorMessage = error.error.message;
                } else {
                    errorMessage = JSON.stringify(error.error);
                }
            } else if (error && typeof error === 'object') {
                // Try to extract meaningful info from error object
                try {
                    errorMessage = JSON.stringify(error, null, 2);
                } catch (e) {
                    errorMessage = 'Complex error object (cannot stringify)';
                }
            } else if (error && error.toString && error.toString !== Object.prototype.toString) {
                errorMessage = error.toString();
            }

            throw new Error(`AI streaming failed: ${errorMessage}`);
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