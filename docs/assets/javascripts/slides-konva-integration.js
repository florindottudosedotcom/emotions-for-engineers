/**
 * Slides Konva Integration
 *
 * Bridge between slides functionality and Konva slide system.
 * Extracted from slides_main.js as part of the modular architecture optimization.
 */

import {
    slidesAppState,
    slidesDom,
    enhancedEditingEnabled,
    konvaEditors,
    konvaSlideSystem,
    setKonvaSlideSystem,
    cleanupKonvaEditors,
    COLOR_THEMES,
    getCurrentTheme,
    saveSlides,
    showUserMessage,
    createDomElement
} from './slides-common.js';

/**
 * Enhanced editing initialization and management
 */
export async function initializeEnhancedEditing() {
    console.log('Initializing enhanced editing components...');

    try {
        // Load Konva.js editor if available
        if (typeof window !== 'undefined' && window.KonvaEditor && window.KonvaEditor.loadDependencies) {
            const success = await window.KonvaEditor.loadDependencies();
            console.log('Enhanced editing enabled:', success);
            return success;
        }

        // Enhanced editing is enabled by default when Konva is available
        return true;
    } catch (error) {
        console.warn('Enhanced editing components failed to initialize:', error);
        return false;
    }
}

/**
 * Display slides with enhanced editing integration
 */
export function displaySlides(slideData) {
    if (!slideData || !slideData.slides) {
        console.warn('Invalid slide data provided to displaySlides');
        return;
    }

    console.log('Displaying slides with enhanced editing:', enhancedEditingEnabled);

    if (enhancedEditingEnabled && typeof window !== 'undefined' && window.KonvaSlideSystem) {
        displaySlidesWithKonva(slideData);
    } else {
        displaySlidesAsHTML(slideData);
    }

    // Update presentation title if available
    updatePresentationTitle(slideData.title);

    // Show export options
    showExportOptions();

    // Save after displaying
    saveSlides();
}

/**
 * Display slides using Konva slide system
 */
function displaySlidesWithKonva(slideData) {
    console.log('Displaying slides with Konva system');

    try {
        // Clean up any existing Konva instances
        cleanupKonvaEditors();

        // Initialize the unified Konva slide system
        const slideSystem = new window.KonvaSlideSystem('slides-preview', slideData);
        setKonvaSlideSystem(slideSystem);

        console.log('Konva slide system initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Konva slide system:', error);
        // Fallback to HTML display
        displaySlidesAsHTML(slideData);
    }
}

/**
 * Display slides as HTML (fallback or when enhanced editing is disabled)
 */
function displaySlidesAsHTML(slideData) {
    console.log('Displaying slides as HTML');

    const slidesContainer = slidesDom.slidesPreview || document.getElementById('slides-preview');
    if (!slidesContainer) {
        console.warn('Slides container not found');
        return;
    }

    slidesContainer.innerHTML = '';

    slideData.slides.forEach((slide, index) => {
        const slideElement = createSlideHTML(slide, index);
        slidesContainer.appendChild(slideElement);
    });
}

/**
 * Create HTML representation of a slide
 */
