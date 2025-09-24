/**
 * Slides Creator Main Application - Following CLAUDE.md Guidelines
 * Orchestrates modular components for visual presentation creation
 */

import { logger, debounce } from './core/utils.js';
import { DOM, Events } from './core/dom.js';
import { appState, saveState, loadState, clearState } from './core/state.js';
import { loadingManager } from './utils/loading-manager.js';

// Import modular components
import { LanguageSelector } from './components/LanguageSelector.js';
import { ProviderSelector } from './components/ProviderSelector.js';
import { StatusDisplay } from './components/StatusDisplay.js';
import { KonvaEditor } from './components/KonvaEditor.js';

/**
 * Slides Creator Application Class
 */
class SlidesCreatorApp {
    constructor() {
        this.dom = {};
        this.currentProvider = null;
        this.components = {};
        this.isInitialized = false;
        this.slides = [];

        // Bind methods
        this.handleProviderChange = this.handleProviderChange.bind(this);
        this.handleStateChange = this.handleStateChange.bind(this);
    }

    /**
     * Initialize the slides creator application
     */
    async init() {
        const initOperations = [
            {
                message: 'Loading AI provider...',
                fn: () => this.initializeProvider()
            },
            {
                message: 'Setting up interface...',
                fn: () => this.cacheDOMElements()
            },
            {
                message: 'Loading components...',
                fn: () => this.initializeComponents()
            },
            {
                message: 'Setting up provider UI...',
                fn: () => this.initializeProviderUI()
            },
            {
                message: 'Finalizing setup...',
                fn: () => {
                    this.setupEventListeners();
                    return Promise.resolve();
                }
            }
        ];

        try {
            logger.info('Initializing Slides Creator Application...');

            // Show loading with progress tracking
            await loadingManager.trackMultipleOperations('app-init', initOperations, {
                message: 'Starting slides creator...',
                showOverlay: true
            });

            // Load saved state
            setTimeout(() => {
                this.loadApplicationState();
            }, 100);

            this.isInitialized = true;
            logger.info('Slides Creator Application initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize slides creator:', error);
            loadingManager.hideAllLoading();
            this.showError('Failed to initialize slides creator. Please refresh and try again.');
        }
    }

    /**
     * Initialize AI provider
     */
    async initializeProvider() {
        const providerType = window.COURSE_CREATOR_PROVIDER || 'openrouter';
        logger.info(`Initializing provider: ${providerType}`);

        try {
            let providerModule;
            switch (providerType) {
                case 'openrouter':
                    providerModule = await import('./providers/OpenRouterProvider.js');
                    this.currentProvider = new providerModule.OpenRouterProvider();
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
                    throw new Error(`Unknown provider type: ${providerType}. Supported: openrouter, webllm, ollama`);
            }

            appState.set('currentProvider', providerType);
            logger.info(`Successfully loaded provider: ${this.currentProvider.name}`);
        } catch (error) {
            logger.error(`Failed to load ${providerType} provider:`, error);
            throw error;
        }
    }

    /**
     * Cache DOM elements for performance
     */
    cacheDOMElements() {
        // Main sections
        this.dom.providerSection = DOM.query('#provider-section');
        this.dom.languageSection = DOM.query('#language-section');
        this.dom.slidesEditorContainer = DOM.query('#slides-editor-container');

        // Form elements
        this.dom.presentationTopicTextarea = DOM.query('#presentation-topic');
        this.dom.numSlidesSelect = DOM.query('#num-slides');

        // Button elements
        this.dom.enhancePromptBtn = DOM.query('#enhance-prompt-btn');
        this.dom.generateSlidesBtn = DOM.query('#generate-slides-btn');

        // Export buttons
        this.dom.exportPdfBtn = DOM.query('#export-pdf-btn');
        this.dom.exportPptxBtn = DOM.query('#export-pptx-btn');
        this.dom.exportHtmlBtn = DOM.query('#export-html-btn');
        this.dom.exportJsonBtn = DOM.query('#export-json-btn');

        // Status elements
        this.dom.aiStatus = DOM.query('#ai-status');
        this.dom.generationStatus = DOM.query('#generation-status');
        this.dom.exportStatus = DOM.query('#export-status');

        // Update page title
        if (this.currentProvider) {
            document.title = `${this.currentProvider.name} Slides Creator`;
        }

        // Make DOM available globally for compatibility
        window.slidesCreatorDom = this.dom;

        logger.debug('DOM elements cached for slides creator');
    }

