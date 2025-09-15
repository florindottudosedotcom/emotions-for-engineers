// Slides functionality - works with any provider (cloud, webllm, ollama)
const SLIDES_STORAGE_KEY = 'aiSlidesCreator_slides';
const THEME_STORAGE_KEY = 'aiSlidesCreator_theme';
const CUSTOM_COLORS_STORAGE_KEY = 'aiSlidesCreator_customColors';

const slidesAppState = {
    currentSlideData: null,
    isGenerating: false,
    currentTheme: null
};

const slidesDom = {};

// Predefined harmonious pastel color themes
const COLOR_THEMES = {
    lavender: {
        name: 'Lavender Dreams',
        textColor: '#4c1d95',      // Dark purple for text
        borderColor: '#8b5cf6',    // Medium purple for borders
        fillColor: '#e6e6fa',      // Light lavender for fills
        backgroundColor: '#faf5ff' // Very light background that matches
    },
    mint: {
        name: 'Mint Fresh',
        textColor: '#065f46',      // Dark green for text
        borderColor: '#10b981',    // Medium green for borders
        fillColor: '#d1f2eb',      // Light mint for fills
        backgroundColor: '#f0fdfa' // Very light background that matches
    },
    rose: {
        name: 'Rose Blush',
        textColor: '#9f1239',      // Dark rose for text
        borderColor: '#e11d48',    // Medium rose for borders
        fillColor: '#fce7f3',      // Light pink for fills
        backgroundColor: '#fdf2f8' // Very light background that matches
    },
    sky: {
        name: 'Sky Blue',
        textColor: '#1e3a8a',      // Dark blue for text
        borderColor: '#2563eb',    // Medium blue for borders
        fillColor: '#dbeafe',      // Light blue for fills
        backgroundColor: '#f0f9ff' // Very light background that matches
    },
    peach: {
        name: 'Peach Cream',
        textColor: '#9a3412',      // Dark orange for text
        borderColor: '#ea580c',    // Medium orange for borders
        fillColor: '#fed7aa',      // Light peach for fills
        backgroundColor: '#fff7ed' // Very light background that matches
    },
    sage: {
        name: 'Sage Green',
        textColor: '#14532d',      // Dark sage for text
        borderColor: '#16a34a',    // Medium sage for borders
        fillColor: '#dcfce7',      // Light sage for fills
        backgroundColor: '#f0fdf4' // Very light background that matches
    }
};

// Load custom colors from localStorage
function loadCustomColors() {
    try {
        const savedColors = localStorage.getItem(CUSTOM_COLORS_STORAGE_KEY);
        if (savedColors) {
            const customColors = JSON.parse(savedColors);
            // Merge custom colors with default themes
            Object.assign(COLOR_THEMES, customColors);
        }
    } catch (error) {
        console.warn('Failed to load custom colors:', error);
    }
}

// Save custom colors to localStorage
function saveCustomColors() {
    try {
        localStorage.setItem(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(COLOR_THEMES));
    } catch (error) {
        console.warn('Failed to save custom colors:', error);
    }
}

// Wait for the main provider to be initialized, then add slides functionality
document.addEventListener('DOMContentLoaded', async () => {
    // Load custom colors first
    loadCustomColors();

    // Wait a bit for unified_main.js to load the provider
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!window.currentProvider) {
        console.error('No provider found - unified_main.js should have loaded it');
        return;
    }

    console.log('Initializing Slides functionality with provider:', window.currentProvider.name);

    // Get slides-specific DOM elements
    slidesDom.presentationTopicTextarea = document.getElementById('presentation-topic');
    slidesDom.numSlidesSelect = document.getElementById('num-slides');
    slidesDom.generateSlidesBtn = document.getElementById('generate-slides-btn');
    slidesDom.generationStatus = document.getElementById('generation-status');
    slidesDom.presentationSection = document.getElementById('presentation-section');
    slidesDom.presentationTitle = document.getElementById('presentation-title');
    slidesDom.totalSlides = document.getElementById('total-slides');
    slidesDom.slidesPreview = document.getElementById('slides-preview');
    slidesDom.presentationViewer = document.getElementById('presentation-viewer');
    slidesDom.closePresentationBtn = document.getElementById('close-presentation-btn');
    slidesDom.revealPresentation = document.getElementById('reveal-presentation');

    // Export buttons
    slidesDom.exportPdfBtn = document.getElementById('export-pdf-btn');
    slidesDom.exportPptxBtn = document.getElementById('export-pptx-btn');
    slidesDom.exportHtmlBtn = document.getElementById('export-html-btn');
    slidesDom.exportJsonBtn = document.getElementById('export-json-btn');
    slidesDom.exportStatus = document.getElementById('export-status');

    // Add slides-specific event listeners
    console.log('Adding slides event listeners...');

    if (slidesDom.generateSlidesBtn) {
        slidesDom.generateSlidesBtn.addEventListener('click', generatePresentation);
        console.log('Generate slides button event listener added');
    }

    // Removed regenerate and preview buttons - no longer needed

    if (slidesDom.closePresentationBtn) {
        slidesDom.closePresentationBtn.addEventListener('click', closePresentationViewer);
    }

    // Clear slides button will be added to the bottom later

    // Export modal event listeners
    const openExportModalBtn = document.getElementById('open-export-modal-btn');
    const closeExportModalBtn = document.getElementById('close-export-modal-btn');
    const exportModal = document.getElementById('export-modal');

    if (openExportModalBtn) {
        openExportModalBtn.addEventListener('click', showExportModal);
    }

    if (closeExportModalBtn) {
        closeExportModalBtn.addEventListener('click', hideExportModal);
    }

    if (exportModal) {
        exportModal.addEventListener('click', (e) => {
            if (e.target === exportModal) {
                hideExportModal();
            }
        });
    }

    // Export buttons in modal
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const exportPptxBtn = document.getElementById('export-pptx-btn');
    const exportHtmlBtn = document.getElementById('export-html-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');

    if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => exportPresentation('pdf'));
    if (exportPptxBtn) exportPptxBtn.addEventListener('click', () => exportPresentation('pptx'));
    if (exportHtmlBtn) exportHtmlBtn.addEventListener('click', () => exportPresentation('html'));
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => exportPresentation('json'));

    // Load saved data
    console.log('Starting slides initialization...');
    loadSavedSlides();

    // Initialize empty presentation if no saved slides
    console.log('Current slide data after loading:', slidesAppState.currentSlideData);
    if (!slidesAppState.currentSlideData) {
        console.log('No slide data found, initializing empty presentation...');
        initializeEmptyPresentation();
        // Show presentation section for new presentations
        showPresentationSection();
    } else {
        console.log('Slide data exists, skipping empty presentation initialization');
    }

    // Add clear button to bottom
    addClearButtonToBottom();

    // Add form auto-save listeners and select-all behavior
    if (slidesDom.presentationTopicTextarea) {
        slidesDom.presentationTopicTextarea.addEventListener('input', debounce(saveFormState, 500));
        selectAllOnFocusTextarea(slidesDom.presentationTopicTextarea);
    }
    if (slidesDom.numSlidesSelect) {
        slidesDom.numSlidesSelect.addEventListener('change', saveFormState);
    }

    console.log('Slides functionality initialized successfully');

    console.log('Slides Creator functionality initialized successfully');
});

// Session Storage Functions
function saveSlides() {
    if (slidesAppState.currentSlideData) {
        localStorage.setItem(SLIDES_STORAGE_KEY, JSON.stringify(slidesAppState.currentSlideData));
    }

    // Also save form state
    saveFormState();
}

function saveFormState() {
    const formState = {
        presentationTopic: slidesDom.presentationTopicTextarea ? slidesDom.presentationTopicTextarea.value : '',
        numSlides: slidesDom.numSlidesSelect ? slidesDom.numSlidesSelect.value : '8'
    };
    localStorage.setItem(SLIDES_STORAGE_KEY + '_form', JSON.stringify(formState));
}

function loadSavedSlides() {
    try {
        console.log('Loading saved slides...');
        const saved = localStorage.getItem(SLIDES_STORAGE_KEY);
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        const savedForm = localStorage.getItem(SLIDES_STORAGE_KEY + '_form');

        console.log('Saved slides data:', saved ? 'Found' : 'Not found');
        console.log('Saved theme data:', savedTheme ? 'Found' : 'Not found');

        if (savedTheme) {
            slidesAppState.currentTheme = JSON.parse(savedTheme);
            console.log('Loaded theme:', slidesAppState.currentTheme);
        }

        if (saved) {
            slidesAppState.currentSlideData = JSON.parse(saved);
            console.log('Loaded slides data:', slidesAppState.currentSlideData);

            // Show presentation section first, then display slides
            console.log('Showing presentation section...');
            showPresentationSection();

            console.log('Displaying slides...');
            displaySlides(slidesAppState.currentSlideData);

            // Apply saved theme if available
            if (slidesAppState.currentTheme) {
                console.log('Applying theme...');
                applyThemeToSlides();
                // Restore active state on color scheme selector
                restoreColorSchemeSelection();
            }

            console.log('Loaded saved slides from session storage');
        } else {
            console.log('No saved slides found');
        }

        // Restore form state
        if (savedForm) {
            const formState = JSON.parse(savedForm);
            if (slidesDom.presentationTopicTextarea) {
                slidesDom.presentationTopicTextarea.value = formState.presentationTopic || '';
            }
            if (slidesDom.numSlidesSelect) {
                slidesDom.numSlidesSelect.value = formState.numSlides || '8';
            }
            console.log('Loaded saved form state');
        }
    } catch (error) {
        console.error('Error loading saved slides:', error);
    }
}

function clearAllSlides() {
    if (confirm('Are you sure you want to clear all slides? This will reset to a single empty slide.')) {
        // Reset to a single empty slide instead of clearing everything
        slidesAppState.currentSlideData = {
            title: 'My Presentation',
            slides: [{
                slideNumber: 1,
                title: 'New Slide',
                content: ['Click to edit this content'],
                visualDesign: {
                    backgroundColor: '#1e40af',
                    textColor: '#ffffff',
                    accentColor: '#60a5fa',
                    layout: 'left-text',
                    shapes: []
                },
                speakerNotes: 'Click to add speaker notes'
            }]
        };

        // Keep the current theme if one is selected
        if (slidesAppState.currentTheme) {
            applyThemeToSlides();
        }

        // Display the reset presentation
        displaySlides(slidesAppState.currentSlideData);
        saveSlides();

        updateGenerationStatus('Slides reset to single empty slide', 'success');
    }
}

function addClearButtonToBottom() {
    // Check if buttons already exist
    if (document.querySelector('.slides-bottom-controls')) {
        return;
    }

    const slidesPreview = slidesDom.slidesPreview;
    if (!slidesPreview) return;

    // Create Add Slide section (above separator, right-aligned)
    const addSlideSection = document.createElement('div');
    addSlideSection.className = 'add-slide-section';
    addSlideSection.style.cssText = 'display: flex; justify-content: flex-end; margin: 30px 0 10px 0;';

    // Create Add Slide button (top right, matching insert button style)
    const addSlideBtn = document.createElement('button');
    addSlideBtn.type = 'button';
    addSlideBtn.className = 'btn-small add-slide-bottom-btn';
    addSlideBtn.textContent = '+';
    addSlideBtn.title = 'Add new slide';
    addSlideBtn.style.cssText = 'padding: 0; font-size: 12px; border: 2px solid #28a745; color: #28a745; background-color: transparent; border-radius: 3px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; box-sizing: border-box;';
    addSlideBtn.addEventListener('click', addNewSlide);
    addSlideSection.appendChild(addSlideBtn);

    // Create bottom controls container (below separator)
    const bottomControls = document.createElement('div');
    bottomControls.className = 'slides-bottom-controls';
    bottomControls.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin: 10px 0 30px 0; padding: 20px 0; border-top: 1px solid #ddd;';

    // Create Export button (bottom left)
    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.id = 'open-export-modal-btn';
    exportBtn.className = 'btn btn-primary';
    exportBtn.textContent = '↓ Export';
    exportBtn.style.cssText = 'border: 2px solid var(--primary-color, #1976d2); color: var(--primary-color, #1976d2); background-color: transparent; display: inline-flex; align-items: center; gap: 0.5rem; font-size: 1.1em; padding: 12px 24px;';
    exportBtn.addEventListener('click', showExportModal);

    // Create Clear All Slides button (bottom right)
    const clearSlidesBtn = document.createElement('button');
    clearSlidesBtn.type = 'button';
    clearSlidesBtn.className = 'btn btn-outline clear-slides-bottom-btn';
    clearSlidesBtn.textContent = '× Clear All Slides';
    clearSlidesBtn.style.cssText = 'border: 2px solid #dc3545; color: #dc3545; background-color: transparent; display: inline-flex; align-items: center; gap: 0.5rem;';
    clearSlidesBtn.addEventListener('click', clearAllSlides);

    // Add buttons to bottom container
    bottomControls.appendChild(exportBtn);
    bottomControls.appendChild(clearSlidesBtn);

    // Insert sections after slides preview but before export options
    const exportOptions = document.querySelector('.export-options');
    if (exportOptions) {
        exportOptions.parentNode.insertBefore(addSlideSection, exportOptions);
        exportOptions.parentNode.insertBefore(bottomControls, exportOptions);
    } else {
        slidesDom.presentationSection.appendChild(addSlideSection);
        slidesDom.presentationSection.appendChild(bottomControls);
    }
}

// Theme Management Functions
function createThemeSelector() {
    // Find where to insert the theme selector (before the presentation generator)
    const presentationGenerator = document.querySelector('fieldset legend');
    if (!presentationGenerator || presentationGenerator.textContent !== 'Presentation Generator') {
        return;
    }

    const fieldset = presentationGenerator.parentElement;

    // Create theme selector container
    const themeContainer = document.createElement('div');
    themeContainer.className = 'theme-selector-container';
    themeContainer.innerHTML = `
        <div class="theme-selector">
            <h3>Choose Color Theme</h3>
            <div class="theme-tiles">
                ${Object.keys(COLOR_THEMES).map(themeKey => {
                    const theme = COLOR_THEMES[themeKey];
                    return `
                        <div class="theme-tile" data-theme="${themeKey}" title="${theme.name}">
                            <div class="theme-colors">
                                ${theme.colors.map(color => `<div class="theme-color" style="background-color: ${color}"></div>`).join('')}
                            </div>
                            <div class="theme-name">${theme.name}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    // Insert before the fieldset
    fieldset.parentNode.insertBefore(themeContainer, fieldset);

    // Add click handlers for theme tiles
    const themeTiles = themeContainer.querySelectorAll('.theme-tile');
    themeTiles.forEach(tile => {
        tile.addEventListener('click', () => selectTheme(tile.dataset.theme));
    });

    // Load saved theme selection
    if (slidesAppState.currentTheme) {
        const savedTile = themeContainer.querySelector(`[data-theme="${slidesAppState.currentTheme.key}"]`);
        if (savedTile) savedTile.classList.add('selected');
    }
}