function createSlideHTML(slide, index) {
    const theme = COLOR_THEMES[getCurrentTheme()] || COLOR_THEMES.lavender;

    const slideElement = createDomElement('div', {
        className: 'slide-preview',
        style: {
            backgroundColor: slide.visualDesign?.backgroundColor || theme.backgroundColor,
            border: `2px solid ${slide.visualDesign?.accentColor || theme.borderColor}`,
            borderRadius: '8px',
            margin: '20px 0',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }
    });

    const titleElement = createDomElement('h3', {
        textContent: slide.title,
        style: {
            margin: '0 0 15px 0',
            color: slide.visualDesign?.textColor || theme.textColor,
            fontSize: '1.4em'
        }
    });

    const contentElement = createDomElement('div', {
        className: 'slide-content'
    });

    if (Array.isArray(slide.content)) {
        const listElement = createDomElement('ul', {
            style: {
                margin: '0',
                paddingLeft: '20px'
            }
        });

        slide.content.forEach(item => {
            const listItem = createDomElement('li', {
                textContent: item,
                style: {
                    margin: '8px 0',
                    lineHeight: '1.4',
                    color: slide.visualDesign?.textColor || theme.textColor
                }
            });
            listElement.appendChild(listItem);
        });

        contentElement.appendChild(listElement);
    }

    // Add visual design info
    if (slide.visualDesign) {
        const designInfo = createDomElement('div', {
            className: 'visual-design-info',
            style: {
                backgroundColor: theme.fillColor,
                borderRadius: '4px',
                padding: '10px',
                marginTop: '15px',
                fontSize: '0.9em',
                color: '#666'
            }
        });

        const designText = [
            `Layout: ${slide.visualDesign.layout || 'Standard'}`,
            `Elements: ${slide.visualDesign.designElements?.length || 0} shapes`,
            slide.visualDesign.chartData ? `Chart: ${slide.visualDesign.chartData.type}` : null
        ].filter(Boolean).join(' | ');

        designInfo.innerHTML = `<strong>Visual Design:</strong> ${designText}`;
        contentElement.appendChild(designInfo);
    }

    // Add slide counter
    const counterElement = createDomElement('div', {
        className: 'slide-counter',
        textContent: `Slide ${index + 1}`,
        style: {
            opacity: '0.8',
            fontSize: '0.9em',
            color: '#666',
            marginTop: '10px'
        }
    });

    slideElement.appendChild(titleElement);
    slideElement.appendChild(contentElement);
    slideElement.appendChild(counterElement);

    return slideElement;
}

/**
 * Apply theme to slides
 */
export function applyThemeToSlides() {
    if (!slidesAppState.currentSlideData) return;

    const currentTheme = getCurrentTheme();
    const theme = COLOR_THEMES[currentTheme];

    if (!theme) {
        console.warn('Theme not found:', currentTheme);
        return;
    }

    console.log('Applying theme to slides:', currentTheme);

    if (enhancedEditingEnabled && konvaSlideSystem) {
        // Apply theme to Konva system
        applyThemeToKonva(theme);
    } else {
        // Apply theme to HTML slides
        applyThemeToHTML(theme);
    }

    showUserMessage(`Applied ${theme.name} theme`, 'success');
}

/**
 * Apply theme to Konva slide system
 */
function applyThemeToKonva(theme) {
    if (!konvaSlideSystem || typeof konvaSlideSystem.applyTheme !== 'function') {
        console.warn('Konva slide system not available or missing applyTheme method');
        return;
    }

    try {
        konvaSlideSystem.applyTheme(theme);
        console.log('Theme applied to Konva system');
    } catch (error) {
        console.error('Failed to apply theme to Konva system:', error);
    }
}

/**
 * Apply theme to HTML slides
 */
function applyThemeToHTML(theme) {
    const slidePreviews = document.querySelectorAll('.slide-preview');

    slidePreviews.forEach(slideElement => {
        // Apply background color
        slideElement.style.backgroundColor = theme.backgroundColor;
        slideElement.style.borderColor = theme.borderColor;

        // Apply text colors
        const titleElement = slideElement.querySelector('h3');
        if (titleElement) {
            titleElement.style.color = theme.textColor;
        }

        const contentItems = slideElement.querySelectorAll('li');
        contentItems.forEach(item => {
            item.style.color = theme.textColor;
        });

        // Update visual design info background
        const designInfo = slideElement.querySelector('.visual-design-info');
        if (designInfo) {
            designInfo.style.backgroundColor = theme.fillColor;
        }
    });
}

/**
 * Update presentation title
 */
function updatePresentationTitle(title) {
    const titleElements = document.querySelectorAll('.presentation-title, #presentation-title');
    titleElements.forEach(element => {
        element.textContent = title || 'My Presentation';
    });
}

/**
 * Show export options
 */
function showExportOptions() {
    const exportOptions = document.querySelector('.export-options');
    if (exportOptions) {
        exportOptions.style.display = 'block';
    }
}

