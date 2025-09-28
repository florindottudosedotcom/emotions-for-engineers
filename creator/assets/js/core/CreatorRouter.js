/**
 * Creator Router - Dynamic Route-Based Creator Loading
 * Handles URL-based provider detection and template rendering
 * Follows CLAUDE.md Guidelines
 */

import { templateEngine } from './TemplateEngine.js';
import { logger } from './utils.js';

export class CreatorRouter {
    constructor() {
        this.providers = {
            'openrouter': {
                name: 'OpenRouter',
                icon: '🌐',
                description: 'Access multiple AI providers through a single API',
                cssClass: 'openrouter-provider',
                title: 'Course Creator - OpenRouter'
            },
            'webllm': {
                name: 'WebLLM',
                icon: '🖥️',
                description: 'Run AI models locally in your browser',
                cssClass: 'webllm-provider',
                title: 'Course Creator - WebLLM'
            },
            'ollama': {
                name: 'Ollama',
                icon: '🏠',
                description: 'Connect to your local Ollama installation',
                cssClass: 'ollama-provider',
                title: 'Course Creator - Ollama'
            },
            'puter': {
                name: 'Puter',
                icon: '🚀',
                description: 'Free access to multiple AI providers',
                cssClass: 'puter-provider',
                title: 'Course Creator - Puter'
            }
        };
    }

    /**
     * Load course creator with provider detection
     */
    async loadCourseCreator() {
        const provider = this.detectProvider();

        if (!provider) {
            throw new Error('No provider specified in URL');
        }

        if (!this.providers[provider]) {
            throw new Error(`Unknown provider: ${provider}`);
        }

        const templateData = this.buildTemplateData(provider, 'course');
        const html = await templateEngine.loadTemplate('course-creator.html', templateData);

        // Replace entire document
        document.open();
        document.write(html);
        document.close();

        logger.info(`Course creator loaded with provider: ${provider}`);
    }

    /**
     * Load slides creator with provider detection
     */
    async loadSlidesCreator() {
        const provider = this.detectProvider();

        if (!provider) {
            throw new Error('No provider specified in URL');
        }

        if (!this.providers[provider]) {
            throw new Error(`Unknown provider: ${provider}`);
        }

        const templateData = this.buildTemplateData(provider, 'slides');
        const html = await templateEngine.loadTemplate('slides-creator.html', templateData);

        // Replace entire document
        document.open();
        document.write(html);
        document.close();

        logger.info(`Slides creator loaded with provider: ${provider}`);
    }

    /**
     * Detect provider from URL parameters or filename
     */
    detectProvider() {
        // Check URL parameters first
        const params = new URLSearchParams(window.location.search);
        const providerParam = params.get('provider');

        if (providerParam && this.providers[providerParam]) {
            return providerParam;
        }

        // Check current filename
        const filename = window.location.pathname.split('/').pop().split('.')[0];

        // Handle provider-specific files
        if (filename.startsWith('slides_')) {
            const provider = filename.replace('slides_', '');
            if (this.providers[provider]) {
                return provider;
            }
        }

        // Direct provider file names
        if (this.providers[filename]) {
            return filename;
        }

        // Default provider
        return 'openrouter';
    }

    /**
     * Build template data for provider and creator type
     */
    buildTemplateData(provider, creatorType) {
        const providerConfig = this.providers[provider];
        const isSlides = creatorType === 'slides';

        return {
            provider: provider,
            title: providerConfig.title.replace('Course Creator',
                isSlides ? 'Slides Creator' : 'Course Creator'),
            subtitle: `Create ${isSlides ? 'presentations' : 'courses'} with ${providerConfig.name}`,
            bodyClass: `${providerConfig.cssClass} ${creatorType}-creator`,

            // Component data
            providerInfo: {
                icon: providerConfig.icon,
                title: providerConfig.name,
                description: providerConfig.description,
                providerClass: providerConfig.cssClass,
                connectionStatus: {
                    connectionStatusId: `${provider}-connection-status`,
                    connectionClass: 'disconnected',
                    connectionText: 'Not connected'
                }
            },

            // Prompt generator data
            textareaId: isSlides ? 'slides-prompt' : 'course-prompt',
            textareaName: isSlides ? 'slides-prompt' : 'course-prompt',
            placeholder: isSlides ?
                'Describe the presentation you want to create...' :
                'Describe the course you want to create...',
            title: isSlides ?
                'Presentation Topic - Describe the presentation you want to create' :
                'Course Topic - Describe the course you want to create',

            // CSS includes
            includeCourseCSS: !isSlides,
            includeSlidesCSS: isSlides,
            includeProvider: provider
        };
    }

    /**
     * Navigate to specific provider and creator type
     */
    static navigate(provider, creatorType = 'course') {
        const baseUrl = window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/');
        const targetUrl = `${baseUrl}/${creatorType}.html?provider=${provider}`;
        window.location.href = targetUrl;
    }

    /**
     * Get current provider from URL
     */
    static getCurrentProvider() {
        const router = new CreatorRouter();
        return router.detectProvider();
    }

    /**
     * Get current creator type from URL
     */
    static getCurrentCreatorType() {
        const filename = window.location.pathname.split('/').pop();

        if (filename.startsWith('slides')) {
            return 'slides';
        }

        return 'course';
    }

    /**
     * Check if current page should use dynamic routing
     */
    static shouldUseDynamicRouting() {
        const filename = window.location.pathname.split('/').pop().split('.')[0];

        // Dynamic files
        if (filename === 'course' || filename === 'slides') {
            return true;
        }

        // Legacy provider-specific files that should be migrated
        const legacyFiles = ['openrouter', 'webllm', 'ollama', 'puter',
                           'slides_openrouter', 'slides_webllm', 'slides_ollama', 'slides_puter'];

        return legacyFiles.includes(filename);
    }

    /**
     * Initialize dynamic routing if needed
     */
    static async initializeIfNeeded() {
        if (this.shouldUseDynamicRouting()) {
            const router = new CreatorRouter();
            const creatorType = this.getCurrentCreatorType();

            try {
                if (creatorType === 'slides') {
                    await router.loadSlidesCreator();
                } else {
                    await router.loadCourseCreator();
                }
            } catch (error) {
                logger.error('Dynamic routing initialization failed:', error);
                throw error;
            }
        }
    }
}