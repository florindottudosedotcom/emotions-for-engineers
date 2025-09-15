// Slides functionality - works with any provider (cloud, webllm, ollama)
const SLIDES_STORAGE_KEY = 'aiSlidesCreator_slides';
const THEME_STORAGE_KEY = 'aiSlidesCreator_theme';

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
                // Get text content excluding the remove button
                const removeBtn = e.target.querySelector('.remove-content-btn');
                let textContent = e.target.textContent;
                if (removeBtn) {
                    textContent = textContent.replace(removeBtn.textContent, '').trim();
                }
                updateSlideContentItem(slideNumber - 1, index, textContent);
            });
            listItem.addEventListener('focus', (e) => e.target.style.border = '2px solid var(--accent-color, #60a5fa)');
            listItem.addEventListener('blur', (e) => e.target.style.border = '2px solid transparent');

            // Select all text when clicking/focusing
            selectAllOnFocus(listItem);

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
        imageInfo.innerHTML = `<strong>⬜ Image:</strong> ${slide.visualDesign.imageDescription}`;
        slideContent.appendChild(imageInfo);
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
            <div style="display: flex; height: 100%; border-radius: 3px; overflow: hidden;">
                <div style="flex: 1; background-color: ${theme.textColor};" title="Text Color"></div>
                <div style="flex: 1; background-color: ${theme.borderColor};" title="Border Color"></div>
                <div style="flex: 1; background-color: ${theme.fillColor};" title="Fill Color"></div>
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

        // Add hover effect
        tile.addEventListener('mouseenter', () => {
            if (!tile.style.border.includes(theme.borderColor)) {
                tile.style.transform = 'scale(1.05)';
                tile.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
            }
        });

        tile.addEventListener('mouseleave', () => {
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
            if (button.classList.contains('remove-content-btn')) {
                button.style.backgroundColor = theme.borderColor;
                button.style.color = 'white';
                button.style.border = 'none';
            } else if (button.classList.contains('add-content-btn')) {
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