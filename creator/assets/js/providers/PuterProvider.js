/**
 * Puter AI Provider - Following CLAUDE.md Guidelines
 * Free access to 200+ AI models through Puter.js
 */

import { BaseProvider } from './BaseProvider.js';
import { DOM, Events } from '../core/dom.js';
import { logger } from '../core/utils.js';

export class PuterProvider extends BaseProvider {
    constructor() {
        super('Cloud AI (Free) - 200+ Models', {
            defaultModel: 'openrouter:openai/gpt-4o',
            models: [
                // Premium models
                'openrouter:anthropic/claude-3.5-sonnet',
                'openrouter:openai/gpt-4o',
                'openrouter:google/gemini-pro-1.5',

                // Fast & efficient models
                'openrouter:openai/gpt-4o-mini',
                'openrouter:anthropic/claude-3-haiku',
                'openrouter:meta-llama/llama-3.1-8b-instruct',

                // Specialized models
                'openrouter:meta-llama/llama-3.1-70b-instruct',
                'openrouter:mistralai/mistral-large',
                'openrouter:google/gemini-flash-1.5',
                'openrouter:qwen/qwen-2.5-72b-instruct',

                // Additional options
                'openrouter:microsoft/wizardlm-2-8x22b',
                'openrouter:anthropic/claude-3-opus',
                'openrouter:cohere/command-r-plus'
            ],
            maxTokens: 8000
        });

        this.currentModel = this.config.defaultModel;
        this.puterLoaded = false;

        // Simple request tracking for debugging (not for quota management)
        this.requestCount = 0;
        this.lastRequest = null;
        this.sessionErrors = [];

        // Log initialization for debugging
        logger.info('Cloud AI (Free) provider initialized with 200+ models via Puter.js + OpenRouter');

        // Future OAuth2 integration reference
        this.authManager = null; // Will be initialized when OAuth2 providers are available
        this.supportsOAuth2 = false; // Will be enabled when AI providers add OAuth2 support
    }

    /**
     * Initialize OAuth2 support for future provider integration
     * Currently prepared for Google AI, Azure OpenAI when they add support
     */
    async initializeOAuth2Support() {
        try {
            // Dynamic import to avoid loading OAuth2 infrastructure unless needed
            const { AuthManager, OAUTH_PROVIDERS } = await import('../utils/auth-manager.js');

            this.authManager = new AuthManager();

            // Register supported OAuth2 providers (currently only Google AI works)
            // this.authManager.registerProvider('google', OAUTH_PROVIDERS.google);
            // this.authManager.registerProvider('azure', OAUTH_PROVIDERS.azure);

            this.supportsOAuth2 = true;
            logger.info('OAuth2 infrastructure ready for future AI provider support');
        } catch (error) {
            logger.debug('OAuth2 infrastructure not available:', error);
        }
    }

    async getTemplate() {
        return `
            <fieldset>
                <legend>💳 User Pays AI Provider</legend>
                <div class="puter-info" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 1.1em;">🌟 Free Access to Premium AI Models</h3>
                    <p style="margin: 0; font-size: 0.9em; opacity: 0.95;">Get instant access to 200+ AI models including GPT-4o, Claude 3.5 Sonnet, Gemini Pro, LLaMA, and more through your free Puter account.</p>
                    <p style="margin: 8px 0 4px 0; font-size: 0.85em; opacity: 0.9;"><strong>No API Keys Required:</strong> Puter manages authentication and provides direct access to OpenRouter's model marketplace.</p>
                    <p style="margin: 4px 0 0 0; font-size: 0.8em; opacity: 0.8;">✨ <em>Recommended for first-time users - zero setup required!</em></p>
                </div>

                <div class="input-group">
                    <label for="puter-model-select" class="label-no-shrink-no-margin">AI Model:</label>
                    <select id="puter-model-select" class="select-no-margin">
                        <optgroup label="🚀 Premium Models (Best Quality)">
                            <option value="openrouter:anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet - Best for writing & analysis</option>
                            <option value="openrouter:openai/gpt-4o" selected>GPT-4o - Balanced performance & speed</option>
                            <option value="openrouter:google/gemini-pro-1.5">Gemini Pro 1.5 - Google's flagship model</option>
                        </optgroup>
                        <optgroup label="⚡ Fast & Efficient Models">
                            <option value="openrouter:openai/gpt-4o-mini">GPT-4o Mini - Fast & cost-effective</option>
                            <option value="openrouter:anthropic/claude-3-haiku">Claude 3 Haiku - Lightning fast</option>
                            <option value="openrouter:meta-llama/llama-3.1-8b-instruct">LLaMA 3.1 8B - Open source</option>
                            <option value="openrouter:google/gemini-flash-1.5">Gemini Flash 1.5 - Ultra fast</option>
                        </optgroup>
                        <optgroup label="🎯 Specialized Models">
                            <option value="openrouter:meta-llama/llama-3.1-70b-instruct">LLaMA 3.1 70B - Advanced reasoning</option>
                            <option value="openrouter:mistralai/mistral-large">Mistral Large - European model</option>
                            <option value="openrouter:qwen/qwen-2.5-72b-instruct">Qwen 2.5 72B - Multilingual expert</option>
                            <option value="openrouter:microsoft/wizardlm-2-8x22b">WizardLM 2 - Code & math specialist</option>
                            <option value="openrouter:anthropic/claude-3-opus">Claude 3 Opus - Maximum capability</option>
                            <option value="openrouter:cohere/command-r-plus">Command R+ - Enterprise focused</option>
                        </optgroup>
                    </select>
                </div>

                <div id="puter-connection-status" class="puter-status" style="background: #f8f9fa; border-radius: 6px; padding: 12px; border-left: 4px solid #f59e0b;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: #f59e0b; font-weight: bold;">●</span>
                        <span style="color: #666; font-size: 0.9em;">Checking Puter connection...</span>
                    </div>
                </div>

                <div id="puter-auth-guide" style="background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 12px; margin: 8px 0; border-radius: 6px; font-size: 0.9em; display: none;">
                    <div style="font-weight: 600; margin-bottom: 6px;">🔐 Puter Account Connection Required</div>
                    <div style="margin-bottom: 8px;">Click "Generate Entire Course" to start. Puter will open a popup to connect your account (first time only).</div>
                    <div style="font-size: 0.85em; color: #78350f;">Don't have a Puter account? You'll be able to create one during the connection process.</div>
                </div>

                <div id="puter-quota-tips" style="background: #f0f9ff; border: 1px solid #0ea5e9; color: #0c4a6e; padding: 12px; margin: 8px 0; border-radius: 6px; font-size: 0.9em; display: none;">
                    <div style="font-weight: 600; margin-bottom: 8px;">💡 Usage Optimization & Future Features</div>
                    <div style="margin-bottom: 6px;">• <strong>Current:</strong> Use "Brief" or "Outline" depth for lighter quota usage</div>
                    <div style="margin-bottom: 6px;">• <strong>Tip:</strong> Start with 1-2 chapters to test account limits first</div>
                    <div style="margin-bottom: 6px;">• <strong>Models:</strong> GPT-4o Mini and Claude Haiku are fastest/cheapest</div>
                    <div style="margin-bottom: 8px; padding: 6px; background: rgba(16,185,129,0.1); border-radius: 4px; font-size: 0.85em;">
                        🚀 <strong>Coming Soon:</strong> OAuth2 authentication for Google AI, Azure OpenAI, and other providers (when they add OAuth2 support)
                    </div>
                    <button id="puter-explore-account" style="background: #0ea5e9; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85em;">🔍 Explore Account Features</button>
                </div>

                <div id="connection-status" class="status-display"></div>
            </fieldset>
        `;
    }