/**
 * Show presentation section
 */
export function showPresentationSection() {
    if (slidesDom.presentationSection) {
        slidesDom.presentationSection.style.display = 'block';
    }

    // Ensure the presentation section is visible
    const presentationSection = document.getElementById('presentation-section');
    if (presentationSection) {
        presentationSection.style.display = 'block';
    }
}

/**
 * Initialize empty presentation
 */
export function initializeEmptyPresentation() {
    const emptySlideData = {
        title: 'My Presentation',
        slides: [{
            slideNumber: 1,
            title: 'Welcome',
            content: ['Click "Generate Slides" to create your presentation'],
            visualDesign: {
                backgroundColor: '#f8f9fa',
                textColor: '#333333',
                accentColor: '#667eea',
                layout: 'center-text',
                shapes: []
            },
            speakerNotes: 'Welcome slide - ready for content generation'
        }]
    };

    slidesAppState.currentSlideData = emptySlideData;
    displaySlides(emptySlideData);
}

/**
 * Update generation status
 */
export function updateGenerationStatus(message, type = 'info') {
    const statusElement = slidesDom.generationStatus || document.getElementById('generation-status');
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = `generation-status ${type}`;

    // Add appropriate styling based on type
    const styles = {
        loading: { color: '#0066cc', backgroundColor: '#e6f3ff' },
        success: { color: '#006600', backgroundColor: '#e6ffe6' },
        error: { color: '#cc0000', backgroundColor: '#ffe6e6' },
        warning: { color: '#cc6600', backgroundColor: '#fff3e6' },
        info: { color: '#333333', backgroundColor: '#f8f9fa' }
    };

    const style = styles[type] || styles.info;
    Object.assign(statusElement.style, {
        padding: '10px',
        borderRadius: '4px',
        margin: '10px 0',
        display: 'block',
        ...style
    });

    console.log(`Generation status: ${message} (${type})`);
}

/**
 * Create slides prompt for AI generation
 */
