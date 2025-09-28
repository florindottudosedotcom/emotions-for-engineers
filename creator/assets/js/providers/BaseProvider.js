/**
 * Base Provider Class - Following CLAUDE.md Guidelines
 * Standardized provider interface for all AI providers
 */

import { EventEmitter, logger } from '../core/utils.js';

/**
 * Base class for all AI providers
 */
export class BaseProvider extends EventEmitter {
    constructor(name, config = {}) {
        super();
        this.name = name;
        this.config = { ...this.getDefaultConfig(), ...config };
        this.isInitialized = false;
        this.isConnected = false;
        this.dom = {};
        this.appState = null;
    }

    /**
     * Get default configuration
     * @returns {Object} Default config
     */
    getDefaultConfig() {
        return {
            timeout: 30000,
            retries: 3,
            retryDelay: 1000
        };
    }

    /**
     * Initialize the provider
     * @param {Object} dom - DOM elements
     * @param {Object} appState - Application state
     */
    async init(dom, appState) {
        try {
            this.dom = dom;
            this.appState = appState;

            // Initialize provider-specific setup
            await this.onInit();

            this.isInitialized = true;
            this.emit('initialized');

            logger.info(`${this.name} provider initialized`);
        } catch (error) {
            logger.error(`Failed to initialize ${this.name} provider:`, error);
            throw error;
        }
    }

    /**
     * Provider-specific initialization
     * Override in subclasses
     */
    async onInit() {
        // Override in subclasses
    }

    /**
     * Get HTML template for provider UI
     * @returns {string} HTML template
     */
    async getTemplate() {
        throw new Error('getTemplate must be implemented by provider');
    }

    /**
     * Generate text using the provider
     * @param {string} prompt - Text prompt
     * @param {Object} options - Generation options
     * @returns {Promise<string>} Generated text
     */
    async generateText(prompt, options = {}) {
        throw new Error('generateText must be implemented by provider');
    }

    /**
     * Validate provider configuration
     * @returns {boolean} True if valid
     */
    validateConfiguration() {
        return true;
    }