    async onInit() {
        // Load Puter.js if not already loaded
        if (!window.puter) {
            await this.loadPuterJS();
        }

        // Cache DOM elements
        this.dom.puterModelSelect = DOM.query('#puter-model-select');
        this.dom.connectionStatus = DOM.query('#connection-status');
        this.dom.puterConnectionStatus = DOM.query('#puter-connection-status');
        this.dom.puterAuthGuide = DOM.query('#puter-auth-guide');
        this.dom.puterExploreBtn = DOM.query('#puter-explore-account');

        // Set default model
        this.currentModel = this.dom.puterModelSelect?.value || this.config.defaultModel;
        if (this.appState) {
            this.appState.set('puterModel', this.currentModel);
        }

        // Set up event listeners
        this.setupEventListeners();

        // Check connection status and update UI
        await this.checkAndUpdateConnectionStatus();
    }

    setupEventListeners() {
        if (this.dom.puterModelSelect) {
            Events.on(this.dom.puterModelSelect, 'change', () => {
                this.handleModelChange();
            });
        }

        // Add event listener for explore account button
        if (this.dom.puterExploreBtn) {
            Events.on(this.dom.puterExploreBtn, 'click', () => {
                this.exploreAccountFeatures();
            });
        }
    }

    exploreAccountFeatures() {
        // Show immediate feedback
        if (this.dom.puterExploreBtn) {
            this.dom.puterExploreBtn.textContent = '🔍 Exploring...';
            this.dom.puterExploreBtn.disabled = true;
        }

        // Discover and display account features
        setTimeout(async () => {
            try {
                const accountInfo = await this.discoverPuterAccountFeatures();
                if (accountInfo) {
                    this.displayAccountManagementInfo(accountInfo);
                } else {
                    this.displayGenericAccountGuidance();
                }

                // Also open puter.com in new tab
                window.open('https://puter.com', '_blank');

            } catch (error) {
                logger.debug('Account exploration failed:', error);
                this.displayGenericAccountGuidance();
                window.open('https://puter.com', '_blank');
            }

            // Reset button
            if (this.dom.puterExploreBtn) {
                this.dom.puterExploreBtn.textContent = '🔍 Explore Account Features';
                this.dom.puterExploreBtn.disabled = false;
            }
        }, 500);
    }

    handleModelChange() {
        this.currentModel = this.dom.puterModelSelect.value;
        const modelName = this.getModelDisplayName(this.currentModel);

        if (this.appState) {
            this.appState.set('puterModel', this.currentModel);
        }


        // Save state if available
        if (this.appState && typeof this.appState.save === 'function') {
            this.appState.save();
        }
    }

    async checkAndUpdateConnectionStatus() {
        if (!window.puter) {
            this.updateConnectionUI('error', 'Puter.js failed to load');
            return;
        }

        try {
            // Check if user is signed in
            const isSignedIn = await window.puter.auth.isSignedIn();

            if (isSignedIn) {
                // User is connected
                this.updateConnectionUI('connected', 'Connected to your Puter account');
                if (this.dom.puterAuthGuide) {
                    this.dom.puterAuthGuide.style.display = 'none';
                }
                // Show quota optimization tips when connected
                const quotaTips = DOM.query('#puter-quota-tips');
                if (quotaTips) {
                    quotaTips.style.display = 'block';
                }
            } else {
                // User needs to connect
                this.updateConnectionUI('disconnected', 'Ready to connect to your Puter account');
                if (this.dom.puterAuthGuide) {
                    this.dom.puterAuthGuide.style.display = 'block';
                }
                // Hide quota tips when not connected
                const quotaTips = DOM.query('#puter-quota-tips');
                if (quotaTips) {
                    quotaTips.style.display = 'none';
                }
            }
        } catch (error) {
            logger.debug('Auth check failed, will attempt connection on first AI call:', error);
            // Show connection guide - auth will happen on first AI call
            this.updateConnectionUI('disconnected', 'Ready to connect to your Puter account');
            if (this.dom.puterAuthGuide) {
                this.dom.puterAuthGuide.style.display = 'block';
            }
        }

        // Update provider status
        this.updateProviderStatus();
    }

