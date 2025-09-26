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
import { TranslationService } from './services/TranslationService.js';

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
        this.translationService = null;

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

        // Check export functions availability after a delay
        setTimeout(() => {
            console.log('=== Export Functions Availability Check ===');
            console.log('PDF Export function:', typeof window.exportToPDF);
            console.log('PPTX Export function:', typeof window.exportToPPTX);
            console.log('Available export-related functions:', Object.keys(window).filter(k => k.includes('export')));
            console.log('PDFKit available:', typeof window.PDFDocument);
            console.log('PptxGenJS available:', typeof window.PptxGenJS);
            console.log('========================================');
        }, 2000);

        logger.debug('DOM elements cached for slides creator');
    }

    /**
     * Initialize modular components
     */
    async initializeComponents() {
        try {
            // Initialize slidesAppState early in the component initialization process
            // This ensures KonvaSlideSystem has access to it during its initialization
            this.initializeSlidesAppState();

            // Initialize LanguageSelector component
            this.components.languageSelector = new LanguageSelector('language-section', {
                title: 'Export Languages',
                description: 'Select languages for translation and export'
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

            // Initialize TranslationService after provider is loaded
            if (this.currentProvider) {
                this.translationService = new TranslationService(this.currentProvider);
            }

            // Make components globally available for compatibility
            window.slidesComponents = this.components;

            logger.debug('Slides creator components initialized');
        } catch (error) {
            logger.error('Failed to initialize slides creator components:', error);
            throw error;
        }
    }

    /**
     * Initialize slidesAppState early to prevent race conditions
     */
    initializeSlidesAppState() {
        // Initialize with empty state that can be updated later
        window.slidesAppState = {
            currentSlideData: { title: 'New Presentation', slides: [] },
            currentSlideIndex: 0,
            currentTheme: null
        };

        logger.debug('Initialized empty slidesAppState to prevent race conditions');
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
        const debouncedFormSave = debounce(() => this.saveFormState(), 300);

        // Form input listeners
        if (this.dom.presentationTopicTextarea) {
            Events.on(this.dom.presentationTopicTextarea, 'input', () => {
                debouncedSave();
                debouncedFormSave();
            });
        }
        if (this.dom.numSlidesSelect) {
            Events.on(this.dom.numSlidesSelect, 'change', () => {
                debouncedSave();
                debouncedFormSave();
                logger.debug('Number of slides changed to:', this.dom.numSlidesSelect.value);
            });
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
        // Force save form state before generation to ensure persistence
        this.saveFormState();

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

        // Save pre-generation state with timestamp for recovery
        appState.set('lastGenerationAttempt', {
            topic,
            numSlides,
            timestamp: Date.now(),
            provider: this.currentProvider.name
        });

        try {
            this.components.generationStatus?.showLoading('Generating presentation...', 0);

            // Debug: Check provider availability
            if (!this.currentProvider) {
                throw new Error('AI provider not initialized');
            }
            if (typeof this.currentProvider.generateText !== 'function') {
                throw new Error('AI provider generateText method not available');
            }

            logger.info(`Generating ${numSlides} slides using provider: ${this.currentProvider.name || 'Unknown'}`);

            const prompt = `Create a comprehensive presentation about: "${topic}"

CRITICAL REQUIREMENTS:
- Generate EXACTLY ${numSlides} slides
- Respond with VALID JSON only (no markdown, no explanations)
- Each slide must have meaningful, detailed content

Slide Structure:
- Slide 1: Title slide with compelling presentation title
- Slides 2-${numSlides-1}: Content slides with detailed information, examples, key points
- Slide ${numSlides}: Strong conclusion/summary with key takeaways

REQUIRED JSON FORMAT (respond with this exact structure):
{
  "title": "Compelling Presentation Title",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Title Here",
      "content": "Detailed content with multiple points separated by bullet points using •",
      "visualSuggestions": {
        "backgroundColor": "#f0f9ff",
        "textColor": "#1e293b",
        "accentColor": "#3b82f6",
        "layout": "title-only"
      }
    }
  ]
}

EXAMPLE (for reference):
{
  "title": "The Future of Artificial Intelligence",
  "slides": [
    {
      "slideNumber": 1,
      "title": "The Future of Artificial Intelligence",
      "content": "Exploring the transformative impact of AI on society, business, and daily life",
      "visualSuggestions": {
        "backgroundColor": "#f0f9ff",
        "textColor": "#1e293b",
        "accentColor": "#3b82f6",
        "layout": "title-only"
      }
    },
    {
      "slideNumber": 2,
      "title": "What is Artificial Intelligence?",
      "content": "• Machine learning algorithms that can learn from data\\n• Natural language processing for human-computer interaction\\n• Computer vision for image and video analysis\\n• Robotics and autonomous systems",
      "visualSuggestions": {
        "backgroundColor": "#ffffff",
        "textColor": "#374151",
        "accentColor": "#059669",
        "layout": "content"
      }
    }
  ]
}

Generate ${numSlides} slides about "${topic}" following this exact format:`;

            logger.debug('Sending prompt to AI provider');
            const response = await this.currentProvider.generateText(prompt);

            logger.debug('Received response from AI provider:', response.substring(0, 500));

            // Try to parse JSON response with improved error handling
            let slidesData;
            try {
                // Clean up response - remove markdown code blocks if present
                let cleanedResponse = response.trim();
                if (cleanedResponse.startsWith('```json')) {
                    cleanedResponse = cleanedResponse.substring(7);
                }
                if (cleanedResponse.startsWith('```')) {
                    cleanedResponse = cleanedResponse.substring(3);
                }
                if (cleanedResponse.endsWith('```')) {
                    cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
                }

                cleanedResponse = cleanedResponse.trim();
                logger.debug('Cleaned response for parsing:', cleanedResponse.substring(0, 200));

                slidesData = JSON.parse(cleanedResponse);

                // Validate the parsed data
                if (!slidesData.slides || !Array.isArray(slidesData.slides)) {
                    throw new Error('Invalid slides data structure');
                }

                if (slidesData.slides.length === 0) {
                    throw new Error('No slides generated');
                }

                logger.info(`Successfully parsed ${slidesData.slides.length} slides`);

            } catch (parseError) {
                logger.error('JSON parsing failed:', parseError);
                logger.error('Raw response:', response);

                // Create structured fallback based on requested slide count
                const fallbackSlides = [];
                const responseLines = response.split('\n').filter(line => line.trim());

                for (let i = 0; i < numSlides; i++) {
                    let slideContent = '';
                    if (i === 0) {
                        slideContent = `${topic}\n\nPresentation Overview`;
                    } else if (i === numSlides - 1) {
                        slideContent = 'Conclusion\n\nKey takeaways and next steps';
                    } else {
                        slideContent = responseLines.slice(i * 2, (i + 1) * 2).join('\n') || `${topic} - Key Point ${i}`;
                    }

                    fallbackSlides.push({
                        slideNumber: i + 1,
                        title: i === 0 ? topic : `${topic} - Slide ${i + 1}`,
                        content: slideContent,
                        visualSuggestions: {
                            backgroundColor: i === 0 ? "#f0f9ff" : "#ffffff",
                            textColor: "#1e293b",
                            accentColor: "#3b82f6",
                            layout: i === 0 ? "title-only" : "content"
                        }
                    });
                }

                slidesData = {
                    title: topic,
                    slides: fallbackSlides
                };

                logger.warn(`Created ${fallbackSlides.length} fallback slides due to parsing error`);
            }

            this.slides = slidesData.slides || [];

            // Store slides data in centralized state for persistence
            appState.set('slidesData', slidesData);
            appState.set('presentationTopic', topic);
            appState.set('slideCount', this.slides.length);

            this.createSlidesInEditor(slidesData);

            this.components.generationStatus?.showSuccess(`Generated ${this.slides.length} slides successfully!`);

            // Save both centralized state and legacy state for compatibility
            saveState();

            // Mark generation as complete and save final form state
            this.saveFormState();
            appState.set('lastSuccessfulGeneration', {
                topic,
                numSlides: this.slides.length,
                timestamp: Date.now(),
                provider: this.currentProvider.name
            });

            // Clear the pending attempt since generation succeeded
            appState.remove('lastGenerationAttempt');

            logger.info('Slides data saved to state management');

        } catch (error) {
            logger.error('Failed to generate slides:', error);
            this.components.generationStatus?.showError(`Failed to generate slides: ${error.message}`);

            // Mark generation attempt as failed but keep form state
            appState.set('lastGenerationAttempt.failed', true);
            appState.set('lastGenerationAttempt.error', error.message);
        }
    }

    /**
     * Create slides in the Konva editor
     */
    createSlidesInEditor(slidesData) {
        if (!this.components.slidesEditor || !this.components.slidesEditor.konvaSlideSystem) return;

        // Update existing global state for KonvaSlideSystem compatibility
        // slidesAppState was already initialized during component setup
        if (window.slidesAppState) {
            window.slidesAppState.currentSlideData = slidesData;
            window.slidesAppState.currentSlideIndex = 0;
            window.slidesAppState.currentTheme = null;
        }

        console.log('✅ Updated slidesAppState with generated data:', {
            title: slidesData.title,
            slideCount: slidesData.slides?.length || 0,
            firstSlideTitle: slidesData.slides?.[0]?.title || 'N/A',
            firstSlideContent: this.getContentPreview(slidesData.slides?.[0]?.content)
        });

        // The KonvaSlideSystem will handle displaying the slides
        // Load the slides data into the KonvaSlideSystem using the correct method name
        if (this.components.slidesEditor.konvaSlideSystem.loadSlidesFromData) {
            this.components.slidesEditor.konvaSlideSystem.loadSlidesFromData(slidesData);
        }

        // Emit event for components listening to slide creation
        this.components.slidesEditor.emit('slidesCreated', {
            slides: slidesData.slides,
            count: slidesData.slides.length
        });
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
     * Export presentation in various formats with multi-language support
     */
    async exportPresentation(format) {
        if (!this.slides || this.slides.length === 0) {
            this.components.exportStatus?.showError('No slides to export. Generate slides first.');
            return;
        }

        if (!this.translationService) {
            this.components.exportStatus?.showError('Translation service not available');
            return;
        }

        try {
            // Get selected languages
            const selectedLanguages = this.components.languageSelector?.getSelectedLanguages() || ['en'];

            if (selectedLanguages.length === 1) {
                // Single language export
                this.components.exportStatus?.showLoading(`Exporting as ${format.toUpperCase()}...`);
                await this.exportSingleLanguage(format, selectedLanguages[0]);
            } else {
                // Multi-language export with translation
                this.components.exportStatus?.showLoading(`Translating and exporting in ${selectedLanguages.length} languages...`);
                await this.exportMultiLanguage(format, selectedLanguages);
            }

            this.components.exportStatus?.showSuccess(
                selectedLanguages.length === 1
                    ? `Exported as ${format.toUpperCase()} successfully!`
                    : `Exported in ${selectedLanguages.length} languages as ${format.toUpperCase()}!`
            );

        } catch (error) {
            logger.error(`Failed to export as ${format}:`, error);
            this.components.exportStatus?.showError(`Failed to export as ${format.toUpperCase()}: ${error.message}`);
        }
    }

    /**
     * Export presentation in a single language
     */
    async exportSingleLanguage(format, language) {
        const languageName = this.translationService.getLanguageName(language);

        switch (format) {
            case 'pdf':
                await this.exportAsPDF(this.slides, language);
                break;
            case 'pptx':
                await this.exportAsPowerPoint(this.slides, language);
                break;
            case 'html':
                await this.exportAsHTML(this.slides, language);
                break;
            case 'json':
                await this.exportAsJSON(this.slides, language);
                break;
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Export presentation in multiple languages with translation
     */
    async exportMultiLanguage(format, languages) {
        const translatedSlides = new Map();
        const files = [];

        // Show translation progress
        const updateProgress = (progressData) => {
            if (progressData.currentLanguage) {
                this.components.exportStatus?.showLoading(
                    `Translating (${progressData.currentLanguage}/${progressData.totalLanguages}): ${progressData.status}`,
                    (progressData.currentLanguage / progressData.totalLanguages) * 0.7 // 70% of progress for translation
                );
            } else {
                this.components.exportStatus?.showLoading(progressData.status);
            }
        };

        // Translate content for non-English languages
        const languagesToTranslate = languages.filter(lang => lang !== 'en');

        if (languagesToTranslate.length > 0) {
            const translations = await this.translationService.translateToMultipleLanguages(
                this.slides,
                languagesToTranslate,
                updateProgress
            );

            // Store translations
            translations.forEach((slides, language) => {
                translatedSlides.set(language, slides);
            });
        }

        // Add original English slides if included
        if (languages.includes('en')) {
            translatedSlides.set('en', this.slides.map(slide => ({ ...slide, language: 'en' })));
        }

        this.components.exportStatus?.showLoading('Generating export files...', 0.7);

        // Generate files for each language
        let fileIndex = 0;
        for (const [language, slides] of translatedSlides) {
            fileIndex++;
            this.components.exportStatus?.showLoading(
                `Generating ${format.toUpperCase()} for ${this.translationService.getLanguageName(language)} (${fileIndex}/${languages.length})...`,
                0.7 + (fileIndex / languages.length) * 0.3
            );

            try {
                const fileData = await this.generateExportFile(format, slides, language);
                files.push(fileData);
            } catch (error) {
                logger.error(`Failed to generate ${format} for ${language}:`, error);
                // Continue with other languages
            }
        }

        // Package and download files
        await this.downloadMultipleFiles(files, format);
    }

    /**
     * Generate export file data for a specific format and language
     */
    async generateExportFile(format, slides, language) {
        const languageName = this.translationService.getLanguageName(language);

        switch (format) {
            case 'pdf':
                return await this.generatePDFData(slides, language);
            case 'pptx':
                return await this.generatePowerPointData(slides, language);
            case 'html':
                return await this.generateHTMLData(slides, language);
            case 'json':
                return await this.generateJSONData(slides, language);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    /**
     * Generate PDF export data
     */
    async generatePDFData(slides, language) {
        const languageName = this.translationService.getLanguageName(language);

        try {
            // Use structured PDF export (slide data → PDF primitives)
            console.log('PDF Export - Using structured export method');

            if (typeof window.exportStructuredPDF === 'function') {
                // Call the structured export function directly - it handles file download
                await window.exportStructuredPDF(false); // false = don't include speaker notes for now

                // Return success indicator (the function downloads the file directly)
                return {
                    filename: `presentation-${language}.pdf`,
                    content: 'PDF downloaded via structured export',
                    type: 'application/pdf',
                    language,
                    languageName,
                    downloaded: true // Indicate file was downloaded
                };
            } else {
                throw new Error('Structured PDF export function not available');
            }
        } catch (error) {
            console.error('PDF generation failed:', error);
            throw error; // No fallbacks - single reliable approach
        }
    }

    /**
     * Generate PowerPoint export data
     */
    async generatePowerPointData(slides, language) {
        const languageName = this.translationService.getLanguageName(language);

        try {
            // Use structured PowerPoint export (slide data → PowerPoint objects)
            console.log('PPTX Export - Using structured export method');

            if (typeof window.exportStructuredPowerPoint === 'function') {
                // Call the structured export function directly - it handles file download
                await window.exportStructuredPowerPoint(false); // false = don't include speaker notes for now

                // Return success indicator (the function downloads the file directly)
                return {
                    filename: `presentation-${language}.pptx`,
                    content: 'PPTX downloaded via structured export',
                    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                    language,
                    languageName,
                    downloaded: true // Indicate file was downloaded
                };
            } else {
                throw new Error('Structured PowerPoint export function not available');
            }
        } catch (error) {
            console.error('PPTX generation failed:', error);
            throw error; // No fallbacks - single reliable approach
        }
    }

    /**
     * Generate HTML export data
     */
    async generateHTMLData(slides, language) {
        const languageName = this.translationService.getLanguageName(language);

        try {
            // Use the structured HTML export (restored original functionality)
            const htmlContent = this.generateStandaloneHTML({
                title: `Presentation - ${languageName}`,
                slides: slides
            }, false); // false = don't include speaker notes by default

            return {
                filename: `presentation-${language}.html`,
                content: htmlContent,
                type: 'text/html',
                language,
                languageName
            };
        } catch (error) {
            console.error('HTML generation failed:', error);
            throw error;
        }
    }

    /**
     * Generate standalone HTML file (restored from working version)
     */
    generateStandaloneHTML(slideData, includeSpeakerNotes = false) {
        // Get current theme colors, fallback to default if no theme selected
        const theme = window.slidesAppState?.currentTheme || {
            backgroundColor: '#ffffff',
            textColor: '#000000',
            borderColor: '#dddddd',
            fillColor: '#f5f5f5'
        };

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${slideData.title || 'Presentation'}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .title-slide {
            background-color: ${theme.backgroundColor};
            color: ${theme.textColor};
            border-radius: 8px;
            padding: 40px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            width: 960px;
            height: 540px;
            max-width: 90vw;
            margin: 0 auto 30px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
        }
        .slide {
            background-color: ${theme.backgroundColor};
            color: ${theme.textColor};
            border-radius: 8px;
            page-break-after: always;
            margin-bottom: 30px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            width: 960px;
            height: 540px;
            max-width: 90vw;
            margin: 0 auto 30px auto;
            box-sizing: border-box;
            position: relative;
        }
        .slide-number {
            position: absolute;
            top: 10px;
            right: 20px;
            font-size: 12px;
            opacity: 0.6;
        }
        .slide h2 {
            margin-top: 0;
            margin-bottom: 20px;
            font-size: 32px;
            color: ${theme.textColor};
        }
        .slide ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .slide li {
            background-color: ${theme.fillColor};
            border: 1px solid ${theme.borderColor};
            border-radius: 4px;
            padding: 12px 16px;
            margin-bottom: 8px;
            font-size: 16px;
            line-height: 1.4;
        }
        .slide li:before {
            content: "• ";
            color: ${theme.textColor};
            font-weight: bold;
            margin-right: 8px;
        }
        .speaker-notes {
            background-color: #f8f9fa;
            border-left: 4px solid #007bff;
            padding: 15px;
            margin-top: 15px;
            font-size: 14px;
            font-style: italic;
            color: #6c757d;
        }
        @media print {
            body { background-color: white; }
            .slide { page-break-after: always; box-shadow: none; border: 1px solid #ddd; }
        }
    </style>
</head>
<body>
    <div class="title-slide">
        <h1>${slideData.title || 'Presentation'}</h1>
    </div>

    ${slideData.slides.map((slide, index) => `
        <div class="slide">
            <div class="slide-number">${index + 1}</div>
            <h2>${slide.title}</h2>
            ${slide.content && slide.content.length > 0 ? `
                <ul>
                    ${slide.content.map(point => `<li>${point}</li>`).join('')}
                </ul>
            ` : ''}
            ${includeSpeakerNotes && slide.speakerNotes ? `
                <div class="speaker-notes">
                    <strong>Speaker Notes:</strong> ${slide.speakerNotes}
                </div>
            ` : ''}
        </div>
    `).join('')}
</body>
</html>`;
    }

    /**
     * Generate JSON export data
     */
    async generateJSONData(slides, language) {
        const languageName = this.translationService.getLanguageName(language);

        const exportData = {
            metadata: {
                title: this.dom.presentationTopicTextarea?.value || 'Untitled Presentation',
                createdAt: new Date().toISOString(),
                provider: this.currentProvider?.name || 'Unknown',
                language: language,
                languageName: languageName
            },
            slides: slides
        };

        return {
            filename: `presentation-data-${language}.json`,
            content: JSON.stringify(exportData, null, 2),
            type: 'application/json',
            language,
            languageName
        };
    }

    /**
     * Generate HTML content from slides data
     */
    generateHTMLFromSlides(slides, title) {
        const slidesHTML = slides.map((slide, index) => {
            const visualSuggestions = slide.visualSuggestions || {};
            const backgroundColor = visualSuggestions.backgroundColor || '#ffffff';
            const textColor = visualSuggestions.textColor || '#333333';
            const accentColor = visualSuggestions.accentColor || '#0066cc';

            // Handle slide.content - it can be array or string
            let contentHTML = '';
            if (slide.content) {
                if (Array.isArray(slide.content)) {
                    // Join array elements with line breaks
                    contentHTML = slide.content.join('<br>');
                } else if (typeof slide.content === 'string') {
                    // Handle string content with newline replacement
                    contentHTML = slide.content.replace(/\n/g, '<br>');
                } else {
                    // Convert other types to string
                    contentHTML = String(slide.content).replace(/\n/g, '<br>');
                }
            }

            return `
                <div class="slide" style="background-color: ${backgroundColor}; color: ${textColor};">
                    <div class="slide-number">Slide ${slide.slideNumber || index + 1}</div>
                    <h2 class="slide-title" style="color: ${accentColor};">${slide.title || ''}</h2>
                    <div class="slide-content">
                        ${contentHTML}
                    </div>
                </div>
            `;
        }).join('');

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            line-height: 1.6;
            background-color: #f5f5f5;
            padding: 20px;
        }

        .presentation-container {
            max-width: 1000px;
            margin: 0 auto;
        }

        .presentation-header {
            text-align: center;
            margin-bottom: 40px;
            padding: 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .presentation-title {
            font-size: 2.5em;
            color: #333;
            margin-bottom: 10px;
        }

        .presentation-meta {
            color: #666;
            font-size: 1.1em;
        }

        .slide {
            background: white;
            margin: 30px 0;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 15px rgba(0,0,0,0.1);
            min-height: 400px;
            position: relative;
            border-left: 5px solid #0066cc;
        }

        .slide-number {
            position: absolute;
            top: 15px;
            right: 20px;
            background: #0066cc;
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 0.9em;
            font-weight: 500;
        }

        .slide-title {
            font-size: 2.2em;
            margin-bottom: 25px;
            border-bottom: 2px solid #eee;
            padding-bottom: 15px;
        }

        .slide-content {
            font-size: 1.2em;
            line-height: 1.8;
        }

        .slide-content ul {
            margin: 15px 0;
            padding-left: 20px;
        }

        .slide-content li {
            margin: 10px 0;
        }

        @media print {
            .slide {
                page-break-after: always;
                margin: 0;
                box-shadow: none;
                border: 1px solid #ccc;
            }

            body {
                background: white;
                padding: 0;
            }
        }

        @media (max-width: 768px) {
            .presentation-container {
                padding: 10px;
            }

            .slide {
                padding: 20px;
                margin: 15px 0;
            }

            .slide-title {
                font-size: 1.8em;
            }

            .slide-content {
                font-size: 1.1em;
            }
        }
    </style>
</head>
<body>
    <div class="presentation-container">
        <header class="presentation-header">
            <h1 class="presentation-title">${title}</h1>
            <div class="presentation-meta">
                Generated on ${new Date().toLocaleDateString()}
            </div>
        </header>

        <main>
            ${slidesHTML}
        </main>
    </div>
</body>
</html>`;
    }

    /**
     * Download multiple files (ZIP for multiple, direct download for single)
     */
    async downloadMultipleFiles(files, format) {
        if (files.length === 0) {
            throw new Error('No files generated');
        }

        if (files.length === 1) {
            // Single file - direct download
            const file = files[0];
            const blob = new Blob([file.content], { type: file.type });
            const url = URL.createObjectURL(blob);

            const link = DOM.create('a', {
                href: url,
                download: file.filename
            });

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else {
            // Multiple files - create ZIP
            await this.createAndDownloadZip(files, format);
        }
    }

    /**
     * Create and download ZIP file containing all language versions
     */
    async createAndDownloadZip(files, format) {
        if (!window.JSZip) {
            throw new Error('JSZip library not loaded');
        }

        const zip = new window.JSZip();

        // Add each file to the ZIP
        files.forEach(file => {
            zip.file(file.filename, file.content);
        });

        // Generate ZIP file
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        // Download ZIP
        const url = URL.createObjectURL(zipBlob);
        const link = DOM.create('a', {
            href: url,
            download: `presentation-multilanguage-${format}.zip`
        });

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Legacy export methods for compatibility
     */
    async exportAsPDF(slides = null, language = 'en') {
        const targetSlides = slides || this.slides;
        const fileData = await this.generatePDFData(targetSlides, language);

        const blob = new Blob([fileData.content], { type: fileData.type });
        const url = URL.createObjectURL(blob);

        const link = DOM.create('a', {
            href: url,
            download: fileData.filename
        });

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async exportAsPowerPoint(slides = null, language = 'en') {
        const targetSlides = slides || this.slides;
        const fileData = await this.generatePowerPointData(targetSlides, language);

        const blob = new Blob([fileData.content], { type: fileData.type });
        const url = URL.createObjectURL(blob);

        const link = DOM.create('a', {
            href: url,
            download: fileData.filename
        });

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async exportAsHTML(slides = null, language = 'en') {
        const targetSlides = slides || this.slides;
        const fileData = await this.generateHTMLData(targetSlides, language);

        const blob = new Blob([fileData.content], { type: fileData.type });
        const url = URL.createObjectURL(blob);

        const link = DOM.create('a', {
            href: url,
            download: fileData.filename
        });

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async exportAsJSON(slides = null, language = 'en') {
        const targetSlides = slides || this.slides;
        const fileData = await this.generateJSONData(targetSlides, language);

        const blob = new Blob([fileData.content], { type: fileData.type });
        const url = URL.createObjectURL(blob);

        const link = DOM.create('a', {
            href: url,
            download: fileData.filename
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

            // Load form values from state
            this.loadFormState();

            logger.debug('Slides creator state loaded');
        } catch (error) {
            logger.error('Failed to load slides creator state:', error);
        }
    }

    /**
     * Load form state from persistence
     */
    loadFormState() {
        try {
            // Load number of slides selection with DOM readiness check
            const savedNumSlides = appState.get('numSlides', '8');
            if (savedNumSlides) {
                // Ensure DOM element is available, retry if needed
                const setNumSlides = () => {
                    if (this.dom.numSlidesSelect) {
                        this.dom.numSlidesSelect.value = savedNumSlides;
                        logger.debug(`Restored num-slides to: ${savedNumSlides}`);
                        return true;
                    }
                    return false;
                };

                // Try immediately, fallback to retry after DOM ready
                if (!setNumSlides()) {
                    setTimeout(() => {
                        if (!setNumSlides()) {
                            logger.warn('num-slides element not found, unable to restore value');
                        }
                    }, 200);
                }
            }

            // Load presentation topic if available
            const savedTopic = appState.get('presentationTopic', '');
            if (this.dom.presentationTopicTextarea && savedTopic) {
                this.dom.presentationTopicTextarea.value = savedTopic;
            }

            // Check for interrupted generation and offer recovery
            const lastAttempt = appState.get('lastGenerationAttempt');
            if (lastAttempt) {
                const timeSinceAttempt = Date.now() - lastAttempt.timestamp;
                const fiveMinutes = 5 * 60 * 1000;

                // If generation attempt was within last 5 minutes and form is empty, offer recovery
                if (timeSinceAttempt < fiveMinutes && !savedTopic) {
                    this.offerGenerationRecovery(lastAttempt);
                } else if (timeSinceAttempt >= fiveMinutes) {
                    // Clean up old attempts
                    appState.remove('lastGenerationAttempt');
                }
            }

            logger.debug('Form state loaded', { numSlides: savedNumSlides, topic: savedTopic });
        } catch (error) {
            logger.error('Failed to load form state:', error);
        }
    }

    /**
     * Offer to recover from interrupted generation
     */
    offerGenerationRecovery(lastAttempt) {
        if (this.components.generationStatus) {
            const message = `It looks like a previous generation was interrupted. Would you like to restore: "${lastAttempt.topic}" (${lastAttempt.numSlides} slides)?`;

            // Create a simple recovery notification
            const recoveryDiv = document.createElement('div');
            recoveryDiv.className = 'recovery-notification';
            recoveryDiv.style.cssText = `
                background: var(--warning-light, #fff3cd);
                border: 1px solid var(--warning-border, #ffeaa7);
                color: var(--warning-text, #856404);
                padding: 12px;
                border-radius: 4px;
                margin: 8px 0;
                font-size: 14px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            recoveryDiv.innerHTML = `
                <span>${message}</span>
                <div>
                    <button id="restore-attempt" style="background: var(--primary-color); color: white; border: none; padding: 4px 8px; border-radius: 3px; margin-right: 4px; cursor: pointer;">Restore</button>
                    <button id="dismiss-recovery" style="background: transparent; border: 1px solid var(--border-light); padding: 4px 8px; border-radius: 3px; cursor: pointer;">Dismiss</button>
                </div>
            `;

            // Insert after form elements
            const formContainer = document.querySelector('.presentation-generator, .form-container') || document.body;
            formContainer.appendChild(recoveryDiv);

            // Add event listeners
            document.getElementById('restore-attempt')?.addEventListener('click', () => {
                if (this.dom.presentationTopicTextarea) {
                    this.dom.presentationTopicTextarea.value = lastAttempt.topic;
                }
                if (this.dom.numSlidesSelect) {
                    this.dom.numSlidesSelect.value = lastAttempt.numSlides.toString();
                }
                this.saveFormState(); // Save the restored values
                recoveryDiv.remove();
                appState.remove('lastGenerationAttempt');
            });

            document.getElementById('dismiss-recovery')?.addEventListener('click', () => {
                recoveryDiv.remove();
                appState.remove('lastGenerationAttempt');
            });
        }
    }

    /**
     * Save form state to persistence
     */
    saveFormState() {
        try {
            // Save number of slides selection
            if (this.dom.numSlidesSelect) {
                appState.set('numSlides', this.dom.numSlidesSelect.value);
            }

            // Save presentation topic
            if (this.dom.presentationTopicTextarea) {
                appState.set('presentationTopic', this.dom.presentationTopicTextarea.value);
            }

            logger.debug('Form state saved');
        } catch (error) {
            logger.error('Failed to save form state:', error);
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
     * Restore slides from saved state data
     */
    restoreSlidesFromState(slidesData) {
        try {
            if (!slidesData || !slidesData.slides) {
                logger.warn('No valid slides data to restore');
                return;
            }

            this.slides = slidesData.slides;

            // Create slides in the visual editor
            this.createSlidesInEditor(slidesData);

            // Update UI to reflect restored data
            if (this.components.generationStatus) {
                this.components.generationStatus.showSuccess(`Restored ${this.slides.length} slides from previous session`);
            }

            logger.info(`Restored ${this.slides.length} slides from saved state`);
        } catch (error) {
            logger.error('Failed to restore slides from state:', error);
        }
    }

    /**
     * Get a safe preview of content for logging
     */
    getContentPreview(content) {
        if (!content) return 'N/A';
        if (typeof content === 'string') {
            return content.substring(0, 100) + (content.length > 100 ? '...' : '');
        }
        if (Array.isArray(content)) {
            return `Array[${content.length}]: ${content.slice(0, 2).join(', ')}${content.length > 2 ? '...' : ''}`;
        }
        return `${typeof content}: ${String(content).substring(0, 50)}`;
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

/**
 * Structured PDF Export using Slide Data
 * Creates editable PDF with text and shapes using jsPDF primitives
 */
async function exportStructuredPDF(includeSpeakerNotes = false) {
    try {
        // Check if jsPDF is available
        let jsPDF;
        if (window.jspdf && window.jspdf.jsPDF) {
            jsPDF = window.jspdf.jsPDF;
        } else if (window.jsPDF) {
            jsPDF = window.jsPDF;
        } else {
            throw new Error('jsPDF library not loaded. Please refresh the page and try again.');
        }

        const slideData = window.slidesAppState?.currentSlideData;
        const theme = window.slidesAppState?.currentTheme || {
            backgroundColor: '#ffffff',
            textColor: '#000000',
            borderColor: '#dddddd',
            fillColor: '#f5f5f5'
        };

        if (!slideData) {
            throw new Error('Slide data not available');
        }

        console.log(`Creating structured PDF with ${slideData.slides.length} slides...`);

        // Create PDF in landscape orientation
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const pageWidth = 297; // A4 landscape width
        const pageHeight = 210; // A4 landscape height

        // Helper function to convert hex color to RGB
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 255, g: 255, b: 255 };
        };

        // Title slide
        const bgColor = hexToRgb(theme.backgroundColor);
        const textColor = hexToRgb(theme.textColor);

        // Background
        pdf.setFillColor(bgColor.r, bgColor.g, bgColor.b);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Title
        pdf.setTextColor(textColor.r, textColor.g, textColor.b);
        pdf.setFontSize(44);
        pdf.setFont('helvetica', 'bold');
        pdf.text(slideData.title || 'Presentation', pageWidth / 2, pageHeight / 2, {
            align: 'center',
            baseline: 'middle'
        });

        // Content slides
        slideData.slides.forEach((slide, index) => {
            pdf.addPage('a4', 'landscape');

            // Background
            pdf.setFillColor(bgColor.r, bgColor.g, bgColor.b);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');

            // Slide number (small, bottom right)
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(textColor.r, textColor.g, textColor.b);
            pdf.text(`${index + 1}`, pageWidth - 20, pageHeight - 10, { align: 'right' });

            // Slide title
            pdf.setFontSize(32);
            pdf.setFont('helvetica', 'bold');
            pdf.text(slide.title, 20, 40);

            // Content bullets - normalize content to array format
            let contentArray = [];
            if (slide.content) {
                if (Array.isArray(slide.content)) {
                    contentArray = slide.content;
                } else if (typeof slide.content === 'string') {
                    // Split string content into array by common delimiters
                    contentArray = slide.content.split(/\n|•/).filter(item => item.trim().length > 0);
                } else {
                    contentArray = [String(slide.content)];
                }
            }

            if (contentArray.length > 0) {
                const bulletColor = hexToRgb(theme.fillColor);
                const borderColor = hexToRgb(theme.borderColor);

                contentArray.forEach((point, pointIndex) => {
                    const y = 70 + (pointIndex * 30);

                    // Bullet box background
                    pdf.setFillColor(bulletColor.r, bulletColor.g, bulletColor.b);
                    pdf.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
                    pdf.roundedRect(20, y - 10, pageWidth - 40, 25, 3, 3, 'FD');

                    // Bullet text
                    pdf.setFontSize(16);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor(textColor.r, textColor.g, textColor.b);
                    pdf.text(`• ${point}`, 25, y + 3);
                });
            }

            // Speaker notes if requested
            if (includeSpeakerNotes && slide.speakerNotes) {
                pdf.addPage('a4', 'portrait');
                pdf.setFillColor(255, 255, 255);
                pdf.rect(0, 0, 210, 297, 'F');

                pdf.setTextColor(0, 0, 0);
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Speaker Notes - Slide ${index + 1}`, 20, 20);

                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'normal');
                const lines = pdf.splitTextToSize(slide.speakerNotes, 170);
                pdf.text(lines, 20, 40);
            }
        });

        // Save the PDF
        const filename = `${slideData.title || 'presentation'}.pdf`;
        pdf.save(filename);

        console.log('Structured PDF exported successfully!');

    } catch (error) {
        console.error('Structured PDF export error:', error);
        throw error;
    }
}

/**
 * Structured PowerPoint Export using Slide Data
 * Uses PptxGenJS to create proper PowerPoint files with structured content
 */
async function exportStructuredPowerPoint(includeSpeakerNotes = false) {
    try {
        // Check if PptxGenJS is available with more debug info
        console.log('Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('pptx')));
        console.log('window.PptxGenJS:', window.PptxGenJS);

        let PptxGen;
        if (window.PptxGenJS) {
            PptxGen = window.PptxGenJS;
        } else if (typeof PptxGenJS !== 'undefined') {
            PptxGen = PptxGenJS;
        } else {
            throw new Error('PptxGenJS library not found. Please refresh the page and try again.');
        }

        const pptx = new PptxGen();
        const slideData = window.slidesAppState?.currentSlideData;
        const theme = window.slidesAppState?.currentTheme || {
            backgroundColor: '#ffffff',
            textColor: '#000000',
            borderColor: '#dddddd',
            fillColor: '#f5f5f5'
        };

        if (!slideData) {
            throw new Error('Slide data not available');
        }

        // Set presentation properties with landscape layout
        pptx.defineLayout({ name: 'LAYOUT_WIDE', width: 13.33, height: 7.5 }); // 16:9 landscape
        pptx.layout = 'LAYOUT_WIDE';
        pptx.author = 'AI Slides Creator';
        pptx.company = 'Emotions for Engineers';
        pptx.title = slideData.title || 'Presentation';

        console.log(`Creating structured PowerPoint with ${slideData.slides.length} slides...`);

        // Title slide with theme colors and landscape sizing
        const titleSlide = pptx.addSlide();

        // Set title slide background
        if (theme.backgroundColor && theme.backgroundColor !== '#ffffff') {
            titleSlide.background = { color: theme.backgroundColor.replace('#', '') };
        }

        titleSlide.addText(slideData.title || 'Presentation', {
            x: 1, y: 2.5, w: 11.33, h: 2.5,
            fontSize: 44,
            bold: true,
            align: 'center',
            color: theme.textColor.replace('#', ''),
            valign: 'middle'
        });

        // Content slides with landscape layout and theme colors
        slideData.slides.forEach((slide, index) => {
            const pptSlide = pptx.addSlide();

            // Set slide background using theme
            if (theme.backgroundColor && theme.backgroundColor !== '#ffffff') {
                pptSlide.background = { color: theme.backgroundColor.replace('#', '') };
            }

            // Slide number (bottom right)
            pptSlide.addText(`${index + 1}`, {
                x: 12.5, y: 6.8, w: 0.5, h: 0.5,
                fontSize: 12,
                color: theme.textColor.replace('#', ''),
                align: 'right',
                transparency: 30
            });

            // Slide title with theme colors and landscape positioning
            pptSlide.addText(slide.title, {
                x: 0.5, y: 0.5, w: 12.33, h: 1,
                fontSize: 32,
                bold: true,
                color: theme.textColor.replace('#', ''),
                valign: 'top'
            });

            // Slide content with better spacing for landscape - normalize content to array format
            let contentArray = [];
            if (slide.content) {
                if (Array.isArray(slide.content)) {
                    contentArray = slide.content;
                } else if (typeof slide.content === 'string') {
                    // Split string content into array by common delimiters
                    contentArray = slide.content.split(/\n|•/).filter(item => item.trim().length > 0);
                } else {
                    contentArray = [String(slide.content)];
                }
            }

            if (contentArray.length > 0) {
                contentArray.forEach((point, pointIndex) => {
                    // First add the rounded rectangle shape for the bullet box
                    pptSlide.addShape(pptx.ShapeType.roundRect, {
                        x: 0.8,  // Move more to the right
                        y: 2 + (pointIndex * 0.9), // Spacing between points
                        w: 11.5,
                        h: 0.65,
                        fill: { color: theme.fillColor.replace('#', '') },
                        line: { color: theme.borderColor.replace('#', ''), width: 1 },
                        rectRadius: 0.08 // Rounded corners (smaller value for subtle rounding)
                    });

                    // Then add the bullet point text on top
                    pptSlide.addText(`• ${point}`, {
                        x: 0.9,  // Align with the rounded box + small margin
                        y: 2 + (pointIndex * 0.9), // Match the box position
                        w: 11.3,
                        h: 0.65,
                        fontSize: 16,
                        color: theme.textColor.replace('#', ''),
                        valign: 'middle',
                        align: 'left',
                        margin: [0.1, 0.1, 0.1, 0.1] // top, right, bottom, left margins
                    });
                });
            }

            // Speaker notes with slide reference
            if (includeSpeakerNotes && slide.speakerNotes) {
                pptSlide.addNotes(`Slide ${index + 1} Notes: ${slide.speakerNotes}`);
            }
        });

        // Save the PowerPoint file
        const fileName = `${slideData.title || 'presentation'}.pptx`;

        // Try different methods to save
        if (pptx.writeFile) {
            await pptx.writeFile({ fileName: fileName });
        } else if (pptx.save) {
            await pptx.save(fileName);
        } else {
            throw new Error('PptxGenJS save method not available');
        }

        console.log('PowerPoint exported successfully!');

    } catch (error) {
        console.error('PowerPoint export error:', error);
        throw error;
    }
}

// Make structured export functions globally available
window.exportStructuredPDF = exportStructuredPDF;
window.exportStructuredPowerPoint = exportStructuredPowerPoint;

// Export debug information
window.slidesCreatorDebug = {
    app: () => window.slidesCreatorApp,
    state: appState,
    DOM,
    Events,
    logger
};

logger.info('Slides creator main script loaded');