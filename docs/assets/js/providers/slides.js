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
                    dom.slidesStatus.textContent = '⚠ No models found. Please install some models first.';
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
        console.log('SlidesProvider.generateSlideContent called with:', topic, slideCount);
        const modelName = document.getElementById('ai-model-select').value;
        console.log('Selected model:', modelName);

        if (!modelName) {
            console.error('No model selected');
            throw new Error('No model selected');
        }

        // Get current color scheme for contextual design
        const currentScheme = slidesAppState?.currentTheme || COLOR_THEMES?.lavender || {
            name: 'Default Blue',
            textColor: '#1e40af',
            borderColor: '#3b82f6',
            fillColor: '#dbeafe',
            backgroundColor: '#f0f9ff'
        };
        const schemeContext = `Using the "${currentScheme.name}" color scheme (${currentScheme.textColor}, ${currentScheme.borderColor}, ${currentScheme.fillColor}, ${currentScheme.backgroundColor})`;

        const prompt = `Create a professional presentation about "${topic}" with exactly ${slideCount} slides.

TOPIC CONTEXT: Analyze "${topic}" and create contextually relevant visual designs that enhance the subject matter. Consider the industry, audience, and content type when designing visual elements.

COLOR SCHEME CONTEXT: ${schemeContext} - ensure all design elements use and complement these specific colors.

CONTENT DEPTH: Create rich, descriptive content with detailed explanations, examples, and insights rather than just bullet point titles.

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
        "designElements": [
          {
            "type": "organic-shape",
            "shape": "flowing-curve",
            "colors": ["currentScheme.borderColor", "currentScheme.fillColor"],
            "position": "center-right",
            "size": "large",
            "content": "Contextual concept related to the topic",
            "topicRelevance": "High - directly relates to main theme"
          },
          {
            "type": "topic-visualization",
            "visualType": "contextual-to-topic",
            "data": "realistic-topic-related-data",
            "colors": "currentScheme.colors",
            "position": "bottom-center",
            "description": "Visual representation of key topic concepts"
          },
          {
            "type": "polyline-accent",
            "points": "dynamic-based-on-content",
            "style": "organic-flow",
            "colors": ["currentScheme.borderColor"],
            "position": "connecting-elements"
          }
        ],
        "chartData": {
          "type": "bar",
          "data": [65, 45, 80, 55],
          "labels": ["Q1", "Q2", "Q3", "Q4"],
          "colors": ["#3182ce", "#60a5fa", "#93c5fd", "#dbeafe"]
        },
        "backgroundPattern": "subtle-dots",
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

ADVANCED CONTEXTUAL VISUAL DESIGN INSTRUCTIONS:

🎯 TOPIC-DRIVEN DESIGN:
- Analyze the topic deeply and create visually meaningful designs that directly relate to the subject
- For business topics: use professional charts, growth curves, network diagrams
- For creative topics: use flowing organic shapes, artistic elements, color gradients
- For technical topics: use structured layouts, code-like elements, system diagrams
- For educational topics: use progressive visual flows, step-by-step elements

🎨 ORGANIC & ADVANCED VISUAL ELEMENTS:
- organic-shape: Flowing, curved, natural shapes that complement the topic
  * flowing-curve, wave-pattern, organic-blob, spiral-flow, leaf-shape, water-ripple
  * Use bezier curves and smooth transitions, avoid rigid geometric shapes
- polyline-accent: Connected line elements that create visual flow
  * curved-connector, flowing-path, organic-network, branching-lines
  * Points should follow natural, organic patterns, not straight lines
- topic-visualization: Custom visual elements that represent core concepts
  * Create unique visualizations based on topic (books for education, gears for business, etc.)
- contextual-metaphor: Visual metaphors that enhance understanding
  * Use imagery and shapes that naturally relate to the topic's domain

📊 ENHANCED DATA VISUALIZATION:
- Create realistic, topic-relevant data that tells a story
- Chart types should match the narrative (growth charts for success topics, pie charts for distribution, etc.)
- Use organic color transitions within the current color scheme
- Add contextual labels that relate directly to the topic content

🎨 RICH CONTENT GENERATION:
- Generate detailed, comprehensive content beyond simple bullet points
- Include explanations, examples, case studies, and insights
- Use descriptive language that paints a vivid picture
- Create narrative flow between slides that builds understanding
- Each bullet point should be a complete thought with context

💡 COLOR SCHEME INTEGRATION:
- All visual elements MUST use the current selected color scheme colors
- Create harmonious color variations within the scheme palette
- Use color psychology appropriate to the topic (warm colors for passion, cool colors for technology)
- Ensure visual hierarchy through color intensity and contrast

🌊 ORGANIC DESIGN PRINCIPLES:
- Embrace asymmetry and natural proportions
- Use flowing, curved lines instead of rigid straight lines
- Create depth through layered organic shapes
- Use breathing space and natural composition
- Incorporate subtle animations through CSS transitions

📐 ADVANCED POSITIONING:
- flowing-around-content: Elements that curve around text naturally
- organic-cluster: Groups of elements that follow natural clustering patterns
- contextual-placement: Positioning based on content meaning and visual flow

CRITICAL: Every design element must serve the topic and enhance comprehension. Avoid generic placeholder content - make everything contextually meaningful and visually compelling.

Return ONLY the JSON, no additional text.`;

        console.log('Making API request to Ollama...');
        console.log('Request payload:', { model: modelName, prompt: prompt.substring(0, 100) + '...' });

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

        console.log('Ollama API response status:', response.status, response.statusText);

        if (!response.ok) {
            console.error('API request failed:', response.status, response.statusText);
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        console.log('Getting response data...');
        const data = await response.json();
        console.log('Raw API response length:', data.response?.length || 'N/A');
        console.log('Raw API response preview:', data.response?.substring(0, 200) + '...');

        try {
            // Try to parse JSON response
            console.log('Attempting to parse JSON...');
            const slideData = JSON.parse(data.response.trim());
            console.log('Successfully parsed slide data:', slideData);
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