    updateConnectionUI(status, message) {
        if (!this.dom.puterConnectionStatus) return;

        const statusElement = this.dom.puterConnectionStatus.querySelector('span:first-child');
        const messageElement = this.dom.puterConnectionStatus.querySelector('span:last-child');

        let color = '#f59e0b'; // amber (default)
        let icon = '●';

        switch (status) {
            case 'connected':
                color = '#10b981'; // green
                icon = '●';
                break;
            case 'disconnected':
                color = '#f59e0b'; // amber
                icon = '●';
                break;
            case 'error':
                color = '#ef4444'; // red
                icon = '●';
                break;
        }

        if (statusElement) {
            statusElement.style.color = color;
            statusElement.textContent = icon;
        }
        if (messageElement) {
            messageElement.textContent = message;
        }

        // Update border color
        this.dom.puterConnectionStatus.style.borderLeftColor = color;
    }

    // Simple session tracking for debugging only
    recordRequest() {
        this.requestCount++;
        this.lastRequest = new Date().toISOString();
        logger.debug(`Puter request #${this.requestCount} at ${this.lastRequest}`);
    }

    recordError(error) {
        const errorRecord = {
            timestamp: new Date().toISOString(),
            error: error.message || error.toString(),
            type: this.detectErrorType(error)
        };

        this.sessionErrors.push(errorRecord);
        logger.warn('Puter error recorded:', errorRecord);

        // Show specific guidance for server quota errors
        if (errorRecord.type === 'server_quota') {
            this.showServerQuotaGuidance(errorRecord);
        }
    }

    detectErrorType(error) {
        const errorText = (error.message || error.toString()).toLowerCase();
        const quotaKeywords = ['quota', 'limit', 'rate', 'usage', 'exceeded', 'too many'];

        if (quotaKeywords.some(keyword => errorText.includes(keyword))) {
            return 'server_quota';
        }
        if (errorText.includes('auth')) {
            return 'authentication';
        }
        if (errorText.includes('network')) {
            return 'network';
        }
        return 'unknown';
    }

    // Server-side quota detection - no local limits
    async checkServerAvailability() {
        // Simple connectivity check - no quota enforcement
        return {
            available: true,
            message: 'Puter.js uses server-side quota management',
            requestsThisSession: this.requestCount
        };
    }

    // Estimate course cost without enforcing artificial limits
    getEstimatedCourseRequests(courseData) {
        // Calculate estimated requests needed for this course
        const baseRequests = 2; // Course name + description (if empty)
        const chapterRequests = courseData.numChapters * 2; // Title + content per chapter
        const estimatedRequests = baseRequests + chapterRequests;

        return {
            estimatedRequests,
            breakdown: {
                courseInfo: baseRequests,
                chapterTitles: courseData.numChapters,
                chapterContent: courseData.numChapters
            },
            courseData: {
                chapters: courseData.numChapters,
                depth: courseData.courseDepth || 'standard'
            },
            note: 'Actual availability depends on your Puter account status'
        };
    }

    // Server quota guidance when errors occur
    showServerQuotaGuidance(errorRecord) {
        const guidance = `
🚫 Puter Account Quota Exceeded

Your Puter account has reached its usage limits. Unfortunately, Puter's quota management system is not well documented.

Try these solutions:
1. Visit your Puter account dashboard (check puter.com when logged in)
2. Wait for quota reset (timeframe varies by account type)
3. Look for account settings or billing options in your Puter profile
4. Contact Puter support if you need quota increases
5. Switch to a different AI provider for immediate access:
   • Cloud AI (OpenAI, Anthropic, Google with your API keys)
   • WebLLM (runs locally in your browser)
   • Ollama (local models)

Note: Puter's "User Pays" model documentation lacks specific quota management details.
        `;

        this.displayServerQuotaMessage(guidance.trim());
        this.addQuotaManagementHelper();
        logger.info('Server quota guidance shown to user');
    }

    addQuotaManagementHelper() {
        // Add an interactive helper to find Puter account management
        setTimeout(() => {
            if (window.puter && typeof window.puter.auth === 'object') {
                this.checkPuterAccountAccess();
            }
        }, 1000);
    }

    async checkPuterAccountAccess() {
        try {
            // Try to get user info or account details from Puter
            const accountInfo = await this.discoverPuterAccountFeatures();
            if (accountInfo) {
                this.displayAccountManagementInfo(accountInfo);
            }
        } catch (error) {
            logger.debug('Could not access Puter account features:', error);
            this.displayGenericAccountGuidance();
        }
    }

    async discoverPuterAccountFeatures() {
        // Try to discover available Puter account management features
        const features = {};

        try {
            // Check if user info is available
            if (window.puter.auth && typeof window.puter.auth.getUser === 'function') {
                features.user = await window.puter.auth.getUser();
            }
        } catch (e) {
            logger.debug('User info not available:', e);
        }

        try {
            // Check if account/billing methods exist
            if (window.puter.account) {
                features.accountMethods = Object.keys(window.puter.account);
            }
        } catch (e) {
            logger.debug('Account methods not available:', e);
        }

        try {
            // Check if usage/quota methods exist
            if (window.puter.usage || window.puter.quota || window.puter.billing) {
                features.usageMethods = {
                    usage: !!window.puter.usage,
                    quota: !!window.puter.quota,
                    billing: !!window.puter.billing
                };
            }
        } catch (e) {
            logger.debug('Usage methods not available:', e);
        }

        return Object.keys(features).length > 0 ? features : null;
    }

