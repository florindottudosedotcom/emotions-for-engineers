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
            </fieldset>
        `;
    },

    init(dom, appState) {
        // Set provider type
        appState.AI_PROVIDER = 'cloud';

        // Get provider-specific DOM elements
        dom.aiProviderSelect = document.getElementById('ai-provider-select');
        dom.apiKeyInput = document.getElementById('api-key-input');

        // Event listeners
        dom.aiProviderSelect.addEventListener('change', () => {
            if (window.stateModule && window.stateModule.saveState) {
                window.stateModule.saveState();
            }
        });

        dom.apiKeyInput.addEventListener('input', () => {
            if (window.stateModule && window.stateModule.saveState) {
                window.stateModule.saveState();
            }
        });
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
            aiProvider: document.getElementById('ai-provider-select')?.value || 'openai',
            apiKey: document.getElementById('api-key-input')?.value || ''
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