function selectTheme(themeKey) {
    const theme = COLOR_THEMES[themeKey];
    if (!theme) return;

    slidesAppState.currentTheme = { ...theme, key: themeKey };
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(slidesAppState.currentTheme));

    // Update UI
    const themeTiles = document.querySelectorAll('.theme-tile');
    themeTiles.forEach(tile => {
        tile.classList.toggle('selected', tile.dataset.theme === themeKey);
    });

    // Re-render slides if they exist
    if (slidesAppState.currentSlideData) {
        applyThemeToSlides();
    }
}


// Create a universal slides prompt that works with any provider
function createSlidesPrompt(topic, slideCount) {
    // Get current color scheme for contextual design
    const currentScheme = slidesAppState.currentTheme || COLOR_THEMES.lavender;
    const schemeContext = `Using the "${currentScheme.name}" color scheme (${currentScheme.textColor}, ${currentScheme.borderColor}, ${currentScheme.fillColor}, ${currentScheme.backgroundColor})`;

    return `Create a professional presentation about "${topic}" with exactly ${slideCount} slides.

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
- Color schemes must have high contrast (WCAG AA compliant)
- Use these professional color palettes:
  * Corporate Blue: background "#1e40af", text "#ffffff", accent "#60a5fa"
  * Modern Dark: background "#1f2937", text "#f9fafb", accent "#10b981"
  * Elegant Purple: background "#581c87", text "#ffffff", accent "#a855f7"
  * Professional Green: background "#064e3b", text "#ffffff", accent "#34d399"
  * Warm Orange: background "#ea580c", text "#ffffff", accent "#fb923c"
  * Classic Navy: background "#1e3a8a", text "#ffffff", accent "#3b82f6"

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
}

// Helper function to adjust color brightness
function adjustColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

// Parse AI response into slide data
function parseSlideResponse(aiResponse) {
    try {
        // Try to parse JSON response directly
        console.log('Attempting to parse JSON...');
        const slideData = JSON.parse(aiResponse.trim());
        console.log('Successfully parsed slide data');
        return slideData;
    } catch (parseError) {
        // If JSON parsing fails, try to extract JSON from the response
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

function showSlideGenerationConfirmation() {
    return new Promise((resolve) => {
        // Create modal using the same design pattern as course creator
        const modal = document.createElement('div');
        modal.className = 'modal-overlay visible';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            opacity: 1;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
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
            // Clear existing slides and persistence like clearAllSlides() but without the confirm()
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

function clearSlidesForGeneration() {
    // Clear slides data (similar to clearAllSlides but without the confirm dialog)
    slidesAppState.currentSlideData = null;

    // Clear localStorage persistence
    localStorage.removeItem(SLIDES_STORAGE_KEY);
    localStorage.removeItem(SLIDES_STORAGE_KEY + '_form');

    // Clear the slides display using the correct DOM reference
    if (slidesDom.slidesPreview) {
        slidesDom.slidesPreview.innerHTML = '';
    }

    // Clear presentation title
    if (slidesDom.presentationTitle) {
        slidesDom.presentationTitle.innerHTML = '';
    }

    // Reset slide count
    if (slidesDom.totalSlides) {
        slidesDom.totalSlides.textContent = '0';
    }

    // Ensure presentation section remains visible for the new generation
    if (slidesDom.presentationSection) {
        slidesDom.presentationSection.style.display = 'block';
    }

    // Update status to show clearing is complete
    updateGenerationStatus('Existing slides cleared, ready for new generation...', 'success');
}

async function generatePresentation() {
    console.log('generatePresentation function called');
    const topic = slidesDom.presentationTopicTextarea.value.trim();
    const slideCount = parseInt(slidesDom.numSlidesSelect.value);

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
        slidesDom.generateSlidesBtn.disabled = true;

        updateGenerationStatus('⚡ Generating AI-powered presentation...', 'loading');
        console.log('Status updated, calling provider...');

        // Generate slide content using any provider's generateText method
        const slidesPrompt = createSlidesPrompt(topic, slideCount);
        console.log('Calling provider.generateText with slides prompt');
        const aiResponse = await window.currentProvider.generateText(slidesPrompt);
        console.log('Provider returned raw response:', aiResponse.substring(0, 200) + '...');

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

        // Save to session storage
        saveSlides();

        updateGenerationStatus(`✅ Generated ${slideData.slides.length} slides successfully!`, 'success');

    } catch (error) {
        console.error('Error generating presentation:', error);
        console.error('Error stack:', error.stack);
        updateGenerationStatus(`❌ Error: ${error.message}`, 'error');
    } finally {
        slidesAppState.isGenerating = false;
        slidesDom.generateSlidesBtn.disabled = false;
    }
}

function displaySlides(slideData) {
    // Update title and slide count (starting from 1, not 0)
    if (slidesDom.presentationTitle) {
        makePresentationTitleEditable(slideData.title || 'My Presentation');
    }
    if (slidesDom.totalSlides) {
        slidesDom.totalSlides.textContent = slideData.slides.length;
    }

    // Clear existing slides
    if (slidesDom.slidesPreview) {
        slidesDom.slidesPreview.innerHTML = '';

        // Generate slide previews with proper numbering starting at 1
        slideData.slides.forEach((slide, index) => {
            const slideElement = createSlidePreviewElement(slide, index + 1);
            slidesDom.slidesPreview.appendChild(slideElement);
        });
    }

    // Add clear button at the bottom if it doesn't exist
    addClearButtonToBottom();

    // Apply theme if available
    if (slidesAppState.currentTheme) {
        applyThemeToSlides();
    }

    // Presentation section is always visible now
}

function createSlidePreviewElement(slide, slideNumber) {
    // Create container for controls header + slide
    const slideContainer = document.createElement('div');
    slideContainer.className = 'slide-with-controls-container';

    // Create controls header first
    const controlsHeader = createSlideControlsHeader(slideNumber, slideNumber - 1);
    slideContainer.appendChild(controlsHeader);

    const slideDiv = document.createElement('div');
    slideDiv.className = 'slide-preview editable-slide';
    slideDiv.dataset.slideIndex = slideNumber - 1; // Store 0-based index for easy access

    // Apply AI-generated visual design
    applySlideDesign(slideDiv, slide, slideNumber);

    // Create editable slide content
    const slideContent = document.createElement('div');
    slideContent.className = 'slide-content-editable';
    slideContent.style.position = 'relative';

    // Editable title
    const titleElement = document.createElement('h3');
    titleElement.className = 'slide-title-editable';
    titleElement.contentEditable = true;
    titleElement.textContent = slide.title;
    titleElement.style.cssText = `
        color: var(--accent-color, #60a5fa);
        margin: 0 0 15px 0;
        font-size: 1.4em;
        border: 2px solid transparent;
        padding: 5px;
        border-radius: 4px;
    `;

    // Add editing event listeners for title
    titleElement.addEventListener('blur', (e) => updateSlideData(slideNumber - 1, 'title', e.target.textContent));
    titleElement.addEventListener('focus', (e) => e.target.style.border = '2px solid var(--accent-color, #60a5fa)');
    titleElement.addEventListener('blur', (e) => e.target.style.border = '2px solid transparent');

    // Select all text when clicking/focusing
    selectAllOnFocus(titleElement);

    // Editable content list
    const contentContainer = document.createElement('div');
    contentContainer.className = 'slide-content-container';

    if (slide.content && slide.content.length > 0) {
        const contentList = document.createElement('ul');
        contentList.style.cssText = 'margin: 0; padding-left: 20px; line-height: 1.6; font-family: Arial, sans-serif;';

        slide.content.forEach((point, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'slide-content-item-editable';
            listItem.contentEditable = true;
            listItem.textContent = point;
            listItem.style.cssText = `
                margin: 8px 0;
                border: 2px solid transparent;
                padding: 8px 12px;
                border-radius: 4px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                line-height: 1.4;
                display: flex;
                align-items: center;
                min-height: 20px;
            `;

            // Add editing event listeners for content
            listItem.addEventListener('blur', (e) => {
                // Get text content (no longer need to exclude remove button)
                const textContent = e.target.textContent.trim();
                updateSlideContentItem(slideNumber - 1, index, textContent);
            });
            listItem.addEventListener('focus', (e) => e.target.style.border = '2px solid var(--accent-color, #60a5fa)');
            listItem.addEventListener('blur', (e) => e.target.style.border = '2px solid transparent');

            // Select all text when clicking/focusing
            selectAllOnFocus(listItem);

            // Make content item deletable with hover mechanism
            makeContentItemEditable(listItem, slideNumber - 1, index);

            contentList.appendChild(listItem);
        });

        // Add "Add Content Point" button
        const addPointBtn = document.createElement('button');
        addPointBtn.textContent = '+ Add Point';
        addPointBtn.className = 'add-content-btn';
        addPointBtn.style.cssText = 'margin-top: 10px; padding: 5px 10px; font-size: 12px; border: 2px solid var(--primary-color, #1976d2); color: var(--primary-color, #1976d2); background-color: transparent; border-radius: 4px; cursor: pointer; display: block; width: fit-content; margin-left: 0 !important; margin-right: auto !important; text-align: left !important; float: none !important; position: relative !important;';
        addPointBtn.addEventListener('click', () => addContentPoint(slideNumber - 1));

        contentContainer.appendChild(contentList);
        contentContainer.appendChild(addPointBtn);
    } else {
        const noContent = document.createElement('p');
        noContent.innerHTML = '<em>Click to add content</em>';
        noContent.contentEditable = true;
        noContent.addEventListener('focus', function() {
            if (this.textContent === 'Click to add content') {
                this.textContent = '';
            }
        });
        contentContainer.appendChild(noContent);

        // Add "Add Content Point" button for empty slides too
        const addPointBtn = document.createElement('button');
        addPointBtn.textContent = '+ Add Point';
        addPointBtn.className = 'add-content-btn';
        addPointBtn.style.cssText = 'margin-top: 10px; padding: 5px 10px; font-size: 12px; border: 2px solid var(--primary-color, #1976d2); color: var(--primary-color, #1976d2); background-color: transparent; border-radius: 4px; cursor: pointer; display: block; width: fit-content; margin-left: 0 !important; margin-right: auto !important; text-align: left !important; float: none !important; position: relative !important;';
        addPointBtn.addEventListener('click', () => addContentPoint(slideNumber - 1));
        contentContainer.appendChild(addPointBtn);
    }

    // Assemble the slide (controls are now above the slide)
    slideContent.appendChild(titleElement);
    slideContent.appendChild(contentContainer);

    // Create layout manager for all visual elements
    const layoutManager = createLayoutManager(slideContent);

    // Add advanced design elements with smart layout positioning
    if (slide.visualDesign && slide.visualDesign.designElements) {
        slide.visualDesign.designElements.forEach((element, index) => {
            const designElement = createAdvancedDesignElement(element, layoutManager, index);
            if (designElement) {
                // Add data attributes to track the element for persistence
                designElement.dataset.slideIndex = slideNumber - 1;
                designElement.dataset.elementIndex = index;
                designElement.dataset.elementType = 'designElement';
                slideContent.appendChild(designElement);
            }
        });
    }

    // Add background pattern if specified
    if (slide.visualDesign && slide.visualDesign.backgroundPattern) {
        slideContent.style.backgroundImage = createBackgroundPattern(slide.visualDesign.backgroundPattern);
        slideContent.style.backgroundSize = 'cover';
        slideContent.style.backgroundRepeat = 'repeat';
    }

    // Add chart if specified with smart layout positioning
    if (slide.visualDesign && slide.visualDesign.chartData) {
        const chartElement = createChartElement(slide.visualDesign.chartData, slideNumber, layoutManager);
        // Add data attributes to track the chart for persistence
        chartElement.dataset.slideIndex = slideNumber - 1;
        chartElement.dataset.elementType = 'chartData';
        slideContent.appendChild(chartElement);
    }

    // Keep legacy shapes support for backward compatibility with smart layout
    if (slide.visualDesign && slide.visualDesign.shapes) {
        slide.visualDesign.shapes.forEach((shape, index) => {
            const shapeElement = createVisualShape(shape, layoutManager);
            // Add data attributes to track the shape for persistence
            shapeElement.dataset.slideIndex = slideNumber - 1;
            shapeElement.dataset.elementIndex = index;
            shapeElement.dataset.elementType = 'legacyShape';
            slideContent.appendChild(shapeElement);
        });
    }

    // Add additional info sections
    if (slide.visualDesign && slide.visualDesign.imageDescription) {
        const imageInfo = document.createElement('div');
        imageInfo.style.cssText = 'margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 4px; font-size: 0.9em;';
        imageInfo.innerHTML = `<strong>⬜ Image:</strong> ${wrapTextInEditableSpan(slide.visualDesign.imageDescription, 'font-size: 0.9em;')}`;
        // Add data attributes to track the image description for persistence
        imageInfo.dataset.slideIndex = slideNumber - 1;
        imageInfo.dataset.elementType = 'imageDescription';
        slideContent.appendChild(makeElementEditable(imageInfo));
    }

    // Remove speaker notes from inside the slide - they'll be added separately below

    slideDiv.appendChild(slideContent);
    slideContainer.appendChild(slideDiv);

    // Create editable speaker notes section
    const notesSection = createEditableSpeakerNotes(slide, slideNumber - 1);
    slideContainer.appendChild(notesSection);

    return slideContainer;
}

// Helper functions for slide editing
function applySlideDesign(slideDiv, slide, slideNumber) {
    // Apply basic slide styling without colors (colors will be handled by theme)
    slideDiv.style.cssText = `
        padding: 20px;
        margin: 10px 0;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        transition: all 0.2s ease;
        min-height: 200px;
        position: relative;
    `;

    if (slide.visualDesign) {
        const design = slide.visualDesign;

        // Apply layout-specific styling only (no colors)
        switch (design.layout) {
            case 'center-text':
                slideDiv.style.textAlign = 'center';
                break;
            case 'right-text':
                slideDiv.style.textAlign = 'right';
                break;
            case 'full-width':
                slideDiv.style.maxWidth = '100%';
                slideDiv.style.padding = '30px';
                break;
            default: // 'left-text'
                slideDiv.style.textAlign = 'left';
        }

    } else {
        // Default layout if no design specified
        slideDiv.style.textAlign = 'left';
    }
}

function updateSlideData(slideIndex, field, value) {
    if (!slidesAppState.currentSlideData || !slidesAppState.currentSlideData.slides[slideIndex]) {
        return;
    }

    slidesAppState.currentSlideData.slides[slideIndex][field] = value;
    saveSlides();
    console.log(`Updated slide ${slideIndex + 1} ${field}:`, value);
}

function updateSlideContentItem(slideIndex, itemIndex, value) {
    if (!slidesAppState.currentSlideData || !slidesAppState.currentSlideData.slides[slideIndex] || !slidesAppState.currentSlideData.slides[slideIndex].content) {
        return;
    }

    slidesAppState.currentSlideData.slides[slideIndex].content[itemIndex] = value;
    saveSlides();
    console.log(`Updated slide ${slideIndex + 1} content item ${itemIndex + 1}:`, value);
}

// updateSlideColor function removed - theme is now applied globally

// Create visual shape elements
function createVisualShape(shape, layoutManager) {
    const shapeElement = document.createElement('div');
    shapeElement.style.position = 'absolute';

    // Set size
    const sizeMap = {
        'small': 30,
        'medium': 50,
        'large': 80
    };
    const sizeValue = sizeMap[shape.size] || sizeMap['medium'];
    const elementSize = { width: sizeValue, height: sizeValue };

    // Use layout manager for smart positioning
    const positionInfo = layoutManager ?
        layoutManager.getAvailablePosition(shape, shape.position || 'top-right', elementSize) :
        { position: 'top: 10px; right: 10px;', zIndex: 10 };

    // Apply positioning styles
    shapeElement.style.zIndex = positionInfo.zIndex;
    shapeElement.style.cssText += `; ${positionInfo.position}`;

    const size = `${sizeValue}px`;

    // Create shape based on type
    switch (shape.type) {
        case 'circle':
            shapeElement.style.width = size;
            shapeElement.style.height = size;
            shapeElement.style.borderRadius = '50%';
            shapeElement.style.background = shape.color;
            shapeElement.style.opacity = '0.8';
            break;

        case 'rectangle':
            shapeElement.style.width = size;
            shapeElement.style.height = `calc(${size} * 0.6)`;
            shapeElement.style.background = shape.color;
            shapeElement.style.opacity = '0.8';
            shapeElement.style.borderRadius = '4px';
            break;

        case 'triangle':
            shapeElement.style.width = '0';
            shapeElement.style.height = '0';
            const triangleSize = parseInt(size) / 2;
            shapeElement.style.borderLeft = `${triangleSize}px solid transparent`;
            shapeElement.style.borderRight = `${triangleSize}px solid transparent`;
            shapeElement.style.borderBottom = `${triangleSize}px solid ${shape.color}`;
            shapeElement.style.opacity = '0.8';
            break;

        case 'diamond':
            shapeElement.style.width = size;
            shapeElement.style.height = size;
            shapeElement.style.background = shape.color;
            shapeElement.style.transform += ' rotate(45deg)';
            shapeElement.style.opacity = '0.8';
            shapeElement.style.borderRadius = '8px';
            break;

        case 'arrow':
            // Create arrow using CSS
            shapeElement.innerHTML = `
                <div style="
                    width: 0; height: 0;
                    border-left: 15px solid ${shape.color};
                    border-top: 8px solid transparent;
                    border-bottom: 8px solid transparent;
                    opacity: 0.8;
                "></div>
            `;
            break;

        default:
            // Default to circle
            shapeElement.style.width = size;
            shapeElement.style.height = size;
            shapeElement.style.borderRadius = '50%';
            shapeElement.style.background = shape.color;
            shapeElement.style.opacity = '0.8';
    }

    return makeElementEditable(shapeElement);
}

// Smart Layout Manager for positioning design elements without overlap
function createLayoutManager(slideContainer) {
    const occupiedAreas = [];
    const slideRect = { width: 800, height: 600 }; // Approximate slide dimensions

    const layoutManager = {
        getAvailablePosition: function(element, preferredPosition, elementSize) {
            const positions = this.getPositionVariations(preferredPosition);

            for (const position of positions) {
                const rect = this.getElementRect(position, elementSize);
                if (!this.hasOverlap(rect)) {
                    this.occupyArea(rect, element.type);
                    return { position, zIndex: 10 + occupiedAreas.length };
                }
            }

            // Fallback: stack with increased z-index and slight offset
            const fallbackRect = this.getElementRect(preferredPosition, elementSize);
            const offset = occupiedAreas.length * 20;
            fallbackRect.left += offset;
            fallbackRect.top += offset;
            this.occupyArea(fallbackRect, element.type);

            return {
                position: this.rectToPosition(fallbackRect),
                zIndex: 20 + occupiedAreas.length
            };
        },

        getPositionVariations: function(preferred) {
            const variations = {
                'top-left': ['top-left', 'top-center', 'center-left', 'top-right'],
                'top-right': ['top-right', 'top-center', 'center-right', 'top-left'],
                'center-right': ['center-right', 'bottom-right', 'top-right', 'center-left'],
                'center-left': ['center-left', 'bottom-left', 'top-left', 'center-right'],
                'bottom-right': ['bottom-right', 'bottom-center', 'center-right', 'bottom-left'],
                'bottom-left': ['bottom-left', 'bottom-center', 'center-left', 'bottom-right'],
                'bottom-center': ['bottom-center', 'bottom-left', 'bottom-right', 'center'],
                'top-center': ['top-center', 'top-left', 'top-right', 'center'],
                'center': ['center', 'center-left', 'center-right', 'top-center']
            };
            return variations[preferred] || [preferred, 'center', 'center-right', 'bottom-right'];
        },

        getElementRect: function(position, size) {
            const padding = 20;
            const width = size.width || 200;
            const height = size.height || 150;

            const positions = {
                'top-left': { left: padding, top: padding },
                'top-right': { left: slideRect.width - width - padding, top: padding },
                'top-center': { left: (slideRect.width - width) / 2, top: padding },
                'center-left': { left: padding, top: (slideRect.height - height) / 2 },
                'center-right': { left: slideRect.width - width - padding, top: (slideRect.height - height) / 2 },
                'center': { left: (slideRect.width - width) / 2, top: (slideRect.height - height) / 2 },
                'bottom-left': { left: padding, top: slideRect.height - height - padding },
                'bottom-right': { left: slideRect.width - width - padding, top: slideRect.height - height - padding },
                'bottom-center': { left: (slideRect.width - width) / 2, top: slideRect.height - height - padding }
            };

            const pos = positions[position] || positions['center'];
            return { ...pos, width, height };
        },

        hasOverlap: function(rect) {
            return occupiedAreas.some(occupied =>
                !(rect.left + rect.width < occupied.left ||
                  occupied.left + occupied.width < rect.left ||
                  rect.top + rect.height < occupied.top ||
                  occupied.top + occupied.height < rect.top)
            );
        },

        occupyArea: function(rect, type) {
            occupiedAreas.push({ ...rect, type });
        },

        rectToPosition: function(rect) {
            return `left: ${rect.left}px; top: ${rect.top}px;`;
        }
    };

    return layoutManager;
}

// Advanced visual design element creation functions
function createAdvancedDesignElement(element, layoutManager, index) {
    switch (element.type) {
        case 'gradient-card':
            return createGradientCard(element, layoutManager);
        case 'progress-bar':
            return createProgressBar(element, layoutManager);
        case 'icon-set':
            return createIconSet(element, layoutManager);
        case 'stat-counter':
            return createStatCounter(element, layoutManager);
        case 'timeline-point':
            return createTimelinePoint(element, layoutManager);
        case 'geometric-accent':
            return createGeometricAccent(element, layoutManager);
        case 'quote-block':
            return createQuoteBlock(element, layoutManager);
        case 'feature-grid':
            return createFeatureGrid(element, layoutManager);
        case 'organic-shape':
            return createOrganicShape(element, layoutManager);
        case 'polyline-accent':
            return createPolylineAccent(element, layoutManager);
        case 'topic-visualization':
            return createTopicVisualization(element, layoutManager);
        case 'contextual-metaphor':
            return createContextualMetaphor(element, layoutManager);
        default:
            console.warn(`Unknown design element type: ${element.type}`);
            return null;
    }
}

function createGradientCard(element, layoutManager) {
    const card = document.createElement('div');
    card.className = 'gradient-card';

    const gradient = element.colors.length >= 2 ?
        `linear-gradient(135deg, ${element.colors[0]}, ${element.colors[1]})` :
        element.colors[0];

    const sizeClasses = {
        small: { width: '200px', height: '100px', padding: '15px' },
        medium: { width: '250px', height: '120px', padding: '20px' },
        large: { width: '300px', height: '150px', padding: '25px' },
        'full-width': { width: '100%', height: '120px', padding: '20px' }
    };

    const size = sizeClasses[element.size] || sizeClasses.medium;

    // Use layout manager for smart positioning
    const elementSize = { width: parseInt(size.width) || 250, height: parseInt(size.height) || 120 };
    const positionInfo = layoutManager ?
        layoutManager.getAvailablePosition(element, element.position, elementSize) :
        { position: getPositionStyles(element.position), zIndex: 10 };

    card.style.cssText = `
        background: ${gradient};
        color: white;
        border-radius: 12px;
        padding: ${size.padding};
        width: ${size.width};
        height: ${size.height};
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-weight: 600;
        font-size: 16px;
        line-height: 1.4;
        position: absolute;
        z-index: ${positionInfo.zIndex};
        backdrop-filter: blur(10px);
        ${positionInfo.position}
    `;

    card.innerHTML = wrapTextInEditableSpan(element.content || 'Key Concept', 'color: white; font-weight: 600; font-size: 16px; line-height: 1.4;');
    return makeElementEditable(card);
}

function createProgressBar(element, layoutManager) {
    const container = document.createElement('div');
    container.className = 'progress-bar-container';

    const value = Math.max(0, Math.min(100, element.value || 50));

    // Use layout manager for smart positioning
    const elementSize = { width: 250, height: 60 };
    const positionInfo = layoutManager ?
        layoutManager.getAvailablePosition(element, element.position, elementSize) :
        { position: getPositionStyles(element.position), zIndex: 10 };

    container.style.cssText = `
        width: ${elementSize.width}px;
        position: absolute;
        z-index: ${positionInfo.zIndex};
        ${positionInfo.position}
    `;

    container.innerHTML = `
        <div style="margin-bottom: 8px; font-size: 14px; font-weight: 500; color: inherit;">
            ${wrapTextInEditableSpan(element.label || 'Progress', 'font-size: 14px; font-weight: 500;')}: ${value}%
        </div>
        <div style="width: 100%; height: 20px; background: rgba(255, 255, 255, 0.2); border-radius: 10px; overflow: hidden;">
            <div style="width: ${value}%; height: 100%; background: ${element.color || '#3b82f6'}; border-radius: 10px; transition: width 0.8s ease;"></div>
        </div>
    `;

    return makeElementEditable(container);
}

function createIconSet(element, layoutManager) {
    const container = document.createElement('div');
    container.className = 'icon-set';

    const layout = element.layout === 'vertical' ? 'flex-direction: column;' : 'flex-direction: row;';

    // Use layout manager for smart positioning
    const isVertical = element.layout === 'vertical';
    const elementSize = isVertical ? { width: 80, height: 200 } : { width: 200, height: 80 };
    const positionInfo = layoutManager ?
        layoutManager.getAvailablePosition(element, element.position, elementSize) :
        { position: getPositionStyles(element.position), zIndex: 10 };

    container.style.cssText = `
        display: flex;
        gap: 15px;
        align-items: center;
        justify-content: center;
        position: absolute;
        z-index: ${positionInfo.zIndex};
        ${layout}
        ${positionInfo.position}
    `;

    // Create simple icon representations
    const iconMap = {
        lightbulb: '💡',
        target: '🎯',
        growth: '📈',
        shield: '🛡️',
        rocket: '🚀',
        gear: '⚙️',
        star: '⭐',
        check: '✓',
        heart: '❤️',
        trophy: '🏆'
    };

    (element.icons || ['lightbulb', 'target', 'growth']).forEach(iconName => {
        const icon = document.createElement('div');
        icon.style.cssText = `
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            backdrop-filter: blur(5px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;
        icon.textContent = iconMap[iconName] || '🔵';
        container.appendChild(icon);
    });

    return makeElementEditable(container);
}