    displayAccountManagementInfo(accountInfo) {
        const infoElement = DOM.create('div', {
            id: 'puter-account-info',
            className: 'puter-account-info'
        });

        let infoHtml = '<div style="background: #e0f2fe; border: 1px solid #0288d1; color: #01579b; padding: 12px; margin: 8px 0; border-radius: 6px; font-size: 0.9em;">';
        infoHtml += '<div style="font-weight: 600; margin-bottom: 6px;">📊 Puter Account Information</div>';

        if (accountInfo.user) {
            infoHtml += `<div>Logged in as: ${accountInfo.user.username || accountInfo.user.email || 'Unknown'}</div>`;
        }

        if (accountInfo.accountMethods && accountInfo.accountMethods.length > 0) {
            infoHtml += `<div>Available account methods: ${accountInfo.accountMethods.join(', ')}</div>`;
        }

        if (accountInfo.usageMethods) {
            const availableFeatures = Object.entries(accountInfo.usageMethods)
                .filter(([_, available]) => available)
                .map(([feature, _]) => feature);
            if (availableFeatures.length > 0) {
                infoHtml += `<div>Available usage features: ${availableFeatures.join(', ')}</div>`;
            }
        }

        infoHtml += '<div style="margin-top: 8px; font-size: 0.85em;">Try accessing these features in your browser console with <code>window.puter</code></div>';
        infoHtml += '</div>';

        infoElement.innerHTML = infoHtml;

        // Insert after quota message
        const quotaMessage = document.getElementById('puter-server-quota-message');
        if (quotaMessage && quotaMessage.parentNode) {
            quotaMessage.parentNode.insertBefore(infoElement, quotaMessage.nextSibling);
        }
    }

    displayGenericAccountGuidance() {
        const guideElement = DOM.create('div', {
            id: 'puter-account-guide',
            className: 'puter-account-guide'
        });

        guideElement.innerHTML = `
            <div style="background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 12px; margin: 8px 0; border-radius: 6px; font-size: 0.9em;">
                <div style="font-weight: 600; margin-bottom: 8px;">💡 Quota Management Tips</div>
                <div style="margin-bottom: 6px;">1. Open your browser console (F12) and type <code>window.puter</code> to explore available account features</div>
                <div style="margin-bottom: 6px;">2. Visit <a href="https://puter.com" target="_blank" style="color: #856404; text-decoration: underline;">puter.com</a> while logged in to find account settings</div>
                <div style="margin-bottom: 6px;">3. Look for billing, usage, or subscription options in your profile</div>
                <div>4. Consider using Brief or Outline depth to reduce quota usage</div>
            </div>
        `;

        // Insert after quota message
        const quotaMessage = document.getElementById('puter-server-quota-message');
        if (quotaMessage && quotaMessage.parentNode) {
            quotaMessage.parentNode.insertBefore(guideElement, quotaMessage.nextSibling);
        }
    }