    /**
     * Test connection to provider
     * @returns {Promise<boolean>} True if connected
     */
    async testConnection() {
        try {
            const result = await this.generateText('Hello', { maxTokens: 5 });
            this.isConnected = !!result;
            return this.isConnected;
        } catch (error) {
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Update connection status in UI
     * @param {string} message - Status message
     * @param {string} type - Status type (success, warning, error, info)
     */
    updateConnectionStatus(message, type = 'info') {
        const statusElement = this.dom.connectionStatus;
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-display status-${type} show`;
        }

        this.emit('statusUpdate', { message, type });
    }

    /**
     * Get provider capabilities
     * @returns {Object} Capabilities object
     */
    getCapabilities() {
        return {
            textGeneration: true,
            streaming: false,
            imageGeneration: false,
            codeGeneration: true,
            maxTokens: 4000
        };
    }

    /**
     * Get provider models
     * @returns {Array} Available models
     */
    getAvailableModels() {
        return [];
    }

    /**
     * Set provider model
     * @param {string} model - Model name
     */
    setModel(model) {
        this.config.model = model;
        this.emit('modelChanged', model);
    }

    /**
     * Get current model
     * @returns {string} Current model name
     */
    getCurrentModel() {
        return this.config.model || this.getAvailableModels()[0] || 'default';
    }

    /**
     * Handle API errors with retry logic
     * @param {Function} apiCall - API call function
     * @param {number} retries - Number of retries
     * @returns {Promise} API call result
     */
    async withRetry(apiCall, retries = this.config.retries) {
        let lastError;

        for (let i = 0; i <= retries; i++) {
            try {
                return await apiCall();
            } catch (error) {
                lastError = error;

                // Don't retry on authentication errors
                if (error.status === 401 || error.status === 403) {
                    throw error;
                }

                // Don't retry on the last attempt
                if (i === retries) {
                    break;
                }

                // Wait before retrying
                await this.delay(this.config.retryDelay * (i + 1));
                logger.warn(`Retrying API call (attempt ${i + 2}/${retries + 1})`);
            }
        }

        throw lastError;
    }

    /**
     * Delay helper
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise} Delay promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Format error message for user
     * @param {Error} error - Error object
     * @returns {string} User-friendly error message
     */
    formatError(error) {
        if (error.status === 401) {
            return 'Invalid API key. Please check your credentials.';
        } else if (error.status === 403) {
            return 'Access forbidden. Please check your API key permissions.';
        } else if (error.status === 429) {
            return 'Rate limit exceeded. Please wait and try again.';
        } else if (error.status >= 500) {
            return 'Server error. Please try again later.';
        } else if (error.message) {
            return error.message;
        } else {
            return 'An unexpected error occurred.';
        }
    }

    /**
     * Save provider state
     * @param {Object} state - Current state
     * @returns {Object} Extended state with provider data
     */
    saveStateExtensions(state) {
        return {
            ...state,
            [`${this.name.toLowerCase()}Config`]: this.config
        };
    }

    /**
     * Load provider state
     * @param {Object} state - Saved state
     */
    loadStateExtensions(state) {
        const configKey = `${this.name.toLowerCase()}Config`;
        if (state[configKey]) {
            this.config = { ...this.config, ...state[configKey] };
        }
    }

    /**
     * Refresh provider (e.g., when tab becomes active)
     */
    refresh() {
        // Check connection status
        this.testConnection().then(connected => {
            if (connected) {
                this.updateConnectionStatus(`✅ ${this.name} is connected`, 'success');
            } else {
                this.updateConnectionStatus(`❌ ${this.name} connection failed`, 'error');
            }
        });
    }

    /**
     * Cleanup provider resources
     */
    destroy() {
        this.removeAllListeners();
        this.isInitialized = false;
        this.isConnected = false;
        this.dom = {};
        this.appState = null;
        logger.info(`${this.name} provider destroyed`);
    }

    /**
     * Get provider status information
     * @returns {Object} Status object
     */
    getStatus() {
        return {
            name: this.name,
            initialized: this.isInitialized,
            connected: this.isConnected,
            model: this.getCurrentModel(),
            capabilities: this.getCapabilities(),
            config: { ...this.config }
        };
    }

    /**
     * Estimate token count (rough approximation)
     * @param {string} text - Text to count tokens for
     * @returns {number} Estimated token count
     */
    estimateTokens(text) {
        // Rough estimation: 1 token ≈ 4 characters for English
        return Math.ceil(text.length / 4);
    }

    /**
     * Check if prompt is within token limits
     * @param {string} prompt - Prompt to check
     * @returns {boolean} True if within limits
     */
    isWithinTokenLimits(prompt) {
        const tokenCount = this.estimateTokens(prompt);
        const maxTokens = this.getCapabilities().maxTokens || 4000;
        return tokenCount <= maxTokens * 0.8; // Leave 20% buffer for response
    }

    /**
     * Truncate prompt if too long
     * @param {string} prompt - Original prompt
     * @returns {string} Truncated prompt
     */
    truncatePrompt(prompt) {
        if (this.isWithinTokenLimits(prompt)) {
            return prompt;
        }

        const maxTokens = this.getCapabilities().maxTokens || 4000;
        const maxChars = Math.floor(maxTokens * 0.6 * 4); // 60% of limit

        if (prompt.length <= maxChars) {
            return prompt;
        }

        return prompt.substring(0, maxChars) + '\n\n[Content truncated due to length limits]';
    }
}

/**
 * Provider registry for managing multiple providers
 */
export class ProviderRegistry {
    constructor() {
        this.providers = new Map();
        this.activeProvider = null;
    }

    /**
     * Register a provider
     * @param {string} name - Provider name
     * @param {BaseProvider} provider - Provider instance
     */
    register(name, provider) {
        this.providers.set(name, provider);
        logger.info(`Provider registered: ${name}`);
    }

    /**
     * Get provider by name
     * @param {string} name - Provider name
     * @returns {BaseProvider|null} Provider instance
     */
    get(name) {
        return this.providers.get(name) || null;
    }

    /**
     * Set active provider
     * @param {string} name - Provider name
     * @returns {boolean} True if successful
     */
    setActive(name) {
        const provider = this.get(name);
        if (provider) {
            this.activeProvider = provider;
            logger.info(`Active provider set to: ${name}`);
            return true;
        }
        return false;
    }

    /**
     * Get active provider
     * @returns {BaseProvider|null} Active provider
     */
    getActive() {
        return this.activeProvider;
    }

    /**
     * List all registered providers
     * @returns {Array<string>} Provider names
     */
    list() {
        return Array.from(this.providers.keys());
    }

    /**
     * Remove provider
     * @param {string} name - Provider name
     */
    unregister(name) {
        const provider = this.providers.get(name);
        if (provider) {
            provider.destroy();
            this.providers.delete(name);
            if (this.activeProvider === provider) {
                this.activeProvider = null;
            }
            logger.info(`Provider unregistered: ${name}`);
        }
    }

    /**
     * Cleanup all providers
     */
    clear() {
        this.providers.forEach(provider => provider.destroy());
        this.providers.clear();
        this.activeProvider = null;
        logger.info('All providers cleared');
    }
}