function createStatCounter(element, layoutManager) {
    const container = document.createElement('div');
    container.className = 'stat-counter';

    // Use layout manager for smart positioning
    const elementSize = { width: 120, height: 100 };
    const positionInfo = layoutManager ?
        layoutManager.getAvailablePosition(element, element.position, elementSize) :
        { position: getPositionStyles(element.position), zIndex: 10 };

    container.style.cssText = `
        text-align: center;
        position: absolute;
        z-index: ${positionInfo.zIndex};
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        padding: 20px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        ${positionInfo.position}
    `;

    container.innerHTML = `
        <div style="font-size: 36px; font-weight: bold; color: inherit; margin-bottom: 8px;">
            ${wrapTextInEditableSpan(element.value || '0', 'font-size: 36px; font-weight: bold; margin-bottom: 8px;')}
        </div>
        <div style="font-size: 14px; opacity: 0.8; color: inherit;">
            ${wrapTextInEditableSpan(element.label || 'Statistic', 'font-size: 14px; opacity: 0.8;')}
        </div>
    `;

    return makeElementEditable(container);
}

function createChartElement(chartData, slideId, layoutManager) {
    const container = document.createElement('div');
    const canvasId = `chart-${slideId}-${Date.now()}`;

    // Use layout manager for smart positioning
    const elementSize = { width: 400, height: 250 };
    const positionInfo = layoutManager ?
        layoutManager.getAvailablePosition({ position: 'center-right' }, 'center-right', elementSize) :
        { position: 'top: 50%; right: 20px; transform: translateY(-50%);', zIndex: 10 };

    container.style.cssText = `
        width: ${elementSize.width}px;
        height: ${elementSize.height}px;
        position: absolute;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        z-index: ${positionInfo.zIndex};
        ${positionInfo.position}
    `;

    const canvas = document.createElement('canvas');
    canvas.id = canvasId;
    container.appendChild(canvas);

    // Initialize chart after a delay to ensure canvas is in DOM
    setTimeout(() => {
        if (window.Chart && document.getElementById(canvasId)) {
            new Chart(canvas, {
                type: chartData.type || 'bar',
                data: {
                    labels: chartData.labels || ['A', 'B', 'C', 'D'],
                    datasets: [{
                        data: chartData.data || [10, 20, 30, 40],
                        backgroundColor: chartData.colors || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
                        borderRadius: 6,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { display: chartData.type !== 'pie' && chartData.type !== 'doughnut' }
                    }
                }
            });
        }
    }, 100);

    return makeElementEditable(container);
}

function createBackgroundPattern(patternType) {
    const patterns = {
        'subtle-dots': 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
        'diagonal-lines': 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)',
        'geometric-pattern': 'conic-gradient(from 45deg, transparent, rgba(255,255,255,0.05), transparent)',
        'gradient-mesh': 'radial-gradient(ellipse at top left, rgba(255,255,255,0.1), transparent), radial-gradient(ellipse at bottom right, rgba(255,255,255,0.05), transparent)',
        'circuit-board': 'linear-gradient(90deg, rgba(255,255,255,0.03) 50%, transparent 50%), linear-gradient(rgba(255,255,255,0.03) 50%, transparent 50%)'
    };

    return patterns[patternType] || patterns['subtle-dots'];
}