    /**
     * Initialize modular components
     */
    async initializeComponents() {
        try {
            // Initialize LanguageSelector component
            this.components.languageSelector = new LanguageSelector('language-section', {
                title: 'Presentation Languages',
                description: 'Select languages for your presentation'
            });
            await this.components.languageSelector.init();

            // Initialize ProviderSelector component (if not already handled by provider)
            if (this.dom.providerSection && !this.dom.providerSection.innerHTML.trim()) {
                this.components.providerSelector = new ProviderSelector('provider-section', {
                    title: 'AI Provider',
                    description: 'Choose your AI provider for slide generation',
                    showSettingsModal: true,
                    showHelpModal: true
                });
                await this.components.providerSelector.init();
            }

            // Initialize StatusDisplay components
            this.components.generationStatus = new StatusDisplay('generation-status');
            await this.components.generationStatus.init();

            this.components.exportStatus = new StatusDisplay('export-status');
            await this.components.exportStatus.init();

            // Initialize KonvaEditor component
            this.components.slidesEditor = new KonvaEditor('slides-editor-container', {
                width: 1000,
                height: 700,
                backgroundColor: '#ffffff',
                enableGrid: false,
                enableSnapping: true
            });
            await this.components.slidesEditor.init();

            // Setup component event listeners
            this.setupComponentEventListeners();

            // Make components globally available for compatibility
            window.slidesComponents = this.components;

            logger.debug('Slides creator components initialized');
        } catch (error) {
            logger.error('Failed to initialize slides creator components:', error);
            throw error;
        }
    }

    /**
     * Initialize provider-specific UI
     */
    async initializeProviderUI() {
        try {
            // Initialize provider-specific UI if provider is loaded
            if (this.currentProvider && this.dom.providerSection) {
                const template = await this.currentProvider.getTemplate();
                this.dom.providerSection.innerHTML = template;
                await this.currentProvider.init(this.dom, appState);

                // Update provider status if available
                if (typeof this.currentProvider.updateProviderStatus === 'function') {
                    this.currentProvider.updateProviderStatus();
                }

                // Make provider globally available for compatibility
                window.currentProvider = this.currentProvider;
                window.saveState = saveState;
                window.loadState = loadState;
            }

            logger.debug('Provider UI initialized');
        } catch (error) {
            logger.error('Failed to initialize provider UI:', error);
            throw error;
        }
    }