    displayServerQuotaMessage(message) {
        // Create or update server quota message element
        let messageEl = document.getElementById('puter-server-quota-message');
        if (!messageEl) {
            messageEl = DOM.create('div', {
                id: 'puter-server-quota-message',
                className: 'server-quota-message'
            });

            // Insert at the top of provider section for visibility
            const providerSection = DOM.query('#provider-section');
            if (providerSection) {
                providerSection.insertBefore(messageEl, providerSection.firstChild);
            }
        }

        messageEl.style.cssText = `
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
            padding: 16px;
            margin: 0 0 16px 0;
            border-radius: 8px;
            font-size: 0.9em;
            line-height: 1.5;
            white-space: pre-line;
        `;

        messageEl.textContent = message;

        // Add a dismiss button
        const dismissButton = DOM.create('button', {
            className: 'dismiss-button',
            textContent: '✕ Dismiss'
        });

        dismissButton.style.cssText = `
            background: #dc2626;
            color: white;
            border: none;
            padding: 4px 12px;
            margin-top: 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85em;
            float: right;
        `;

        dismissButton.onclick = () => {
            if (messageEl && messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        };

        messageEl.appendChild(dismissButton);
    }

    // Batched generation method to save quota
    async generateBatchedCourseInfo(courseData) {
        if (!courseData.name || !courseData.description) {
            const prompt = `Generate course information for an educational course:

Master Prompt: ${courseData.masterPrompt}

Please provide both a course name and description in this exact format:

COURSE NAME: [Your course title here]

COURSE DESCRIPTION: [Your course description here - should be a brief overview for the main landing page]

Make sure the name is compelling and the description clearly explains what students will learn.`;

            const response = await this.generateText(prompt, { maxTokens: 200 });

            // Parse the response to extract name and description
            const nameMatch = response.match(/COURSE NAME:\s*(.+?)(?=\n|$)/i);
            const descMatch = response.match(/COURSE DESCRIPTION:\s*(.+?)(?=\n|$)/si);

            return {
                name: nameMatch ? nameMatch[1].trim() : courseData.name || 'Generated Course',
                description: descMatch ? descMatch[1].trim() : courseData.description || 'Course description'
            };
        }

        return {
            name: courseData.name,
            description: courseData.description
        };
    }

    // Generate all chapter titles in a single request
    async generateBatchedChapterTitles(courseData) {
        const prompt = `Create compelling titles for all ${courseData.numChapters} chapters of a course:

Course Name: ${courseData.name}
Course Description: ${courseData.description || 'No description provided'}
Master Prompt: ${courseData.masterPrompt}

Please provide exactly ${courseData.numChapters} chapter titles in this format:

Chapter 1: [First chapter title]
Chapter 2: [Second chapter title]
${courseData.numChapters > 2 ? `Chapter 3: [Third chapter title]\n${[...Array(courseData.numChapters - 3)].map((_, i) => `Chapter ${i + 4}: [Title for chapter ${i + 4}]`).join('\n')}` : ''}

Make sure each title is compelling and follows a logical progression through the course content.`;

        const response = await this.generateText(prompt, { maxTokens: Math.min(500, courseData.numChapters * 50) });

        // Parse the response to extract chapter titles
        const titles = [];
        const lines = response.split('\n');

        for (let i = 0; i < courseData.numChapters; i++) {
            const chapterPattern = new RegExp(`Chapter\\s+${i + 1}:\\s*(.+?)(?=\\n|$)`, 'i');
            let title = `Chapter ${i + 1}`;

            for (const line of lines) {
                const match = line.match(chapterPattern);
                if (match) {
                    title = match[1].trim();
                    break;
                }
            }

            titles.push(title);
        }

        return titles;
    }

    // Enhanced generation method with Puter-specific optimizations
    async generateOptimizedCourseContent(courseData, onProgress) {
        try {
            // Show estimated cost (no local enforcement)
            const estimate = this.getEstimatedCourseRequests(courseData);
            if (onProgress) onProgress(0, `Estimated: ${estimate.estimatedRequests} requests needed`);

            let progress = 0;
            const totalSteps = 3; // Batch course info, batch titles, individual content

            // Step 1: Generate course name and description in batch (1 request instead of 2)
            if (onProgress) onProgress(10, 'Generating course information...');
            const courseInfo = await this.generateBatchedCourseInfo(courseData);
            progress++;

            // Step 2: Generate all chapter titles in batch (1 request instead of N)
            if (onProgress) onProgress(30, 'Generating all chapter titles...');
            const chapterTitles = await this.generateBatchedChapterTitles({
                ...courseData,
                name: courseInfo.name,
                description: courseInfo.description
            });
            progress++;

            // Step 3: Generate chapter content individually (can't easily batch this)
            const chapters = [];
            for (let i = 0; i < courseData.numChapters; i++) {
                const progressPercent = 30 + ((i + 1) / courseData.numChapters) * 60;
                if (onProgress) onProgress(progressPercent, `Generating Chapter ${i + 1} content...`);

                // Use the existing generateChapterContent from CourseManager logic
                const depth = courseData.depthConfig || { tokens: 1200 };
                const maxTokens = depth.tokens;

                // Customize prompt based on depth level
                let contentInstructions = this.getContentInstructionsForDepth(courseData.courseDepth, depth);

                const prompt = `Generate educational content for this chapter of a course:

Course Name: ${courseInfo.name}
Course Description: ${courseInfo.description}
Master Prompt: ${courseData.masterPrompt}
Chapter Title: ${chapterTitles[i]}
Chapter Number: ${i + 1} of ${courseData.numChapters}
Content Depth: ${courseData.courseDepth} (${depth.description || 'standard content'})

${contentInstructions}

Format the content in Markdown. Make it engaging and educational for the target audience:`;

                const content = await this.generateText(prompt, { maxTokens });

                chapters.push({
                    title: chapterTitles[i],
                    content: content
                });

                // Brief delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (onProgress) onProgress(100, 'Course generation complete!');

            return {
                name: courseInfo.name,
                description: courseInfo.description,
                chapters: chapters,
                generatedAt: new Date().toISOString(),
                requestsMade: estimate.estimatedRequests
            };

        } catch (error) {
            logger.error('Optimized course generation failed:', error);
            throw error;
        }
    }

    getContentInstructionsForDepth(courseDepth, depth) {
        switch (courseDepth) {
            case 'outline':
                return `Create a concise outline-style content (${depth.wordRange || '50-100 words'}). Include:
- Brief learning objectives
- Key concepts (bullet points)
- Essential takeaways
Keep it structured but concise.`;
            case 'brief':
                return `Create brief, focused content (${depth.wordRange || '200-400 words'}). Include:
- Learning objectives
- Key concepts with short explanations
- One practical example
- Summary of main points`;
            case 'standard':
                return `Create balanced, educational content (${depth.wordRange || '500-800 words'}). Include:
- Learning objectives
- Key concepts and explanations
- Practical examples
- Activities or exercises
- Summary and key takeaways`;
            case 'detailed':
                return `Create comprehensive, detailed content (${depth.wordRange || '1000-1500 words'}). Include:
- Detailed learning objectives
- In-depth key concepts and explanations
- Multiple practical examples
- Hands-on exercises and activities
- Detailed summary and key takeaways
- Additional resources or further reading`;
            case 'comprehensive':
                return `Create thorough, comprehensive content (${depth.wordRange || '2000+ words'}). Include:
- Comprehensive learning objectives
- Detailed key concepts with thorough explanations
- Multiple real-world examples and case studies
- Varied exercises, activities, and assessments
- Comprehensive summary and detailed key takeaways
- Additional resources, further reading, and related topics`;
            default:
                return `Create educational content. Include learning objectives, key concepts, examples, and summary.`;
        }
    }

    showLimitWarning(current, limit, level) {
        const percentage = Math.round((current / limit) * 100);
        const remaining = limit - current;

        let message, bgColor;
        if (level === 'near') {
            message = `⚠️ Usage Warning: You've used ${current}/${limit} requests (${percentage}%) today. Only ${remaining} requests remaining before hitting daily limits.`;
            bgColor = '#f59e0b'; // amber
        } else {
            message = `📊 Usage Notice: You've used ${current}/${limit} requests (${percentage}%) today. ${remaining} requests remaining.`;
            bgColor = '#3b82f6'; // blue
        }

        // Show warning in UI
        this.displayUsageWarning(message, bgColor);

        // Log for debugging
        logger.warn(`Puter usage ${level}:`, { current, limit, percentage, remaining });
    }

    displayUsageWarning(message, bgColor) {
        // Create or update warning element
        let warningEl = document.getElementById('puter-usage-warning');
        if (!warningEl) {
            warningEl = DOM.create('div', {
                id: 'puter-usage-warning',
                className: 'usage-warning'
            });

            // Insert after provider section
            const providerSection = DOM.query('#provider-section');
            if (providerSection && providerSection.parentNode) {
                providerSection.parentNode.insertBefore(warningEl, providerSection.nextSibling);
            }
        }

        warningEl.style.cssText = `
            background: ${bgColor};
            color: white;
            padding: 12px 16px;
            margin: 10px 0;
            border-radius: 8px;
            font-size: 0.9em;
            line-height: 1.4;
            border-left: 4px solid rgba(255,255,255,0.3);
        `;
        warningEl.textContent = message;

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (warningEl && warningEl.parentNode) {
                warningEl.style.opacity = '0';
                setTimeout(() => {
                    if (warningEl && warningEl.parentNode) {
                        warningEl.parentNode.removeChild(warningEl);
                    }
                }, 500);
            }
        }, 10000);
    }



