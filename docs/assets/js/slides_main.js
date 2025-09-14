// Slides functionality - works with any provider (cloud, webllm, ollama)
const SLIDES_STORAGE_KEY = 'aiSlidesCreator_slides';
const THEME_STORAGE_KEY = 'aiSlidesCreator_theme';

const slidesAppState = {
    currentSlideData: null,
    isGenerating: false,
    currentTheme: null
};

const slidesDom = {};

// Predefined harmonious color themes
const COLOR_THEMES = {
    corporate: {
        name: 'Corporate Blue',
        colors: ['#1e40af', '#3b82f6', '#60a5fa'],
        background: '#1e40af',
        text: '#ffffff',
        accent: '#60a5fa'
    },
    modern: {
        name: 'Modern Dark',
        colors: ['#1f2937', '#374151', '#10b981'],
        background: '#1f2937',
        text: '#f9fafb',
        accent: '#10b981'
    },
    elegant: {
        name: 'Elegant Purple',
        colors: ['#581c87', '#7c3aed', '#a855f7'],
        background: '#581c87',
        text: '#ffffff',
        accent: '#a855f7'
    },
    warm: {
        name: 'Warm Orange',
        colors: ['#ea580c', '#f97316', '#fb923c'],
        background: '#ea580c',
        text: '#ffffff',
        accent: '#fb923c'
    },
    nature: {
        name: 'Nature Green',
        colors: ['#166534', '#22c55e', '#4ade80'],
        background: '#166534',
        text: '#ffffff',
        accent: '#4ade80'
    },
    ocean: {
        name: 'Ocean Teal',
        colors: ['#0f766e', '#14b8a6', '#5eead4'],
        background: '#0f766e',
        text: '#ffffff',
        accent: '#5eead4'
    }
};

// Wait for the main provider to be initialized, then add slides functionality
document.addEventListener('DOMContentLoaded', async () => {
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
    slidesDom.addSlideBtn = document.getElementById('add-slide-btn');
    slidesDom.previewPresentationBtn = document.getElementById('preview-presentation-btn');
    slidesDom.regenerateSlidesBtn = document.getElementById('regenerate-slides-btn');
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

    if (slidesDom.regenerateSlidesBtn) {
        slidesDom.regenerateSlidesBtn.addEventListener('click', generatePresentation);
        console.log('Regenerate slides button event listener added');
    }

    if (slidesDom.addSlideBtn) {
        slidesDom.addSlideBtn.addEventListener('click', addNewSlide);
        console.log('Add slide button event listener added');
    }

    if (slidesDom.previewPresentationBtn) {
        slidesDom.previewPresentationBtn.addEventListener('click', showPresentationViewer);
    }

    if (slidesDom.closePresentationBtn) {
        slidesDom.closePresentationBtn.addEventListener('click', closePresentationViewer);
    }

    // Clear slides button
    const clearSlidesBtn = document.createElement('button');
    clearSlidesBtn.type = 'button';
    clearSlidesBtn.className = 'btn btn-outline';
    clearSlidesBtn.textContent = '🗑️ Clear All Slides';
    clearSlidesBtn.addEventListener('click', clearAllSlides);

    // Add clear button to slide controls
    const slideControls = document.querySelector('.slide-controls');
    if (slideControls && !slideControls.querySelector('.clear-slides-btn')) {
        clearSlidesBtn.classList.add('clear-slides-btn');
        slideControls.appendChild(clearSlidesBtn);
    }

    // Export event listeners
    if (slidesDom.exportPdfBtn) slidesDom.exportPdfBtn.addEventListener('click', () => exportPresentation('pdf'));
    if (slidesDom.exportPptxBtn) slidesDom.exportPptxBtn.addEventListener('click', () => exportPresentation('pptx'));
    if (slidesDom.exportHtmlBtn) slidesDom.exportHtmlBtn.addEventListener('click', () => exportPresentation('html'));
    if (slidesDom.exportJsonBtn) slidesDom.exportJsonBtn.addEventListener('click', () => exportPresentation('json'));

    // Initialize theme selector and load saved data
    createThemeSelector();
    loadSavedSlides();

    // Initialize empty presentation if no saved slides
    if (!slidesAppState.currentSlideData) {
        initializeEmptyPresentation();
    }

    // Always show presentation section
    showPresentationSection();

    console.log('Slides functionality initialized successfully');

    console.log('Slides Creator functionality initialized successfully');
});

