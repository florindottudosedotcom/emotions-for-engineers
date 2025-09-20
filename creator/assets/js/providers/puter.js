// Puter.js AI Provider (Free access to 200+ AI models)
export const PuterProvider = {
    name: 'Puter AI (Free)',

    getTemplate() {
        return `
            <fieldset>
                <legend>🚀 Free AI Provider</legend>
                <div class="puter-info" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 1.1em;">✨ No Setup Required!</h3>
                    <p style="margin: 0; font-size: 0.9em; opacity: 0.9;">Access 200+ AI models from OpenAI, Anthropic, Google, Meta, and more - completely free with no API keys needed.</p>
                    <p style="margin: 8px 0 0 0; font-size: 0.85em; opacity: 0.8;"><strong>Note:</strong> First-time users may see a Puter.js authentication popup - this is normal and only happens once for free access setup.</p>
                </div>

                <div class="input-group">
                    <label for="puter-model-select" class="label-no-shrink-no-margin">AI Model:</label>
                    <select id="puter-model-select" class="select-no-margin">
                        <option value="openrouter:anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Anthropic)</option>
                        <option value="openrouter:openai/gpt-4o" selected>GPT-4o (OpenAI)</option>
                        <option value="openrouter:openai/gpt-4o-mini">GPT-4o Mini (OpenAI)</option>
                        <option value="openrouter:meta-llama/llama-3.1-70b-instruct">Llama 3.1 70B (Meta)</option>
                        <option value="openrouter:google/gemini-pro-1.5">Gemini Pro 1.5 (Google)</option>
                        <option value="openrouter:mistralai/mistral-large">Mistral Large</option>
                        <option value="openrouter:anthropic/claude-3-haiku">Claude 3 Haiku (Anthropic)</option>
                    </select>
                </div>

                <div class="puter-status" style="background: #f8f9fa; border-radius: 6px; padding: 12px; border-left: 4px solid #28a745;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: #28a745; font-weight: bold;">●</span>
                        <span style="color: #666; font-size: 0.9em;">Ready to generate content - no configuration needed!</span>
                    </div>
                </div>

                <div id="connection-status" class="status-display"></div>
            </fieldset>
        `;
    },

    async init(dom, appState) {
        // Set provider type
        appState.AI_PROVIDER = 'puter';

        // Load Puter.js if not already loaded
        if (!window.puter) {
            await this.loadPuterJS();
        }

        // Get provider-specific DOM elements
        dom.puterModelSelect = document.getElementById('puter-model-select');
        dom.connectionStatus = document.getElementById('connection-status');

        // Set default model
        appState.PUTER_MODEL = dom.puterModelSelect.value;

        // Event listeners
        dom.puterModelSelect.addEventListener('change', () => {
            appState.PUTER_MODEL = dom.puterModelSelect.value;
            const modelName = this.getModelDisplayName(appState.PUTER_MODEL);

            if (window.UI && window.UI.updateConnectionStatus) {
                window.UI.updateConnectionStatus(`✅ Ready with ${modelName}`, 'success');
            }

            if (window.stateModule && window.stateModule.saveState) {
                window.stateModule.saveState();
            }
        });

        // Initialize status
        this.updateStatus(dom, appState);
    },

    async loadPuterJS() {
        return new Promise((resolve, reject) => {
            if (window.puter) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://js.puter.com/v2/';
            script.onload = () => {
                console.log('Puter.js loaded successfully');
                resolve();
            };
            script.onerror = () => {
                console.error('Failed to load Puter.js');
                reject(new Error('Failed to load Puter.js'));
            };
            document.head.appendChild(script);
        });
    },

    getModelDisplayName(modelId) {
        const modelMap = {
            'openrouter:anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet',
            'openrouter:openai/gpt-4o': 'GPT-4o',
            'openrouter:openai/gpt-4o-mini': 'GPT-4o Mini',
            'openrouter:meta-llama/llama-3.1-70b-instruct': 'Llama 3.1 70B',
            'openrouter:google/gemini-pro-1.5': 'Gemini Pro 1.5',
            'openrouter:mistralai/mistral-large': 'Mistral Large',
            'openrouter:anthropic/claude-3-haiku': 'Claude 3 Haiku'
        };
        return modelMap[modelId] || modelId;
    },

    updateStatus(dom, appState) {
        const modelName = this.getModelDisplayName(appState.PUTER_MODEL);

        if (window.UI && window.UI.updateConnectionStatus) {
            window.UI.updateConnectionStatus(`✅ Ready with ${modelName}`, 'success');
        }
    },

    async generateContent(prompt, options = {}) {
        if (!window.puter) {
            throw new Error('Puter.js not loaded');
        }

        try {
            const model = options.model || 'openrouter:openai/gpt-4o';

            const response = await window.puter.ai.chat(prompt, {
                model: model,
                stream: false,
                ...options
            });

            return response;
        } catch (error) {
            console.error('Puter.js generation error:', error);
            throw new Error(`AI generation failed: ${error.message}`);
        }
    },

    async generateStreamContent(prompt, onChunk, options = {}) {
        if (!window.puter) {
            throw new Error('Puter.js not loaded');
        }

        try {
            const model = options.model || 'openrouter:openai/gpt-4o';

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

            return fullContent;
        } catch (error) {
            console.error('Puter.js streaming error:', error);
            throw new Error(`AI generation failed: ${error.message}`);
        }
    },

    async generateText(prompt) {
        if (!window.puter) {
            throw new Error('Puter.js not loaded');
        }

        try {
            // Get the selected model from DOM if available, fallback to default
            const modelSelect = document.getElementById('puter-model-select');
            const model = modelSelect ? modelSelect.value : 'openrouter:openai/gpt-4o';

            console.log(`Generating text with Puter.js using model: ${model}`);

            // Check if user is already signed in to avoid unnecessary popup
            let isSignedIn = false;
            try {
                isSignedIn = await window.puter.auth.isSignedIn();
                console.log('Puter.js auth status:', isSignedIn);
            } catch (authError) {
                console.log('Auth check failed, proceeding with AI call:', authError);
            }

            // If not signed in, show a user-friendly message
            if (!isSignedIn) {
                if (window.UI && window.UI.updateGenerationStatus) {
                    window.UI.updateGenerationStatus('🔐 First-time setup: Puter.js will open an authentication window...', 'info');
                }
            }

            const response = await window.puter.ai.chat(prompt, {
                model: model,
                stream: false
            });

            console.log('Puter.js response:', response);
            console.log('Response type:', typeof response);

            // Handle different response formats from Puter.js
            if (typeof response === 'string') {
                return response;
            } else if (response && response.text) {
                return response.text;
            } else if (response && response.content) {
                return response.content;
            } else if (response && response.message) {
                return response.message;
            } else {
                console.warn('Unexpected response format from Puter.js:', response);
                return JSON.stringify(response);
            }
        } catch (error) {
            console.error('Puter.js generation error:', error);

            // Provide user-friendly error message for auth issues
            if (error.message && error.message.includes('auth')) {
                throw new Error('Authentication required. Please allow the Puter.js popup to complete setup for free AI access.');
            }

            throw new Error(`AI generation failed: ${error.message}`);
        }
    }
};