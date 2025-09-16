// Ollama Provider (Local AI)
export const OllamaProvider = {
    name: 'Ollama',

    getTemplate() {
        return `
            <fieldset>
                <legend>AI Provider</legend>
                <p>Ollama (Local)</p>
                <div class="input-group" id="ai-model-selection-group">
                    <label for="ai-model-select" class="label-no-shrink-no-margin">Model:</label>
                    <select id="ai-model-select" class="select-no-margin"></select>
                    <button type="button" id="refresh-models-btn" class="btn btn-secondary">Refresh List</button>
                </div>
                <div id="ollama-status" class="ollama-status-style"></div>
            </fieldset>
        `;
    },

    init(dom, appState) {
        // Set provider type
        appState.AI_PROVIDER = 'ollama';

        // Get provider-specific DOM elements
        dom.aiModelSelect = document.getElementById('ai-model-select');
        dom.refreshModelsBtn = document.getElementById('refresh-models-btn');
        dom.ollamaStatus = document.getElementById('ollama-status');

        // Event listeners
        dom.refreshModelsBtn.addEventListener('click', () => this.loadModels(dom));
        dom.aiModelSelect.addEventListener('change', () => {
            if (window.stateModule && window.stateModule.saveState) {
                window.stateModule.saveState();
            }
        });

        // Auto-load models on init
        this.loadModels(dom);
    },

    async loadModels(dom) {
        if (dom.ollamaStatus) {
            dom.ollamaStatus.textContent = 'Loading Ollama models...';
            dom.ollamaStatus.className = 'ollama-status-style';
        }

        if (!dom.aiModelSelect) {
            return; // Cannot proceed without aiModelSelect
        }

        const selectedModelBeforeUpdate = dom.aiModelSelect.value;
        dom.aiModelSelect.innerHTML = '';

        try {
            const response = await fetch('http://localhost:11434/api/tags');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.models || data.models.length === 0) {
                dom.aiModelSelect.add(new Option('No models found', ''));
                if (dom.ollamaStatus) {
                    dom.ollamaStatus.textContent = '⚠ No Ollama models found. Please install some models first.';
                    dom.ollamaStatus.className = 'ollama-status-style ollama-status-warning';
                }
                return;
            }

            // Sort models alphabetically
            data.models.sort((a, b) => a.name.localeCompare(b.name));

            data.models.forEach(model => {
                dom.aiModelSelect.add(new Option(model.name, model.name));
            });

            // Restore previous selection if possible
            if (data.models.some(model => model.name === selectedModelBeforeUpdate)) {
                dom.aiModelSelect.value = selectedModelBeforeUpdate;
            } else {
                dom.aiModelSelect.selectedIndex = 0;
            }

            if (dom.ollamaStatus) {
                dom.ollamaStatus.textContent = `✅ Found ${data.models.length} Ollama model(s)`;
                dom.ollamaStatus.className = 'ollama-status-style ollama-status-ok';
            }

        } catch (error) {
            console.error('Error loading Ollama models:', error);
            dom.aiModelSelect.add(new Option('Ollama not available', ''));
            if (dom.ollamaStatus) {
                dom.ollamaStatus.textContent = '❌ Cannot connect to Ollama. Make sure it\'s running on localhost:11434';
                dom.ollamaStatus.className = 'ollama-status-style ollama-status-error';
            }
        }
    },

    async generateText(prompt) {
        const modelName = document.getElementById('ai-model-select').value;

        if (!modelName) {
            throw new Error('No Ollama model selected');
        }

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelName,
                prompt: prompt,
                stream: false
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.response;
    },

    async generateSlideContent(topic, slideCount = 8) {
        const prompt = `Create a professional presentation about "${topic}" with exactly ${slideCount} slides.

Generate structured data in this exact JSON format:

{
  "title": "Presentation Title",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slide Title",
      "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
      "speakerNotes": "Additional context for this slide"
    }
  ]
}

Guidelines:
- First slide: Title slide with topic name
- Last slide: Conclusion/Thank you slide
- Content slides: Maximum 4 bullet points each
- Create rich, descriptive content with detailed explanations
- Include speaker notes for each slide

Return ONLY the JSON, no additional text.`;

        const response = await this.generateText(prompt);
        console.log('AI response received for slides:', response.substring(0, 200) + '...');

        // Try to parse JSON response
        try {
            return JSON.parse(response.trim());
        } catch (parseError) {
            // If JSON parsing fails, try to extract JSON from the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('AI response was not in valid JSON format');
            }
        }
    },

    saveStateExtensions(state) {
        return {
            ...state,
            ollamaModel: document.getElementById('ai-model-select')?.value || ''
        };
    },

    loadStateExtensions(state) {
        if (state.ollamaModel && document.getElementById('ai-model-select')) {
            document.getElementById('ai-model-select').value = state.ollamaModel;
        }
    }
};