// Session Storage Functions
function saveSlides() {
    if (slidesAppState.currentSlideData) {
        localStorage.setItem(SLIDES_STORAGE_KEY, JSON.stringify(slidesAppState.currentSlideData));
    }
}

function loadSavedSlides() {
    try {
        const saved = localStorage.getItem(SLIDES_STORAGE_KEY);
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

        if (savedTheme) {
            slidesAppState.currentTheme = JSON.parse(savedTheme);
        }

        if (saved) {
            slidesAppState.currentSlideData = JSON.parse(saved);
            displaySlides(slidesAppState.currentSlideData);
            console.log('Loaded saved slides from session storage');
        }
    } catch (error) {
        console.warn('Error loading saved slides:', error);
    }
}

function clearAllSlides() {
    if (confirm('Are you sure you want to clear all slides? This action cannot be undone.')) {
        slidesAppState.currentSlideData = null;
        slidesAppState.currentTheme = null;
        localStorage.removeItem(SLIDES_STORAGE_KEY);
        localStorage.removeItem(THEME_STORAGE_KEY);

        // Hide presentation section
        if (slidesDom.presentationSection) {
            slidesDom.presentationSection.style.display = 'none';
        }

        // Clear slides preview
        if (slidesDom.slidesPreview) {
            slidesDom.slidesPreview.innerHTML = '';
        }

        // Reset theme selector
        const themeSelector = document.querySelector('.theme-selector');
        if (themeSelector) {
            const tiles = themeSelector.querySelectorAll('.theme-tile');
            tiles.forEach(tile => tile.classList.remove('selected'));
        }

        updateGenerationStatus('All slides cleared', 'success');
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

function applyThemeToSlides() {
    if (!slidesAppState.currentTheme || !slidesAppState.currentSlideData) return;

    const theme = slidesAppState.currentTheme;

    // Apply theme to all slides
    slidesAppState.currentSlideData.slides.forEach((slide, index) => {
        // Create harmonious variations of the theme
        const colorIndex = index % theme.colors.length;
        const bgColor = theme.colors[colorIndex];
        const lighterBg = adjustColor(bgColor, 10);
        const darkerBg = adjustColor(bgColor, -10);

        slide.visualDesign = {
            backgroundColor: bgColor,
            textColor: theme.text,
            accentColor: theme.accent,
            gradient: `linear-gradient(135deg, ${bgColor} 0%, ${darkerBg} 100%)`,
            shapes: slide.visualDesign?.shapes || []
        };
    });

    displaySlides(slidesAppState.currentSlideData);
    saveSlides();
}

// Create a universal slides prompt that works with any provider
function createSlidesPrompt(topic, slideCount) {
    return `Create a professional presentation about "${topic}" with exactly ${slideCount} slides.

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
- Color schemes must have high contrast (WCAG AA compliant)
- Use these professional color palettes:
  * Corporate Blue: background "#1e40af", text "#ffffff", accent "#60a5fa"
  * Modern Dark: background "#1f2937", text "#f9fafb", accent "#10b981"
  * Elegant Purple: background "#581c87", text "#ffffff", accent "#a855f7"
  * Professional Green: background "#064e3b", text "#ffffff", accent "#34d399"
  * Warm Orange: background "#ea580c", text "#ffffff", accent "#fb923c"
  * Classic Navy: background "#1e3a8a", text "#ffffff", accent "#3b82f6"
- Accent colors should be 40-60% lighter than background for visibility
- Suggest relevant shapes: circle, rectangle, triangle, arrow, diamond
- Position options: top-left, top-right, bottom-left, bottom-right, center
- Layout options: left-text, center-text, right-text, full-width
- Size options: small, medium, large
- Provide specific image descriptions that match the content

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

    try {
        console.log('Starting generation process...');
        slidesAppState.isGenerating = true;
        slidesDom.generateSlidesBtn.disabled = true;
        slidesDom.regenerateSlidesBtn.disabled = true;

        updateGenerationStatus('🎨 Generating AI-powered presentation...', 'loading');
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
        slidesDom.regenerateSlidesBtn.disabled = false;
    }
}

function displaySlides(slideData) {
    // Update title and slide count (starting from 1, not 0)
    if (slidesDom.presentationTitle) {
        slidesDom.presentationTitle.textContent = slideData.title || 'My Presentation';
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

    // Presentation section is always visible now
}

function createSlidePreviewElement(slide, slideNumber) {
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

    // Editable content list
    const contentContainer = document.createElement('div');
    contentContainer.className = 'slide-content-container';

    if (slide.content && slide.content.length > 0) {
        const contentList = document.createElement('ul');
        contentList.style.cssText = 'margin: 0; padding-left: 20px; line-height: 1.6;';

        slide.content.forEach((point, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'slide-content-item-editable';
            listItem.contentEditable = true;
            listItem.textContent = point;
            listItem.style.cssText = `
                margin: 8px 0;
                border: 2px solid transparent;
                padding: 5px;
                border-radius: 4px;
            `;

            // Add editing event listeners for content
            listItem.addEventListener('blur', (e) => updateSlideContentItem(slideNumber - 1, index, e.target.textContent));
            listItem.addEventListener('focus', (e) => e.target.style.border = '2px solid var(--accent-color, #60a5fa)');
            listItem.addEventListener('blur', (e) => e.target.style.border = '2px solid transparent');

            // Add remove button for content item
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '✕';
            removeBtn.className = 'remove-content-btn';
            removeBtn.style.cssText = 'margin-left: 10px; padding: 2px 6px; font-size: 10px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; opacity: 0.7;';
            removeBtn.addEventListener('click', () => removeContentItem(slideNumber - 1, index));
            listItem.appendChild(removeBtn);

            contentList.appendChild(listItem);
        });

        // Add "Add Content Point" button
        const addPointBtn = document.createElement('button');
        addPointBtn.textContent = '➕ Add Point';
        addPointBtn.className = 'add-content-btn';
        addPointBtn.style.cssText = 'margin-top: 10px; padding: 5px 10px; font-size: 12px; background: var(--accent-color, #60a5fa); color: white; border: none; border-radius: 4px; cursor: pointer;';
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
    }

    // Add slide controls
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'slide-controls-inline';
    controlsDiv.style.cssText = `
        margin-top: 15px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
    `;

    // Color picker for background
    const bgColorPicker = document.createElement('input');
    bgColorPicker.type = 'color';
    bgColorPicker.value = slide.visualDesign?.backgroundColor || '#1e40af';
    bgColorPicker.title = 'Change background color';
    bgColorPicker.style.cssText = 'width: 30px; height: 30px; border: none; border-radius: 4px; cursor: pointer;';
    bgColorPicker.addEventListener('change', (e) => updateSlideColor(slideNumber - 1, 'backgroundColor', e.target.value));

    // Color picker for shapes/accent
    const accentColorPicker = document.createElement('input');
    accentColorPicker.type = 'color';
    accentColorPicker.value = slide.visualDesign?.accentColor || '#60a5fa';
    accentColorPicker.title = 'Change accent color';
    accentColorPicker.style.cssText = 'width: 30px; height: 30px; border: none; border-radius: 4px; cursor: pointer;';
    accentColorPicker.addEventListener('change', (e) => updateSlideColor(slideNumber - 1, 'accentColor', e.target.value));

    // Delete slide button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-small btn-danger';
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = 'Delete this slide';
    deleteBtn.style.cssText = 'margin-left: 10px; padding: 5px 8px; font-size: 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;';
    deleteBtn.addEventListener('click', () => deleteSlide(slideNumber - 1));

    // Move up button
    const moveUpBtn = document.createElement('button');
    moveUpBtn.type = 'button';
    moveUpBtn.className = 'btn-small';
    moveUpBtn.textContent = '⬆️';
    moveUpBtn.title = 'Move slide up';
    moveUpBtn.style.cssText = 'margin-left: 5px; padding: 5px 8px; font-size: 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;';
    moveUpBtn.addEventListener('click', () => moveSlide(slideNumber - 1, 'up'));

    // Move down button
    const moveDownBtn = document.createElement('button');
    moveDownBtn.type = 'button';
    moveDownBtn.className = 'btn-small';
    moveDownBtn.textContent = '⬇️';
    moveDownBtn.title = 'Move slide down';
    moveDownBtn.style.cssText = 'margin-left: 5px; padding: 5px 8px; font-size: 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;';
    moveDownBtn.addEventListener('click', () => moveSlide(slideNumber - 1, 'down'));

    controlsDiv.innerHTML = `
        <small style="color: var(--text-color, #ffffff); opacity: 0.8;">
            Slide ${slideNumber} - 🎨 Background:
        </small>
    `;
    controlsDiv.appendChild(bgColorPicker);
    controlsDiv.innerHTML += `<small style="color: var(--text-color, #ffffff); opacity: 0.8;"> Accent: </small>`;
    controlsDiv.appendChild(accentColorPicker);
    controlsDiv.appendChild(moveUpBtn);
    controlsDiv.appendChild(moveDownBtn);
    controlsDiv.appendChild(deleteBtn);

    // Assemble the slide
    slideContent.appendChild(titleElement);
    slideContent.appendChild(contentContainer);
    slideContent.appendChild(controlsDiv);

    // Add visual shapes if available
    if (slide.visualDesign && slide.visualDesign.shapes) {
        slide.visualDesign.shapes.forEach(shape => {
            const shapeElement = createVisualShape(shape);
            slideContent.appendChild(shapeElement);
        });
    }

    // Add additional info sections
    if (slide.visualDesign && slide.visualDesign.imageDescription) {
        const imageInfo = document.createElement('div');
        imageInfo.style.cssText = 'margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 4px; font-size: 0.9em;';
        imageInfo.innerHTML = `<strong>📷 Image:</strong> ${slide.visualDesign.imageDescription}`;
        slideContent.appendChild(imageInfo);
    }

    if (slide.speakerNotes) {
        const notesDiv = document.createElement('div');
        notesDiv.style.cssText = 'margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 4px; font-size: 0.9em; font-style: italic;';
        notesDiv.innerHTML = `<strong>🎤 Speaker Notes:</strong> ${slide.speakerNotes}`;
        slideContent.appendChild(notesDiv);
    }

    slideDiv.appendChild(slideContent);
    return slideDiv;
}

// Helper functions for slide editing
function applySlideDesign(slideDiv, slide, slideNumber) {
    if (slide.visualDesign) {
        const design = slide.visualDesign;

        // Apply colors
        slideDiv.style.background = design.backgroundColor || '#1e40af';
        slideDiv.style.color = design.textColor || '#ffffff';
        slideDiv.style.borderLeft = `4px solid ${design.accentColor || '#60a5fa'}`;

        // Apply layout-specific styling
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

        // Add subtle gradient for depth
        const bgColor = design.backgroundColor || '#1e40af';
        const accentColor = design.accentColor || '#60a5fa';
        slideDiv.style.background = `linear-gradient(135deg, ${bgColor} 0%, ${adjustColor(bgColor, -10)} 100%)`;

        // Add custom CSS variables for this slide
        slideDiv.style.setProperty('--accent-color', accentColor);
        slideDiv.style.setProperty('--text-color', design.textColor || '#ffffff');
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

function updateSlideColor(slideIndex, colorType, value) {
    if (!slidesAppState.currentSlideData || !slidesAppState.currentSlideData.slides[slideIndex]) {
        return;
    }

    const slide = slidesAppState.currentSlideData.slides[slideIndex];
    if (!slide.visualDesign) {
        slide.visualDesign = {};
    }

    slide.visualDesign[colorType] = value;

    // Re-render the slide with new colors
    const slideElement = document.querySelector(`.slide-preview[data-slide-index="${slideIndex}"]`);
    if (slideElement) {
        applySlideDesign(slideElement, slide, slideIndex + 1);
    }

    saveSlides();
    console.log(`Updated slide ${slideIndex + 1} ${colorType}:`, value);
}

// Create visual shape elements
function createVisualShape(shape) {
    const shapeElement = document.createElement('div');
    shapeElement.style.position = 'absolute';
    shapeElement.style.zIndex = '10';

    // Set size
    const sizeMap = {
        'small': '30px',
        'medium': '50px',
        'large': '80px'
    };
    const size = sizeMap[shape.size] || sizeMap['medium'];

    // Set position
    const positionMap = {
        'top-left': { top: '10px', left: '10px' },
        'top-right': { top: '10px', right: '10px' },
        'bottom-left': { bottom: '10px', left: '10px' },
        'bottom-right': { bottom: '10px', right: '10px' },
        'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    };
    const position = positionMap[shape.position] || positionMap['top-right'];

    Object.assign(shapeElement.style, position);

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

    return shapeElement;
}

function showPresentationSection() {
    slidesDom.presentationSection.style.display = 'block';
    slidesDom.presentationSection.scrollIntoView({ behavior: 'smooth' });
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
        updateExportStatus('No presentation data to export', 'error');
        return;
    }

    try {
        updateExportStatus(`Exporting to ${format.toUpperCase()}...`, 'loading');

        switch (format) {
            case 'json':
                exportJSON();
                break;
            case 'html':
                exportHTML();
                break;
            case 'pdf':
                await exportPDF();
                break;
            case 'pptx':
                await exportPowerPoint();
                break;
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }

    } catch (error) {
        console.error('Export error:', error);
        updateExportStatus(`Export failed: ${error.message}`, 'error');
    }
}

function exportJSON() {
    const dataStr = JSON.stringify(slidesAppState.currentSlideData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${slidesAppState.currentSlideData.title || 'presentation'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    updateExportStatus('✅ JSON exported successfully!', 'success');
}

function exportHTML() {
    const htmlContent = generateStandaloneHTML(slidesAppState.currentSlideData);
    const dataBlob = new Blob([htmlContent], {type: 'text/html'});

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${slidesAppState.currentSlideData.title || 'presentation'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    updateExportStatus('✅ HTML exported successfully!', 'success');
}

function generateStandaloneHTML(slideData) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${slideData.title || 'Presentation'}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .slide { page-break-after: always; margin-bottom: 50px; padding: 40px; border: 1px solid #ddd; }
        h1, h2 { margin: 0 0 20px 0; }
        ul { margin: 10px 0; padding-left: 30px; }
        li { margin: 8px 0; line-height: 1.4; }
        .slide-number { opacity: 0.6; font-size: 0.9em; margin-bottom: 10px; }
        @media print { .slide { page-break-after: always; } }
    </style>
</head>
<body>
    <h1>${slideData.title || 'Presentation'}</h1>
    ${slideData.slides.map((slide, index) => `
        <div class="slide" style="background: ${slide.visualDesign?.backgroundColor || '#ffffff'}; color: ${slide.visualDesign?.textColor || '#000000'};">
            <div class="slide-number">Slide ${index + 1}</div>
            <h2>${slide.title}</h2>
            ${slide.content && slide.content.length > 0 ?
                `<ul>${slide.content.map(point => `<li>${point}</li>`).join('')}</ul>` : ''
            }
            ${slide.speakerNotes ? `<p><em>Notes: ${slide.speakerNotes}</em></p>` : ''}
        </div>
    `).join('')}
</body>
</html>`;
}

async function exportPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'mm', 'a4');

        const slideData = slidesAppState.currentSlideData;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);

        // Title slide
        doc.setFontSize(24);
        doc.setTextColor(40, 40, 40);

        // Calculate text position to center it
        const titleText = slideData.title || 'Presentation';
        const titleWidth = doc.getTextWidth(titleText);
        doc.text(titleText, (pageWidth - titleWidth) / 2, pageHeight / 2);

        // Content slides
        slideData.slides.forEach((slide, index) => {
            doc.addPage();

            // Apply background color if available
            if (slide.visualDesign && slide.visualDesign.backgroundColor) {
                const bgColor = hexToRgb(slide.visualDesign.backgroundColor);
                if (bgColor) {
                    doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
                    doc.rect(0, 0, pageWidth, pageHeight, 'F');
                }
            }

            // Set text color
            let textColor = { r: 40, g: 40, b: 40 };
            if (slide.visualDesign && slide.visualDesign.textColor) {
                textColor = hexToRgb(slide.visualDesign.textColor) || textColor;
            }
            doc.setTextColor(textColor.r, textColor.g, textColor.b);

            // Slide number
            doc.setFontSize(10);
            doc.text(`Slide ${index + 1}`, margin, margin);

            // Slide title
            doc.setFontSize(18);
            const lines = doc.splitTextToSize(slide.title, contentWidth);
            doc.text(lines, margin, margin + 15);

            let yPosition = margin + 30 + (lines.length - 1) * 7;

            // Slide content
            if (slide.content && slide.content.length > 0) {
                doc.setFontSize(12);
                slide.content.forEach((point, pointIndex) => {
                    const bulletLines = doc.splitTextToSize(`• ${point}`, contentWidth - 10);
                    doc.text(bulletLines, margin + 10, yPosition);
                    yPosition += bulletLines.length * 6 + 3;
                });
            }

            // Speaker notes
            if (slide.speakerNotes) {
                yPosition += 10;
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                const notesLines = doc.splitTextToSize(`Notes: ${slide.speakerNotes}`, contentWidth);
                doc.text(notesLines, margin, yPosition);
            }
        });

        // Save the PDF
        const fileName = `${slideData.title || 'presentation'}.pdf`;
        doc.save(fileName);

        updateExportStatus('✅ PDF exported successfully!', 'success');

    } catch (error) {
        console.error('PDF export error:', error);
        updateExportStatus(`PDF export failed: ${error.message}`, 'error');
    }
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

        // Set presentation properties
        pptx.author = 'AI Slides Creator';
        pptx.company = 'Emotions for Engineers';
        pptx.title = slideData.title || 'Presentation';

        // Title slide
        const titleSlide = pptx.addSlide();
        titleSlide.addText(slideData.title || 'Presentation', {
            x: 1, y: 2.5, w: 8, h: 2,
            fontSize: 36,
            bold: true,
            align: 'center',
            color: '363636'
        });

        // Content slides
        slideData.slides.forEach((slide, index) => {
            const pptSlide = pptx.addSlide();

            // Set background color if available
            if (slide.visualDesign && slide.visualDesign.backgroundColor) {
                pptSlide.background = { color: slide.visualDesign.backgroundColor.replace('#', '') };
            }

            // Slide title
            const titleColor = slide.visualDesign?.textColor?.replace('#', '') || '363636';
            pptSlide.addText(slide.title, {
                x: 0.5, y: 0.5, w: 9, h: 1,
                fontSize: 28,
                bold: true,
                color: titleColor
            });

            // Slide content - simpler approach for better compatibility
            if (slide.content && slide.content.length > 0) {
                const bulletText = slide.content.map(point => `• ${point}`).join('\n');
                pptSlide.addText(bulletText, {
                    x: 0.5, y: 1.8, w: 9, h: 4.5,
                    fontSize: 16,
                    color: titleColor,
                    lineSpacing: 28,
                    valign: 'top'
                });
            }

            // Speaker notes
            if (slide.speakerNotes) {
                pptSlide.addNotes(`Slide ${index + 1} Notes: ${slide.speakerNotes}`);
            }

            // Add visual shapes if available - simplified
            if (slide.visualDesign && slide.visualDesign.shapes) {
                slide.visualDesign.shapes.forEach(shape => {
                    try {
                        addShapeToSlide(pptSlide, shape);
                    } catch (shapeError) {
                        console.warn('Skipping shape due to error:', shapeError);
                    }
                });
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

        updateExportStatus('✅ PowerPoint exported successfully!', 'success');

    } catch (error) {
        console.error('PowerPoint export error:', error);
        updateExportStatus(`PowerPoint export failed: ${error.message}`, 'error');
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
        slides: []
    };

    // Display empty state
    displaySlides(slidesAppState.currentSlideData);

    console.log('Initialized empty presentation');
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

// Make slides functionality globally available for debugging
window.slidesAppState = slidesAppState;