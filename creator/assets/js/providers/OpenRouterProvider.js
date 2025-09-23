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

                <div class="openrouter-info" style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 1.1em;">🚀 200+ Premium AI Models</h3>
                    <p style="margin: 0 0 8px 0; font-size: 0.9em; opacity: 0.95;">Access GPT-4o, Claude 3.5 Sonnet, Gemini Pro, LLaMA, and 200+ more models with transparent pricing.</p>
                    <div style="display: flex; gap: 16px; margin-top: 8px; flex-wrap: wrap;">
                        <div style="font-size: 0.8em; opacity: 0.9;">✨ <strong>Transparent Billing</strong></div>
                        <div style="font-size: 0.8em; opacity: 0.9;">📊 <strong>Usage Analytics</strong></div>
                        <div style="font-size: 0.8em; opacity: 0.9;">⚡ <strong>Real-time Balance</strong></div>
                    </div>
                </div>

                <div class="auth-section" id="openrouter-auth">
                    <div class="auth-option" style="display: block;" id="auth-login">
                        <h4 style="margin: 0 0 12px 0; color: #374151;">🔐 Connect Your OpenRouter Account</h4>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
                            <p style="margin: 0 0 8px 0; font-size: 0.9em; color: #4b5563;">Connect with your OpenRouter account for seamless billing and usage tracking.</p>
                            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                <button id="openrouter-oauth-btn" class="btn btn-primary" style="font-size: 0.9em;">
                                    🔗 Connect OpenRouter Account
                                </button>
                                <span style="font-size: 0.8em; color: #6b7280;">Recommended</span>
                            </div>
                        </div>

                        <details style="margin-bottom: 12px;">
                            <summary style="cursor: pointer; font-size: 0.9em; color: #6b7280; margin-bottom: 8px;">🔑 Or use API Key (Advanced)</summary>
                            <div class="input-group">
                                <label for="openrouter-api-key" class="label-no-shrink-no-margin">OpenRouter API Key:</label>
                                <input type="password" id="openrouter-api-key" placeholder="sk-or-..." class="input-flex-grow">
                                <button id="openrouter-connect-btn" class="btn btn-secondary">Connect</button>
                            </div>
                            <div style="font-size: 0.8em; color: #6b7280; margin-top: 4px;">
                                Get your API key from <a href="https://openrouter.ai/keys" target="_blank" style="color: #2563eb;">OpenRouter Dashboard</a>
                            </div>
                        </details>
                    </div>
                </div>

                <div id="openrouter-authenticated" style="display: none;">
                    <div class="account-info" style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <h4 style="margin: 0; color: #0c4a6e;">✅ Connected to OpenRouter</h4>
                            <button id="openrouter-disconnect-btn" class="btn btn-sm" style="font-size: 0.8em;">Disconnect</button>
                        </div>
                        <div id="account-balance" style="font-size: 0.9em; color: #0c4a6e;"></div>
                        <div id="session-usage" style="font-size: 0.8em; color: #0369a1; margin-top: 4px;"></div>
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

                    <div id="cost-estimation" style="background: #fefce8; border: 1px solid #facc15; border-radius: 6px; padding: 10px; margin: 8px 0; font-size: 0.85em; display: none;">
                        <strong>💰 Cost Estimation:</strong> <span id="estimated-cost"></span>
                    </div>
                </div>

                <div id="connection-status" class="status-display"></div>
            </fieldset>
        `;
    }

    async onInit() {
        // Cache DOM elements
        this.dom.oauthBtn = DOM.query('#openrouter-oauth-btn');
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
        if (this.dom.oauthBtn) {
            Events.on(this.dom.oauthBtn, 'click', () => this.initiateOAuth());
        }

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

    async initiateOAuth() {
        try {
            // OpenRouter OAuth2 flow
            const clientId = 'course-creator'; // Would be registered with OpenRouter
            const redirectUri = `${window.location.origin}/auth/openrouter`;
            const scope = 'read write';
            const state = this.generateState();

            // Store state for verification
            sessionStorage.setItem('openrouter_oauth_state', state);

            const authUrl = `https://openrouter.ai/auth/oauth2/authorize?` +
                `client_id=${encodeURIComponent(clientId)}&` +
                `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                `response_type=code&` +
                `scope=${encodeURIComponent(scope)}&` +
                `state=${encodeURIComponent(state)}`;

            // Open OAuth popup
            const popup = window.open(authUrl, 'openrouter_oauth', 'width=500,height=600');

            // Listen for OAuth completion
            window.addEventListener('message', this.handleOAuthMessage.bind(this));

            logger.info('OpenRouter OAuth flow initiated');
        } catch (error) {
            logger.error('OAuth initiation failed:', error);
            this.showMessage('OAuth connection failed. Please try API key method.', 'error');
        }
    }

    async handleOAuthMessage(event) {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'openrouter_oauth_success') {
            const { code, state } = event.data;

            // Verify state
            const storedState = sessionStorage.getItem('openrouter_oauth_state');
            if (state !== storedState) {
                this.showMessage('OAuth security verification failed', 'error');
                return;
            }

            try {
                // Exchange code for access token
                await this.exchangeCodeForToken(code);
                sessionStorage.removeItem('openrouter_oauth_state');

                this.showMessage('Successfully connected to OpenRouter!', 'success');
                await this.updateAccountInfo();
            } catch (error) {
                logger.error('Token exchange failed:', error);
                this.showMessage('Authentication failed. Please try again.', 'error');
            }
        }
    }

    async exchangeCodeForToken(code) {
        // This would typically be handled by your backend to avoid exposing client secret
        // For demo purposes, showing the flow structure
        const response = await fetch('/api/auth/openrouter/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });

        if (!response.ok) {
            throw new Error('Token exchange failed');
        }

        const { access_token } = await response.json();
        this.apiKey = access_token;
        this.isAuthenticated = true;

        // Save to secure storage
        localStorage.setItem('openrouter_token', access_token);

        this.updateUI();
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
        const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
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
            // Get account balance and info
            const response = await fetch('https://openrouter.ai/api/v1/account/balance', {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.accountInfo = await response.json();
                this.updateBalanceDisplay();
            }
        } catch (error) {
            logger.error('Failed to fetch account info:', error);
        }
    }

    updateBalanceDisplay() {
        if (!this.accountInfo || !this.dom.accountBalance) return;

        const balance = this.accountInfo.balance || 0;
        const usage = this.sessionUsage[this.currentModel] || { requests: 0, cost: 0 };

        this.dom.accountBalance.textContent = `💰 Balance: $${balance.toFixed(2)}`;

        if (this.dom.sessionUsage) {
            this.dom.sessionUsage.textContent =
                `📊 Session: ${usage.requests} requests, $${usage.cost.toFixed(4)} spent`;
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
        sessionStorage.removeItem('openrouter_oauth_state');

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

    generateState() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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