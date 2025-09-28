/**
 * Template Engine - Following CLAUDE.md Guidelines
 * Unified template loading and rendering system for both course and slides creators
 */

import { logger } from './utils.js';

export class TemplateEngine {
    constructor(options = {}) {
        this.cache = new Map();
        this.baseUrl = options.baseUrl || './templates/';
        this.cachingEnabled = options.cachingEnabled !== false;
        this.debugMode = options.debugMode || false;

        // Template interpolation patterns
        this.patterns = {
            variable: /\{\{(\w+)\}\}/g,
            conditional: /\{\{#(\w+)\}\}(.*?)\{\{\/\1\}\}/gs,
            negativeConditional: /\{\{!\+(\w+)\}\}(.*?)\{\{\/\1\}\}/gs,
            loop: /\{\{@(\w+)\}\}(.*?)\{\{\/\1\}\}/gs,
            include: /\{\{>\s*([a-zA-Z0-9\-_/]+)\s*\}\}/g
        };
    }

    /**
     * Load and render a template with data
     */
    async loadTemplate(templatePath, data = {}) {
        try {
            const fullPath = this.baseUrl + templatePath;
            let templateContent;

            // Check cache first
            if (this.cachingEnabled && this.cache.has(fullPath)) {
                templateContent = this.cache.get(fullPath);
                this.debugLog(`Cache hit for template: ${templatePath}`);
            } else {
                // Fetch template
                const response = await fetch(fullPath);
                if (!response.ok) {
                    throw new Error(`Failed to load template: ${templatePath} (${response.status})`);
                }

                templateContent = await response.text();

                // Cache the template
                if (this.cachingEnabled) {
                    this.cache.set(fullPath, templateContent);
                    this.debugLog(`Cached template: ${templatePath}`);
                }
            }

            // Render template with data (including nested includes)
            const renderedTemplate = await this.renderTemplateAsync(templateContent, data);

            this.debugLog(`Successfully rendered template: ${templatePath}`);
            return renderedTemplate;

        } catch (error) {
            logger.error(`Template loading failed for ${templatePath}:`, error);
            throw new Error(`Template loading failed: ${error.message}`);
        }
    }

    /**
     * Load provider-specific template
     */
    async loadProviderTemplate(providerType, data = {}) {
        const templatePath = `providers/${providerType}.html`;
        return this.loadTemplate(templatePath, data);
    }

    /**
     * Load component template
     */
    async loadComponentTemplate(componentName, data = {}) {
        const templatePath = `components/${componentName}.html`;
        return this.loadTemplate(templatePath, data);
    }

    /**
     * Load editor template
     */
    async loadEditorTemplate(editorType, data = {}) {
        const templatePath = `editors/${editorType}.html`;
        return this.loadTemplate(templatePath, data);
    }

    /**
     * Load layout template
     */
    async loadLayoutTemplate(layoutName, data = {}) {
        const templatePath = `layouts/${layoutName}.html`;
        return this.loadTemplate(templatePath, data);
    }

    /**
     * Load partial template
     */
    async loadPartialTemplate(partialName, data = {}) {
        const templatePath = `partials/${partialName}.html`;
        return this.loadTemplate(templatePath, data);
    }

    /**
     * Render template string with data interpolation (synchronous)
     */
    renderTemplate(templateContent, data = {}) {
        let rendered = templateContent;

        // Process conditionals first
        rendered = this.processConditionals(rendered, data);

        // Process loops
        rendered = this.processLoops(rendered, data);

        // Process variables
        rendered = this.processVariables(rendered, data);

        return rendered;
    }

    /**
     * Render template string with data interpolation and nested includes (asynchronous)
     */
    async renderTemplateAsync(templateContent, data = {}) {
        let rendered = templateContent;

        // Process includes first (they may contain other template directives)
        rendered = await this.processIncludes(rendered, data);

        // Process conditionals
        rendered = this.processConditionals(rendered, data);

        // Process loops (but need to handle nested includes in loops)
        rendered = await this.processLoopsAsync(rendered, data);

        // Process variables
        rendered = this.processVariables(rendered, data);

        return rendered;
    }

    /**
     * Process conditional blocks {{#condition}}content{{/condition}}
     */
    processConditionals(template, data) {
        // Positive conditionals
        template = template.replace(this.patterns.conditional, (match, condition, content) => {
            const value = this.getValue(data, condition);
            return this.isTruthy(value) ? content : '';
        });

        // Negative conditionals {{!+condition}}content{{/condition}}
        template = template.replace(this.patterns.negativeConditional, (match, condition, content) => {
            const value = this.getValue(data, condition);
            return !this.isTruthy(value) ? content : '';
        });

        return template;
    }

    /**
     * Process loop blocks {{@array}}content{{/array}} (synchronous)
     */
    processLoops(template, data) {
        return template.replace(this.patterns.loop, (match, arrayName, content) => {
            const array = this.getValue(data, arrayName);
            if (!Array.isArray(array)) {
                return '';
            }

            return array.map((item, index) => {
                const itemData = {
                    ...data,
                    ...item,
                    $index: index,
                    $first: index === 0,
                    $last: index === array.length - 1,
                    $length: array.length
                };
                return this.renderTemplate(content, itemData);
            }).join('');
        });
    }

    /**
     * Process loop blocks {{@array}}content{{/array}} (asynchronous with includes)
     */
    async processLoopsAsync(template, data) {
        const loopMatches = Array.from(template.matchAll(this.patterns.loop));

        for (const match of loopMatches) {
            const [fullMatch, arrayName, content] = match;
            const array = this.getValue(data, arrayName);

            if (!Array.isArray(array)) {
                template = template.replace(fullMatch, '');
                continue;
            }

            const processedItems = await Promise.all(
                array.map(async (item, index) => {
                    const itemData = {
                        ...data,
                        ...item,
                        $index: index,
                        $first: index === 0,
                        $last: index === array.length - 1,
                        $length: array.length
                    };
                    return await this.renderTemplateAsync(content, itemData);
                })
            );

            template = template.replace(fullMatch, processedItems.join(''));
        }

        return template;
    }

    /**
     * Process include directives {{> componentName}}
     */
    async processIncludes(template, data) {
        const includeMatches = Array.from(template.matchAll(this.patterns.include));

        for (const match of includeMatches) {
            const [fullMatch, componentPath] = match;

            try {
                // Load and render the included component
                const includedContent = await this.loadTemplate(`components/${componentPath}.html`, data);
                template = template.replace(fullMatch, includedContent);
                this.debugLog(`Included component: ${componentPath}`);
            } catch (error) {
                logger.error(`Failed to include component ${componentPath}:`, error);
                template = template.replace(fullMatch, `<!-- Include failed: ${componentPath} -->`);
            }
        }

        return template;
    }

    /**
     * Process variable interpolation {{variable}}
     */
    processVariables(template, data) {
        return template.replace(this.patterns.variable, (match, variableName) => {
            const value = this.getValue(data, variableName);
            return this.escapeHtml(String(value ?? ''));
        });
    }

    /**
     * Get nested value from data object using dot notation
     */
    getValue(data, path) {
        return path.split('.').reduce((obj, key) => obj?.[key], data);
    }

    /**
     * Check if value is truthy for template conditionals
     */
    isTruthy(value) {
        if (value === null || value === undefined || value === false) {
            return false;
        }
        if (Array.isArray(value)) {
            return value.length > 0;
        }
        if (typeof value === 'string') {
            return value.trim().length > 0;
        }
        if (typeof value === 'number') {
            return !isNaN(value);
        }
        return Boolean(value);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Preload multiple templates
     */
    async preloadTemplates(templatePaths) {
        const promises = templatePaths.map(path => this.loadTemplate(path));
        await Promise.all(promises);
        this.debugLog(`Preloaded ${templatePaths.length} templates`);
    }

    /**
     * Clear template cache
     */
    clearCache() {
        this.cache.clear();
        this.debugLog('Template cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            templates: Array.from(this.cache.keys())
        };
    }

    /**
     * Register a custom helper function
     */
    registerHelper(name, helperFunction) {
        if (!this.helpers) {
            this.helpers = new Map();
        }
        this.helpers.set(name, helperFunction);
    }

    /**
     * Debug logging
     */
    debugLog(message) {
        if (this.debugMode) {
            logger.debug(`[TemplateEngine] ${message}`);
        }
    }

    /**
     * Validate template syntax
     */
    validateTemplate(templateContent) {
        const errors = [];

        // Check for unclosed tags
        const openTags = templateContent.match(/\{\{[#@!]\w+\}\}/g) || [];
        const closeTags = templateContent.match(/\{\{\/\w+\}\}/g) || [];

        if (openTags.length !== closeTags.length) {
            errors.push('Mismatched opening and closing template tags');
        }

        // Check for invalid variable syntax
        const invalidVars = templateContent.match(/\{\{[^}]*[^a-zA-Z0-9_.#@!\/][^}]*\}\}/g);
        if (invalidVars) {
            errors.push(`Invalid variable syntax: ${invalidVars.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Create a template instance with shared data
     */
    createInstance(sharedData = {}) {
        return {
            loadTemplate: (path, data = {}) =>
                this.loadTemplate(path, { ...sharedData, ...data }),
            loadProviderTemplate: (type, data = {}) =>
                this.loadProviderTemplate(type, { ...sharedData, ...data }),
            loadComponentTemplate: (name, data = {}) =>
                this.loadComponentTemplate(name, { ...sharedData, ...data }),
            renderTemplateAsync: (content, data = {}) =>
                this.renderTemplateAsync(content, { ...sharedData, ...data })
        };
    }
}

// Export singleton instance for global use
export const templateEngine = new TemplateEngine({
    debugMode: window.location.hostname === 'localhost'
});