function getPositionStyles(position) {
    const positions = {
        'top-left': 'top: 20px; left: 20px;',
        'top-right': 'top: 20px; right: 20px;',
        'top-center': 'top: 20px; left: 50%; transform: translateX(-50%);',
        'center-left': 'top: 50%; left: 20px; transform: translateY(-50%);',
        'center-right': 'top: 50%; right: 20px; transform: translateY(-50%);',
        'center': 'top: 50%; left: 50%; transform: translate(-50%, -50%);',
        'bottom-left': 'bottom: 20px; left: 20px;',
        'bottom-right': 'bottom: 20px; right: 20px;',
        'bottom-center': 'bottom: 20px; left: 50%; transform: translateX(-50%);'
    };

    return positions[position] || positions['top-right'];
}

// New organic design element functions
function createOrganicShape(element, layoutManager) {
    const container = document.createElement('div');
    container.className = 'organic-shape';

    const colors = Array.isArray(element.colors) ? element.colors : [element.colors];
    const primaryColor = colors[0] || '#3b82f6';
    const secondaryColor = colors[1] || colors[0] || '#1d4ed8';

    const shapeTypes = {
        'flowing-curve': createFlowingCurve,
        'wave-pattern': createWavePattern,
        'organic-blob': createOrganicBlob,
        'spiral-flow': createSpiralFlow,
        'leaf-shape': createLeafShape,
        'water-ripple': createWaterRipple
    };

    const shapeCreator = shapeTypes[element.shape] || shapeTypes['flowing-curve'];
    const svgContent = shapeCreator(primaryColor, secondaryColor);

    // Use layout manager for smart positioning
    const elementSize = { width: 200, height: 150 };
    const positionInfo = layoutManager ?
        layoutManager.getAvailablePosition(element, element.position, elementSize) :
        { position: getPositionStyles(element.position), zIndex: 5 };

    container.style.cssText = `
        position: absolute;
        z-index: ${positionInfo.zIndex};
        width: ${elementSize.width}px;
        height: ${elementSize.height}px;
        ${positionInfo.position}
    `;

    container.innerHTML = `
        <div style="position: relative; width: 100%; height: 100%;">
            ${svgContent}
            ${element.content ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-weight: 600; text-align: center; font-size: 14px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${wrapTextInEditableSpan(element.content, 'color: white; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.3);')}</div>` : ''}
        </div>
    `;

    return makeElementEditable(container);
}

function createFlowingCurve(color1, color2) {
    return `<svg viewBox="0 0 200 150" style="width: 100%; height: 100%;">
        <defs>
            <linearGradient id="flowingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${color1};stop-opacity:0.8" />
                <stop offset="100%" style="stop-color:${color2};stop-opacity:0.6" />
            </linearGradient>
        </defs>
        <path d="M20,80 Q60,20 120,50 T180,80 Q160,120 100,100 T20,80 Z"
              fill="url(#flowingGrad)"
              style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));" />
    </svg>`;
}

function createWavePattern(color1, color2) {
    return `<svg viewBox="0 0 200 150" style="width: 100%; height: 100%;">
        <defs>
            <linearGradient id="waveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:${color1};stop-opacity:0.8" />
                <stop offset="100%" style="stop-color:${color2};stop-opacity:0.4" />
            </linearGradient>
        </defs>
        <path d="M0,75 Q50,25 100,75 T200,75 L200,150 L0,150 Z"
              fill="url(#waveGrad)" />
    </svg>`;
}

function createOrganicBlob(color1, color2) {
    return `<svg viewBox="0 0 200 150" style="width: 100%; height: 100%;">
        <defs>
            <radialGradient id="blobGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:${color1};stop-opacity:0.9" />
                <stop offset="100%" style="stop-color:${color2};stop-opacity:0.5" />
            </radialGradient>
        </defs>
        <path d="M100,20 C140,20 180,40 180,75 C180,110 140,130 100,130 C60,130 20,110 20,75 C20,40 60,20 100,20 Z"
              fill="url(#blobGrad)"
              style="filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));" />
    </svg>`;
}

function createSpiralFlow(color1, color2) {
    return `<svg viewBox="0 0 200 150" style="width: 100%; height: 100%;">
        <defs>
            <linearGradient id="spiralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${color1};stop-opacity:0.9" />
                <stop offset="100%" style="stop-color:${color2};stop-opacity:0.4" />
            </linearGradient>
        </defs>
        <path d="M100,75 Q120,60 130,80 Q120,100 100,90 Q80,80 90,70 Q110,65 120,75 Q115,85 105,80"
              stroke="url(#spiralGrad)"
              stroke-width="8"
              fill="none"
              stroke-linecap="round" />
    </svg>`;
}

function createLeafShape(color1, color2) {
    return `<svg viewBox="0 0 200 150" style="width: 100%; height: 100%;">
        <defs>
            <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${color1};stop-opacity:0.8" />
                <stop offset="100%" style="stop-color:${color2};stop-opacity:0.6" />
            </linearGradient>
        </defs>
        <path d="M100,20 Q140,40 160,75 Q140,110 100,130 Q80,110 60,75 Q80,40 100,20 Z"
              fill="url(#leafGrad)"
              style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));" />
        <path d="M100,20 Q120,50 140,75 Q120,100 100,130"
              stroke="${color1}"
              stroke-width="2"
              fill="none"
              opacity="0.7" />
    </svg>`;
}

function createWaterRipple(color1, color2) {
    return `<svg viewBox="0 0 200 150" style="width: 100%; height: 100%;">
        <defs>
            <radialGradient id="rippleGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:${color1};stop-opacity:0.1" />
                <stop offset="30%" style="stop-color:${color1};stop-opacity:0.6" />
                <stop offset="60%" style="stop-color:${color2};stop-opacity:0.4" />
                <stop offset="100%" style="stop-color:${color2};stop-opacity:0.1" />
            </radialGradient>
        </defs>
        <circle cx="100" cy="75" r="70" fill="url(#rippleGrad)" />
        <circle cx="100" cy="75" r="50" fill="none" stroke="${color1}" stroke-width="2" opacity="0.6" />
        <circle cx="100" cy="75" r="30" fill="none" stroke="${color2}" stroke-width="2" opacity="0.4" />
        <circle cx="100" cy="75" r="10" fill="none" stroke="${color1}" stroke-width="2" opacity="0.8" />
    </svg>`;
}

function createPolylineAccent(element, layoutManager) {
    const container = document.createElement('div');
    container.className = 'polyline-accent';

    const color = element.colors[0] || '#3b82f6';
    const style = element.style || 'organic-flow';

    const polylineTypes = {
        'curved-connector': createCurvedConnector,
        'flowing-path': createFlowingPath,
        'organic-network': createOrganicNetwork,
        'branching-lines': createBranchingLines
    };

    const polylineCreator = polylineTypes[style] || polylineTypes['flowing-path'];
    const svgContent = polylineCreator(color);

    // Use layout manager for smart positioning
    const elementSize = { width: 300, height: 100 };
    const positionInfo = layoutManager ?
        layoutManager.getAvailablePosition(element, element.position, elementSize) :
        { position: getPositionStyles(element.position), zIndex: 3 };

    container.style.cssText = `
        position: absolute;
        z-index: ${positionInfo.zIndex};
        width: ${elementSize.width}px;
        height: ${elementSize.height}px;
        ${positionInfo.position}
    `;

    // Create a wrapper for the SVG content with pointer-events: none to avoid interference
    const svgWrapper = document.createElement('div');
    svgWrapper.style.cssText = 'pointer-events: none; width: 100%; height: 100%;';
    svgWrapper.innerHTML = svgContent;
    container.appendChild(svgWrapper);

    return makeElementEditable(container);
}

function createFlowingPath(color) {
    return `<svg viewBox="0 0 300 100" style="width: 100%; height: 100%;">
        <defs>
            <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:${color};stop-opacity:0.8" />
                <stop offset="50%" style="stop-color:${color};stop-opacity:0.4" />
                <stop offset="100%" style="stop-color:${color};stop-opacity:0.1" />
            </linearGradient>
        </defs>
        <path d="M10,50 Q80,20 150,50 T290,50"
              stroke="url(#pathGrad)"
              stroke-width="3"
              fill="none"
              stroke-linecap="round" />
        <circle cx="10" cy="50" r="4" fill="${color}" opacity="0.8" />
        <circle cx="290" cy="50" r="4" fill="${color}" opacity="0.3" />
    </svg>`;
}

function createCurvedConnector(color) {
    return `<svg viewBox="0 0 300 100" style="width: 100%; height: 100%;">
        <defs>
            <linearGradient id="connectorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:${color};stop-opacity:0.8" />
                <stop offset="100%" style="stop-color:${color};stop-opacity:0.3" />
            </linearGradient>
        </defs>
        <path d="M20,50 C80,20 120,80 180,50 S240,20 280,50"
              stroke="url(#connectorGrad)"
              stroke-width="4"
              fill="none"
              stroke-linecap="round" />
    </svg>`;
}

function createOrganicNetwork(color) {
    return `<svg viewBox="0 0 300 100" style="width: 100%; height: 100%;">
        <defs>
            <radialGradient id="networkGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:${color};stop-opacity:0.8" />
                <stop offset="100%" style="stop-color:${color};stop-opacity:0.2" />
            </radialGradient>
        </defs>
        <path d="M50,30 Q100,50 150,30 T250,30"
              stroke="${color}"
              stroke-width="2"
              fill="none"
              opacity="0.6" />
        <path d="M50,50 Q150,70 250,50"
              stroke="${color}"
              stroke-width="2"
              fill="none"
              opacity="0.5" />
        <path d="M50,70 Q100,50 150,70 T250,70"
              stroke="${color}"
              stroke-width="2"
              fill="none"
              opacity="0.4" />
        <circle cx="50" cy="50" r="6" fill="url(#networkGrad)" />
        <circle cx="150" cy="50" r="6" fill="url(#networkGrad)" />
        <circle cx="250" cy="50" r="6" fill="url(#networkGrad)" />
    </svg>`;
}

function createBranchingLines(color) {
    return `<svg viewBox="0 0 300 100" style="width: 100%; height: 100%;">
        <defs>
            <linearGradient id="branchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:${color};stop-opacity:0.9" />
                <stop offset="100%" style="stop-color:${color};stop-opacity:0.3" />
            </linearGradient>
        </defs>
        <path d="M50,50 Q100,50 150,50"
              stroke="url(#branchGrad)"
              stroke-width="4"
              fill="none" />
        <path d="M150,50 Q200,30 250,20"
              stroke="url(#branchGrad)"
              stroke-width="3"
              fill="none" />
        <path d="M150,50 Q200,50 250,50"
              stroke="url(#branchGrad)"
              stroke-width="3"
              fill="none" />
        <path d="M150,50 Q200,70 250,80"
              stroke="url(#branchGrad)"
              stroke-width="3"
              fill="none" />
        <circle cx="50" cy="50" r="4" fill="${color}" opacity="0.8" />
        <circle cx="150" cy="50" r="4" fill="${color}" opacity="0.6" />
    </svg>`;
}

function createTopicVisualization(element, layoutManager) {
    const container = document.createElement('div');
    container.className = 'topic-visualization';

    const colors = element.colors || ['#3b82f6', '#1d4ed8'];

    // Use layout manager for smart positioning
    const elementSize = { width: 200, height: 120 };
    const positionInfo = layoutManager ?
        layoutManager.getAvailablePosition(element, element.position, elementSize) :
        { position: getPositionStyles(element.position), zIndex: 8 };

    container.style.cssText = `
        position: absolute;
        z-index: ${positionInfo.zIndex};
        background: rgba(255, 255, 255, 0.95);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        min-width: ${elementSize.width}px;
        ${positionInfo.position}
    `;

    container.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 32px; margin-bottom: 8px;">${getTopicIcon(element.visualType)}</div>
            <div style="font-weight: 600; color: ${colors[0]}; font-size: 14px; line-height: 1.4;">
                ${wrapTextInEditableSpan(element.description || 'Topic Concept', `font-weight: 600; color: ${colors[0]}; font-size: 14px; line-height: 1.4;`)}
            </div>
        </div>
    `;

    return makeElementEditable(container);
}

function getTopicIcon(visualType) {
    const icons = {
        'business': '📊',
        'education': '📚',
        'technology': '⚡',
        'creative': '🎨',
        'health': '🌱',
        'finance': '💰',
        'science': '🔬',
        'communication': '💬',
        'default': '✨'
    };

    return icons[visualType] || icons.default;
}

