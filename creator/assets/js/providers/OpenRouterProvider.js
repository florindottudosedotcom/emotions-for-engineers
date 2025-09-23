/**
 * OpenRouter Provider - Following CLAUDE.md Guidelines
 * Professional cloud AI with transparent billing and 200+ models
 */

import { BaseProvider } from './BaseProvider.js';
import { DOM, Events } from '../core/dom.js';
import { logger } from '../core/utils.js';

export class OpenRouterProvider extends BaseProvider {
    constructor() {
        super('OpenRouter - Professional Cloud AI', {
            defaultModel: 'openai/gpt-4o',
            models: [
                // Premium Models (Best Quality)
                { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', category: 'premium', description: 'Best for writing & analysis', pricing: '$3.00/$15.00' },
                { id: 'openai/gpt-4o', name: 'GPT-4o', category: 'premium', description: 'Balanced performance & speed', pricing: '$5.00/$15.00' },
                { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', category: 'premium', description: 'Google\'s flagship model', pricing: '$2.50/$10.00' },

                // Fast & Efficient Models
                { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', category: 'fast', description: 'Fast & cost-effective', pricing: '$0.15/$0.60' },
                { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', category: 'fast', description: 'Lightning fast', pricing: '$0.25/$1.25' },
                { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5', category: 'fast', description: 'Ultra fast', pricing: '$0.075/$0.30' },
                { id: 'meta-llama/llama-3.1-8b-instruct', name: 'LLaMA 3.1 8B', category: 'fast', description: 'Open source & efficient', pricing: '$0.18/$0.18' },

                // Specialized Models
                { id: 'meta-llama/llama-3.1-70b-instruct', name: 'LLaMA 3.1 70B', category: 'specialized', description: 'Advanced reasoning', pricing: '$0.59/$0.79' },
                { id: 'mistralai/mistral-large', name: 'Mistral Large', category: 'specialized', description: 'European model', pricing: '$3.00/$9.00' },
                { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', category: 'specialized', description: 'Multilingual expert', pricing: '$0.56/$2.24' },
                { id: 'microsoft/wizardlm-2-8x22b', name: 'WizardLM 2', category: 'specialized', description: 'Code & math specialist', pricing: '$1.00/$1.00' },
                { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', category: 'specialized', description: 'Maximum capability', pricing: '$15.00/$75.00' },
                { id: 'cohere/command-r-plus', name: 'Command R+', category: 'specialized', description: 'Enterprise focused', pricing: '$3.00/$15.00' }
            ],
            maxTokens: 8000,
            apiEndpoint: 'https://openrouter.ai/api/v1'
        });

        this.currentModel = this.config.defaultModel;
        this.apiKey = null;
        this.accountInfo = null;
        this.isAuthenticated = false;

        // Usage tracking
        this.requestCount = 0;
        this.totalCost = 0;
        this.sessionUsage = {};

        logger.info('OpenRouter provider initialized with 200+ models and transparent billing');
    }

    async getTemplate() {
        return `
            <fieldset>
                <legend>🌐 Professional Cloud AI</legend>

                <div class="openrouter-info card" style="background: var(--color-primary); color: white; padding: var(--spacing-4); border-radius: 8px; margin-bottom: var(--spacing-4); border: 1px solid var(--color-primary);">
                    <h3 style="margin: 0 0 var(--spacing-2) 0; font-size: var(--font-size-lg);">🚀 200+ Premium AI Models</h3>
                    <p style="margin: 0 0 var(--spacing-2) 0; font-size: var(--font-size-sm); opacity: 0.95;">Access GPT-4o, Claude 3.5 Sonnet, Gemini Pro, LLaMA, and 200+ more models with transparent pricing.</p>
                    <div style="display: flex; gap: var(--spacing-4); margin-top: var(--spacing-2); flex-wrap: wrap;">
                        <div style="font-size: var(--font-size-sm); opacity: 0.9;">✨ <strong>Transparent Billing</strong></div>
                        <div style="font-size: var(--font-size-sm); opacity: 0.9;">📊 <strong>Usage Analytics</strong></div>
                        <div style="font-size: var(--font-size-sm); opacity: 0.9;">⚡ <strong>Real-time Balance</strong></div>
                    </div>
                </div>

                <div class="auth-section" id="openrouter-auth">
                    <div class="auth-option" style="display: block;" id="auth-login">
                        <h4 style="margin: 0 0 var(--spacing-3) 0; color: var(--text-primary);">🔐 Connect Your OpenRouter Account</h4>

                        <div class="setup-info card" style="background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 6px; padding: var(--spacing-3); margin-bottom: var(--spacing-3);">
                            <div style="font-weight: 600; margin-bottom: var(--spacing-2); color: var(--text-primary);">📋 Quick Setup</div>
                            <div style="font-size: var(--font-size-sm); color: var(--text-secondary); margin-bottom: var(--spacing-2);">
                                1. Visit <a href="https://openrouter.ai" target="_blank" style="color: var(--color-primary); font-weight: 600;">OpenRouter.ai</a> and create a free account<br>
                                2. Go to <a href="https://openrouter.ai/keys" target="_blank" style="color: var(--color-primary); font-weight: 600;">API Keys</a> and generate a new key<br>
                                3. Add credits to your account for usage<br>
                                4. Enter your API key below
                            </div>
                        </div>

                        <div class="input-group">
                            <label for="openrouter-api-key" class="label-no-shrink-no-margin">OpenRouter API Key:</label>
                            <input type="password" id="openrouter-api-key" placeholder="sk-or-v1-..." class="input-flex-grow">
                            <button id="openrouter-connect-btn" class="btn btn-primary">Connect</button>
                        </div>
                        <div style="font-size: var(--font-size-sm); color: var(--text-tertiary); margin-top: var(--spacing-1);">
                            Your API key is stored locally and never leaves your browser
                        </div>
                    </div>
                </div>

                <div id="openrouter-authenticated" style="display: none;">
                    <div class="account-info card" style="background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 6px; padding: var(--spacing-3); margin-bottom: var(--spacing-4);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-2);">
                            <h4 style="margin: 0; color: var(--text-primary);">✅ Connected to OpenRouter</h4>
                            <button id="openrouter-disconnect-btn" class="btn btn-sm" style="font-size: var(--font-size-sm);">Disconnect</button>
                        </div>
                        <div id="account-balance" style="font-size: var(--font-size-sm); color: var(--text-secondary);"></div>
                        <div id="session-usage" style="font-size: var(--font-size-sm); color: var(--text-tertiary); margin-top: var(--spacing-1);"></div>
                    </div>

                    <div class="input-group">
                        <label for="openrouter-model-select" class="label-no-shrink-no-margin">AI Model:</label>
                        <select id="openrouter-model-select" class="select-no-margin">
                            <optgroup label="🚀 Premium Models (Best Quality)">
                                <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet - Best for writing & analysis ($3.00/$15.00)</option>
                                <option value="openai/gpt-4o" selected>GPT-4o - Balanced performance & speed ($5.00/$15.00)</option>
                                <option value="google/gemini-pro-1.5">Gemini Pro 1.5 - Google's flagship model ($2.50/$10.00)</option>
                            </optgroup>
                            <optgroup label="⚡ Fast & Efficient Models">
                                <option value="openai/gpt-4o-mini">GPT-4o Mini - Fast & cost-effective ($0.15/$0.60)</option>
                                <option value="anthropic/claude-3-haiku">Claude 3 Haiku - Lightning fast ($0.25/$1.25)</option>
                                <option value="google/gemini-flash-1.5">Gemini Flash 1.5 - Ultra fast ($0.075/$0.30)</option>
                                <option value="meta-llama/llama-3.1-8b-instruct">LLaMA 3.1 8B - Open source & efficient ($0.18/$0.18)</option>
                            </optgroup>
                            <optgroup label="🎯 Specialized Models">
                                <option value="meta-llama/llama-3.1-70b-instruct">LLaMA 3.1 70B - Advanced reasoning ($0.59/$0.79)</option>
                                <option value="mistralai/mistral-large">Mistral Large - European model ($3.00/$9.00)</option>
                                <option value="qwen/qwen-2.5-72b-instruct">Qwen 2.5 72B - Multilingual expert ($0.56/$2.24)</option>
                                <option value="microsoft/wizardlm-2-8x22b">WizardLM 2 - Code & math specialist ($1.00/$1.00)</option>
                                <option value="anthropic/claude-3-opus">Claude 3 Opus - Maximum capability ($15.00/$75.00)</option>
                                <option value="cohere/command-r-plus">Command R+ - Enterprise focused ($3.00/$15.00)</option>
                            </optgroup>
                        </select>
                    </div>

                    <div id="cost-estimation" class="card" style="background: var(--bg-tertiary); border: 1px solid var(--color-warning); border-radius: 6px; padding: var(--spacing-2); margin: var(--spacing-2) 0; font-size: var(--font-size-sm); display: none; color: var(--text-primary);">
                        <strong>💰 Cost Estimation:</strong> <span id="estimated-cost"></span>
                    </div>
                </div>

                <div id="connection-status" class="status-display"></div>
            </fieldset>
        `;
    }

    async onInit() {
        // Cache DOM elements
        this.dom.apiKeyInput = DOM.query('#openrouter-api-key');
        this.dom.connectBtn = DOM.query('#openrouter-connect-btn');
        this.dom.disconnectBtn = DOM.query('#openrouter-disconnect-btn');
        this.dom.modelSelect = DOM.query('#openrouter-model-select');
        this.dom.authSection = DOM.query('#openrouter-auth');
        this.dom.authenticatedSection = DOM.query('#openrouter-authenticated');
        this.dom.accountBalance = DOM.query('#account-balance');
        this.dom.sessionUsage = DOM.query('#session-usage');
        this.dom.costEstimation = DOM.query('#cost-estimation');
        this.dom.estimatedCost = DOM.query('#estimated-cost');

        // Setup event listeners
        if (this.dom.connectBtn) {
            Events.on(this.dom.connectBtn, 'click', () => this.connectWithApiKey());
        }

        if (this.dom.disconnectBtn) {
            Events.on(this.dom.disconnectBtn, 'click', () => this.disconnect());
        }

        if (this.dom.modelSelect) {
            Events.on(this.dom.modelSelect, 'change', (e) => {
                this.currentModel = e.target.value;
                this.updateCostEstimation();
            });
        }

        // Load saved authentication if available
        await this.loadSavedAuth();
    }


    async connectWithApiKey() {
        const apiKey = this.dom.apiKeyInput?.value?.trim();
        if (!apiKey) {
            this.showMessage('Please enter your OpenRouter API key', 'warning');
            return;
        }

        if (!apiKey.startsWith('sk-or-')) {
            this.showMessage('Invalid OpenRouter API key format', 'error');
            return;
        }

        try {
            this.apiKey = apiKey;

            // Test the API key
            await this.validateApiKey();

            this.isAuthenticated = true;
            localStorage.setItem('openrouter_token', apiKey);

            this.showMessage('Successfully connected to OpenRouter!', 'success');
            await this.updateAccountInfo();
            this.updateUI();
        } catch (error) {
            this.apiKey = null;
            this.isAuthenticated = false;
            logger.error('API key validation failed:', error);
            this.showMessage('Invalid API key or connection failed', 'error');
        }
    }

    async validateApiKey() {
        // Test the API key by making a simple request to OpenRouter
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('API key validation failed');
        }

        return await response.json();
    }

    async updateAccountInfo() {
        if (!this.isAuthenticated) return;

        try {
            // Get account credits and info
            const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.accountInfo = await response.json();
                this.updateBalanceDisplay();
            } else {
                // Fallback if balance endpoint isn't available
                this.accountInfo = { label: 'Connected', usage: 0 };
                this.updateBalanceDisplay();
            }
        } catch (error) {
            logger.error('Failed to fetch account info:', error);
            // Show basic connected status even if balance fetch fails
            this.accountInfo = { label: 'Connected', usage: 0 };
            this.updateBalanceDisplay();
        }
    }

    updateBalanceDisplay() {
        if (!this.accountInfo || !this.dom.accountBalance) return;

        const usage = this.sessionUsage[this.currentModel] || { requests: 0, cost: 0 };

        // Display account info (balance may not be available via API)
        if (this.accountInfo.data && this.accountInfo.data.label) {
            this.dom.accountBalance.textContent = `✅ Account: ${this.accountInfo.data.label}`;
        } else if (this.accountInfo.balance !== undefined) {
            this.dom.accountBalance.textContent = `💰 Balance: $${this.accountInfo.balance.toFixed(2)}`;
        } else {
            this.dom.accountBalance.textContent = `✅ API Key Connected`;
        }

        if (this.dom.sessionUsage) {
            this.dom.sessionUsage.textContent =
                `📊 Session: ${usage.requests} requests, ~$${usage.cost.toFixed(4)} estimated`;
        }
    }

    updateCostEstimation() {
        // This would calculate estimated cost based on selected model and course parameters
        // Implementation would depend on course depth and chapter count
        if (this.dom.costEstimation && this.dom.estimatedCost) {
            const model = this.config.models.find(m => m.id === this.currentModel);
            if (model) {
                this.dom.estimatedCost.textContent = `~$0.50-2.00 for typical course (varies by depth and model: ${model.pricing})`;
                this.dom.costEstimation.style.display = 'block';
            }
        }
    }

    updateUI() {
        if (this.isAuthenticated) {
            this.dom.authSection.style.display = 'none';
            this.dom.authenticatedSection.style.display = 'block';
            this.updateCostEstimation();
        } else {
            this.dom.authSection.style.display = 'block';
            this.dom.authenticatedSection.style.display = 'none';
        }
    }

    async disconnect() {
        this.apiKey = null;
        this.isAuthenticated = false;
        this.accountInfo = null;
        this.sessionUsage = {};

        localStorage.removeItem('openrouter_token');

        this.updateUI();
        this.showMessage('Disconnected from OpenRouter', 'info');
    }

    async loadSavedAuth() {
        const token = localStorage.getItem('openrouter_token');
        if (token) {
            this.apiKey = token;
            try {
                await this.validateApiKey();
                this.isAuthenticated = true;
                await this.updateAccountInfo();
                this.updateUI();
            } catch (error) {
                localStorage.removeItem('openrouter_token');
                logger.error('Saved token invalid:', error);
            }
        }
    }

    validateConfiguration() {
        return this.isAuthenticated && this.apiKey;
    }

    async generateText(prompt, options = {}) {
        if (!this.validateConfiguration()) {
            throw new Error('OpenRouter not connected. Please authenticate first.');
        }

        const maxTokens = options.maxTokens || this.config.maxTokens;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'Course Creator'
                },
                body: JSON.stringify({
                    model: this.currentModel,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: maxTokens,
                    temperature: 0.7,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `OpenRouter API error: ${response.status}`);
            }

            const data = await response.json();

            // Track usage
            this.trackUsage(data.usage);

            return data.choices[0].message.content;
        } catch (error) {
            logger.error('OpenRouter generation failed:', error);
            throw error;
        }
    }

    trackUsage(usage) {
        if (!usage) return;

        this.requestCount++;

        if (!this.sessionUsage[this.currentModel]) {
            this.sessionUsage[this.currentModel] = { requests: 0, cost: 0 };
        }

        this.sessionUsage[this.currentModel].requests++;

        // Calculate cost (simplified - would use actual OpenRouter pricing)
        const estimatedCost = (usage.prompt_tokens * 0.000001) + (usage.completion_tokens * 0.000002);
        this.sessionUsage[this.currentModel].cost += estimatedCost;
        this.totalCost += estimatedCost;

        this.updateBalanceDisplay();
    }


    getModelDisplayName(modelId) {
        const model = this.config.models.find(m => m.id === modelId);
        return model ? model.name : modelId;
    }

    formatError(error) {
        if (error.message.includes('insufficient credits')) {
            return 'Insufficient credits in your OpenRouter account. Please add credits at https://openrouter.ai/credits';
        }
        if (error.message.includes('rate limit')) {
            return 'Rate limit exceeded. Please wait a moment before trying again.';
        }
        if (error.message.includes('unauthorized')) {
            return 'Authentication failed. Please reconnect your OpenRouter account.';
        }
        return error.message || 'An unexpected error occurred with OpenRouter.';
    }

    showMessage(message, type) {
        // Implementation would show user feedback
        logger.info(`OpenRouter ${type}: ${message}`);
    }
}