export function createSlidesPrompt(topic, slideCount) {
    const currentScheme = slidesAppState.currentTheme || COLOR_THEMES.lavender;
    const schemeContext = `Using the "${currentScheme.name}" color scheme (${currentScheme.textColor}, ${currentScheme.borderColor}, ${currentScheme.fillColor}, ${currentScheme.backgroundColor})`;

    const actualSlideCount = slideCount + 1; // Add 1 for the title slide

    return `Create a professional presentation about "${topic}" with exactly ${actualSlideCount} slides.

IMPORTANT:
- The FIRST slide MUST ALWAYS be a title slide with:
  * The presentation title as the main heading
  * A subtitle or brief description (optional)
  * Author/date information (optional)
  * NO bullet points or detailed content
- Slides 2 through ${actualSlideCount} should contain the actual content
- This means you will generate ${actualSlideCount} total slides: 1 title slide + ${slideCount} content slides

TOPIC CONTEXT: Analyze "${topic}" and create contextually relevant visual designs that enhance the subject matter. Consider the industry, audience, and content type when designing visual elements.

COLOR SCHEME CONTEXT: ${schemeContext} - ensure all design elements use and complement these specific colors.

CONTENT DEPTH: Create rich, descriptive content with detailed explanations, examples, and insights rather than just bullet point titles.

For each slide, provide structured data in this exact JSON format:

{
  "title": "Presentation Title",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Presentation Title",
      "content": ["Optional subtitle", "Author: Your Name", "Date: Today"],
      "isTitle": true
    },
    {
      "slideNumber": 2,
      "title": "First Content Slide Title",
      "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3", "Bullet point 4"],
      "visualDesign": {
        "backgroundColor": "${currentScheme.backgroundColor}",
        "textColor": "${currentScheme.textColor}",
        "accentColor": "${currentScheme.borderColor}",
        "layout": "left-text",
        "designElements": [
          {
            "type": "organic-shape",
            "shape": "flowing-curve",
            "colors": ["${currentScheme.borderColor}", "${currentScheme.fillColor}"],
            "position": "center-right",
            "size": "large",
            "content": "Contextual concept related to the topic",
            "topicRelevance": "High - directly relates to main theme"
          }
        ],
        "chartData": {
          "type": "bar",
          "data": [65, 45, 80, 55],
          "labels": ["Q1", "Q2", "Q3", "Q4"],
          "colors": ["${currentScheme.borderColor}", "${currentScheme.fillColor}"]
        }
      },
      "speakerNotes": "Additional context for this slide"
    }
  ]
}

CRITICAL REQUIREMENTS:
- First slide: ALWAYS a title slide with presentation title (isTitle: true)
- Content slides: MUST have 3-4 bullet points in "content" array
- Each bullet point should be a complete, meaningful sentence
- Bullet points MUST be provided in the "content" array as separate strings
- Last slide: Should be a conclusion or summary slide
- Color schemes must have high contrast (WCAG AA compliant)

ADVANCED CONTEXTUAL VISUAL DESIGN INSTRUCTIONS:

🎯 TOPIC-DRIVEN DESIGN:
- Analyze the topic deeply and create visually meaningful designs that directly relate to the subject
- For business topics: use professional charts, growth curves, network diagrams
- For creative topics: use flowing organic shapes, artistic elements, color gradients
- For technical topics: use structured layouts, code-like elements, system diagrams
- For educational topics: use progressive visual flows, step-by-step elements

🎨 ORGANIC & ADVANCED VISUAL ELEMENTS:
- organic-shape: Flowing, curved, natural shapes that complement the topic
- polyline-accent: Connected line elements that create visual flow
- topic-visualization: Custom visual elements that represent core concepts
- contextual-metaphor: Visual metaphors that enhance understanding

📊 ENHANCED DATA VISUALIZATION:
- Create realistic, topic-relevant data that tells a story
- Chart types should match the narrative
- Use organic color transitions within the current color scheme
- Add contextual labels that relate directly to the topic content

💡 COLOR SCHEME INTEGRATION:
- All visual elements MUST use the current selected color scheme colors
- Create harmonious color variations within the scheme palette
- Use color psychology appropriate to the topic
- Ensure visual hierarchy through color intensity and contrast

⚠️ FINAL REQUIREMENT CHECK:
- Slide 1: Title slide with isTitle: true
- Slides 2+: Content slides with "content" array containing 3-4 bullet points each
- All bullet points must be complete, meaningful sentences
- NO empty content arrays allowed

Return ONLY the JSON, no additional text.`;
}

/**
 * Parse AI response into slide data
 */
export function parseSlideResponse(aiResponse) {
    try {
        console.log('Attempting to parse JSON...');
        const slideData = JSON.parse(aiResponse.trim());
        console.log('Successfully parsed slide data');
        return slideData;
    } catch (parseError) {
        console.log('Direct JSON parse failed, trying to extract JSON...');
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const slideData = JSON.parse(jsonMatch[0]);
                console.log('Successfully extracted and parsed JSON');
                return slideData;
            } catch (secondParseError) {
                console.error('Failed to parse extracted JSON:', secondParseError);
                throw new Error('AI response was not in valid JSON format');
            }
        } else {
            console.error('No JSON found in AI response');
            throw new Error('AI response did not contain valid JSON');
        }
    }
}

/**
 * Show slide generation confirmation dialog
 */