function createContextualMetaphor(element, layoutManager) {
    const container = document.createElement('div');
    container.className = 'contextual-metaphor';

    const colors = element.colors || ['#3b82f6', '#1d4ed8'];

    // Use layout manager for smart positioning
    const elementSize = { width: 150, height: 100 };
    const positionInfo = layoutManager ?
        layoutManager.getAvailablePosition(element, element.position, elementSize) :
        { position: getPositionStyles(element.position), zIndex: 6 };

    container.style.cssText = `
        position: absolute;
        z-index: ${positionInfo.zIndex};
        background: linear-gradient(135deg, ${colors[0]}20, ${colors[1] || colors[0]}10);
        border-radius: 20px;
        padding: 16px;
        backdrop-filter: blur(8px);
        border: 1px solid ${colors[0]}40;
        min-width: ${elementSize.width}px;
        ${positionInfo.position}
    `;

    const metaphorContent = getMetaphorContent(element.metaphor || 'growth');

    container.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 28px; margin-bottom: 6px;">${metaphorContent.icon}</div>
            <div style="font-weight: 500; color: ${colors[0]}; font-size: 12px; line-height: 1.3;">
                ${wrapTextInEditableSpan(element.content || metaphorContent.text, `font-weight: 500; color: ${colors[0]}; font-size: 12px; line-height: 1.3;`)}
            </div>
        </div>
    `;

    return makeElementEditable(container);
}

function getMetaphorContent(type) {
    const metaphors = {
        'growth': { icon: '🌱', text: 'Growing Forward' },
        'connection': { icon: '🔗', text: 'Building Bridges' },
        'innovation': { icon: '💡', text: 'Spark of Ideas' },
        'journey': { icon: '🛤️', text: 'Path to Success' },
        'transformation': { icon: '🦋', text: 'Metamorphosis' },
        'foundation': { icon: '🏗️', text: 'Strong Base' },
        'exploration': { icon: '🧭', text: 'Navigate Forward' },
        'collaboration': { icon: '🤝', text: 'Unity in Action' }
    };

    return metaphors[type] || metaphors.growth;
}

// Helper functions for editable visual elements
function makeElementEditable(element) {
    // Don't make core slide elements deletable
    if (element.classList.contains('slide-title-editable') ||
        element.classList.contains('slide-content-item-editable') ||
        element.classList.contains('slide-content-editable') ||
        element.classList.contains('slide-preview')) {
        return element;
    }

    // Add visual-element class for styling
    element.classList.add('visual-element');

    // Add hover functionality for showing/hiding delete button
    element.addEventListener('mouseenter', () => {
        const deleteBtn = element.querySelector('.delete-element-btn');
        if (deleteBtn) {
            deleteBtn.style.display = 'block';
        }
    });

    element.addEventListener('mouseleave', () => {
        const deleteBtn = element.querySelector('.delete-element-btn');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }
    });

    // Add delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button'; // Explicitly set button type
    deleteBtn.className = 'delete-element-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Delete element';
    deleteBtn.contentEditable = false; // Prevent content editable interference
    // Set button styles and hide by default
    deleteBtn.style.cssText = `
        display: none;
        position: absolute;
        top: 8px;
        right: 8px;
        width: 20px;
        height: 20px;
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 11px;
        font-weight: bold;
        z-index: 1001;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        transition: all 0.2s ease;
        line-height: 18px;
        text-align: center;
        font-family: Arial, sans-serif;
        pointer-events: auto;
    `;
    deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Remove from persistence before removing from DOM
        removeElementFromPersistence(element);
        element.remove();
        // Save slides state after deletion
        if (window.stateModule && window.stateModule.saveState) {
            window.stateModule.saveState();
        }
    });
    deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.background = '#c0392b';
        deleteBtn.style.transform = 'scale(1.1)';
    });
    deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.background = '#e74c3c';
        deleteBtn.style.transform = 'scale(1)';
    });
    element.appendChild(deleteBtn);

    // Make text content editable
    makeTextContentEditable(element);

    return element;
}

function makeTextContentEditable(element) {
    // Find text nodes and make them editable
    const textElements = element.querySelectorAll('[style*="color"], div, span');

    textElements.forEach(textEl => {
        const text = textEl.textContent.trim();
        // Only make elements with significant text content editable
        if (text && text.length > 2 && !textEl.querySelector('svg') && !textEl.classList.contains('delete-element-btn')) {
            textEl.classList.add('editable-text');
            textEl.contentEditable = true;
            textEl.addEventListener('input', () => {
                // Save state when text is edited
                if (window.stateModule && window.stateModule.saveState) {
                    window.stateModule.saveState();
                }
            });
            textEl.addEventListener('blur', () => {
                // Clean up any empty elements
                if (!textEl.textContent.trim()) {
                    textEl.textContent = 'Click to edit';
                }
            });
        }
    });
}

function wrapTextInEditableSpan(text, styles = '') {
    return `<span class="editable-text" contenteditable="true" style="${styles}">${text}</span>`;
}

function removeElementFromPersistence(element) {
    if (!slidesAppState.currentSlideData || !element.dataset.slideIndex) {
        return;
    }

    const slideIndex = parseInt(element.dataset.slideIndex);
    const elementType = element.dataset.elementType;
    const elementIndex = element.dataset.elementIndex ? parseInt(element.dataset.elementIndex) : null;

    const slide = slidesAppState.currentSlideData.slides[slideIndex];
    if (!slide || !slide.visualDesign) {
        return;
    }

    try {
        switch (elementType) {
            case 'designElement':
                if (slide.visualDesign.designElements && elementIndex !== null) {
                    slide.visualDesign.designElements.splice(elementIndex, 1);
                    console.log(`Removed design element ${elementIndex} from slide ${slideIndex}`);
                }
                break;

            case 'chartData':
                delete slide.visualDesign.chartData;
                console.log(`Removed chart data from slide ${slideIndex}`);
                break;

            case 'legacyShape':
                if (slide.visualDesign.shapes && elementIndex !== null) {
                    slide.visualDesign.shapes.splice(elementIndex, 1);
                    console.log(`Removed legacy shape ${elementIndex} from slide ${slideIndex}`);
                }
                break;

            case 'imageDescription':
                delete slide.visualDesign.imageDescription;
                console.log(`Removed image description from slide ${slideIndex}`);
                break;

            default:
                console.warn(`Unknown element type for persistence: ${elementType}`);
        }

        // Update the element indices for remaining elements of the same type
        updateElementIndicesAfterDeletion(slideIndex, elementType, elementIndex);

        // Save the updated slide data
        saveSlides();

    } catch (error) {
        console.error('Error removing element from persistence:', error);
    }
}

function updateElementIndicesAfterDeletion(slideIndex, elementType, deletedIndex) {
    if (deletedIndex === null) return;

    // Update data attributes for remaining elements of the same type
    const slideContainer = document.querySelector(`[data-slide-index="${slideIndex}"]`);
    if (!slideContainer) return;

    const elements = slideContainer.querySelectorAll(`[data-element-type="${elementType}"]`);
    elements.forEach(el => {
        const currentIndex = parseInt(el.dataset.elementIndex);
        if (currentIndex > deletedIndex) {
            el.dataset.elementIndex = (currentIndex - 1).toString();
        }
    });
}

function makeContentItemEditable(listItem, slideIndex, itemIndex) {
    // Add visual-element class for consistent styling
    listItem.classList.add('visual-element');

    // Add hover functionality for showing/hiding delete button
    listItem.addEventListener('mouseenter', () => {
        const deleteBtn = listItem.querySelector('.delete-element-btn');
        if (deleteBtn) {
            deleteBtn.style.display = 'block';
        }
    });

    listItem.addEventListener('mouseleave', () => {
        const deleteBtn = listItem.querySelector('.delete-element-btn');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }
    });

    // Add delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button'; // Explicitly set button type
    deleteBtn.className = 'delete-element-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Delete content item';
    deleteBtn.contentEditable = false; // Prevent content editable interference
    // Set button styles and hide by default
    deleteBtn.style.cssText = `
        display: none;
        position: absolute;
        top: 8px;
        right: 8px;
        width: 20px;
        height: 20px;
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 11px;
        font-weight: bold;
        z-index: 1001;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        transition: all 0.2s ease;
        line-height: 18px;
        text-align: center;
        font-family: Arial, sans-serif;
        pointer-events: auto;
    `;
    deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeContentItem(slideIndex, itemIndex);
    });
    deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.background = '#c0392b';
        deleteBtn.style.transform = 'scale(1.1)';
    });
    deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.background = '#e74c3c';
        deleteBtn.style.transform = 'scale(1)';
    });

    // Make the list item position relative so the absolute delete button positions correctly
    listItem.style.position = 'relative';

    listItem.appendChild(deleteBtn);
}

function createColorSchemeSelector() {
    // Check if selector already exists
    let existingSelector = document.getElementById('color-scheme-selector');
    if (existingSelector) {
        return existingSelector;
    }

    const selectorContainer = document.createElement('div');
    selectorContainer.id = 'color-scheme-selector';
    selectorContainer.style.cssText = `
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 20px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    `;

    const title = document.createElement('h3');
    title.textContent = 'Color Schemes';
    title.style.cssText = `
        margin: 0 0 10px 0;
        font-size: 14px;
        font-weight: 600;
        color: #374151;
    `;

    const schemesGrid = document.createElement('div');
    schemesGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 10px;
    `;

    // Create color scheme tiles
    Object.entries(COLOR_THEMES).forEach(([key, theme]) => {
        const tile = document.createElement('div');
        tile.className = 'color-scheme-tile';
        tile.dataset.themeKey = key;
        tile.title = theme.name;
        tile.style.cssText = `
            height: 60px;
            border-radius: 6px;
            cursor: pointer;
            border: 3px solid transparent;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        `;

        // Create 3-color layout showing dark, border, and light colors
        tile.innerHTML = `
            <div style="display: flex; height: 100%; border-radius: 3px; overflow: hidden; position: relative;">
                <div style="flex: 1; background-color: ${theme.textColor};" title="Text Color"></div>
                <div style="flex: 1; background-color: ${theme.borderColor};" title="Border Color"></div>
                <div style="flex: 1; background-color: ${theme.fillColor};" title="Fill Color"></div>
                <div class="edit-theme-btn" style="position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; background: rgba(255,255,255,0.9); border-radius: 50%; display: none; align-items: center; justify-content: center; cursor: pointer; font-size: 12px; color: #666; border: 1px solid #ddd;" title="Edit Colors">✎</div>
            </div>
        `;

        // Add theme name label
        const label = document.createElement('div');
        label.textContent = theme.name;
        label.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.95);
            color: ${theme.textColor};
            font-size: 10px;
            font-weight: 600;
            text-align: center;
            padding: 4px 2px;
            line-height: 1;
            backdrop-filter: blur(2px);
        `;

        tile.appendChild(label);

        // Add click handler
        tile.addEventListener('click', () => {
            // Remove active state from all tiles
            document.querySelectorAll('.color-scheme-tile').forEach(t => {
                t.style.border = '3px solid transparent';
            });

            // Add active state to clicked tile
            tile.style.border = `3px solid ${theme.borderColor}`;

            // Apply the theme
            applyColorScheme(key, theme);
        });

        // Add edit button functionality
        const editBtn = tile.querySelector('.edit-theme-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent tile selection
            openColorEditor(key, theme);
        });

        // Add hover effect
        tile.addEventListener('mouseenter', () => {
            editBtn.style.display = 'flex';
            if (!tile.style.border.includes(theme.borderColor)) {
                tile.style.transform = 'scale(1.05)';
                tile.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
            }
        });

        tile.addEventListener('mouseleave', () => {
            editBtn.style.display = 'none';
            if (!tile.style.border.includes(theme.borderColor)) {
                tile.style.transform = 'scale(1)';
                tile.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            }
        });

        schemesGrid.appendChild(tile);
    });

    selectorContainer.appendChild(title);
    selectorContainer.appendChild(schemesGrid);

    return selectorContainer;
}

function showPresentationSection() {
    slidesDom.presentationSection.style.display = 'block';

    // Add color scheme selector if it doesn't exist
    let colorSelector = document.getElementById('color-scheme-selector');
    if (!colorSelector) {
        colorSelector = createColorSchemeSelector();
        // Insert at the very beginning of the presentation section
        if (slidesDom.presentationSection) {
            slidesDom.presentationSection.insertBefore(colorSelector, slidesDom.presentationSection.firstChild);
        }

        // Restore selection if there's a saved theme
        if (slidesAppState.currentTheme) {
            restoreColorSchemeSelection();
        }
    }

    slidesDom.presentationSection.scrollIntoView({ behavior: 'smooth' });
}

function applyColorScheme(themeKey, theme) {
    // Store the selected theme
    slidesAppState.currentTheme = { key: themeKey, ...theme };

    // Save to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(slidesAppState.currentTheme));

    // Apply theme to all slides
    applyThemeToSlides();

    console.log(`Applied color scheme: ${theme.name}`);
}

function restoreColorSchemeSelection() {
    if (!slidesAppState.currentTheme || !slidesAppState.currentTheme.key) return;

    // Wait a bit for the selector to be created
    setTimeout(() => {
        const activeThemeKey = slidesAppState.currentTheme.key;
        const activeTile = document.querySelector(`[data-theme-key="${activeThemeKey}"]`);

        if (activeTile) {
            // Remove active state from all tiles
            document.querySelectorAll('.color-scheme-tile').forEach(tile => {
                tile.style.border = '3px solid transparent';
            });

            // Add active state to the saved theme tile
            const theme = COLOR_THEMES[activeThemeKey];
            if (theme) {
                activeTile.style.border = `3px solid ${theme.borderColor}`;
                console.log(`Restored color scheme selection: ${theme.name}`);
            }
        }
    }, 100);
}

function openColorEditor(themeKey, theme) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'color-editor-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        width: 400px;
        max-width: 90vw;
        box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 12px;
    `;

    const title = document.createElement('h3');
    title.textContent = `Edit ${theme.name}`;
    title.style.cssText = `
        margin: 0;
        font-size: 18px;
        color: #374151;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6b7280;
        padding: 0;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    closeBtn.onclick = () => modal.remove();

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Create color inputs
    const colorInputs = document.createElement('div');
    colorInputs.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

    const colors = [
        { key: 'textColor', label: 'Text Color', value: theme.textColor },
        { key: 'borderColor', label: 'Border Color', value: theme.borderColor },
        { key: 'fillColor', label: 'Fill Color', value: theme.fillColor },
        { key: 'backgroundColor', label: 'Background Color', value: theme.backgroundColor }
    ];

    const inputs = {};
    colors.forEach(({ key, label, value }) => {
        const inputGroup = document.createElement('div');
        inputGroup.style.cssText = 'display: flex; align-items: center; gap: 12px;';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            flex: 1;
            font-weight: 500;
            color: #374151;
        `;

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = value;
        colorInput.style.cssText = `
            width: 50px;
            height: 40px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            cursor: pointer;
            padding: 0;
        `;

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = value;
        textInput.style.cssText = `
            width: 90px;
            padding: 8px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-family: monospace;
            font-size: 12px;
        `;

        // Sync color picker and text input
        colorInput.addEventListener('input', () => {
            textInput.value = colorInput.value;
        });

        textInput.addEventListener('input', () => {
            if (/^#[0-9A-Fa-f]{6}$/.test(textInput.value)) {
                colorInput.value = textInput.value;
            }
        });

        inputs[key] = { colorInput, textInput };

        inputGroup.appendChild(labelEl);
        inputGroup.appendChild(colorInput);
        inputGroup.appendChild(textInput);
        colorInputs.appendChild(inputGroup);
    });

    // Create buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
        padding: 8px 16px;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 6px;
        cursor: pointer;
        color: #374151;
    `;
    cancelBtn.onclick = () => modal.remove();

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Changes';
    saveBtn.style.cssText = `
        padding: 8px 16px;
        border: none;
        background: #2563eb;
        color: white;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
    `;
    saveBtn.onclick = () => {
        // Update the theme with new colors
        const updatedTheme = { ...theme };
        Object.entries(inputs).forEach(([key, { textInput }]) => {
            updatedTheme[key] = textInput.value;
        });

        // Update the COLOR_THEMES object
        COLOR_THEMES[themeKey] = updatedTheme;

        // Save custom colors to localStorage
        saveCustomColors();

        // Apply the updated theme if it's currently active
        if (slidesAppState.currentTheme && slidesAppState.currentTheme.key === themeKey) {
            applyColorScheme(themeKey, updatedTheme);
        }

        // Refresh the color scheme selector to show updated colors
        refreshColorSchemeSelector();

        modal.remove();
    };

    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(saveBtn);

    // Assemble modal
    modalContent.appendChild(header);
    modalContent.appendChild(colorInputs);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);

    // Add to document
    document.body.appendChild(modal);

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function refreshColorSchemeSelector() {
    const existingSelector = document.getElementById('color-scheme-selector');
    if (existingSelector) {
        existingSelector.remove();
    }

    // Recreate the selector
    const newSelector = createColorSchemeSelector();
    if (slidesDom.presentationSection) {
        slidesDom.presentationSection.insertBefore(newSelector, slidesDom.presentationSection.firstChild);

        // Restore selection if there's a saved theme
        if (slidesAppState.currentTheme) {
            restoreColorSchemeSelection();
        }
    }
}

function applyThemeToSlides() {
    if (!slidesAppState.currentTheme) return;

    const theme = slidesAppState.currentTheme;

    // Apply theme to all slide previews with consistent background
    document.querySelectorAll('.slide-preview.editable-slide').forEach((slide, index) => {
        // All slides get the calculated background color
        slide.style.backgroundColor = theme.backgroundColor;
        slide.style.color = theme.textColor;
        slide.style.border = `2px solid ${theme.borderColor}`;

        // Apply colors to slide title
        const titleElement = slide.querySelector('.slide-title-editable, h2');
        if (titleElement) {
            titleElement.style.color = theme.textColor;
            titleElement.style.fontWeight = '600';
        }

        // Apply colors to content items (bullet points)
        const contentItems = slide.querySelectorAll('.slide-content-item-editable, li');
        contentItems.forEach(item => {
            item.style.color = theme.textColor;
            item.style.backgroundColor = theme.fillColor;
            item.style.border = `1px solid ${theme.borderColor}`;
            item.style.borderRadius = '6px';
            item.style.padding = '8px 12px';
            item.style.margin = '6px 0';
            item.style.fontFamily = 'Arial, sans-serif';
            item.style.fontSize = '14px';
            item.style.lineHeight = '1.4';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.minHeight = '20px';
        });

        // Apply colors to buttons
        const buttons = slide.querySelectorAll('button');
        buttons.forEach(button => {
            if (button.classList.contains('add-content-btn')) {
                button.style.backgroundColor = 'transparent';
                button.style.color = theme.borderColor;
                button.style.border = `2px solid ${theme.borderColor}`;
            }
        });

        // Style any shapes or visual elements
        const shapes = slide.querySelectorAll('.visual-shape');
        shapes.forEach(shape => {
            shape.style.fill = theme.fillColor;
            shape.style.stroke = theme.borderColor;
            shape.style.strokeWidth = '2px';
        });

        // Style advanced design elements
        applyThemeToAdvancedElements(slide, theme);
    });

    // Update presentation title container and title element styling
    const presentationPreview = document.querySelector('.presentation-preview');
    if (presentationPreview) {
        // Style the container like a slide - use !important to override CSS
        presentationPreview.style.setProperty('background', theme.backgroundColor, 'important');
        presentationPreview.style.setProperty('background-color', theme.backgroundColor, 'important');
        presentationPreview.style.setProperty('border', `2px solid ${theme.borderColor}`, 'important');
        presentationPreview.style.setProperty('color', theme.textColor, 'important');
        presentationPreview.style.borderRadius = '8px';
        presentationPreview.style.padding = '20px';
        presentationPreview.style.margin = '10px 0';
        presentationPreview.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        presentationPreview.style.transition = 'all 0.2s ease';
    }

    // Style the title element itself
    if (slidesDom.presentationTitle) {
        slidesDom.presentationTitle.style.color = theme.textColor;
        slidesDom.presentationTitle.style.backgroundColor = 'transparent';
        slidesDom.presentationTitle.style.border = 'none';
        slidesDom.presentationTitle.style.borderRadius = '4px';
        slidesDom.presentationTitle.style.padding = '10px';
        slidesDom.presentationTitle.style.margin = '0';
        slidesDom.presentationTitle.style.fontWeight = '600';
        slidesDom.presentationTitle.style.fontSize = '1.5em';
        slidesDom.presentationTitle.style.textAlign = 'center';
        slidesDom.presentationTitle.style.boxShadow = 'none';
        slidesDom.presentationTitle.style.transition = 'all 0.2s ease';
    }

    // Update overall presentation section with fixed light grey background
    if (slidesDom.presentationSection) {
        slidesDom.presentationSection.style.backgroundColor = '#f8f9fa';
        slidesDom.presentationSection.style.borderRadius = '12px';
        slidesDom.presentationSection.style.padding = '20px';
        slidesDom.presentationSection.style.border = '1px solid #e9ecef';
    }
}

function applyThemeToAdvancedElements(slide, theme) {
    // Apply theme to gradient cards
    const gradientCards = slide.querySelectorAll('.gradient-card');
    gradientCards.forEach(card => {
        // Update gradient to use theme colors
        const gradient = `linear-gradient(135deg, ${theme.borderColor}, ${theme.fillColor})`;
        card.style.background = gradient;
        card.style.color = theme.textColor;
    });

    // Apply theme to progress bars
    const progressBars = slide.querySelectorAll('.progress-bar-container');
    progressBars.forEach(container => {
        const progressFill = container.querySelector('div[style*="width:"][style*="%"]');
        if (progressFill) {
            progressFill.style.background = theme.borderColor;
        }
        container.style.color = theme.textColor;
    });

    // Apply theme to icon sets
    const iconSets = slide.querySelectorAll('.icon-set');
    iconSets.forEach(iconSet => {
        const icons = iconSet.querySelectorAll('div');
        icons.forEach(icon => {
            icon.style.background = `rgba(${hexToRgb(theme.borderColor)?.r || 59}, ${hexToRgb(theme.borderColor)?.g || 130}, ${hexToRgb(theme.borderColor)?.b || 246}, 0.2)`;
            icon.style.border = `1px solid ${theme.borderColor}`;
        });
    });

    // Apply theme to stat counters
    const statCounters = slide.querySelectorAll('.stat-counter');
    statCounters.forEach(counter => {
        counter.style.background = `rgba(${hexToRgb(theme.fillColor)?.r || 255}, ${hexToRgb(theme.fillColor)?.g || 255}, ${hexToRgb(theme.fillColor)?.b || 255}, 0.1)`;
        counter.style.border = `1px solid ${theme.borderColor}`;
        counter.style.color = theme.textColor;
    });

    // Apply theme to chart containers (Chart.js charts will inherit text colors)
    const chartContainers = slide.querySelectorAll('div[id*="chart-"]');
    chartContainers.forEach(container => {
        container.style.background = `rgba(${hexToRgb(theme.backgroundColor)?.r || 255}, ${hexToRgb(theme.backgroundColor)?.g || 255}, ${hexToRgb(theme.backgroundColor)?.b || 255}, 0.95)`;
        container.style.border = `1px solid ${theme.borderColor}`;
    });

    // Update background patterns to blend with theme
    const elementsWithPatterns = slide.querySelectorAll('[style*="background-image"]');
    elementsWithPatterns.forEach(element => {
        const currentBg = element.style.backgroundImage;
        if (currentBg.includes('rgba(255,255,255,')) {
            // Replace white pattern with theme-appropriate colors
            const themeRgb = hexToRgb(theme.textColor);
            if (themeRgb) {
                const newPattern = currentBg.replace(
                    /rgba\(255,255,255,([0-9.]+)\)/g,
                    `rgba(${themeRgb.r}, ${themeRgb.g}, ${themeRgb.b}, $1)`
                );
                element.style.backgroundImage = newPattern;
            }
        }
    });
}

function showPresentationViewer() {
    if (!slidesAppState.currentSlideData) {
        updateGenerationStatus('No presentation data available', 'error');
        return;
    }

    // Create Reveal.js presentation
    createRevealPresentation(slidesAppState.currentSlideData);

    // Show the viewer
    slidesDom.presentationViewer.style.display = 'block';
    slidesDom.presentationViewer.scrollIntoView({ behavior: 'smooth' });

    // Initialize Reveal.js (will be implemented with Reveal.js integration)
    console.log('Reveal.js presentation ready');
}

function closePresentationViewer() {
    slidesDom.presentationViewer.style.display = 'none';
    slidesDom.presentationSection.scrollIntoView({ behavior: 'smooth' });
}

function createRevealPresentation(slideData) {
    const slidesContainer = slidesDom.revealPresentation.querySelector('.slides');
    slidesContainer.innerHTML = '';

    slideData.slides.forEach((slide, index) => {
        const slideElement = document.createElement('section');

        // Apply visual design
        if (slide.visualDesign) {
            slideElement.style.backgroundColor = slide.visualDesign.backgroundColor || '#ffffff';
            slideElement.style.color = slide.visualDesign.textColor || '#000000';

            // Add data attributes for styling
            slideElement.setAttribute('data-background-color', slide.visualDesign.backgroundColor || '#ffffff');
        }

        // Build slide content
        let slideHTML = `<h2>${slide.title}</h2>`;

        if (slide.content && slide.content.length > 0) {
            slideHTML += `<ul>${slide.content.map(point => `<li>${point}</li>`).join('')}</ul>`;
        }

        // Add shapes as CSS elements (simplified version)
        if (slide.visualDesign && slide.visualDesign.shapes) {
            slide.visualDesign.shapes.forEach(shape => {
                slideHTML += createShapeHTML(shape);
            });
        }

        slideElement.innerHTML = slideHTML;
        slidesContainer.appendChild(slideElement);
    });
}

function createShapeHTML(shape) {
    const size = shape.size === 'large' ? '100px' : shape.size === 'small' ? '30px' : '60px';
    const position = getPositionCSS(shape.position);

    if (shape.type === 'circle') {
        return `<div style="position: absolute; ${position} width: ${size}; height: ${size}; background: ${shape.color}; border-radius: 50%; z-index: 10;"></div>`;
    } else if (shape.type === 'rectangle') {
        return `<div style="position: absolute; ${position} width: ${size}; height: ${parseInt(size) * 0.6}px; background: ${shape.color}; z-index: 10;"></div>`;
    }

    return '';
}

function getPositionCSS(position) {
    switch (position) {
        case 'top-left': return 'top: 20px; left: 20px;';
        case 'top-right': return 'top: 20px; right: 20px;';
        case 'bottom-left': return 'bottom: 20px; left: 20px;';
        case 'bottom-right': return 'bottom: 20px; right: 20px;';
        case 'center': return 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
        default: return 'top: 20px; right: 20px;';
    }
}

async function exportPresentation(format) {
    if (!slidesAppState.currentSlideData) {
        updateExportModalStatus('No presentation data to export', 'error');
        return;
    }

    const includeSpeakerNotes = shouldIncludeSpeakerNotes();

    try {
        updateExportModalStatus(`Exporting to ${format.toUpperCase()}...`, 'loading');

        switch (format) {
            case 'json':
                exportJSON(includeSpeakerNotes);
                break;
            case 'html':
                exportHTML(includeSpeakerNotes);
                break;
            case 'pdf':
                await exportPDF(includeSpeakerNotes);
                break;
            case 'pptx':
                await exportPowerPoint(includeSpeakerNotes);
                break;
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }

        // Close modal after successful export
        setTimeout(() => {
            hideExportModal();
        }, 2000);

    } catch (error) {
        console.error('Export error:', error);
        updateExportModalStatus(`Export failed: ${error.message}`, 'error');
    }
}

function exportJSON(includeSpeakerNotes = false) {
    let dataToExport = { ...slidesAppState.currentSlideData };

    if (!includeSpeakerNotes) {
        dataToExport.slides = dataToExport.slides.map(slide => {
            const { speakerNotes, ...slideWithoutNotes } = slide;
            return slideWithoutNotes;
        });
    }

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${slidesAppState.currentSlideData.title || 'presentation'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    updateExportModalStatus('JSON exported successfully!', 'success');
}

function exportHTML(includeSpeakerNotes = false) {
    const htmlContent = generateStandaloneHTML(slidesAppState.currentSlideData, includeSpeakerNotes);
    const dataBlob = new Blob([htmlContent], {type: 'text/html'});

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${slidesAppState.currentSlideData.title || 'presentation'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    updateExportModalStatus('HTML exported successfully!', 'success');
}

function generateStandaloneHTML(slideData, includeSpeakerNotes = false) {
    // Get current theme colors, fallback to default if no theme selected
    const theme = slidesAppState.currentTheme || {
        backgroundColor: '#ffffff',
        textColor: '#000000',
        borderColor: '#dddddd',
        fillColor: '#f5f5f5'
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${slideData.title || 'Presentation'}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .title-slide {
            background-color: ${theme.backgroundColor};
            color: ${theme.textColor};
            border-radius: 8px;
            padding: 40px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            width: 960px;
            height: 540px;
            max-width: 90vw;
            margin: 0 auto 30px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
        }
        .slide {
            background-color: ${theme.backgroundColor};
            color: ${theme.textColor};
            border-radius: 8px;
            page-break-after: always;
            margin-bottom: 30px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            width: 960px;
            height: 540px;
            max-width: 90vw;
            margin: 0 auto 30px auto;
            box-sizing: border-box;
            position: relative;
        }
        h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 600;
        }
        h2 {
            margin: 0 0 20px 0;
            color: ${theme.textColor};
            font-weight: 600;
        }
        ul {
            margin: 20px 0;
            padding-left: 30px;
        }
        li {
            margin: 12px 0;
            line-height: 1.6;
            padding: 8px 12px;
            background-color: ${theme.fillColor};
            border: 1px solid ${theme.borderColor};
            border-radius: 6px;
            list-style: none;
        }
        li::before {
            content: "•";
            color: ${theme.borderColor};
            font-weight: bold;
            margin-right: 10px;
        }
        .slide-number {
            position: absolute;
            bottom: 20px;
            right: 20px;
            opacity: 0.7;
            font-size: 0.9em;
            color: ${theme.textColor};
            margin: 0;
        }
        .speaker-notes {
            margin-top: 20px;
            padding: 15px;
            background-color: ${theme.fillColor};
            border-left: 4px solid ${theme.borderColor};
            border-radius: 4px;
            font-style: italic;
            opacity: 0.8;
        }
        @media print {
            .slide {
                page-break-after: always;
                margin-bottom: 0;
                height: 540px;
                min-height: 540px;
                max-height: 540px;
            }
            .title-slide {
                page-break-after: always;
                margin-bottom: 0;
                height: 540px;
                min-height: 540px;
                max-height: 540px;
            }
            body {
                background-color: white;
                margin: 0;
                padding: 10mm;
            }
            /* Ensure rounded corners and colors are preserved in print */
            * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
    </style>
</head>
<body>
    <div class="title-slide">
        <h1>${slideData.title || 'Presentation'}</h1>
    </div>
    ${slideData.slides.map((slide, index) => `
        <div class="slide">
            <div class="slide-number">${index + 1}</div>
            <h2>${slide.title}</h2>
            ${slide.content && slide.content.length > 0 ?
                `<ul>${slide.content.map(point => `<li>${point}</li>`).join('')}</ul>` : ''
            }
            ${includeSpeakerNotes && slide.speakerNotes ? `<div class="speaker-notes">Notes: ${slide.speakerNotes}</div>` : ''}
        </div>
    `).join('')}
</body>
</html>`;
}

