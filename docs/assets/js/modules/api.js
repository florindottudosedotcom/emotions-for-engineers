let dom = {};
let state = {};
let webllmPromiseResolvers = {};

function initializeWebLLM(modelId) {
    if (!modelId) return;

    if (!state.isWebllmIframeReady) {
        state.pendingWebllmModelId = modelId;
        console.log("WebLLM iframe not ready, pending initialization for:", modelId);
        return;
    }

    state.isWebllmReady = false;
    state.currentWebllmModel = '';
    const selectedModelName = state.WEBLLM_MODELS.find(m => m.id === modelId)?.name || modelId;
    dom.ollamaStatus.textContent = `🔵 Initializing ${selectedModelName}... This may take a moment.`;
    dom.ollamaStatus.className = 'ollama-status-style ollama-status-info';
    dom.webllmIframe.contentWindow.postMessage({ type: 'initialize-webllm', modelId: modelId }, '*');
}

function loadWebLLMModels() {
    const selectedModelBeforeUpdate = dom.aiModelSelect.value;
    dom.aiModelSelect.innerHTML = '';
    state.WEBLLM_MODELS.forEach(model => {
        dom.aiModelSelect.add(new Option(model.name, model.id));
    });

    if (state.WEBLLM_MODELS.some(m => m.id === selectedModelBeforeUpdate)) {
        dom.aiModelSelect.value = selectedModelBeforeUpdate;
    } else {
       dom.aiModelSelect.selectedIndex = 0;
    }

    initializeWebLLM(dom.aiModelSelect.value);
}

async function loadOllamaModels() {
    dom.ollamaStatus.textContent = 'Loading Ollama models...';
    dom.ollamaStatus.className = 'ollama-status-style';
    dom.aiModelSelect.innerHTML = '';
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        const data = await response.json();
        if (data.models && data.models.length > 0) {
            data.models.forEach(model => {
                dom.aiModelSelect.add(new Option(model.name, model.name));
            });
            dom.ollamaStatus.textContent = `✅ Ollama connected. ${data.models.length} model(s) found.`;
            dom.ollamaStatus.className = 'ollama-status-style ollama-status-ok';
        } else {
             dom.ollamaStatus.textContent = `⚠️ Ollama is running but no models found.`;
             dom.ollamaStatus.className = 'ollama-status-style';
        }
    } catch(err) {
         dom.ollamaStatus.textContent = `❌ Could not connect to Ollama.`;
         dom.ollamaStatus.className = 'ollama-status-style ollama-status-error';
    }
}

function handleProviderChange() {
    const selectedProvider = dom.aiProviderSelect.value;
    state.AI_PROVIDER = selectedProvider;

    dom.aiModelSelectionGroup.style.display = 'none';
    dom.refreshModelsBtn.style.display = 'none';
    dom.ollamaStatus.textContent = '';
    dom.ollamaStatus.className = 'ollama-status-style';

    if (selectedProvider === 'ollama') {
        dom.aiModelSelectionGroup.style.display = 'flex';
        dom.refreshModelsBtn.style.display = 'block';
        loadOllamaModels();
    } else if (selectedProvider === 'webllm') {
        dom.aiModelSelectionGroup.style.display = 'flex';
        dom.refreshModelsBtn.style.display = 'none';
        loadWebLLMModels();
    } else {
         dom.ollamaStatus.textContent = `✅ Ready to use ${selectedProvider}.`;
         dom.ollamaStatus.className = 'ollama-status-style ollama-status-ok';
    }
}

async function updateAvailableProviders() {
    dom.ollamaStatus.textContent = 'Detecting available AI providers...';
    const selectedProviderBeforeUpdate = dom.aiProviderSelect.value;
    dom.aiProviderSelect.innerHTML = '';

    if (state.SESSION_API_KEYS.openai) {
        dom.aiProviderSelect.add(new Option("OpenAI (Cloud)", "openai"));
    }
    if (state.SESSION_API_KEYS.anthropic) {
        dom.aiProviderSelect.add(new Option("Anthropic (Cloud)", "anthropic"));
    }
    if (state.SESSION_API_KEYS.google) {
        dom.aiProviderSelect.add(new Option("Google Gemini (Cloud)", "google"));
    }

    try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
            const data = await response.json();
            if (data.models && data.models.length > 0) {
                dom.aiProviderSelect.add(new Option("Ollama (Local)", "ollama"));
            }
        }
    } catch (err) {
        // Ollama is not available
    }

    dom.aiProviderSelect.add(new Option("WebLLM (In-Browser)", "webllm"));
    dom.aiProviderSelect.selectedIndex = 0;
    handleProviderChange();
}

