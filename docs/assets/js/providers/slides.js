// Slides Provider (AI-Generated Presentations)
export const SlidesProvider = {
    name: 'Slides',

    getTemplate() {
        return `
            <fieldset>
                <legend>AI Provider</legend>
                <p>Slides Creator (AI-Powered Visual Presentations)</p>
                <div class="input-group" id="ai-model-selection-group">
                    <label for="ai-model-select" class="label-no-shrink-no-margin">Model:</label>
                    <select id="ai-model-select" class="select-no-margin"></select>
                    <button type="button" id="refresh-models-btn" class="btn btn-secondary">Refresh List</button>
                </div>
                <div id="slides-status" class="ollama-status-style"></div>
            </fieldset>
        `;
    },

    init(dom, appState) {
        // Set provider type
        appState.AI_PROVIDER = 'slides';

        // Get provider-specific DOM elements
        dom.aiModelSelect = document.getElementById('ai-model-select');
        dom.refreshModelsBtn = document.getElementById('refresh-models-btn');
        dom.slidesStatus = document.getElementById('slides-status');

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
        if (dom.slidesStatus) {
            dom.slidesStatus.textContent = 'Loading available models...';
            dom.slidesStatus.className = 'ollama-status-style';
        }

        if (!dom.aiModelSelect) {
            return;
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
                if (dom.slidesStatus) {
                    dom.slidesStatus.textContent = '⚠️ No models found. Please install some models first.';
                    dom.slidesStatus.className = 'ollama-status-style ollama-status-warning';
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

            if (dom.slidesStatus) {
                dom.slidesStatus.textContent = `✅ Found ${data.models.length} model(s) for slide generation`;
                dom.slidesStatus.className = 'ollama-status-style ollama-status-ok';
            }

        } catch (error) {
            console.error('Error loading models:', error);
            dom.aiModelSelect.add(new Option('Models not available', ''));
            if (dom.slidesStatus) {
                dom.slidesStatus.textContent = '❌ Cannot connect to AI models. Make sure Ollama is running.';
                dom.slidesStatus.className = 'ollama-status-style ollama-status-error';
            }
        }
    },

    async generateSlideContent(topic, slideCount = 8) {
        const modelName = document.getElementById('ai-model-select').value;

        if (!modelName) {
            throw new Error('No model selected');
        }

        const prompt = `Create a professional presentation about "${topic}" with exactly ${slideCount} slides.

For each slide, provide structured data in this exact JSON format:

{
  "title": "Presentation Title",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slide Title",
      "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
      "visualDesign": {
        "backgroundColor": "#1a365d",
        "textColor": "#ffffff",
        "accentColor": "#3182ce",
        "layout": "left-text",
        "shapes": [
          {
            "type": "circle",
            "color": "#3182ce",
            "position": "top-right",
            "size": "medium"
          }
        ],
        "imageDescription": "Professional business meeting illustration"
      },
      "speakerNotes": "Additional context for this slide"
    }
  ]
}

Guidelines:
- First slide: Title slide with topic name
- Last slide: Conclusion/Thank you slide
- Content slides: Maximum 4 bullet points each
- Use professional color schemes (dark/light themes)
- Suggest relevant shapes: circle, rectangle, triangle, arrow
- Position options: top-left, top-right, bottom-left, bottom-right, center
- Layout options: left-text, center-text, right-text, full-width
- Size options: small, medium, large
- Provide specific image descriptions that match the content

Return ONLY the JSON, no additional text.`;

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
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        try {
            // Try to parse JSON response
            const slideData = JSON.parse(data.response.trim());
            return slideData;
        } catch (parseError) {
            // If JSON parsing fails, try to extract JSON from the response
            const jsonMatch = data.response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const slideData = JSON.parse(jsonMatch[0]);
                    return slideData;
                } catch (secondParseError) {
                    console.error('Failed to parse AI response as JSON:', data.response);
                    throw new Error('AI response was not in valid JSON format');
                }
            } else {
                console.error('No JSON found in AI response:', data.response);
                throw new Error('AI response did not contain valid JSON');
            }
        }
    },

    async generateText(prompt) {
        // Compatibility method for existing course generation system
        const modelName = document.getElementById('ai-model-select').value;

        if (!modelName) {
            throw new Error('No model selected');
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
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.response;
    },

    saveStateExtensions(state) {
        return {
            ...state,
            slidesModel: document.getElementById('ai-model-select')?.value || ''
        };
    },

    loadStateExtensions(state) {
        if (state.slidesModel && document.getElementById('ai-model-select')) {
            document.getElementById('ai-model-select').value = state.slidesModel;
        }
    }
};