async function exportPDF(includeSpeakerNotes = false) {
    try {
        // Debug: log available globals
        console.log('Available PDF globals:', Object.keys(window).filter(k => k.toLowerCase().includes('pdf')));
        console.log('Available canvas globals:', Object.keys(window).filter(k => k.toLowerCase().includes('canvas')));
        console.log('window.jspdf:', typeof window.jspdf, window.jspdf);
        console.log('window.jsPDF:', typeof window.jsPDF, window.jsPDF);
        console.log('window.html2canvas:', typeof window.html2canvas);

        // Check if jsPDF and html2canvas are available with better detection
        let jsPDF, html2canvas;

        // Try different ways jsPDF might be exposed
        if (window.jspdf && window.jspdf.jsPDF) {
            jsPDF = window.jspdf.jsPDF;
            console.log('Using window.jspdf.jsPDF');
        } else if (window.jsPDF) {
            jsPDF = window.jsPDF;
            console.log('Using window.jsPDF');
        } else {
            console.error('jsPDF not found in any expected location');
            throw new Error('jsPDF library not loaded. Please refresh the page and try again.');
        }

        // Check html2canvas
        if (typeof window.html2canvas === 'undefined') {
            console.error('html2canvas not found');
            throw new Error('html2canvas library not loaded. Please refresh the page and try again.');
        }
        html2canvas = window.html2canvas;
        console.log('html2canvas loaded successfully');

        const slideData = slidesAppState.currentSlideData;
        updateExportModalStatus('Creating PDF document...', 'loading');

        // Create temporary container for rendering slides (exact A4 landscape ratio)
        const tempContainer = document.createElement('div');
        // A4 landscape: 297mm × 210mm = 1.414:1 ratio
        // Using 1188×841px for better precision (297/210 * 841 = 1188)
        tempContainer.style.cssText = `
            position: fixed;
            top: -10000px;
            left: -10000px;
            width: 1188px;
            height: 841px;
            background: white;
            font-family: Arial, sans-serif;
            box-sizing: border-box;
        `;
        document.body.appendChild(tempContainer);

        const pdf = new jsPDF('landscape', 'mm', 'a4');
        let isFirstPage = true;

        // Add title page
        const titleHtml = createTitleSlideHTML(slideData.title);
        tempContainer.innerHTML = titleHtml;

        updateExportModalStatus('Rendering title page...', 'loading');
        const titleCanvas = await html2canvas(tempContainer, {
            width: 1188,
            height: 841,
            scale: 1,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null
        });

        if (isFirstPage) {
            isFirstPage = false;
        } else {
            pdf.addPage();
        }

        const titleImgData = titleCanvas.toDataURL('image/png');
        // Fill entire A4 landscape page with generous oversizing to eliminate borders
        pdf.addImage(titleImgData, 'PNG', -0.5, -0.5, 298, 211);

        // Add content slides
        for (let i = 0; i < slideData.slides.length; i++) {
            const slide = slideData.slides[i];

            updateExportModalStatus(`Rendering slide ${i + 1}...`, 'loading');

            const slideHtml = createSlideHTML(slide, i + 1, includeSpeakerNotes);
            tempContainer.innerHTML = slideHtml;

            // Wait a moment for styles to apply
            await new Promise(resolve => setTimeout(resolve, 100));

            const canvas = await html2canvas(tempContainer, {
                width: 1188,
                height: 841,
                scale: 1,
                useCORS: true,
                allowTaint: true,
                backgroundColor: null
            });

            pdf.addPage();
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', -0.5, -0.5, 298, 211);
        }

        // Clean up
        document.body.removeChild(tempContainer);

        updateExportModalStatus('Finalizing PDF...', 'loading');

        // Save the PDF
        const fileName = `${slideData.title || 'presentation'}.pdf`;
        pdf.save(fileName);

        updateExportModalStatus('PDF exported successfully!', 'success');

    } catch (error) {
        console.error('PDF export error:', error);
        updateExportModalStatus(`PDF export failed: ${error.message}`, 'error');
    }
}