    recordError(error) {
        const errorRecord = {
            timestamp: new Date().toISOString(),
            error: error.message || error.toString(),
            code: error.code || 'unknown'
        };

        this.usageTracker.errors.push(errorRecord);
        this.saveUsageData(this.usageTracker);

        // Check if this is a server-side quota error
        const quotaKeywords = ['quota', 'limit', 'rate', 'usage', 'exceeded', 'too many'];
        const isServerQuotaError = quotaKeywords.some(keyword =>
            errorRecord.error.toLowerCase().includes(keyword)
        );

        if (isServerQuotaError) {
            this.handleServerQuotaError(errorRecord);
        }
    }

    handleServerQuotaError(errorRecord) {
        // Display a prominent warning about server-side limits
        const warningMessage = `🚫 Puter.js Server Quota Exceeded\n\nThe server reports quota limits independent of our local tracking. This means:\n• Puter.js has daily/hourly limits per user or IP\n• Your account may have hit usage restrictions\n• The service may be temporarily rate-limited\n\nSuggested actions:\n1. Wait 1-24 hours before trying again\n2. Switch to a different AI provider\n3. Check your Puter.js account status`;

        // Show in UI with distinct styling
        this.displayServerQuotaWarning(warningMessage);

        // Log for debugging
        logger.warn('Server-side quota error detected:', errorRecord);
    }

    displayServerQuotaWarning(message) {
        // Create or update server quota warning element
        let warningEl = document.getElementById('puter-server-quota-warning');
        if (!warningEl) {
            warningEl = DOM.create('div', {
                id: 'puter-server-quota-warning',
                className: 'server-quota-warning'
            });

            // Insert at the top of provider section for visibility
            const providerSection = DOM.query('#provider-section');
            if (providerSection) {
                providerSection.insertBefore(warningEl, providerSection.firstChild);
            }
        }

        warningEl.style.cssText = `
            background: #dc2626;
            color: white;
            padding: 16px;
            margin: 0 0 16px 0;
            border-radius: 8px;
            font-size: 0.9em;
            line-height: 1.5;
            border-left: 4px solid #991b1b;
            white-space: pre-line;
        `;

        warningEl.textContent = message;

        // Add a retry button
        const retryButton = DOM.create('button', {
            className: 'retry-button',
            textContent: '🔄 Try Different Provider'
        });

        retryButton.style.cssText = `
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            padding: 8px 16px;
            margin-top: 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85em;
        `;

        retryButton.onclick = () => {
            // Suggest switching to cloud provider
            if (confirm('Switch to Cloud AI provider? This will reload the page with a different AI service.')) {
                window.location.href = window.location.href.replace('puter.html', 'cloud.html');
            }
        };

        warningEl.appendChild(retryButton);
    }

    // Method to clear server quota warnings (for testing)
    clearServerQuotaWarning() {
        const warningEl = document.getElementById('puter-server-quota-warning');
        if (warningEl && warningEl.parentNode) {
            warningEl.parentNode.removeChild(warningEl);
        }
        return 'Server quota warning cleared';
    }

    updateProviderStatus() {
        const modelName = this.getModelDisplayName(this.currentModel);
        this.isConnected = true;

        // Log session info for debugging
        logger.info(`Puter session: ${this.requestCount} requests made, model: ${modelName}`);

        // Update the status display in UI
        this.updateSessionDisplay();
    }