export function showSlideGenerationConfirmation() {
    return new Promise((resolve) => {
        const modal = createDomElement('div', {
            className: 'modal-overlay visible',
            style: {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                opacity: 1
            }
        });

        const modalContent = createDomElement('div', {
            className: 'modal-content'
        });

        modalContent.innerHTML = `
            <h2>Overwrite Existing Slides?</h2>
            <p>You already have slides in your presentation. Generating new slides will replace all existing content. This action cannot be undone.</p>
            <div class="input-group margin-top-1-5rem">
                <button type="button" id="overwrite-slides-yes" class="btn btn-primary">✓ Yes, Replace Slides</button>
                <button type="button" id="overwrite-slides-cancel" class="btn btn-danger margin-left-auto">× Cancel</button>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        const yesBtn = modal.querySelector('#overwrite-slides-yes');
        const cancelBtn = modal.querySelector('#overwrite-slides-cancel');

        const cleanup = () => {
            modal.remove();
        };

        yesBtn.addEventListener('click', () => {
            cleanup();
            clearSlidesForGeneration();
            resolve(true);
        }, { once: true });

        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(false);
        }, { once: true });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cleanup();
                resolve(false);
            }
        });

        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', handleEscape);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}

/**
 * Clear slides for generation
 */
function clearSlidesForGeneration() {
    slidesAppState.currentSlideData = null;

    // Clear localStorage persistence
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('aiSlidesCreator_slides');
        localStorage.removeItem('aiSlidesCreator_slides_form');
    }

    // Clear the slides display
    if (slidesDom.slidesPreview) {
        slidesDom.slidesPreview.innerHTML = '';
    }

    // Ensure presentation section remains visible
    showPresentationSection();

    updateGenerationStatus('Existing slides cleared, ready for new generation...', 'success');
}

/**
 * Generate presentation using AI
 */
export async function generatePresentation() {
    console.log('generatePresentation function called');

    const topicElement = slidesDom.presentationTopicTextarea || document.getElementById('presentation-topic');
    const slideCountElement = slidesDom.numSlidesSelect || document.getElementById('num-slides');

    if (!topicElement || !slideCountElement) {
        updateGenerationStatus('Required form elements not found.', 'error');
        return;
    }

    const topic = topicElement.value.trim();
    const slideCount = parseInt(slideCountElement.value);

    console.log('Topic:', topic, 'Slide count:', slideCount);

    if (!topic) {
        updateGenerationStatus('Please enter a presentation topic.', 'error');
        return;
    }

    if (slidesAppState.isGenerating) {
        updateGenerationStatus('Generation already in progress...', 'warning');
        return;
    }

    // Check if there are existing slides and ask for confirmation
    if (slidesAppState.currentSlideData && slidesAppState.currentSlideData.slides && slidesAppState.currentSlideData.slides.length > 0) {
        const confirmed = await showSlideGenerationConfirmation();
        if (!confirmed) {
            console.log('User cancelled slide generation');
            return;
        }
    }

    try {
        console.log('Starting generation process...');
        slidesAppState.isGenerating = true;

        const generateBtn = slidesDom.generateSlidesBtn || document.getElementById('generate-slides-btn');
        if (generateBtn) {
            generateBtn.disabled = true;
        }

        updateGenerationStatus('⚡ Generating AI-powered presentation...', 'loading');

        // Generate slide content using provider
        const slidesPrompt = createSlidesPrompt(topic, slideCount);
        console.log('Calling provider.generateText with slides prompt');

        if (!window.currentProvider || typeof window.currentProvider.generateText !== 'function') {
            throw new Error('AI provider not available or missing generateText method');
        }

        const aiResponse = await window.currentProvider.generateText(slidesPrompt);
        console.log('Provider returned response');

        // Parse the JSON response
        const slideData = parseSlideResponse(aiResponse);
        console.log('Parsed slide data:', slideData);

        if (!slideData || !slideData.slides || slideData.slides.length === 0) {
            throw new Error('No slide data generated');
        }

        slidesAppState.currentSlideData = slideData;

        // Ensure presentation section is visible
        showPresentationSection();

        // Update UI with generated slides
        displaySlides(slideData);

        // Apply theme if selected
        if (slidesAppState.currentTheme) {
            applyThemeToSlides();
        }

        updateGenerationStatus(`✅ Generated ${slideData.slides.length} slides successfully!`, 'success');

    } catch (error) {
        console.error('Error generating presentation:', error);
        updateGenerationStatus(`❌ Generation failed: ${error.message}`, 'error');
    } finally {
        slidesAppState.isGenerating = false;
        const generateBtn = slidesDom.generateSlidesBtn || document.getElementById('generate-slides-btn');
        if (generateBtn) {
            generateBtn.disabled = false;
        }
    }
}