function createTitleSlideHTML(title) {
    const theme = slidesAppState.currentTheme || {
        backgroundColor: '#ffffff',
        textColor: '#000000',
        borderColor: '#dddddd',
        fillColor: '#f5f5f5'
    };

    return `
        <div style="
            width: 960px;
            height: 540px;
            background-color: ${theme.backgroundColor};
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
        ">
            <h1 style="
                color: ${theme.textColor};
                font-size: 48px;
                font-weight: 600;
                text-align: center;
                margin: 0;
                padding: 40px;
                line-height: 1.2;
                max-width: 1200px;
            ">${title || 'Presentation'}</h1>
        </div>
    `;
}

function createSlideHTML(slide, slideNumber, includeSpeakerNotes = false) {
    const theme = slidesAppState.currentTheme || {
        backgroundColor: '#ffffff',
        textColor: '#000000',
        borderColor: '#dddddd',
        fillColor: '#f5f5f5'
    };

    const speakerNotesHtml = includeSpeakerNotes && slide.speakerNotes ? `
        <div style="
            margin-top: 20px;
            padding: 15px;
            background-color: ${theme.fillColor};
            border-left: 4px solid ${theme.borderColor};
            border-radius: 4px;
            font-style: italic;
            opacity: 0.8;
            font-size: 14px;
            color: ${theme.textColor};
            max-width: 1100px;
        ">
            <strong>Speaker Notes:</strong> ${slide.speakerNotes}
        </div>
    ` : '';

    return `
        <div style="
            width: 960px;
            height: 540px;
            background-color: ${theme.backgroundColor};
            box-sizing: border-box;
            padding: 40px;
            position: relative;
        ">
            <div style="
                position: absolute;
                bottom: 20px;
                right: 20px;
                font-size: 12px;
                color: ${theme.textColor};
                opacity: 0.7;
            ">${slideNumber}</div>

            <h2 style="
                color: ${theme.textColor};
                font-size: 32px;
                font-weight: 600;
                margin: 0 0 30px 0;
                line-height: 1.2;
                max-width: 1200px;
            ">${slide.title}</h2>

            <div style="margin-bottom: 20px; max-width: 1200px;">
                ${slide.content && slide.content.length > 0 ?
                    slide.content.map(point => `
                        <div style="
                            margin: 12px 0;
                            padding: 12px 16px;
                            background-color: ${theme.fillColor};
                            border: 1px solid ${theme.borderColor};
                            border-radius: 6px;
                            font-size: 16px;
                            line-height: 1.4;
                            color: ${theme.textColor};
                            display: flex;
                            align-items: center;
                            width: 100%;
                            box-sizing: border-box;
                        ">
                            <span style="
                                color: ${theme.textColor};
                                font-weight: bold;
                                margin-right: 12px;
                                font-size: 18px;
                                flex-shrink: 0;
                            ">•</span>
                            <span style="flex: 1;">${point}</span>
                        </div>
                    `).join('') : ''
                }
            </div>

            ${speakerNotesHtml}
        </div>
    `;
}


