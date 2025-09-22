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

        // Log initialization for debugging
        logger.info(`Puter provider initialized with usage tracking - Current usage: ${this.usageTracker.requestCount}/${this.dailyRequestLimit}`);
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

        // Update the display immediately
        this.updateProviderStatus();
    }

    // Debug method to test usage warnings - can be called from browser console
    testUsageWarning(targetCount = 40) {
        console.log(`Setting usage count to ${targetCount} for testing...`);
        this.usageTracker.requestCount = targetCount;
        this.saveUsageData(this.usageTracker);
        this.updateProviderStatus();
        return `Usage set to ${targetCount}/${this.dailyRequestLimit}`;
    }

    recordError(error) {
        const errorRecord = {
            timestamp: new Date().toISOString(),
            error: error.message || error.toString(),
            code: error.code || 'unknown'
        };

        this.usageTracker.errors.push(errorRecord);
        this.saveUsageData(this.usageTracker);

        // Check if this is a server-side quota error
        const quotaKeywords = ['quota', 'limit', 'rate', 'usage', 'exceeded', 'too many'];
        const isServerQuotaError = quotaKeywords.some(keyword =>
            errorRecord.error.toLowerCase().includes(keyword)
        );

        if (isServerQuotaError) {
            this.handleServerQuotaError(errorRecord);
        }
    }

    handleServerQuotaError(errorRecord) {
        // Display a prominent warning about server-side limits
        const warningMessage = `🚫 Puter.js Server Quota Exceeded\n\nThe server reports quota limits independent of our local tracking. This means:\n• Puter.js has daily/hourly limits per user or IP\n• Your account may have hit usage restrictions\n• The service may be temporarily rate-limited\n\nSuggested actions:\n1. Wait 1-24 hours before trying again\n2. Switch to a different AI provider\n3. Check your Puter.js account status`;

        // Show in UI with distinct styling
        this.displayServerQuotaWarning(warningMessage);

        // Log for debugging
        logger.warn('Server-side quota error detected:', errorRecord);
    }

    displayServerQuotaWarning(message) {
        // Create or update server quota warning element
        let warningEl = document.getElementById('puter-server-quota-warning');
        if (!warningEl) {
            warningEl = DOM.create('div', {
                id: 'puter-server-quota-warning',
                className: 'server-quota-warning'
            });

            // Insert at the top of provider section for visibility
            const providerSection = DOM.query('#provider-section');
            if (providerSection) {
                providerSection.insertBefore(warningEl, providerSection.firstChild);
            }
        }

        warningEl.style.cssText = `
            background: #dc2626;
            color: white;
            padding: 16px;
            margin: 0 0 16px 0;
            border-radius: 8px;
            font-size: 0.9em;
            line-height: 1.5;
            border-left: 4px solid #991b1b;
            white-space: pre-line;
        `;

        warningEl.textContent = message;

        // Add a retry button
        const retryButton = DOM.create('button', {
            className: 'retry-button',
            textContent: '🔄 Try Different Provider'
        });

        retryButton.style.cssText = `
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            padding: 8px 16px;
            margin-top: 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85em;
        `;

        retryButton.onclick = () => {
            // Suggest switching to cloud provider
            if (confirm('Switch to Cloud AI provider? This will reload the page with a different AI service.')) {
                window.location.href = window.location.href.replace('puter.html', 'cloud.html');
            }
        };

        warningEl.appendChild(retryButton);
    }

    // Method to clear server quota warnings (for testing)
    clearServerQuotaWarning() {
        const warningEl = document.getElementById('puter-server-quota-warning');
        if (warningEl && warningEl.parentNode) {
            warningEl.parentNode.removeChild(warningEl);
        }
        return 'Server quota warning cleared';
    }

    updateProviderStatus() {
        const modelName = this.getModelDisplayName(this.currentModel);
        const usage = this.usageTracker;
        const percentage = Math.round((usage.requestCount / this.dailyRequestLimit) * 100);

        this.isConnected = true;

        // Always show usage info in console for debugging
        logger.info(`Puter usage today: ${usage.requestCount}/${this.dailyRequestLimit} (${percentage}%)`);

        // Update the status display in UI
        this.updateUsageDisplay(usage.requestCount, this.dailyRequestLimit, percentage);
    }

    updateUsageDisplay(used, limit, percentage) {
        // Find or create usage display element
        let usageDisplay = document.getElementById('puter-usage-display');
        if (!usageDisplay) {
            usageDisplay = DOM.create('div', {
                id: 'puter-usage-display',
                className: 'usage-display'
            });

            // Insert after the puter status section
            const statusEl = document.querySelector('.puter-status');
            if (statusEl && statusEl.parentNode) {
                statusEl.parentNode.insertBefore(usageDisplay, statusEl.nextSibling);
            }
        }

        // Determine color based on usage percentage
        let statusColor = '#28a745'; // green
        let statusIcon = '✅';
        if (percentage >= 90) {
            statusColor = '#f59e0b'; // amber
            statusIcon = '⚠️';
        } else if (percentage >= 80) {
            statusColor = '#3b82f6'; // blue
            statusIcon = '📊';
        }

        usageDisplay.style.cssText = `
            background: ${statusColor};
            color: white;
            padding: 8px 12px;
            margin: 8px 0;
            border-radius: 6px;
            font-size: 0.85em;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        usageDisplay.innerHTML = `
            <span>${statusIcon}</span>
            <span>Daily usage: ${used}/${limit} requests (${percentage}%)</span>
        `;
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
                let isQuotaError = false;

                if (response.error) {
                    if (typeof response.error === 'string') {
                        errorMsg = response.error;
                    } else if (response.error.message) {
                        errorMsg = response.error.message;
                    } else if (response.error.error) {
                        // Handle nested error structure
                        errorMsg = response.error.error;
                    } else {
                        errorMsg = JSON.stringify(response.error, null, 2);
                    }
                } else if (response.message) {
                    errorMsg = response.message;
                }

                // Check if this is a quota/limit error
                const quotaKeywords = ['quota', 'limit', 'rate', 'usage', 'exceeded', 'too many'];
                isQuotaError = quotaKeywords.some(keyword =>
                    errorMsg.toLowerCase().includes(keyword)
                );

                // Show detailed error information for debugging
                logger.error(`Puter.js detailed error:`, {
                    fullResponse: response,
                    extractedMessage: errorMsg,
                    isQuotaError: isQuotaError
                });

                if (isQuotaError) {
                    // Show a user-friendly quota error with more context
                    throw new Error(`Puter.js quota exceeded: ${errorMsg}\n\nThis appears to be a server-side limit from Puter.js. You may need to:\n1. Wait and try again later\n2. Try a different AI provider (Cloud, WebLLM, or Ollama)\n3. Check your Puter.js account at https://puter.com for quota details`);
                } else {
                    throw new Error(`Puter.js API error: ${errorMsg}`);
                }
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

    formatError(error) {
        // Extract user-friendly error message from Puter.js errors
        let errorMessage = 'Unknown error occurred';

        if (error && error.message) {
            errorMessage = error.message;
        } else if (error && typeof error === 'string') {
            errorMessage = error;
        } else if (error && typeof error === 'object') {
            try {
                errorMessage = JSON.stringify(error);
            } catch (e) {
                errorMessage = 'Complex error occurred';
            }
        }

        // Clean up technical error messages for users
        if (errorMessage.includes('Puter.js API error:')) {
            errorMessage = errorMessage.replace('Puter.js API error: ', '');
        }

        // Handle quota/limit errors with clear guidance
        const quotaKeywords = ['quota', 'limit', 'rate', 'usage', 'exceeded', 'too many'];
        const isQuotaError = quotaKeywords.some(keyword =>
            errorMessage.toLowerCase().includes(keyword)
        );

        if (isQuotaError) {
            return `Puter.js usage limit exceeded. The free service has daily limits that have been reached. Please try again later or switch to a different AI provider.`;
        }

        // Handle authentication errors
        if (errorMessage.toLowerCase().includes('auth')) {
            return `Puter.js authentication required. Please allow the popup window to complete free account setup.`;
        }

        // Handle network errors
        if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('connection')) {
            return `Network connection error. Please check your internet connection and try again.`;
        }

        // Return cleaned error message
        return errorMessage.length > 200
            ? errorMessage.substring(0, 200) + '...'
            : errorMessage;
    }
}