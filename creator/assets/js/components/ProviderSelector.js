/**
 * Provider Selector Component - Following CLAUDE.md Guidelines
 * Reusable provider selection for OpenRouter, WebLLM, and Ollama
 */

import { DOM, Events } from '../core/dom.js';
import { logger } from '../core/utils.js';

export class ProviderSelector {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = null;
        this.options = {
            title: 'AI Provider',
            description: 'Choose your AI provider',
            defaultProvider: 'openrouter',
            showSettingsModal: true,
            showHelpModal: true,
            ...options
        };
        this.currentProvider = this.options.defaultProvider;
        this.isInitialized = false;
    }

    /**
     * Get provider configuration
     */
    getProviderConfig() {
        return {
            openrouter: {
                name: 'OpenRouter',
                icon: '🌐',
                description: 'Professional Cloud AI',
                longDescription: 'Access 200+ AI models from OpenAI, Anthropic, Google, Meta, and more with transparent pricing',
                url: 'openrouter.html'
            },
            webllm: {
                name: 'WebLLM',
                icon: '🖥️',
                description: 'Browser AI',
                longDescription: 'Run AI models directly in your browser - no server required, completely private',
                url: 'webllm.html'
            },
            ollama: {
                name: 'Ollama',
                icon: '🏠',
                description: 'Private AI',
                longDescription: 'Use your own local Ollama installation for maximum privacy and control',
                url: 'ollama.html'
            }
        };
    }

    /**
     * Generate HTML template for the provider selector
     */
    getTemplate() {
        const providers = this.getProviderConfig();
        const currentProviderConfig = providers[this.currentProvider];

        const providerLinks = Object.entries(providers).map(([key, provider]) => {
            const isActive = key === this.currentProvider;
            return `
                <a href="${provider.url}"
                   class="provider-link ${isActive ? 'current' : ''}"
                   data-provider="${key}">
                    ${provider.icon} ${provider.name} (${provider.description})
                </a>
            `;
        }).join('');

        return `
            <div class="card mb-6">
                <div class="card-header">
                    <h3>${this.options.title}</h3>
                    <p class="text-secondary">${this.options.description}</p>
                </div>
                <div class="card-body">
                    <div class="provider-info mb-4">
                        <div class="current-provider-display">
                            <span class="provider-icon">${currentProviderConfig.icon}</span>
                            <div class="provider-details">
                                <h4>${currentProviderConfig.name}</h4>
                                <p class="text-secondary">${currentProviderConfig.longDescription}</p>
                            </div>
                        </div>
                    </div>

                    ${this.options.showSettingsModal || this.options.showHelpModal ? `
                    <div class="provider-actions mb-4">
                        ${this.options.showSettingsModal ? `
                        <button type="button" id="settings-btn" class="btn btn-outline">
                            ⚙️ Switch Provider
                        </button>
                        ` : ''}
                        ${this.options.showHelpModal ? `
                        <button type="button" id="help-btn" class="btn btn-outline">
                            ❓ Help
                        </button>
                        ` : ''}
                    </div>
                    ` : ''}

                    <div id="provider-status" class="status-display"></div>
                </div>
            </div>

            <!-- Settings Modal -->
            ${this.options.showSettingsModal ? `
            <div id="settings-modal" class="modal-overlay modal-hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Settings</h2>
                        <button type="button" class="modal-close-btn" data-action="close-settings">×</button>
                    </div>
                    <div class="modal-body">
                        <h3>AI Provider Switching</h3>
                        <div class="provider-links">
                            ${providerLinks}
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Help Modal -->
            ${this.options.showHelpModal ? `
            <div id="help-modal" class="modal-overlay modal-hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">How to Use</h2>
                        <button type="button" class="modal-close-btn" data-action="close-help">×</button>
                    </div>
                    <div class="modal-body" id="help-content">
                        ${this.getHelpContent(currentProviderConfig)}
                    </div>
                </div>
            </div>
            ` : ''}
        `;
    }

    /**
     * Get help content for current provider
     */
    getHelpContent(providerConfig) {
        const helpContent = {
            openrouter: `
                <h3>OpenRouter Course Creator</h3>
                <ol>
                    <li><strong>Connect:</strong> Authenticate with your OpenRouter account or use an API key</li>
                    <li><strong>Choose Model:</strong> Select from 200+ AI models with transparent pricing</li>
                    <li><strong>Describe:</strong> Enter a description of the course you want to create</li>
                    <li><strong>Configure:</strong> Set the depth and number of chapters</li>
                    <li><strong>Generate:</strong> Click "Generate Entire Course" to create your course</li>
                    <li><strong>Review:</strong> Edit the generated content as needed</li>
                    <li><strong>Download:</strong> Export your course as a ZIP file</li>
                </ol>
                <h4>OpenRouter Benefits</h4>
                <ul>
                    <li>Access to premium models (GPT-4o, Claude 3.5, Gemini Pro)</li>
                    <li>Transparent pricing with real-time usage tracking</li>
                    <li>Professional-grade analytics and billing</li>
                    <li>No markup - same pricing as going direct to providers</li>
                </ul>
            `,
            webllm: `
                <h3>WebLLM Course Creator</h3>
                <ol>
                    <li><strong>Load Model:</strong> Select and download an AI model to your browser</li>
                    <li><strong>Wait for Loading:</strong> First-time use requires downloading model files</li>
                    <li><strong>Create Content:</strong> Generate courses entirely in your browser</li>
                    <li><strong>Privacy First:</strong> All processing happens locally - no data sent to servers</li>
                    <li><strong>Offline Capable:</strong> Works without internet after initial model download</li>
                </ol>
                <h4>WebLLM Benefits</h4>
                <ul>
                    <li>Complete privacy - no data leaves your device</li>
                    <li>No API keys or accounts required</li>
                    <li>Works offline after initial setup</li>
                    <li>Free to use (after model download)</li>
                </ul>
            `,
            ollama: `
                <h3>Ollama Course Creator</h3>
                <ol>
                    <li><strong>Install Ollama:</strong> Download and install Ollama on your computer</li>
                    <li><strong>Download Models:</strong> Use "ollama pull" to download AI models</li>
                    <li><strong>Start Server:</strong> Run "ollama serve" to start the local server</li>
                    <li><strong>Connect:</strong> The creator will automatically connect to your local Ollama instance</li>
                    <li><strong>Generate:</strong> Create courses using your local AI models</li>
                </ol>
                <h4>Ollama Benefits</h4>
                <ul>
                    <li>Maximum privacy - everything runs on your hardware</li>
                    <li>No usage limits or costs</li>
                    <li>Full control over AI models and versions</li>
                    <li>Works completely offline</li>
                </ul>
            `
        };

        return helpContent[this.currentProvider] || '<p>Help content not available.</p>';
    }

    /**
     * Initialize the provider selector
     */
    async init() {
        try {
            this.container = DOM.query(`#${this.containerId}`);
            if (!this.container) {
                throw new Error(`Container #${this.containerId} not found`);
            }

            // Detect current provider from page
            this.detectCurrentProvider();

            // Inject HTML template
            this.container.innerHTML = this.getTemplate();

            // Setup event listeners
            this.setupEventListeners();

            // Update status
            this.updateProviderStatus();

            this.isInitialized = true;
            logger.info('ProviderSelector initialized');
        } catch (error) {
            logger.error('Failed to initialize ProviderSelector:', error);
            throw error;
        }
    }

    /**
     * Detect current provider from page configuration
     */
    detectCurrentProvider() {
        if (window.COURSE_CREATOR_PROVIDER) {
            this.currentProvider = window.COURSE_CREATOR_PROVIDER;
        } else {
            // Try to detect from URL
            const url = window.location.pathname;
            if (url.includes('openrouter')) {
                this.currentProvider = 'openrouter';
            } else if (url.includes('webllm')) {
                this.currentProvider = 'webllm';
            } else if (url.includes('ollama')) {
                this.currentProvider = 'ollama';
            }
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Settings modal
        if (this.options.showSettingsModal) {
            const settingsBtn = this.container.querySelector('#settings-btn');
            const settingsModal = this.container.querySelector('#settings-modal');

            if (settingsBtn && settingsModal) {
                Events.on(settingsBtn, 'click', () => this.showSettingsModal());
                Events.on(this.container, 'click', '[data-action="close-settings"]', () => this.hideSettingsModal());

                // Close modal when clicking outside
                Events.on(settingsModal, 'click', (e) => {
                    if (e.target === settingsModal) {
                        this.hideSettingsModal();
                    }
                });
            }
        }

        // Help modal
        if (this.options.showHelpModal) {
            const helpBtn = this.container.querySelector('#help-btn');
            const helpModal = this.container.querySelector('#help-modal');

            if (helpBtn && helpModal) {
                Events.on(helpBtn, 'click', () => this.showHelpModal());
                Events.on(this.container, 'click', '[data-action="close-help"]', () => this.hideHelpModal());

                // Close modal when clicking outside
                Events.on(helpModal, 'click', (e) => {
                    if (e.target === helpModal) {
                        this.hideHelpModal();
                    }
                });
            }
        }
    }

    /**
     * Show settings modal
     */
    showSettingsModal() {
        const modal = this.container.querySelector('#settings-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * Hide settings modal
     */
    hideSettingsModal() {
        const modal = this.container.querySelector('#settings-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Show help modal
     */
    showHelpModal() {
        const modal = this.container.querySelector('#help-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * Hide help modal
     */
    hideHelpModal() {
        const modal = this.container.querySelector('#help-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Update provider status display
     */
    updateProviderStatus(message = '', type = 'info') {
        const statusElement = this.container.querySelector('#provider-status');
        if (statusElement) {
            if (message) {
                statusElement.textContent = message;
                statusElement.className = `status-display status-${type} show`;
            } else {
                statusElement.textContent = '';
                statusElement.className = 'status-display';
            }
        }
    }

    /**
     * Get current provider information
     */
    getCurrentProvider() {
        return {
            name: this.currentProvider,
            config: this.getProviderConfig()[this.currentProvider]
        };
    }

    /**
     * Emit provider change event
     */
    emitProviderChange() {
        const event = new CustomEvent('providerSelector:providerChanged', {
            detail: {
                provider: this.currentProvider,
                config: this.getProviderConfig()[this.currentProvider]
            },
            bubbles: true
        });
        this.container.dispatchEvent(event);
    }

    /**
     * Destroy the component and cleanup
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.isInitialized = false;
        logger.info('ProviderSelector destroyed');
    }
}