function saveApiKeys(e) {
    e.preventDefault();
    state.SESSION_API_KEYS.openai = dom.openAiApiKeyInput.value || null;
    state.SESSION_API_KEYS.anthropic = dom.anthropicApiKeyInput.value || null;
    state.SESSION_API_KEYS.google = dom.googleApiKeyInput.value || null;

    dom.openAiApiKeyInput.value = '';
    dom.anthropicApiKeyInput.value = '';
    dom.googleApiKeyInput.value = '';

    // This needs to call a UI function, which is a dependency issue.
    // For now, we'll assume a UI module exists.
    // hideSettingsModal();
    updateAvailableProviders();
    alert("API Keys will be used for this session only.");
}

async function generateAIText(systemPrompt) {
    const provider = dom.aiProviderSelect.value;
    let endpoint = '';
    let headers = { 'Content-Type': 'application/json' };
    let body = {};
    let apiKey = '';

    switch (provider) {
        case 'openai':
            apiKey = state.SESSION_API_KEYS.openai;
            if (!apiKey) throw new Error("OpenAI API key is missing.");
            endpoint = 'https://api.openai.com/v1/chat/completions';
            headers['Authorization'] = `Bearer ${apiKey}`;
            body = { model: "gpt-4o", messages: [{ role: 'user', content: systemPrompt }], stream: false };
            break;
        case 'anthropic':
            apiKey = state.SESSION_API_KEYS.anthropic;
            if (!apiKey) throw new Error("Anthropic API key is missing.");
            endpoint = 'https://api.anthropic.com/v1/messages';
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
            body = { model: "claude-3-haiku-20240307", max_tokens: 4096, messages: [{ role: 'user', content: systemPrompt }] };
            break;
        case 'google':
            apiKey = state.SESSION_API_KEYS.google;
            if (!apiKey) throw new Error("Google Gemini API key is missing.");
            endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            body = { contents: [{ parts:[{ text: systemPrompt }] }] };
            break;
        case 'ollama':
            const ollamaModel = dom.aiModelSelect.value;
            if (!ollamaModel) throw new Error("No Ollama model selected.");
            endpoint = 'http://localhost:11434/api/chat';
            body = { model: ollamaModel, messages: [{ role: 'user', content: systemPrompt }], stream: false };
            break;
        case 'webllm':
            if (!state.isWebllmReady) throw new Error("WebLLM engine is not ready.");
            return new Promise((resolve, reject) => {
                const requestId = Date.now() + Math.random();
                webllmPromiseResolvers[requestId] = { resolve, reject };
                dom.webllmIframe.contentWindow.postMessage({ type: 'generate-text', prompt: systemPrompt, id: requestId }, '*');
            });
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }

    const response = await fetch(endpoint, { method: 'POST', headers: headers, body: JSON.stringify(body) });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`${provider} API request failed: ${errorBody}`);
    }
    const data = await response.json();

    switch (provider) {
        case 'openai': return data.choices[0].message.content;
        case 'anthropic': return data.content[0].text;
        case 'google': return data.candidates[0].content.parts[0].text;
        case 'ollama': return data.message.content;
        default: throw new Error(`Cannot parse response for provider: ${provider}`);
    }
}

export function initApi(domElements, appState) {
    dom = domElements;
    state = appState;
}

export {
    initializeWebLLM,
    loadWebLLMModels,
    updateAvailableProviders,
    handleProviderChange,
    loadOllamaModels,
    generateAIText,
    saveApiKeys,
    webllmPromiseResolvers
};
