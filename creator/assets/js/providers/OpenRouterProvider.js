/**
 * OpenRouter Provider - Following CLAUDE.md Guidelines
 * Professional cloud AI with transparent billing and 200+ models
 */

import { BaseProvider } from './BaseProvider.js';
import { DOM, Events } from '../core/dom.js';
import { logger } from '../core/utils.js';
import { templateEngine } from '../core/TemplateEngine.js';

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
        this.availableModels = this.config.models; // Initialize with fallback models

        // Usage tracking
        this.requestCount = 0;
        this.totalCost = 0;
        this.sessionUsage = {};

        logger.info('OpenRouter provider initialized with 200+ models and transparent billing');
    }

    async getTemplate() {
        try {
            return await templateEngine.loadProviderTemplate('openrouter', {
                isAuthenticated: this.isAuthenticated,
                accountBalanceText: this.getAccountBalanceText(),
                selectedModelText: this.getSelectedModelText(),
                modelCountText: this.getModelCountText()
            });
        } catch (error) {
            console.error('Failed to load OpenRouter template:', error);
            // Fallback to minimal template
            return `
                <div class="card-header">
                    <h3>🌐 OpenRouter Provider</h3>
                    <p class="text-secondary">Professional cloud AI with 200+ models and transparent billing</p>
                </div>
                <div class="card-body">
                    <div class="provider-error">Template loading failed. Please refresh the page.</div>
                </div>
            `;
        }
    }

    /**
     * Generate models HTML for dropdown
     */
    generateModelsHTML(modelGroups) {
        return modelGroups.map(group => `
            <div class="model-group">
                <div class="model-group-header" style="padding: 6px 12px; background: var(--background-tertiary); font-size: 12px; font-weight: 600; color: var(--text-primary); border-bottom: 1px solid var(--border-light);">${group.icon} ${group.label}</div>
                ${group.models.map(model => `
                    <div class="model-option ${model.isSelected ? 'selected' : ''}" data-model-id="${model.id}" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border-light); background: ${model.isSelected ? 'var(--primary-color-20)' : 'transparent'}; color: var(--text-primary);" onmouseover="this.style.background='var(--background-tertiary)'" onmouseout="this.style.background='${model.isSelected ? 'var(--primary-color-20)' : 'transparent'}'">
                        <div class="model-name" style="font-weight: 500; color: var(--text-primary);">${model.name}</div>
                        <div class="model-details" style="font-size: 12px; color: var(--text-secondary);">${model.description} • ${model.pricing}</div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    generateDropdownContent(searchQuery = '') {
        let models = this.availableModels || this.config.models;

        // Apply search filter if provided
        if (searchQuery && searchQuery.trim()) {
            models = this.filterModelsBySearch(models, searchQuery.trim());
        }

        // Group models by category
        const groupedModels = {
            premium: [],
            fast: [],
            image: [],
            audio: [],
            embedding: [],
            specialized: [],
            free: []
        };

        models.forEach(model => {
            const category = model.category || 'specialized';
            if (groupedModels[category]) {
                groupedModels[category].push(model);
            }
        });

        // Generate HTML for each group
        const groupIcons = {
            premium: '🚀',
            fast: '⚡',
            image: '🎨',
            audio: '🎵',
            embedding: '📊',
            specialized: '🎯',
            free: '🆓'
        };

        const groupLabels = {
            premium: 'Premium Models (Best Quality)',
            fast: 'Fast & Efficient Models',
            image: 'Image Generation & Vision',
            audio: 'Audio & Speech Models',
            embedding: 'Embedding & Vector Models',
            specialized: 'Specialized Models',
            free: 'Free Models'
        };

        let html = '';

        Object.entries(groupedModels).forEach(([category, categoryModels]) => {
            if (categoryModels.length > 0) {
                const icon = groupIcons[category] || '🎯';
                const label = groupLabels[category] || 'Other Models';

                html += `<div class="model-group">`;
                html += `<div class="model-group-header">${icon} ${label}</div>`;

                categoryModels.forEach(model => {
                    const isSelected = model.id === this.currentModel ? 'selected' : '';

                    html += `<div class="model-option ${isSelected}" data-model-id="${model.id}">`;
                    html += `<div class="model-name">${model.name}</div>`;
                    html += `<div class="model-details">${model.description} • ${model.pricing}</div>`;
                    html += `</div>`;
                });

                html += `</div>`;
            }
        });

        // Fallback if no models available
        if (!html) {
            html = `<div class="model-option" data-model-id="${this.config.defaultModel}">
                        <div class="model-name">Loading models...</div>
                        <div class="model-details">Please wait</div>
                    </div>`;
        }

        return html;
    }

    /**
     * Get template data for rendering
     */
    getTemplateData() {
        const modelCount = this.availableModels?.length || this.config.models.length;
        const selectedModel = this.getCurrentSelectedModel();
        const accountBalanceText = this.getAccountBalanceText();

        console.log('📄 OpenRouter template data - accountBalanceText:', accountBalanceText);
        console.log('📄 OpenRouter template data - isAuthenticated:', this.isAuthenticated);
        console.log('📄 OpenRouter template data - accountInfo exists:', !!this.accountInfo);

        return {
            modelCount,
            isAuthenticated: this.isAuthenticated,
            accountBalanceText: accountBalanceText,
            selectedModelText: selectedModel ? `${selectedModel.name} - ${selectedModel.description}` : 'Select a model...',
            modelGroups: this.getModelGroupsData(),
            modelCountText: this.getModelCountText()
        };
    }

    getCurrentSelectedModel() {
        const models = this.availableModels || this.config.models;
        return models.find(m => m.id === this.currentModel);
    }

    getAccountBalanceText() {
        if (!this.accountInfo) {
            logger.debug('OpenRouter: No account info available');
            return '🔑 Connected';
        }

        console.log('🎯 OpenRouter account info being processed:', this.accountInfo);

        // Display account info based on OpenRouter's actual API structure
        if (this.accountInfo.data && this.accountInfo.data.limit_remaining !== undefined) {
            // OpenRouter's remaining credit balance
            return `💰 Credits: $${this.accountInfo.data.limit_remaining.toFixed(2)}`;
        } else if (this.accountInfo.data && this.accountInfo.data.usage !== undefined) {
            // Show usage if balance not available
            return `📊 Used: $${this.accountInfo.data.usage.toFixed(4)}`;
        } else if (this.accountInfo.data && this.accountInfo.data.limit !== undefined) {
            // Show total limit if no remaining balance
            return `💳 Limit: $${this.accountInfo.data.limit.toFixed(2)}`;
        } else if (this.accountInfo.data && this.accountInfo.data.is_free_tier === false) {
            // Paid tier indicator
            return `👑 Paid Tier`;
        } else if (this.accountInfo.data && this.accountInfo.data.is_free_tier === true) {
            // Free tier indicator
            return `🆓 Free Tier`;
        } else {
            // Fallback - show that we're connected
            return '✅ API Key Active';
        }
    }

    getSessionUsageText() {
        const usage = this.sessionUsage[this.currentModel] || { requests: 0, cost: 0 };
        return `📊 Session: ${usage.requests} requests, ~$${usage.cost.toFixed(4)} estimated`;
    }

    getModelGroupsData() {
        let models = this.availableModels || this.config.models;

        // Group models by category
        const groupedModels = {
            premium: [],
            fast: [],
            image: [],
            audio: [],
            embedding: [],
            specialized: [],
            free: []
        };

        models.forEach(model => {
            const category = model.category || 'specialized';
            if (groupedModels[category]) {
                groupedModels[category].push({
                    ...model,
                    isSelected: model.id === this.currentModel
                });
            }
        });

        // Generate groups data
        const groupIcons = {
            premium: '🚀',
            fast: '⚡',
            image: '🎨',
            audio: '🎵',
            embedding: '📊',
            specialized: '🎯',
            free: '🆓'
        };

        const groupLabels = {
            premium: 'Premium Models (Best Quality)',
            fast: 'Fast & Efficient Models',
            image: 'Image Generation & Vision',
            audio: 'Audio & Speech Models',
            embedding: 'Embedding & Vector Models',
            specialized: 'Specialized Models',
            free: 'Free Models'
        };

        return Object.entries(groupedModels)
            .filter(([category, categoryModels]) => categoryModels.length > 0)
            .map(([category, categoryModels]) => ({
                category,
                icon: groupIcons[category] || '🎯',
                label: groupLabels[category] || 'Other Models',
                models: categoryModels
            }));
    }

    getModelCountText() {
        const allModels = this.availableModels || this.config.models;
        return `Showing all ${allModels.length} models`;
    }

    getSelectedModelText() {
        const selectedModel = this.getCurrentSelectedModel();
        return selectedModel ? `${selectedModel.name} - ${selectedModel.description}` : 'Select a model...';
    }

    populateModelDropdown() {
        if (this.dom.modelsList) {
            const modelsHtml = this.generateDropdownContent();
            this.dom.modelsList.innerHTML = modelsHtml;

            console.log('OpenRouter: Populated dropdown with models', {
                isAuthenticated: this.isAuthenticated,
                availableModelsCount: (this.availableModels || []).length,
                configModelsCount: this.config.models.length,
                htmlLength: modelsHtml.length,
                htmlPreview: modelsHtml.substring(0, 200) + '...'
            });

            // Update count info
            const totalCount = (this.availableModels || this.config.models).length;
            this.updateModelCountInfo(totalCount, totalCount, '');

            // Setup handlers for the new content
            this.setupModelOptionHandlers();
        } else {
            console.warn('OpenRouter: modelsList DOM element not found for population');
        }
    }

    shouldShowCostEstimation() {
        return this.isAuthenticated && this.currentModel;
    }

    getEstimatedCostText() {
        const model = this.config.models.find(m => m.id === this.currentModel);
        if (model) {
            return `~$0.50-2.00 for typical course (varies by depth and model: ${model.pricing})`;
        }
        return '';
    }

    // Keep the old method for backward compatibility (though we won't use it)
    generateModelOptionsHtml(searchQuery = '') {
        return ''; // No longer used with custom dropdown
    }

    filterModelsBySearch(models, searchQuery) {
        const query = searchQuery.toLowerCase();

        return models.filter(model => {
            // Search in model name
            if (model.name?.toLowerCase().includes(query)) return true;

            // Search in model ID
            if (model.id?.toLowerCase().includes(query)) return true;

            // Search in provider
            if (model.provider?.toLowerCase().includes(query)) return true;

            // Search in description
            if (model.description?.toLowerCase().includes(query)) return true;

            // Search in category
            if (model.category?.toLowerCase().includes(query)) return true;

            // Search in capabilities
            if (model.capabilities?.some(cap => cap.toLowerCase().includes(query))) return true;

            return false;
        });
    }

    toggleDropdown() {
        if (this.dropdownOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        if (!this.dom.dropdownContent || !this.dom.dropdownTrigger) {
            console.warn('OpenRouter: Dropdown elements not found', {
                dropdownContent: !!this.dom.dropdownContent,
                dropdownTrigger: !!this.dom.dropdownTrigger
            });
            return;
        }

        // Position the dropdown relative to the trigger button
        const triggerRect = this.dom.dropdownTrigger.getBoundingClientRect();
        this.dom.dropdownContent.style.top = `${triggerRect.bottom + window.scrollY}px`;
        this.dom.dropdownContent.style.left = `${triggerRect.left + window.scrollX}px`;
        this.dom.dropdownContent.style.width = `${triggerRect.width}px`;
        this.dom.dropdownContent.style.minWidth = `${Math.max(triggerRect.width, 400)}px`;

        console.log('OpenRouter: Opening dropdown', {
            triggerRect,
            top: triggerRect.bottom + window.scrollY,
            left: triggerRect.left + window.scrollX,
            width: triggerRect.width
        });

        this.dropdownOpen = true;
        this.dom.dropdownContent.classList.add('show');
        this.dom.dropdownTrigger.classList.add('open');
        this.dom.dropdownTrigger.setAttribute('aria-expanded', 'true');

        // Debug: Check if classes were applied and styles are correct
        console.log('OpenRouter: Dropdown classes after opening', {
            hasShowClass: this.dom.dropdownContent.classList.contains('show'),
            computedDisplay: window.getComputedStyle(this.dom.dropdownContent).display,
            classList: Array.from(this.dom.dropdownContent.classList),
            innerHTML: this.dom.dropdownContent.innerHTML.substring(0, 100) + '...'
        });

        // Focus the search input
        setTimeout(() => {
            this.dom.dropdownSearch?.focus();
        }, 50);

        // Set up model option click handlers
        this.setupModelOptionHandlers();
    }

    closeDropdown() {
        if (!this.dom.dropdownContent) return;

        this.dropdownOpen = false;
        this.dom.dropdownContent.classList.remove('show');
        this.dom.dropdownTrigger?.classList.remove('open');
        this.dom.dropdownTrigger?.setAttribute('aria-expanded', 'false');

        // Clear search
        if (this.dom.dropdownSearch) {
            this.dom.dropdownSearch.value = '';
            this.filterDropdownModels(''); // Reset to show all models
        }
    }

    setupModelOptionHandlers() {
        // Remove existing handlers
        const existingOptions = this.dom.modelsList?.querySelectorAll('.model-option');
        existingOptions?.forEach(option => {
            const clonedOption = option.cloneNode(true);
            option.parentNode?.replaceChild(clonedOption, option);
        });

        // Add new handlers
        const modelOptions = this.dom.modelsList?.querySelectorAll('.model-option');
        modelOptions?.forEach(option => {
            option.addEventListener('click', (e) => {
                const modelId = option.getAttribute('data-model-id');
                if (modelId) {
                    this.selectModel(modelId);
                    this.closeDropdown();
                }
            });
        });
    }

    selectModel(modelId) {
        const models = this.availableModels || this.config.models;
        const selectedModel = models.find(m => m.id === modelId);

        if (selectedModel) {
            this.currentModel = modelId;

            // Update display
            if (this.dom.selectedModel) {
                this.dom.selectedModel.textContent = `${selectedModel.name} - ${selectedModel.description}`;
            }

            // Update selection highlighting
            const allOptions = this.dom.modelsList?.querySelectorAll('.model-option');
            allOptions?.forEach(opt => opt.classList.remove('selected'));

            const selectedOption = this.dom.modelsList?.querySelector(`[data-model-id="${modelId}"]`);
            selectedOption?.classList.add('selected');

            this.updateCostEstimation();
        }
    }

    filterDropdownModels(searchQuery) {
        // Update the models list with filtered results
        if (this.dom.modelsList) {
            const filteredHtml = this.generateDropdownContent(searchQuery);
            this.dom.modelsList.innerHTML = filteredHtml;

            // Update count info
            const allModels = this.availableModels || this.config.models;
            const filteredModels = searchQuery ? this.filterModelsBySearch(allModels, searchQuery) : allModels;
            this.updateModelCountInfo(filteredModels.length, allModels.length, searchQuery);

            // Re-setup click handlers for new content
            this.setupModelOptionHandlers();
        }
    }

    // Keep old method for backward compatibility
    filterModels(searchQuery) {
        this.filterDropdownModels(searchQuery);
    }

    updateModelCountInfo(filteredCount, totalCount, searchQuery) {
        if (this.dom.modelCountInfo) {
            if (searchQuery && searchQuery.trim()) {
                this.dom.modelCountInfo.textContent =
                    `Showing ${filteredCount} of ${totalCount} models for "${searchQuery}"`;
            } else {
                this.dom.modelCountInfo.textContent = `Showing all ${totalCount} models`;
            }
        }
    }

    refreshModelSelection() {
        // Update the custom dropdown with current models
        if (this.dom.modelsList) {
            // Clear search if exists
            if (this.dom.dropdownSearch) {
                this.dom.dropdownSearch.value = '';
            }

            // Update the dropdown content
            this.dom.modelsList.innerHTML = this.generateDropdownContent();

            // Try to restore the previous selection, or use default
            const currentValue = this.currentModel;
            const modelExists = this.availableModels?.some(m => m.id === currentValue);

            if (modelExists) {
                this.selectModel(currentValue);
            } else {
                // Find a suitable default from available models
                const defaultModel = this.availableModels?.find(m => m.id === this.config.defaultModel) ||
                                   this.availableModels?.[0];
                if (defaultModel) {
                    this.selectModel(defaultModel.id);
                }
            }

            // Update count info and setup handlers
            const totalCount = (this.availableModels || this.config.models).length;
            this.updateModelCountInfo(totalCount, totalCount, '');
            this.setupModelOptionHandlers();
        }
    }

    async onInit() {
        // Ensure dom object exists
        if (!this.dom) {
            this.dom = {};
        }

        // Wait a moment for DOM elements to be fully rendered
        await new Promise(resolve => setTimeout(resolve, 50));

        // Cache DOM elements
        this.cacheDOM();

        // Track dropdown state
        this.dropdownOpen = false;

        // Setup event listeners
        this.setupEventListeners();

        // Always populate models in dropdown (needed for selection even when not authenticated)
        this.populateModelDropdown();

        // Set up model option handlers if we have models and are authenticated
        if (this.isAuthenticated && this.availableModels && this.availableModels.length > 0) {
            this.setupModelOptionHandlers();
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
            this.refreshModelSelection(); // Update model list with fresh data

            // Regenerate template with authenticated state
            await this.regenerateTemplate();
        } catch (error) {
            this.apiKey = null;
            this.isAuthenticated = false;
            logger.error('API key validation failed:', error);
            this.showMessage('Invalid API key or connection failed', 'error');
        }
    }

    async validateApiKey() {
        // Test the API key by making a simple request to OpenRouter and fetch current models
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('API key validation failed');
        }

        const modelsData = await response.json();

        // Process and store the current model list
        await this.updateModelList(modelsData.data || []);

        return modelsData;
    }

    async updateModelList(apiModels) {
        try {
            // Validate input
            if (!Array.isArray(apiModels) || apiModels.length === 0) {
                throw new Error('No models received from API');
            }

            // Filter and categorize models for the slides creator
            const processedModels = apiModels
                .filter(model => this.isModelSuitableForSlides(model))
                .map(model => this.processModelData(model))
                .sort((a, b) => this.sortModelsByCategory(a, b));

            // Ensure we have at least some models
            if (processedModels.length === 0) {
                throw new Error('No suitable models found after filtering');
            }

            // Store the processed models
            this.availableModels = processedModels;

            // Update the config models array
            this.config.models = processedModels;

            logger.info(`Updated model list with ${processedModels.length} current models from OpenRouter`);
        } catch (error) {
            logger.error('Failed to process model list:', error);

            // Fallback: Keep existing hardcoded models and add warning
            if (!this.availableModels || this.availableModels.length === 0) {
                this.availableModels = this.config.models;
                logger.warn('Using fallback hardcoded model list due to API processing failure');
            }

            // Show user-friendly message about fallback
            if (this.showMessage) {
                this.showMessage('Using cached model list. Some models may be outdated.', 'warning');
            }
        }
    }

    async validateApiKeyWithFallback() {
        try {
            return await this.validateApiKey();
        } catch (error) {
            logger.error('API validation failed, using fallback models:', error);

            // For authentication purposes, still throw the error
            // but ensure we have fallback models available
            if (!this.availableModels || this.availableModels.length === 0) {
                this.availableModels = this.config.models;
            }

            throw error;
        }
    }

    isModelSuitableForSlides(model) {
        // Show ALL models - no filtering
        // Users can now access image generators, audio models, vision models, etc.
        return true; // Accept all models from OpenRouter
    }

    processModelData(model) {
        // Extract provider from model ID
        const provider = model.id.split('/')[0] || 'unknown';

        // Categorize model
        const category = this.categorizeModel(model);

        // Format pricing
        const pricing = this.formatPricing(model.pricing);

        return {
            id: model.id,
            name: model.name || model.id.split('/')[1] || model.id,
            provider: provider,
            category: category,
            description: this.generateModelDescription(model, category),
            pricing: pricing,
            context_length: model.context_length || 'Unknown',
            capabilities: this.extractCapabilities(model)
        };
    }

    categorizeModel(model) {
        const modelId = model.id.toLowerCase();
        const modelName = model.name?.toLowerCase() || '';

        // Image generation models
        if (modelId.includes('dall-e') || modelId.includes('midjourney') ||
            modelId.includes('stable-diffusion') || modelId.includes('flux') ||
            modelName.includes('image') || modelName.includes('draw') ||
            modelName.includes('art') || modelName.includes('vision') ||
            modelId.includes('replicate') && (modelName.includes('image') || modelName.includes('art'))) {
            return 'image';
        }

        // Audio/Speech models
        if (modelId.includes('whisper') || modelId.includes('tts') ||
            modelName.includes('audio') || modelName.includes('speech') ||
            modelName.includes('voice') || modelName.includes('sound')) {
            return 'audio';
        }

        // Embedding models
        if (modelId.includes('embedding') || modelName.includes('embedding') ||
            modelId.includes('embed') || modelName.includes('embed')) {
            return 'embedding';
        }

        // Premium models (high capability, higher cost)
        if (modelId.includes('gpt-4') || modelId.includes('claude-3.5-sonnet') ||
            modelId.includes('claude-4') || modelId.includes('gpt-5') ||
            modelId.includes('gemini-pro') || modelId.includes('opus')) {
            return 'premium';
        }

        // Fast models (optimized for speed and cost)
        if (modelId.includes('mini') || modelId.includes('haiku') ||
            modelId.includes('flash') || modelId.includes('8b') ||
            modelName.includes('fast') || modelName.includes('lite')) {
            return 'fast';
        }

        // Free models
        if (model.pricing?.prompt === 0 || model.pricing?.completion === 0) {
            return 'free';
        }

        // Default to specialized
        return 'specialized';
    }

    generateModelDescription(model, category) {
        const provider = model.id.split('/')[0];
        const capabilities = [];

        if (model.context_length >= 100000) capabilities.push('Long context');
        if (model.multimodal) capabilities.push('Multimodal');
        if (provider === 'anthropic') capabilities.push('Excellent writing');
        if (provider === 'openai') capabilities.push('Balanced performance');
        if (provider === 'google') capabilities.push('Fast inference');
        if (provider === 'meta-llama') capabilities.push('Open source');

        return capabilities.join(' • ') || 'Text generation';
    }

    formatPricing(pricing) {
        if (!pricing) return 'Contact provider';

        const prompt = pricing.prompt ? (pricing.prompt * 1000000).toFixed(2) : '0';
        const completion = pricing.completion ? (pricing.completion * 1000000).toFixed(2) : '0';

        return `$${prompt}/$${completion}`;
    }

    extractCapabilities(model) {
        const caps = [];
        if (model.multimodal) caps.push('multimodal');
        if (model.context_length >= 100000) caps.push('long-context');
        return caps;
    }

    sortModelsByCategory(a, b) {
        const categoryOrder = { premium: 0, fast: 1, specialized: 2, free: 3 };
        const categoryDiff = (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99);

        if (categoryDiff !== 0) return categoryDiff;

        // Within category, sort by name
        return a.name.localeCompare(b.name);
    }

    async updateAccountInfo() {
        if (!this.isAuthenticated) return;

        try {
            // Get account key info - this is the only reliable endpoint
            const keyResponse = await fetch('https://openrouter.ai/api/v1/auth/key', {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            let accountData = {};
            if (keyResponse.ok) {
                accountData = await keyResponse.json();
                console.log('🔍 OpenRouter key response:', accountData);
            } else {
                console.log('❌ OpenRouter key response failed:', keyResponse.status);
                // Even if key endpoint fails, we know the API key works since validation passed
                accountData = { connected: true };
            }

            this.accountInfo = accountData;
            console.log('📊 Final accountInfo:', this.accountInfo);
            this.updateBalanceDisplay();

            // Directly update the account balance in DOM
            const accountBalanceEl = DOM.query('.account-balance');
            if (accountBalanceEl) {
                const balanceText = this.getAccountBalanceText();
                accountBalanceEl.textContent = balanceText;
                console.log('🔄 Updated account balance DOM to:', balanceText);
            }

            // Update template with new account info
            if (this.isAuthenticated) {
                this.updateUI();
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

        // Display account info with priority: balance > account label > connected status
        if (this.accountInfo.balance !== undefined) {
            // Show balance if available
            this.dom.accountBalance.textContent = `💰 Credits: $${this.accountInfo.balance.toFixed(2)}`;
        } else if (this.accountInfo.credits && this.accountInfo.credits.remaining !== undefined) {
            // Check nested credits object
            this.dom.accountBalance.textContent = `💰 Credits: $${this.accountInfo.credits.remaining.toFixed(2)}`;
        } else if (this.accountInfo.data && this.accountInfo.data.label) {
            // Show account label if available
            this.dom.accountBalance.textContent = `📧 ${this.accountInfo.data.label}`;
        } else if (this.accountInfo.data && this.accountInfo.data.usage) {
            // Show usage info if available
            this.dom.accountBalance.textContent = `📊 Usage: $${this.accountInfo.data.usage.toFixed(4)}`;
        } else {
            // Fallback status
            this.dom.accountBalance.textContent = `✅ API Key Active`;
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
        if (this.dom.authSection && this.dom.authenticatedSection) {
            if (this.isAuthenticated) {
                this.dom.authSection.style.display = 'none';
                this.dom.authenticatedSection.style.display = 'block';
                this.updateCostEstimation();
            } else {
                this.dom.authSection.style.display = 'block';
                this.dom.authenticatedSection.style.display = 'none';
            }
        } else {
            // If DOM elements don't exist, regenerate the template
            console.log('DOM elements not found, regenerating template');
            this.regenerateTemplate();
        }
    }

    async regenerateTemplate() {
        const providerSection = document.getElementById('provider-section');
        if (providerSection) {
            try {
                const template = await this.getTemplate();
                providerSection.innerHTML = template;

                // Re-cache DOM elements
                await new Promise(resolve => setTimeout(resolve, 50));
                this.cacheDOM();
                this.setupEventListeners();

                // Set up model option handlers if we have models
                if (this.availableModels && this.availableModels.length > 0) {
                    this.setupModelOptionHandlers();
                }
            } catch (error) {
                console.error('Failed to regenerate template:', error);
            }
        }
    }

    cacheDOM() {
        this.dom.apiKeyInput = document.querySelector('#openrouter-api-key');
        this.dom.connectBtn = document.querySelector('#openrouter-connect-btn');
        this.dom.disconnectBtn = document.querySelector('#openrouter-disconnect-btn');
        this.dom.dropdownTrigger = document.querySelector('#dropdown-trigger');
        this.dom.dropdownContent = document.querySelector('#dropdown-content');
        this.dom.dropdownSearch = document.querySelector('#dropdown-search');
        this.dom.modelsList = document.querySelector('#models-list');
        this.dom.selectedModel = document.querySelector('#selected-model');
        this.dom.modelCountInfo = document.querySelector('#model-count-info');
        this.dom.authSection = document.querySelector('#openrouter-auth');
        this.dom.authenticatedSection = document.querySelector('#openrouter-authenticated');
        this.dom.accountBalance = document.querySelector('.account-balance');
    }

    setupEventListeners() {
        if (this.dom.connectBtn) {
            Events.on(this.dom.connectBtn, 'click', () => this.connectWithApiKey());
        }

        if (this.dom.disconnectBtn) {
            Events.on(this.dom.disconnectBtn, 'click', () => this.disconnect());
        }

        // Custom dropdown event listeners
        if (this.dom.dropdownTrigger) {
            Events.on(this.dom.dropdownTrigger, 'click', (e) => {
                e.preventDefault();
                this.toggleDropdown();
            });
        }

        if (this.dom.dropdownSearch) {
            Events.on(this.dom.dropdownSearch, 'input', (e) => {
                this.filterDropdownModels(e.target.value);
            });

            Events.on(this.dom.dropdownSearch, 'keydown', (e) => {
                // Prevent dropdown from closing when typing
                e.stopPropagation();
            });
        }

        // Close dropdown when clicking outside
        Events.on(document, 'click', (e) => {
            if (this.dropdownOpen &&
                this.dom.dropdownContent &&
                !this.dom.dropdownContent.contains(e.target) &&
                !this.dom.dropdownTrigger.contains(e.target)) {
                this.closeDropdown();
            }
        });
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
                this.refreshModelSelection(); // Update model list with saved auth
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

            // Refresh account balance after generation
            setTimeout(() => {
                this.updateAccountInfo();
            }, 1000); // Small delay to allow OpenRouter to process the usage

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