    updateSessionDisplay() {
        // Find or create session display element
        let sessionDisplay = document.getElementById('puter-session-display');
        if (!sessionDisplay) {
            sessionDisplay = DOM.create('div', {
                id: 'puter-session-display',
                className: 'session-display'
            });

            // Insert after the puter status section
            const statusEl = document.querySelector('.puter-status');
            if (statusEl && statusEl.parentNode) {
                statusEl.parentNode.insertBefore(sessionDisplay, statusEl.nextSibling);
            }
        }

        const statusColor = '#3b82f6'; // blue
        const statusIcon = '🔄';

        sessionDisplay.style.cssText = `
            background: ${statusColor};
            color: white;
            padding: 8px 12px;
            margin: 8px 0;
            border-radius: 6px;
            font-size: 0.85em;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        sessionDisplay.innerHTML = `
            <span>${statusIcon}</span>
            <span>Session: ${this.requestCount} requests made | Quota managed by your Puter account</span>
        `;
    }

    async loadPuterJS() {
        return new Promise((resolve, reject) => {
            if (window.puter) {
                this.puterLoaded = true;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://js.puter.com/v2/';
            script.onload = () => {
                logger.info('Puter.js loaded successfully');
                this.puterLoaded = true;
                resolve();
            };
            script.onerror = () => {
                const error = new Error('Failed to load Puter.js');
                logger.error('Failed to load Puter.js');
                reject(error);
            };
            document.head.appendChild(script);
        });
    }

    getModelDisplayName(modelId) {
        const modelMap = {
            // Premium models
            'openrouter:anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet',
            'openrouter:openai/gpt-4o': 'GPT-4o',
            'openrouter:google/gemini-pro-1.5': 'Gemini Pro 1.5',

            // Fast & efficient models
            'openrouter:openai/gpt-4o-mini': 'GPT-4o Mini',
            'openrouter:anthropic/claude-3-haiku': 'Claude 3 Haiku',
            'openrouter:meta-llama/llama-3.1-8b-instruct': 'LLaMA 3.1 8B',
            'openrouter:google/gemini-flash-1.5': 'Gemini Flash 1.5',

            // Specialized models
            'openrouter:meta-llama/llama-3.1-70b-instruct': 'LLaMA 3.1 70B',
            'openrouter:mistralai/mistral-large': 'Mistral Large',
            'openrouter:qwen/qwen-2.5-72b-instruct': 'Qwen 2.5 72B',
            'openrouter:microsoft/wizardlm-2-8x22b': 'WizardLM 2',
            'openrouter:anthropic/claude-3-opus': 'Claude 3 Opus',
            'openrouter:cohere/command-r-plus': 'Command R+'
        };

        // If not in the map, extract a clean name from the ID
        if (!modelMap[modelId]) {
            const parts = modelId.split('/');
            const modelName = parts[parts.length - 1] || modelId;
            return modelName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }

        return modelMap[modelId];
    }

    async generateText(prompt, options = {}) {
        if (!window.puter) {
            throw new Error('Puter.js not loaded');
        }

        // No local quota checks - let server manage quotas

        try {
            // Use current model or fallback to default
            const model = options.model || this.currentModel || this.config.defaultModel;

            logger.info(`Generating text with Puter.js using model: ${model}`);

            // Check if user is already signed in to avoid unnecessary popup
            let isSignedIn = false;
            try {
                isSignedIn = await window.puter.auth.isSignedIn();
                logger.debug('Puter.js auth status:', isSignedIn);
            } catch (authError) {
                logger.debug('Auth check failed, proceeding with AI call:', authError);
            }

            // If not signed in, show a user-friendly message
            if (!isSignedIn) {
                this.updateConnectionStatus(
                    '🔐 First-time setup: Puter.js will open an authentication window...',
                    'info'
                );
                this.updateConnectionUI('disconnected', 'Connecting to your Puter account...');
            }

            const response = await window.puter.ai.chat(prompt, {
                model: model,
                stream: false,
                ...options
            });

            // Check if Puter.js returned an error response
            if (response && response.success === false) {
                logger.warn('Puter.js API returned error response:', response);
                let errorMsg = 'Unknown Puter.js error';
                let isQuotaError = false;

                if (response.error) {
                    if (typeof response.error === 'string') {
                        errorMsg = response.error;
                    } else if (response.error.message) {
                        errorMsg = response.error.message;
                    } else if (response.error.error) {
                        // Handle nested error structure
                        errorMsg = response.error.error;
                    } else {
                        errorMsg = JSON.stringify(response.error, null, 2);
                    }
                } else if (response.message) {
                    errorMsg = response.message;
                }

                // Check if this is a quota/limit error
                const quotaKeywords = ['quota', 'limit', 'rate', 'usage', 'exceeded', 'too many'];
                isQuotaError = quotaKeywords.some(keyword =>
                    errorMsg.toLowerCase().includes(keyword)
                );

                // Show detailed error information for debugging
                logger.error(`Puter.js detailed error:`, {
                    fullResponse: response,
                    extractedMessage: errorMsg,
                    isQuotaError: isQuotaError
                });

                if (isQuotaError) {
                    // Show a user-friendly quota error with more context
                    throw new Error(`Puter.js quota exceeded: ${errorMsg}\n\nThis appears to be a server-side limit from Puter.js. You may need to:\n1. Wait and try again later\n2. Try a different AI provider (Cloud, WebLLM, or Ollama)\n3. Check your Puter.js account at https://puter.com for quota details`);
                } else {
                    throw new Error(`Puter.js API error: ${errorMsg}`);
                }
            }

            // Handle different response formats from Puter.js
            let extractedText = '';

            if (typeof response === 'string') {
                extractedText = response;
            } else if (response && response.message && typeof response.message.content === 'string') {
                extractedText = response.message.content;
            } else if (response && typeof response.text === 'string') {
                extractedText = response.text;
            } else if (response && typeof response.content === 'string') {
                extractedText = response.content;
            } else if (response && typeof response.message === 'string') {
                extractedText = response.message;
            } else if (response && typeof response.response === 'string') {
                extractedText = response.response;
            } else if (response && typeof response.data === 'string') {
                extractedText = response.data;
            } else {
                logger.warn('Unexpected response format from Puter.js:', response);
                throw new Error('Invalid response format from Puter.js API');
            }

            // Validate that we got actual content
            if (!extractedText || extractedText.trim().length === 0) {
                throw new Error('Received empty response from Puter.js API');
            }

            // Record successful request
            this.recordRequest();

            // Update connection status after successful API call
            this.updateConnectionUI('connected', 'Connected to your Puter account');
            if (this.dom.puterAuthGuide) {
                this.dom.puterAuthGuide.style.display = 'none';
            }
            // Show quota optimization tips after successful connection
            const quotaTips = DOM.query('#puter-quota-tips');
            if (quotaTips) {
                quotaTips.style.display = 'block';
            }

            return extractedText;
        } catch (error) {
            logger.error('Puter.js generation error:', error);

            // Record the error for tracking
            this.recordError(error);

            // Extract error message safely
            let errorMessage = 'Unknown error';
            if (error && typeof error.message === 'string') {
                errorMessage = error.message;
            } else if (error && typeof error === 'string') {
                errorMessage = error;
            } else if (error && error.error) {
                // Handle nested error objects
                if (typeof error.error === 'string') {
                    errorMessage = error.error;
                } else if (error.error.message) {
                    errorMessage = error.error.message;
                } else {
                    errorMessage = JSON.stringify(error.error);
                }
            } else if (error && typeof error === 'object') {
                // Try to extract meaningful info from error object
                if (error.code) {
                    errorMessage = `Error ${error.code}: ${error.message || 'Unknown'}`;
                } else if (error.status) {
                    errorMessage = `HTTP ${error.status}: ${error.statusText || 'Request failed'}`;
                } else {
                    // Fallback to JSON representation
                    try {
                        errorMessage = JSON.stringify(error, null, 2);
                    } catch (e) {
                        errorMessage = 'Complex error object (cannot stringify)';
                    }
                }
            } else if (error && error.toString && error.toString !== Object.prototype.toString) {
                errorMessage = error.toString();
            }

            // Provide user-friendly error message for auth issues
            if (errorMessage.toLowerCase().includes('auth')) {
                throw new Error('Authentication required. Please allow the Puter.js popup to complete setup for free AI access.');
            }

            // Check for specific Puter.js error conditions
            if (errorMessage.toLowerCase().includes('network')) {
                throw new Error('Network connection error. Please check your internet connection and try again.');
            }

            if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('limit')) {
                throw new Error('API quota exceeded. Please try again later or check your Puter.js account limits.');
            }

            throw new Error(`AI generation failed: ${errorMessage}`);
        }
    }

    async generateStreamContent(prompt, onChunk, options = {}) {
        if (!window.puter) {
            throw new Error('Puter.js not loaded');
        }

        // No local quota checks - let server manage quotas

        try {
            const model = options.model || this.currentModel || this.config.defaultModel;

            const response = await window.puter.ai.chat(prompt, {
                model: model,
                stream: true,
                ...options
            });

            let fullContent = '';
            for await (const part of response) {
                if (part?.text) {
                    fullContent += part.text;
                    if (onChunk) {
                        onChunk(part.text, fullContent);
                    }
                }
            }

            // Record successful request
            this.recordRequest();

            // Update connection status after successful API call
            this.updateConnectionUI('connected', 'Connected to your Puter account');
            if (this.dom.puterAuthGuide) {
                this.dom.puterAuthGuide.style.display = 'none';
            }
            // Show quota optimization tips after successful connection
            const quotaTips = DOM.query('#puter-quota-tips');
            if (quotaTips) {
                quotaTips.style.display = 'block';
            }

            return fullContent;
        } catch (error) {
            logger.error('Puter.js streaming error:', error);

            // Record the error for tracking
            this.recordError(error);

            // Extract error message safely
            let errorMessage = 'Unknown error';
            if (error && typeof error.message === 'string') {
                errorMessage = error.message;
            } else if (error && typeof error === 'string') {
                errorMessage = error;
            } else if (error && error.error) {
                // Handle nested error objects
                if (typeof error.error === 'string') {
                    errorMessage = error.error;
                } else if (error.error.message) {
                    errorMessage = error.error.message;
                } else {
                    errorMessage = JSON.stringify(error.error);
                }
            } else if (error && typeof error === 'object') {
                // Try to extract meaningful info from error object
                try {
                    errorMessage = JSON.stringify(error, null, 2);
                } catch (e) {
                    errorMessage = 'Complex error object (cannot stringify)';
                }
            } else if (error && error.toString && error.toString !== Object.prototype.toString) {
                errorMessage = error.toString();
            }

            throw new Error(`AI streaming failed: ${errorMessage}`);
        }
    }

    validateConfiguration() {
        return this.puterLoaded && !!window.puter;
    }

    getCapabilities() {
        return {
            textGeneration: true,
            streaming: true,
            imageGeneration: false,
            codeGeneration: true,
            maxTokens: this.config.maxTokens
        };
    }

    getAvailableModels() {
        return this.config.models;
    }

    setModel(model) {
        if (this.config.models.includes(model)) {
            this.currentModel = model;
            if (this.dom.puterModelSelect) {
                this.dom.puterModelSelect.value = model;
            }
            this.emit('modelChanged', model);
        }
    }

    getCurrentModel() {
        return this.currentModel;
    }

    saveStateExtensions(state) {
        return {
            ...state,
            puterModel: this.currentModel
        };
    }

    loadStateExtensions(state) {
        if (state.puterModel && this.config.models.includes(state.puterModel)) {
            this.currentModel = state.puterModel;
            if (this.dom.puterModelSelect) {
                this.dom.puterModelSelect.value = state.puterModel;
            }
        }
    }

    refresh() {
        super.refresh();
        this.updateProviderStatus();
    }

    formatError(error) {
        // Extract user-friendly error message from Puter.js errors
        let errorMessage = 'Unknown error occurred';

        if (error && error.message) {
            errorMessage = error.message;
        } else if (error && typeof error === 'string') {
            errorMessage = error;
        } else if (error && typeof error === 'object') {
            try {
                errorMessage = JSON.stringify(error);
            } catch (e) {
                errorMessage = 'Complex error occurred';
            }
        }

        // Clean up technical error messages for users
        if (errorMessage.includes('Puter.js API error:')) {
            errorMessage = errorMessage.replace('Puter.js API error: ', '');
        }

        // Handle quota/limit errors with clear guidance
        const quotaKeywords = ['quota', 'limit', 'rate', 'usage', 'exceeded', 'too many'];
        const isQuotaError = quotaKeywords.some(keyword =>
            errorMessage.toLowerCase().includes(keyword)
        );

        if (isQuotaError) {
            return `Puter.js usage limit exceeded. The free service has daily limits that have been reached. Please try again later or switch to a different AI provider.`;
        }

        // Handle authentication errors
        if (errorMessage.toLowerCase().includes('auth')) {
            return `Puter.js authentication required. Please allow the popup window to complete free account setup.`;
        }

        // Handle network errors
        if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('connection')) {
            return `Network connection error. Please check your internet connection and try again.`;
        }

        // Return cleaned error message
        return errorMessage.length > 200
            ? errorMessage.substring(0, 200) + '...'
            : errorMessage;
    }
}