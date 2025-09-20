// Cloud AI Provider (OpenAI, Anthropic, Google)
export const CloudProvider = {
    name: 'Cloud AI',

    getTemplate() {
        return `
            <fieldset>
                <legend>AI Provider</legend>
                <div class="input-group">
                    <label for="ai-provider-select" class="label-no-shrink-no-margin">Provider:</label>
                    <select id="ai-provider-select" class="select-no-margin">
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="google">Google</option>
                    </select>
                </div>
                <div class="input-group">
                    <label for="api-key-input" class="label-no-shrink-no-margin">API Key:</label>
                    <input type="password" id="api-key-input" placeholder="Your API key" class="input-flex-grow">
                </div>
                <div id="connection-status" class="status-display"></div>
            </fieldset>
        `;
    },

    init(dom, appState) {
        // Set provider type
        appState.AI_PROVIDER = 'cloud';

        // Initialize session storage for API keys
        if (!appState.SESSION_API_KEYS) {
            appState.SESSION_API_KEYS = this.getApiKeysFromSession();
        }

        // Get provider-specific DOM elements
        dom.aiProviderSelect = document.getElementById('ai-provider-select');
        dom.apiKeyInput = document.getElementById('api-key-input');
        dom.connectionStatus = document.getElementById('connection-status');

        // Event listeners
        dom.aiProviderSelect.addEventListener('change', () => {
            const provider = dom.aiProviderSelect.value;
            dom.apiKeyInput.value = '';
            appState.AI_PROVIDER = provider;
            // Clear all session keys when provider changes
            Object.keys(appState.SESSION_API_KEYS).forEach(key => {
                appState.SESSION_API_KEYS[key] = null;
            });
            if (window.UI && window.UI.updateConnectionStatus) {
                window.UI.updateConnectionStatus(`Provider changed to ${provider}. Please enter an API key.`, 'warning');
            }
            if (window.stateModule && window.stateModule.saveState) {
                window.stateModule.saveState();
            }
        });

        dom.apiKeyInput.addEventListener('input', () => {
            const provider = dom.aiProviderSelect.value;
            const key = dom.apiKeyInput.value;
            appState.SESSION_API_KEYS[provider] = key;
            this.saveApiKeysToSession(appState.SESSION_API_KEYS);

            if (key && window.UI && window.UI.updateConnectionStatus) {
                window.UI.updateConnectionStatus(`✅ ${provider.charAt(0).toUpperCase() + provider.slice(1)} is ready.`, 'success');
            } else if (window.UI && window.UI.updateConnectionStatus) {
                window.UI.updateConnectionStatus(`Provider for ${provider} is not configured.`, 'warning');
            }

            if (window.stateModule && window.stateModule.saveState) {
                window.stateModule.saveState();
            }
        });

        // Initialize with current provider status
        this.initializeProviderStatus(dom, appState);
    },

    initializeProviderStatus(dom, appState) {
        const currentProvider = dom.aiProviderSelect.value;
        appState.AI_PROVIDER = currentProvider;
        const apiKey = appState.SESSION_API_KEYS[currentProvider];

        if (apiKey) {
            dom.apiKeyInput.value = apiKey;
            if (window.UI && window.UI.updateConnectionStatus) {
                window.UI.updateConnectionStatus(`✅ ${currentProvider.charAt(0).toUpperCase() + currentProvider.slice(1)} is ready.`, 'success');
            }
        } else {
            if (window.UI && window.UI.updateConnectionStatus) {
                window.UI.updateConnectionStatus(`Provider set to ${currentProvider}. Please enter an API key.`, 'warning');
            }
        }
    },

    getApiKeysFromSession() {
        try {
            const keys = sessionStorage.getItem('courseCreatorApiKeys');
            return keys ? JSON.parse(keys) : { openai: null, anthropic: null, google: null };
        } catch (e) {
            return { openai: null, anthropic: null, google: null };
        }
    },

    saveApiKeysToSession(keys) {
        try {
            sessionStorage.setItem('courseCreatorApiKeys', JSON.stringify(keys));
        } catch (e) {
            console.warn('Failed to save API keys to session storage:', e);
        }
    },

    async generateText(prompt) {
        const provider = document.getElementById('ai-provider-select').value;
        const apiKey = document.getElementById('api-key-input').value;

        if (!apiKey) {
            throw new Error('API key is required for cloud providers');
        }

        let apiUrl, headers, body;

        switch (provider) {
            case 'openai':
                apiUrl = 'https://api.openai.com/v1/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };
                body = {
                    model: 'gpt-4',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7
                };
                break;

            case 'anthropic':
                apiUrl = 'https://api.anthropic.com/v1/messages';
                headers = {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                };
                body = {
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: 4000,
                    messages: [{ role: 'user', content: prompt }]
                };
                break;

            case 'google':
                apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
                headers = {
                    'Content-Type': 'application/json'
                };
                body = {
                    contents: [{ parts: [{ text: prompt }] }]
                };
                break;

            default:
                throw new Error('Unknown AI provider');
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();

        // Extract content based on provider
        switch (provider) {
            case 'openai':
                return data.choices[0].message.content;
            case 'anthropic':
                return data.content[0].text;
            case 'google':
                return data.candidates[0].content.parts[0].text;
            default:
                throw new Error('Unknown provider response format');
        }
    },

    saveStateExtensions(state) {
        return {
            ...state,
            aiProvider: document.getElementById('ai-provider-select')?.value || 'openai'
            // Note: API keys are saved to session storage, not local storage for security
        };
    },

    loadStateExtensions(state) {
        if (state.aiProvider && document.getElementById('ai-provider-select')) {
            document.getElementById('ai-provider-select').value = state.aiProvider;
        }
        if (state.apiKey && document.getElementById('api-key-input')) {
            document.getElementById('api-key-input').value = state.apiKey;
        }
    }
};