async function exportPowerPoint() {
    try {
        // Check if PptxGenJS is available with more debug info
        console.log('Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('pptx')));
        console.log('window.PptxGenJS:', window.PptxGenJS);
        console.log('typeof PptxGenJS:', typeof PptxGenJS);

        let PptxGen;
        if (window.PptxGenJS) {
            PptxGen = window.PptxGenJS;
        } else if (typeof PptxGenJS !== 'undefined') {
            PptxGen = PptxGenJS;
        } else {
            throw new Error('PptxGenJS library not found. Please refresh the page and try again.');
        }

        const pptx = new PptxGen();
        const slideData = slidesAppState.currentSlideData;
        const theme = slidesAppState.currentTheme || {
            backgroundColor: '#ffffff',
            textColor: '#000000',
            borderColor: '#dddddd',
            fillColor: '#f5f5f5'
        };

        // Set presentation properties with landscape layout
        pptx.defineLayout({ name: 'LAYOUT_WIDE', width: 13.33, height: 7.5 }); // 16:9 landscape
        pptx.layout = 'LAYOUT_WIDE';
        pptx.author = 'AI Slides Creator';
        pptx.company = 'Emotions for Engineers';
        pptx.title = slideData.title || 'Presentation';

        // Title slide with theme colors and landscape sizing
        const titleSlide = pptx.addSlide();

        // Set title slide background
        if (theme.backgroundColor && theme.backgroundColor !== '#ffffff') {
            titleSlide.background = { color: theme.backgroundColor.replace('#', '') };
        }

        titleSlide.addText(slideData.title || 'Presentation', {
            x: 1, y: 2.5, w: 11.33, h: 2.5,
            fontSize: 44,
            bold: true,
            align: 'center',
            color: theme.textColor.replace('#', ''),
            valign: 'middle'
        });

        // Content slides with landscape layout and theme colors
        slideData.slides.forEach((slide, index) => {
            const pptSlide = pptx.addSlide();

            // Set slide background using theme
            if (theme.backgroundColor && theme.backgroundColor !== '#ffffff') {
                pptSlide.background = { color: theme.backgroundColor.replace('#', '') };
            }

            // Slide number (bottom right)
            pptSlide.addText(`${index + 1}`, {
                x: 12.5, y: 6.8, w: 0.5, h: 0.5,
                fontSize: 12,
                color: theme.textColor.replace('#', ''),
                align: 'right',
                transparency: 30
            });

            // Slide title with theme colors and landscape positioning
            pptSlide.addText(slide.title, {
                x: 0.5, y: 0.5, w: 12.33, h: 1,
                fontSize: 32,
                bold: true,
                color: theme.textColor.replace('#', ''),
                valign: 'top'
            });

            // Slide content with better spacing for landscape
            if (slide.content && slide.content.length > 0) {
                slide.content.forEach((point, pointIndex) => {
                    // First add the rounded rectangle shape for the bullet box
                    pptSlide.addShape(pptx.ShapeType.roundRect, {
                        x: 0.8,  // Move more to the right
                        y: 2 + (pointIndex * 0.9), // Spacing between points
                        w: 11.5,
                        h: 0.65,
                        fill: { color: theme.fillColor.replace('#', '') },
                        line: { color: theme.borderColor.replace('#', ''), width: 1 },
                        rectRadius: 0.08 // Rounded corners (smaller value for subtle rounding)
                    });

                    // Then add the bullet point text on top
                    pptSlide.addText(`• ${point}`, {
                        x: 0.9,  // Align with the rounded box + small margin
                        y: 2 + (pointIndex * 0.9), // Match the box position
                        w: 11.3,
                        h: 0.65,
                        fontSize: 16,
                        color: theme.textColor.replace('#', ''),
                        valign: 'middle',
                        align: 'left',
                        margin: [0.1, 0.1, 0.1, 0.1] // top, right, bottom, left margins
                    });
                });
            }

            // Speaker notes with slide reference
            if (slide.speakerNotes) {
                pptSlide.addNotes(`Slide ${index + 1} Notes: ${slide.speakerNotes}`);
            }
        });

        // Save the PowerPoint file
        const fileName = `${slideData.title || 'presentation'}.pptx`;

        // Try different methods to save
        if (pptx.writeFile) {
            await pptx.writeFile({ fileName: fileName });
        } else if (pptx.save) {
            await pptx.save(fileName);
        } else {
            throw new Error('PptxGenJS save method not available');
        }

        updateExportModalStatus('PowerPoint exported successfully!', 'success');

    } catch (error) {
        console.error('PowerPoint export error:', error);
        updateExportModalStatus(`PowerPoint export failed: ${error.message}`, 'error');
    }
}

function addShapeToSlide(slide, shape) {
    try {
        const positionMap = {
            'top-left': { x: 0.5, y: 1.5 },
            'top-right': { x: 8, y: 1.5 },
            'center': { x: 4.5, y: 3.5 },
            'bottom-left': { x: 0.5, y: 5.5 },
            'bottom-right': { x: 8, y: 5.5 }
        };

        const sizeMap = {
            'small': { w: 1, h: 1 },
            'medium': { w: 1.5, h: 1.5 },
            'large': { w: 2, h: 2 }
        };

        const position = positionMap[shape.position] || positionMap['center'];
        const size = sizeMap[shape.size] || sizeMap['medium'];
        const color = shape.color?.replace('#', '') || '3498db';

        switch (shape.type) {
            case 'circle':
                slide.addShape('ellipse', {
                    x: position.x, y: position.y, w: size.w, h: size.h,
                    fill: { color: color },
                    line: { color: color, width: 1 }
                });
                break;
            case 'rectangle':
                slide.addShape('rect', {
                    x: position.x, y: position.y, w: size.w, h: size.h,
                    fill: { color: color },
                    line: { color: color, width: 1 }
                });
                break;
            case 'triangle':
                slide.addShape('triangle', {
                    x: position.x, y: position.y, w: size.w, h: size.h,
                    fill: { color: color },
                    line: { color: color, width: 1 }
                });
                break;
        }
    } catch (error) {
        console.warn('Could not add shape to slide:', error);
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function updateGenerationStatus(message, type) {
    if (!slidesDom.generationStatus) return;

    slidesDom.generationStatus.textContent = message;
    slidesDom.generationStatus.className = `status-display status-${type} show`;
}

function updateExportStatus(message, type) {
    if (!slidesDom.exportStatus) return;

    slidesDom.exportStatus.textContent = message;
    slidesDom.exportStatus.className = `status-display status-${type} show`;
}

function initializeEmptyPresentation() {
    slidesAppState.currentSlideData = {
        title: 'My Presentation',
        slides: [{
            slideNumber: 1,
            title: 'New Slide',
            content: ['Click to edit this content'],
            visualDesign: {
                backgroundColor: '#1e40af',
                textColor: '#ffffff',
                accentColor: '#60a5fa',
                layout: 'left-text',
                shapes: []
            },
            speakerNotes: 'Click to add speaker notes'
        }]
    };

    // Display initial slide
    displaySlides(slidesAppState.currentSlideData);

    console.log('Initialized presentation with one empty slide');
}

function addNewSlide() {
    if (!slidesAppState.currentSlideData) {
        initializeEmptyPresentation();
    }

    const newSlideNumber = slidesAppState.currentSlideData.slides.length + 1;
    const newSlide = {
        slideNumber: newSlideNumber,
        title: `Slide ${newSlideNumber}`,
        content: ['Click to edit this content'],
        visualDesign: {
            backgroundColor: '#1e40af',
            textColor: '#ffffff',
            accentColor: '#60a5fa',
            layout: 'left-text',
            shapes: []
        },
        speakerNotes: 'Click to add speaker notes'
    };

    slidesAppState.currentSlideData.slides.push(newSlide);
    displaySlides(slidesAppState.currentSlideData);
    saveSlides();

    console.log('Added new slide:', newSlide);

    // Scroll to the new slide
    const newSlideElement = document.querySelector(`[data-slide-index="${newSlideNumber - 1}"]`);
    if (newSlideElement) {
        newSlideElement.scrollIntoView({ behavior: 'smooth' });
    }
}

function deleteSlide(slideIndex) {
    if (!slidesAppState.currentSlideData || !slidesAppState.currentSlideData.slides[slideIndex]) {
        return;
    }

    if (slidesAppState.currentSlideData.slides.length <= 1) {
        updateGenerationStatus('Cannot delete the last slide', 'warning');
        return;
    }

    if (confirm(`Are you sure you want to delete Slide ${slideIndex + 1}?`)) {
        slidesAppState.currentSlideData.slides.splice(slideIndex, 1);

        // Renumber remaining slides
        slidesAppState.currentSlideData.slides.forEach((slide, index) => {
            slide.slideNumber = index + 1;
        });

        displaySlides(slidesAppState.currentSlideData);
        saveSlides();

        updateGenerationStatus(`Slide ${slideIndex + 1} deleted`, 'success');
        console.log(`Deleted slide ${slideIndex + 1}`);
    }
}

function moveSlide(slideIndex, direction) {
    if (!slidesAppState.currentSlideData || !slidesAppState.currentSlideData.slides[slideIndex]) {
        return;
    }

    const slides = slidesAppState.currentSlideData.slides;
    const targetIndex = direction === 'up' ? slideIndex - 1 : slideIndex + 1;

    // Check bounds
    if (targetIndex < 0 || targetIndex >= slides.length) {
        updateGenerationStatus(`Cannot move slide ${direction}`, 'warning');
        return;
    }

    // Swap slides
    const temp = slides[slideIndex];
    slides[slideIndex] = slides[targetIndex];
    slides[targetIndex] = temp;

    // Renumber slides
    slides.forEach((slide, index) => {
        slide.slideNumber = index + 1;
    });

    displaySlides(slidesAppState.currentSlideData);
    saveSlides();

    updateGenerationStatus(`Slide moved ${direction}`, 'success');
    console.log(`Moved slide ${slideIndex + 1} ${direction}`);
}

function insertSlideAfter(slideIndex) {
    if (!slidesAppState.currentSlideData) {
        return;
    }

    const newSlideNumber = slideIndex + 2; // Insert after the current slide
    const newSlide = {
        slideNumber: newSlideNumber,
        title: `New Slide`,
        content: ['Click to edit this content'],
        visualDesign: {
            backgroundColor: '#1e40af',
            textColor: '#ffffff',
            accentColor: '#60a5fa',
            layout: 'left-text',
            shapes: []
        },
        speakerNotes: 'Click to add speaker notes'
    };

    // Insert the new slide after the current one
    slidesAppState.currentSlideData.slides.splice(slideIndex + 1, 0, newSlide);

    // Renumber all slides after insertion
    slidesAppState.currentSlideData.slides.forEach((slide, index) => {
        slide.slideNumber = index + 1;
    });

    displaySlides(slidesAppState.currentSlideData);
    saveSlides();

    updateGenerationStatus(`Slide inserted after slide ${slideIndex + 1}`, 'success');
    console.log(`Inserted new slide after slide ${slideIndex + 1}`);
}

function addContentPoint(slideIndex) {
    if (!slidesAppState.currentSlideData || !slidesAppState.currentSlideData.slides[slideIndex]) {
        return;
    }

    const slide = slidesAppState.currentSlideData.slides[slideIndex];
    if (!slide.content) {
        slide.content = [];
    }

    slide.content.push('New bullet point');
    displaySlides(slidesAppState.currentSlideData);
    saveSlides();

    console.log(`Added content point to slide ${slideIndex + 1}`);
}

function removeContentItem(slideIndex, itemIndex) {
    if (!slidesAppState.currentSlideData || !slidesAppState.currentSlideData.slides[slideIndex]) {
        return;
    }

    const slide = slidesAppState.currentSlideData.slides[slideIndex];
    if (!slide.content || itemIndex >= slide.content.length) {
        return;
    }

    if (slide.content.length <= 1) {
        updateGenerationStatus('Cannot remove the last content point', 'warning');
        return;
    }

    slide.content.splice(itemIndex, 1);
    displaySlides(slidesAppState.currentSlideData);
    saveSlides();

    console.log(`Removed content item ${itemIndex + 1} from slide ${slideIndex + 1}`);
}

function createEditableSpeakerNotes(slide, slideIndex) {
    const notesContainer = document.createElement('div');
    notesContainer.className = 'speaker-notes-container';
    notesContainer.style.cssText = 'margin: 10px 0 20px 0; padding: 15px; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; border-left: 4px solid #6c757d;';

    // Create notes label
    const notesLabel = document.createElement('div');
    notesLabel.style.cssText = 'font-weight: bold; margin-bottom: 8px; color: #495057; font-size: 0.9em; display: flex; align-items: center;';
    notesLabel.innerHTML = '≡ Speaker Notes (not exported by default)';

    // Create editable notes area
    const notesTextarea = document.createElement('textarea');
    notesTextarea.className = 'speaker-notes-textarea';
    notesTextarea.value = slide.speakerNotes || '';
    notesTextarea.placeholder = 'Add your speaker notes here...';
    notesTextarea.style.cssText = 'width: 100%; min-height: 80px; padding: 10px; border: 1px solid #ced4da; border-radius: 4px; font-size: 0.9em; font-family: inherit; resize: vertical; background: white;';

    // Add event listeners for auto-save
    notesTextarea.addEventListener('blur', () => {
        updateSpeakerNotes(slideIndex, notesTextarea.value);
    });

    notesTextarea.addEventListener('input', debounce(() => {
        updateSpeakerNotes(slideIndex, notesTextarea.value);
    }, 500));

    // Select all text when clicking/focusing
    selectAllOnFocusTextarea(notesTextarea);

    notesContainer.appendChild(notesLabel);
    notesContainer.appendChild(notesTextarea);

    return notesContainer;
}

function updateSpeakerNotes(slideIndex, notes) {
    if (!slidesAppState.currentSlideData || !slidesAppState.currentSlideData.slides[slideIndex]) {
        return;
    }

    slidesAppState.currentSlideData.slides[slideIndex].speakerNotes = notes;
    saveSlides();
    console.log(`Updated speaker notes for slide ${slideIndex + 1}`);
}

function createSlideControlsHeader(slideNumber, slideIndex) {
    const controlsHeader = document.createElement('div');
    controlsHeader.className = 'slide-controls-header';
    controlsHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        padding: 0 10px;
    `;

    // Left side - slide number
    const slideLabel = document.createElement('div');
    slideLabel.style.cssText = 'font-weight: bold; color: #666; font-size: 0.9em;';
    slideLabel.textContent = `Slide ${slideNumber}`;

    // Right side - controls
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'slide-controls-buttons';
    controlsDiv.style.cssText = 'display: flex; gap: 5px; align-items: center;';

    // Insert slide button
    const insertBtn = document.createElement('button');
    insertBtn.type = 'button';
    insertBtn.className = 'btn-small';
    insertBtn.textContent = '+';
    insertBtn.title = 'Insert slide after this one';
    insertBtn.style.cssText = 'padding: 0; font-size: 12px; border: 2px solid #28a745; color: #28a745; background-color: transparent; border-radius: 3px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; box-sizing: border-box;';
    insertBtn.addEventListener('click', () => insertSlideAfter(slideIndex));

    // Move up button
    const moveUpBtn = document.createElement('button');
    moveUpBtn.type = 'button';
    moveUpBtn.className = 'btn-small';
    moveUpBtn.textContent = '↑';
    moveUpBtn.title = 'Move slide up';
    moveUpBtn.style.cssText = 'padding: 0; font-size: 12px; border: 2px solid #6c757d; color: #6c757d; background-color: transparent; border-radius: 3px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; box-sizing: border-box;';
    moveUpBtn.addEventListener('click', () => moveSlide(slideIndex, 'up'));

    // Move down button
    const moveDownBtn = document.createElement('button');
    moveDownBtn.type = 'button';
    moveDownBtn.className = 'btn-small';
    moveDownBtn.textContent = '↓';
    moveDownBtn.title = 'Move slide down';
    moveDownBtn.style.cssText = 'padding: 0; font-size: 12px; border: 2px solid #6c757d; color: #6c757d; background-color: transparent; border-radius: 3px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; box-sizing: border-box;';
    moveDownBtn.addEventListener('click', () => moveSlide(slideIndex, 'down'));

    // Delete slide button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-small btn-danger';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete this slide';
    deleteBtn.style.cssText = 'padding: 0; font-size: 12px; border: 2px solid #dc3545; color: #dc3545; background-color: transparent; border-radius: 3px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; box-sizing: border-box;';
    deleteBtn.addEventListener('click', () => deleteSlide(slideIndex));

    controlsDiv.appendChild(insertBtn);
    controlsDiv.appendChild(moveUpBtn);
    controlsDiv.appendChild(moveDownBtn);
    controlsDiv.appendChild(deleteBtn);

    controlsHeader.appendChild(slideLabel);
    controlsHeader.appendChild(controlsDiv);

    return controlsHeader;
}

// Simple debounce function for auto-save
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Helper function to select all text when clicking on contentEditable elements
function selectAllOnFocus(element) {
    element.addEventListener('focus', () => {
        // Select all text when the element gets focus
        setTimeout(() => {
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
        }, 0);
    });

    element.addEventListener('click', (e) => {
        // If element is not focused, focus it (which will trigger selection)
        if (document.activeElement !== element) {
            element.focus();
        }
    });
}

// Helper function to select all text in textarea/input elements
function selectAllOnFocusTextarea(element) {
    element.addEventListener('focus', () => {
        // Select all text when the element gets focus
        setTimeout(() => {
            element.select();
        }, 0);
    });

    element.addEventListener('click', (e) => {
        // If element is not focused, focus it (which will trigger selection)
        if (document.activeElement !== element) {
            element.focus();
        }
    });
}

function makePresentationTitleEditable(title) {
    if (!slidesDom.presentationTitle) return;

    // Set the title text
    slidesDom.presentationTitle.textContent = title;

    // Make it editable if it's not already
    if (!slidesDom.presentationTitle.hasAttribute('contenteditable')) {
        slidesDom.presentationTitle.contentEditable = true;
        slidesDom.presentationTitle.style.cursor = 'text';
        slidesDom.presentationTitle.title = 'Click to edit presentation title';

        // Add visual styling for editable state
        slidesDom.presentationTitle.style.border = '2px solid transparent';
        slidesDom.presentationTitle.style.borderRadius = '4px';
        slidesDom.presentationTitle.style.padding = '5px 10px';
        slidesDom.presentationTitle.style.transition = 'border-color 0.2s ease';

        // Add event listeners
        slidesDom.presentationTitle.addEventListener('focus', () => {
            slidesDom.presentationTitle.style.borderColor = '#60a5fa';
            slidesDom.presentationTitle.style.backgroundColor = 'rgba(255,255,255,0.1)';
        });

        // Select all text when clicking/focusing
        selectAllOnFocus(slidesDom.presentationTitle);

        slidesDom.presentationTitle.addEventListener('blur', () => {
            slidesDom.presentationTitle.style.borderColor = 'transparent';
            slidesDom.presentationTitle.style.backgroundColor = 'transparent';

            // Update the presentation title in the data
            if (slidesAppState.currentSlideData) {
                slidesAppState.currentSlideData.title = slidesDom.presentationTitle.textContent.trim() || 'My Presentation';
                saveSlides();
                console.log('Updated presentation title:', slidesAppState.currentSlideData.title);
            }
        });

        // Handle Enter key to blur (finish editing)
        slidesDom.presentationTitle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                slidesDom.presentationTitle.blur();
            }
        });

        console.log('Made presentation title editable');
    }
}

function showExportModal() {
    const exportModal = document.getElementById('export-modal');
    if (exportModal) {
        exportModal.style.display = 'flex';
    }
}

function hideExportModal() {
    const exportModal = document.getElementById('export-modal');
    if (exportModal) {
        exportModal.style.display = 'none';
    }
}

function shouldIncludeSpeakerNotes() {
    const includeNotesCheckbox = document.getElementById('include-speaker-notes');
    return includeNotesCheckbox ? includeNotesCheckbox.checked : false;
}

function updateExportModalStatus(message, type) {
    const exportModalStatus = document.getElementById('export-modal-status');
    if (exportModalStatus) {
        exportModalStatus.textContent = message;
        exportModalStatus.className = `status-display status-${type} show`;
    }
}

// Make slides functionality globally available for debugging
window.slidesAppState = slidesAppState;