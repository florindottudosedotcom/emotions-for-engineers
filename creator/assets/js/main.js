/**
 * Main Application Entry Point - Following CLAUDE.md Guidelines
 * Orchestrates the entire application initialization and module loading
 */

import { logger, debounce } from './core/utils.js';
import { DOM, Events } from './core/dom.js';
import { appState, saveState, loadState, clearState } from './core/state.js';

/**
 * Main Application Class
 */
class CreatorApp {
    constructor() {
        this.dom = {};
        this.currentProvider = null;
        this.modules = {};
        this.isInitialized = false;

        // Bind methods
        this.handleProviderChange = this.handleProviderChange.bind(this);
        this.handleStateChange = this.handleStateChange.bind(this);
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            logger.info('Initializing Creator Application...');

            // Initialize provider first
            await this.initializeProvider();

            // Cache DOM elements
            this.cacheDOMElements();

            // Initialize modules
            await this.initializeModules();

            // Set up event listeners
            this.setupEventListeners();

            // Load saved state
            this.loadApplicationState();

            // Mark as initialized
            this.isInitialized = true;

            logger.info('Creator Application initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize application:', error);
            this.showError('Failed to initialize application. Please refresh and try again.');
        }
    }

    /**
     * Initialize AI provider
     */
    async initializeProvider() {
        const providerType = window.COURSE_CREATOR_PROVIDER || 'cloud';
        logger.info(`Initializing provider: ${providerType}`);

        try {
            let providerModule;
            switch (providerType) {
                case 'cloud':
                    providerModule = await import('./providers/CloudProvider.js');
                    this.currentProvider = new providerModule.CloudProvider();
                    break;
                case 'puter':
                    providerModule = await import('./providers/PuterProvider.js');
                    this.currentProvider = new providerModule.PuterProvider();
                    break;
                case 'webllm':
                    providerModule = await import('./providers/WebLLMProvider.js');
                    this.currentProvider = new providerModule.WebLLMProvider();
                    break;
                case 'ollama':
                    providerModule = await import('./providers/OllamaProvider.js');
                    this.currentProvider = new providerModule.OllamaProvider();
                    break;
                default:
                    throw new Error(`Unknown provider type: ${providerType}`);
            }

            // Store provider type in state
            appState.set('currentProvider', providerType);

            logger.info(`Successfully loaded provider: ${this.currentProvider.name}`);
        } catch (error) {
            logger.error(`Failed to load ${providerType} provider:`, error);

            // Fallback to cloud provider
            if (providerType !== 'cloud') {
                logger.info('Falling back to cloud provider');
                try {
                    const cloudModule = await import('./providers/CloudProvider.js');
                    this.currentProvider = new cloudModule.CloudProvider();
                    appState.set('currentProvider', 'cloud');

                    // Show user-friendly message about fallback
                    setTimeout(() => {
                        this.showError(`${providerType} provider failed to load. Switched to Cloud AI provider. You can try refreshing to retry ${providerType}.`);
                    }, 1000);
                } catch (fallbackError) {
                    logger.error('Fallback to cloud provider also failed:', fallbackError);
                    throw new Error(`Both ${providerType} and cloud providers failed to load`);
                }
            } else {
                throw error;
            }
        }
    }

    /**
     * Cache DOM elements for performance
     */
    cacheDOMElements() {
        // Main form elements
        this.dom.courseForm = DOM.query('#course-form');
        this.dom.chapterTabsContainer = DOM.query('#chapter-tabs-container');
        this.dom.chapterContentContainer = DOM.query('#chapter-content-container');
        this.dom.addChapterBtn = DOM.query('#add-chapter');
        this.dom.downloadSection = DOM.query('#download-section');
        this.dom.downloadZipLink = DOM.query('#download-zip');

        // Input elements
        this.dom.courseNameInput = DOM.query('#course-name');
        this.dom.courseDescTextarea = DOM.query('#course-desc');
        this.dom.masterPromptTextarea = DOM.query('#master-prompt');
        this.dom.numChaptersSelect = DOM.query('#num-chapters');

        // Button elements
        this.dom.enhancePromptBtn = DOM.query('#enhance-prompt-btn');
        this.dom.generateCourseBtn = DOM.query('#generate-course-btn');
        this.dom.clearFormBtn = DOM.query('#clear-form-btn');

        // Status elements
        this.dom.aiStatus = DOM.query('#ai-status');
        this.dom.generationStatus = DOM.query('#generation-status');
        this.dom.fileGenerationStatus = DOM.query('#file-generation-status');

        // Provider section
        this.dom.providerSection = DOM.query('#provider-section');

        // Update page title if provider is loaded
        if (this.currentProvider) {
            document.title = `${this.currentProvider.name} Course Creator`;
            const titleElement = DOM.query('h1');
            if (titleElement) {
                titleElement.textContent = `${this.currentProvider.name} Course Creator`;
            }
        }

        // Make DOM available globally for legacy compatibility
        window.courseCreatorDom = this.dom;

        logger.debug('DOM elements cached');
    }

    /**
     * Initialize application modules
     */
    async initializeModules() {
        try {
            // Initialize provider-specific UI
            if (this.currentProvider && this.dom.providerSection) {
                const template = await this.currentProvider.getTemplate();
                this.dom.providerSection.innerHTML = template;
                await this.currentProvider.init(this.dom, appState);
            }

            // Initialize UI module
            const { UIManager } = await import('./components/UIManager.js');
            this.modules.ui = new UIManager(this.dom);
            await this.modules.ui.init();

            // Initialize Course module
            const { CourseManager } = await import('./creators/CourseManager.js');
            this.modules.course = new CourseManager(this.dom, this.modules.ui, this.currentProvider);
            await this.modules.course.init();

            // Make modules globally available for legacy compatibility
            window.UI = this.modules.ui;
            window.Course = this.modules.course;
            window.currentProvider = this.currentProvider;

            logger.debug('Modules initialized');
        } catch (error) {
            logger.error('Failed to initialize modules:', error);
            throw error;
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // State persistence (debounced)
        const debouncedSave = debounce(saveState, 300);

        // Form input listeners
        if (this.dom.courseNameInput) {
            Events.on(this.dom.courseNameInput, 'input', debouncedSave);
        }
        if (this.dom.courseDescTextarea) {
            Events.on(this.dom.courseDescTextarea, 'input', debouncedSave);
        }
        if (this.dom.masterPromptTextarea) {
            Events.on(this.dom.masterPromptTextarea, 'input', debouncedSave);
        }
        if (this.dom.numChaptersSelect) {
            Events.on(this.dom.numChaptersSelect, 'change', saveState);
        }

        // Chapter content changes
        if (this.dom.chapterContentContainer) {
            Events.on(this.dom.chapterContentContainer, 'input', '.chapter-title', debouncedSave);
        }

        // Button listeners
        if (this.dom.generateCourseBtn) {
            Events.on(this.dom.generateCourseBtn, 'click', () => {
                this.modules.course?.generateCourse();
            });
        }

        if (this.dom.enhancePromptBtn) {
            Events.on(this.dom.enhancePromptBtn, 'click', () => {
                this.modules.course?.enhancePrompt();
            });
        }

        // Chapter button management is handled by UIManager
        // if (this.dom.addChapterBtn) {
        //     Events.on(this.dom.addChapterBtn, 'click', () => {
        //         this.modules.ui?.addChapter();
        //     });
        // }

        if (this.dom.clearFormBtn) {
            Events.on(this.dom.clearFormBtn, 'click', clearState);
        }

        // Form submission
        if (this.dom.courseForm) {
            Events.on(this.dom.courseForm, 'submit', (e) => {
                e.preventDefault();
                this.modules.course?.generateCourseFiles();
            });
        }

        // State change listeners
        appState.on('stateChange', this.handleStateChange);

        // Window message handling for iframes
        Events.on(window, 'message', this.handleIframeMessage.bind(this));

        // Page visibility changes
        Events.on(document, 'visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // Refresh state when page becomes visible
                this.refreshApplicationState();
            }
        });

        logger.debug('Event listeners set up');
    }

    /**
     * Load application state
     */
    loadApplicationState() {
        try {
            // Load API keys from session storage
            appState.loadApiKeys();

            // Load persisted state
            loadState();

            // Initialize with default chapter if none exist - handled by UIManager
            // if (this.dom.chapterContentContainer &&
            //     this.dom.chapterContentContainer.children.length === 0) {
            //     this.modules.ui?.addChapter();
            // }

            logger.debug('Application state loaded');
        } catch (error) {
            logger.error('Failed to load application state:', error);
        }
    }

    /**
     * Refresh application state
     */
    refreshApplicationState() {
        try {
            // Re-load API keys in case they changed in another tab
            appState.loadApiKeys();

            // Trigger provider refresh if available
            if (this.currentProvider && typeof this.currentProvider.refresh === 'function') {
                this.currentProvider.refresh();
            }

            logger.debug('Application state refreshed');
        } catch (error) {
            logger.error('Failed to refresh application state:', error);
        }
    }

    /**
     * Handle provider changes
     */
    handleProviderChange(newProvider) {
        if (newProvider !== appState.get('currentProvider')) {
            logger.info(`Provider changed from ${appState.get('currentProvider')} to ${newProvider}`);
            appState.set('currentProvider', newProvider);

            // You could implement provider hot-swapping here if needed
            // For now, just log the change
        }
    }

    /**
     * Handle state changes
     */
    handleStateChange({ key, value, oldValue }) {
        logger.debug(`State changed: ${key} = ${value} (was ${oldValue})`);

        // Handle specific state changes
        switch (key) {
            case 'currentProvider':
                this.handleProviderChange(value);
                break;
            case 'currentTheme':
                this.handleThemeChange(value);
                break;
            case 'isGenerating':
                this.handleGenerationStateChange(value);
                break;
        }
    }

    /**
     * Handle theme changes
     */
    handleThemeChange(theme) {
        if (window.themeManager && typeof window.themeManager.setTheme === 'function') {
            window.themeManager.setTheme(theme);
        }
    }

    /**
     * Handle generation state changes
     */
    handleGenerationStateChange(isGenerating) {
        // Update UI to reflect generation state
        if (this.dom.generateCourseBtn) {
            this.dom.generateCourseBtn.disabled = isGenerating;
            this.dom.generateCourseBtn.textContent = isGenerating ?
                '🔄 Generating...' : '⚡ Generate Entire Course';
        }
    }

    /**
     * Handle iframe messages
     */
    handleIframeMessage(event) {
        // Handle messages from Editor iframes
        if (this.modules.ui?.editorInstances &&
            this.modules.ui.editorInstances[event.data.id]) {

            const { type, id, content } = event.data;
            const instance = this.modules.ui.editorInstances[id];

            if (type === 'editor-ready') {
                instance.isReady = true;
                if (instance.pendingContent) {
                    instance.iframe.contentWindow.postMessage({
                        type: 'set-content',
                        content: instance.pendingContent
                    }, '*');
                    delete instance.pendingContent;
                }
            } else if (type === 'content-changed') {
                instance.content = content;
                saveState();
            }
        }
    }

    /**
     * Show error message to user
     */
    showError(message) {
        // Create error notification
        const errorDiv = DOM.create('div', {
            className: 'status-display status-error show',
            style: 'position: fixed; top: 20px; right: 20px; z-index: 1000; max-width: 400px;'
        }, message);

        document.body.appendChild(errorDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);

        logger.error('Error shown to user:', message);
    }

    /**
     * Show success message to user
     */
    showSuccess(message) {
        const successDiv = DOM.create('div', {
            className: 'status-display status-success show',
            style: 'position: fixed; top: 20px; right: 20px; z-index: 1000; max-width: 400px;'
        }, message);

        document.body.appendChild(successDiv);

        setTimeout(() => {
            successDiv.remove();
        }, 3000);

        logger.info('Success shown to user:', message);
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            provider: this.currentProvider?.name || 'Unknown',
            hasUnsavedChanges: this.hasUnsavedChanges(),
            moduleStatus: Object.keys(this.modules).reduce((status, key) => {
                status[key] = this.modules[key]?.isInitialized || false;
                return status;
            }, {})
        };
    }

    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges() {
        // This could be implemented to check for unsaved editor content
        return false;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Remove event listeners
        appState.off('stateChange', this.handleStateChange);

        // Cleanup modules
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            }
        });

        // Clear references
        this.dom = {};
        this.modules = {};
        this.currentProvider = null;
        this.isInitialized = false;

        logger.info('Application destroyed');
    }
}

/**
 * Initialize application when DOM is ready
 */
function initializeApp() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.creatorApp = new CreatorApp();
            window.creatorApp.init();
        });
    } else {
        window.creatorApp = new CreatorApp();
        window.creatorApp.init();
    }
}

// Auto-initialize
initializeApp();

// Export debug information
window.courseCreatorDebug = {
    app: () => window.creatorApp,
    state: appState,
    DOM,
    Events,
    logger
};

logger.info('Main application script loaded');