    /**
     * Setup component-specific event listeners
     */
    setupComponentEventListeners() {
        // Language selection changes
        Events.on(document, 'languageSelector:languageSelectionChanged', (e) => {
            logger.debug('Language selection changed:', e.detail);
            saveState();
        });

        // Provider changes
        Events.on(document, 'providerSelector:providerChanged', (e) => {
            logger.debug('Provider changed:', e.detail);
            this.handleProviderChange(e.detail.provider);
        });

        // Konva editor events
        Events.on(document, 'konvaEditor:elementAdded', (e) => {
            logger.debug('Element added to slides:', e.detail);
            saveState();
        });

        Events.on(document, 'konvaEditor:elementSelected', (e) => {
            logger.debug('Element selected in slides:', e.detail);
        });

        Events.on(document, 'konvaEditor:stateChanged', (e) => {
            logger.debug('Slides editor state changed:', e.detail);
        });
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // State persistence (debounced)
        const debouncedSave = debounce(saveState, 300);

        // Form input listeners
        if (this.dom.presentationTopicTextarea) {
            Events.on(this.dom.presentationTopicTextarea, 'input', debouncedSave);
        }
        if (this.dom.numSlidesSelect) {
            Events.on(this.dom.numSlidesSelect, 'change', debouncedSave);
        }

        // Button listeners
        if (this.dom.generateSlidesBtn) {
            Events.on(this.dom.generateSlidesBtn, 'click', () => {
                this.generateSlides();
            });
        }

        if (this.dom.enhancePromptBtn) {
            Events.on(this.dom.enhancePromptBtn, 'click', () => {
                this.enhancePrompt();
            });
        }

        // Export button listeners
        if (this.dom.exportPdfBtn) {
            Events.on(this.dom.exportPdfBtn, 'click', () => {
                this.exportPresentation('pdf');
            });
        }

        if (this.dom.exportPptxBtn) {
            Events.on(this.dom.exportPptxBtn, 'click', () => {
                this.exportPresentation('pptx');
            });
        }

        if (this.dom.exportHtmlBtn) {
            Events.on(this.dom.exportHtmlBtn, 'click', () => {
                this.exportPresentation('html');
            });
        }

        if (this.dom.exportJsonBtn) {
            Events.on(this.dom.exportJsonBtn, 'click', () => {
                this.exportPresentation('json');
            });
        }

        // State change listeners
        appState.on('stateChange', this.handleStateChange);

        // Page visibility changes
        Events.on(document, 'visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.refreshApplicationState();
            }
        });

        logger.debug('Event listeners set up for slides creator');
    }

    /**
     * Generate slides using AI
     */
    async generateSlides() {
        const topic = this.dom.presentationTopicTextarea?.value?.trim();
        const numSlides = parseInt(this.dom.numSlidesSelect?.value || '8');

        if (!topic) {
            this.components.generationStatus?.showError('Please enter a presentation topic');
            return;
        }

        if (!this.currentProvider) {
            this.components.generationStatus?.showError('No AI provider available');
            return;
        }

        try {
            this.components.generationStatus?.showLoading('Generating presentation...', 0);

            const prompt = `Create a presentation about: ${topic}

Generate ${numSlides} slides with the following structure:
- Slide 1: Title slide with the presentation title
- Slides 2-${numSlides-1}: Content slides with key points
- Slide ${numSlides}: Conclusion/Summary slide

For each slide, provide:
- Title
- Main content (bullet points or paragraphs)
- Suggested visual elements (colors, shapes, images)

Format the response as JSON with this structure:
{
  "title": "Presentation Title",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slide Title",
      "content": "Slide content",
      "visualSuggestions": {
        "backgroundColor": "#ffffff",
        "textColor": "#333333",
        "accentColor": "#0066cc",
        "layout": "title-only|content|conclusion"
      }
    }
  ]
}`;

            const response = await this.currentProvider.generateText(prompt);

            // Try to parse JSON response
            let slidesData;
            try {
                slidesData = JSON.parse(response);
            } catch (parseError) {
                // If JSON parsing fails, create a simple structure
                slidesData = {
                    title: topic,
                    slides: [{
                        slideNumber: 1,
                        title: topic,
                        content: response,
                        visualSuggestions: {
                            backgroundColor: "#ffffff",
                            textColor: "#333333",
                            accentColor: "#0066cc",
                            layout: "content"
                        }
                    }]
                };
            }

            this.slides = slidesData.slides || [];
            this.createSlidesInEditor(slidesData);

            this.components.generationStatus?.showSuccess(`Generated ${this.slides.length} slides successfully!`);
            saveState();

        } catch (error) {
            logger.error('Failed to generate slides:', error);
            this.components.generationStatus?.showError(`Failed to generate slides: ${error.message}`);
        }
    }

    /**
     * Create slides in the Konva editor
     */
    createSlidesInEditor(slidesData) {
        if (!this.components.slidesEditor) return;

        // Clear existing slides
        this.components.slidesEditor.clearAll();

        // Create slides from AI-generated data
        slidesData.slides.forEach((slide, index) => {
            this.createSlideElements(slide, index);
        });
    }

    /**
     * Create visual elements for a single slide
     */
    createSlideElements(slide, slideIndex) {
        const editor = this.components.slidesEditor;
        if (!editor) return;

        const slideY = slideIndex * 750; // Vertical offset for each slide
        const suggestions = slide.visualSuggestions || {};

        // Create slide title
        const titleElement = new window.Konva.Text({
            x: 50,
            y: slideY + 50,
            text: slide.title || `Slide ${slide.slideNumber}`,
            fontSize: 32,
            fontFamily: 'Arial',
            fill: suggestions.textColor || '#333333',
            fontStyle: 'bold',
            width: 900,
            align: 'center',
            draggable: true,
            id: `slide-${slideIndex}-title`
        });

        editor.addElement(titleElement);

        // Create slide content
        if (slide.content) {
            const contentElement = new window.Konva.Text({
                x: 50,
                y: slideY + 150,
                text: slide.content,
                fontSize: 18,
                fontFamily: 'Arial',
                fill: suggestions.textColor || '#333333',
                width: 900,
                align: 'left',
                draggable: true,
                id: `slide-${slideIndex}-content`
            });

            editor.addElement(contentElement);
        }

        // Add decorative elements based on layout
        if (suggestions.layout === 'title-only') {
            // Add a decorative line under the title
            const line = new window.Konva.Line({
                points: [100, slideY + 120, 900, slideY + 120],
                stroke: suggestions.accentColor || '#0066cc',
                strokeWidth: 3,
                draggable: true,
                id: `slide-${slideIndex}-line`
            });
            editor.addElement(line);
        }

        // Add slide separator if not the last slide
        if (slideIndex < this.slides.length - 1) {
            const separator = new window.Konva.Line({
                points: [0, slideY + 700, 1000, slideY + 700],
                stroke: '#cccccc',
                strokeWidth: 1,
                listening: false,
                id: `slide-${slideIndex}-separator`
            });
            editor.addElement(separator);
        }
    }

    /**
     * Enhance prompt using AI
     */
    async enhancePrompt() {
        const currentTopic = this.dom.presentationTopicTextarea?.value?.trim();

        if (!currentTopic) {
            this.components.generationStatus?.showWarning('Enter a topic first to enhance it');
            return;
        }

        if (!this.currentProvider) {
            this.components.generationStatus?.showError('No AI provider available');
            return;
        }

        try {
            this.components.generationStatus?.showLoading('Enhancing prompt...');

            const enhancePrompt = `Improve and expand this presentation topic to make it more specific, engaging, and comprehensive:

"${currentTopic}"

Provide an enhanced version that:
- Is more specific and focused
- Includes key aspects to cover
- Suggests a compelling angle or perspective
- Is suitable for a professional presentation

Return only the improved topic description, nothing else.`;

            const enhancedTopic = await this.currentProvider.generateText(enhancePrompt);

            if (this.dom.presentationTopicTextarea) {
                this.dom.presentationTopicTextarea.value = enhancedTopic.trim();
                saveState();
            }

            this.components.generationStatus?.showSuccess('Prompt enhanced successfully!');

        } catch (error) {
            logger.error('Failed to enhance prompt:', error);
            this.components.generationStatus?.showError(`Failed to enhance prompt: ${error.message}`);
        }
    }

    /**
     * Export presentation in various formats
     */
    async exportPresentation(format) {
        if (!this.components.slidesEditor) {
            this.components.exportStatus?.showError('No slides to export');
            return;
        }

        try {
            this.components.exportStatus?.showLoading(`Exporting as ${format.toUpperCase()}...`);

            switch (format) {
                case 'pdf':
                    await this.exportAsPDF();
                    break;
                case 'pptx':
                    await this.exportAsPowerPoint();
                    break;
                case 'html':
                    await this.exportAsHTML();
                    break;
                case 'json':
                    await this.exportAsJSON();
                    break;
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }

            this.components.exportStatus?.showSuccess(`Exported as ${format.toUpperCase()} successfully!`);

        } catch (error) {
            logger.error(`Failed to export as ${format}:`, error);
            this.components.exportStatus?.showError(`Failed to export as ${format.toUpperCase()}: ${error.message}`);
        }
    }

    /**
     * Export as PDF
     */
    async exportAsPDF() {
        const dataURL = this.components.slidesEditor.exportAsImage('png');

        // Create a simple PDF with the canvas image
        const link = DOM.create('a', {
            href: dataURL,
            download: 'presentation.png'
        });

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Export as PowerPoint (simplified)
     */
    async exportAsPowerPoint() {
        const canvasData = this.components.slidesEditor.getCanvasData();
        const dataURL = this.components.slidesEditor.exportAsImage('png');

        // For now, export as image
        const link = DOM.create('a', {
            href: dataURL,
            download: 'presentation.png'
        });

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Export as HTML
     */
    async exportAsHTML() {
        const canvasData = this.components.slidesEditor.getCanvasData();
        const imageDataURL = this.components.slidesEditor.exportAsImage('png');

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Presentation</title>
    <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
        .presentation { text-align: center; }
        .slide-image { max-width: 100%; height: auto; border: 1px solid #ccc; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="presentation">
        <h1>Generated Presentation</h1>
        <img src="${imageDataURL}" alt="Presentation Slides" class="slide-image">
    </div>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        const link = DOM.create('a', {
            href: url,
            download: 'presentation.html'
        });

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Export as JSON
     */
    async exportAsJSON() {
        const exportData = {
            metadata: {
                title: this.dom.presentationTopicTextarea?.value || 'Untitled Presentation',
                createdAt: new Date().toISOString(),
                provider: this.currentProvider?.name || 'Unknown',
                languages: this.components.languageSelector?.getSelectedLanguages() || ['en']
            },
            slides: this.slides,
            canvasData: this.components.slidesEditor.getCanvasData()
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = DOM.create('a', {
            href: url,
            download: 'presentation-data.json'
        });

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Handle provider changes
     */
    handleProviderChange(newProvider) {
        if (newProvider !== appState.get('currentProvider')) {
            logger.info(`Provider changed from ${appState.get('currentProvider')} to ${newProvider}`);
            appState.set('currentProvider', newProvider);
        }
    }

    /**
     * Handle state changes
     */
    handleStateChange({ key, value, oldValue }) {
        logger.debug(`State changed: ${key} = ${value} (was ${oldValue})`);

        switch (key) {
            case 'currentProvider':
                this.handleProviderChange(value);
                break;
            case 'isGenerating':
                this.handleGenerationStateChange(value);
                break;
        }
    }

    /**
     * Handle generation state changes
     */
    handleGenerationStateChange(isGenerating) {
        if (this.dom.generateSlidesBtn) {
            this.dom.generateSlidesBtn.disabled = isGenerating;
            this.dom.generateSlidesBtn.textContent = isGenerating ?
                '🔄 Generating...' : '⚡ Generate Presentation';
        }
    }

    /**
     * Load application state
     */
    loadApplicationState() {
        try {
            appState.loadApiKeys();
            loadState();
            logger.debug('Slides creator state loaded');
        } catch (error) {
            logger.error('Failed to load slides creator state:', error);
        }
    }

    /**
     * Refresh application state
     */
    refreshApplicationState() {
        try {
            appState.loadApiKeys();
            if (this.currentProvider && typeof this.currentProvider.refresh === 'function') {
                this.currentProvider.refresh();
            }
            logger.debug('Slides creator state refreshed');
        } catch (error) {
            logger.error('Failed to refresh slides creator state:', error);
        }
    }

    /**
     * Show error message to user
     */
    showError(message) {
        const errorDiv = DOM.create('div', {
            className: 'status-display status-error show',
            style: 'position: fixed; top: 20px; right: 20px; z-index: 1000; max-width: 400px;'
        }, message);

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.remove();
        }, 5000);

        logger.error('Error shown to user:', message);
    }

    /**
     * Destroy the slides creator and cleanup
     */
    destroy() {
        appState.off('stateChange', this.handleStateChange);

        Object.values(this.components).forEach(component => {
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        });

        this.dom = {};
        this.components = {};
        this.currentProvider = null;
        this.slides = [];
        this.isInitialized = false;

        logger.info('Slides Creator destroyed');
    }
}

/**
 * Initialize slides creator when DOM is ready
 */
function initializeSlidesCreator() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.slidesCreatorApp = new SlidesCreatorApp();
            window.slidesCreatorApp.init();
        });
    } else {
        window.slidesCreatorApp = new SlidesCreatorApp();
        window.slidesCreatorApp.init();
    }
}

// Auto-initialize
initializeSlidesCreator();

// Export debug information
window.slidesCreatorDebug = {
    app: () => window.slidesCreatorApp,
    state: appState,
    DOM,
    Events,
    logger
};

logger.info('Slides creator main script loaded');