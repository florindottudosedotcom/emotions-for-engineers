// Reveal.js based slides functionality
const SLIDES_STORAGE_KEY = 'aiSlidesCreator_slides';
const THEME_STORAGE_KEY = 'aiSlidesCreator_theme';

const slidesAppState = {
    currentSlideData: null,
    isGenerating: false,
    reveal: null,
    currentTheme: 'white'
};

const slidesDom = {};

// Reveal.js themes
const REVEAL_THEMES = {
    white: 'White',
    black: 'Black',
    beige: 'Beige',
    sky: 'Sky',
    night: 'Night',
    serif: 'Serif',
    simple: 'Simple',
    solarized: 'Solarized',
    blood: 'Blood',
    moon: 'Moon',
    league: 'League'
};

// Initialize Reveal.js slides system
function initializeSlidesSystem() {
    console.log('Initializing Reveal.js slides system...');

    // Initialize DOM references
    slidesDom.generateBtn = document.getElementById('generate-slides-btn');
    slidesDom.topicInput = document.getElementById('slide-topic');
    slidesDom.slideCountInput = document.getElementById('slide-count');
    slidesDom.themeSelect = document.getElementById('theme-select');
    slidesDom.exportPdfBtn = document.getElementById('export-pdf-btn');
    slidesDom.exportPptBtn = document.getElementById('export-ppt-btn');
    slidesDom.previewContainer = document.getElementById('preview-container');

    // Debug: Check which elements were found
    console.log('DOM elements found:', {
        generateBtn: !!slidesDom.generateBtn,
        topicInput: !!slidesDom.topicInput,
        slideCountInput: !!slidesDom.slideCountInput,
        themeSelect: !!slidesDom.themeSelect,
        previewContainer: !!slidesDom.previewContainer,
        currentProvider: !!window.currentProvider
    });

    // Populate theme selector
    if (slidesDom.themeSelect) {
        Object.entries(REVEAL_THEMES).forEach(([key, name]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = name;
            slidesDom.themeSelect.appendChild(option);
        });
    }

    // Event listeners
    if (slidesDom.generateBtn) {
        slidesDom.generateBtn.addEventListener('click', () => {
            console.log('Generate button clicked!');
            generateSlides();
        });
    }

    if (slidesDom.themeSelect) {
        slidesDom.themeSelect.addEventListener('change', changeTheme);
    }

    if (slidesDom.exportPdfBtn) {
        slidesDom.exportPdfBtn.addEventListener('click', exportToPdf);
    }

    if (slidesDom.exportPptBtn) {
        slidesDom.exportPptBtn.addEventListener('click', exportToPowerPoint);
    }

    // Load saved state
    loadSavedSlides();
    loadSavedTheme();
}

// Generate slides using AI
async function generateSlides() {
    console.log('generateSlides function called');

    const topic = slidesDom.topicInput?.value?.trim();
    const slideCount = parseInt(slidesDom.slideCountInput?.value) || 8;

    console.log('Topic:', topic, 'Slide count:', slideCount);

    if (!topic) {
        alert('Please enter a presentation topic');
        return;
    }

    try {
        slidesAppState.isGenerating = true;
        updateUI();

        // Get slide content from AI provider
        let slideData;

        // Check for unified provider system (currentProvider from unified_main.js)
        if (window.currentProvider && window.currentProvider.generateSlideContent) {
            console.log('Using currentProvider for slide generation');
            slideData = await window.currentProvider.generateSlideContent(topic, slideCount);
        }
        // Fallback to specific provider implementations
        else if (window.SlidesProvider && window.SlidesProvider.generateSlideContent) {
            console.log('Using SlidesProvider for slide generation');
            slideData = await window.SlidesProvider.generateSlideContent(topic, slideCount);
        }
        // Try to use the provider pattern for course creators adapted for slides
        else if (window.currentProvider && window.currentProvider.generateText) {
            console.log('Using currentProvider.generateText to create slides');

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

            const response = await window.currentProvider.generateText(prompt);
            console.log('AI response received:', response.substring(0, 200) + '...');

            // Try to parse JSON response
            try {
                slideData = JSON.parse(response.trim());
            } catch (parseError) {
                // If JSON parsing fails, try to extract JSON from the response
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    slideData = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('AI response was not in valid JSON format');
                }
            }
        }
        else {
            throw new Error('No compatible AI provider found. Make sure the provider is loaded.');
        }

        console.log('Slide data generated:', slideData);

        slidesAppState.currentSlideData = slideData;
        saveSlides(slideData);

        createRevealPresentation(slideData);

        // Update UI to show export buttons
        updateUI();

    } catch (error) {
        console.error('Error generating slides:', error);
        alert('Error generating slides: ' + error.message);
    } finally {
        slidesAppState.isGenerating = false;
        updateUI();
    }
}

// Create Reveal.js presentation
function createRevealPresentation(slideData) {
    if (!slideData || !slideData.slides) {
        console.error('Invalid slide data');
        return;
    }

    console.log('Creating Reveal.js presentation with', slideData.slides.length, 'slides');

    // Create HTML structure for Reveal.js
    const revealHTML = `
        <div class="slide-controls">
            <div class="reveal-navigation-hint">Use on-screen controls or click to navigate slides</div>
            <button id="edit-mode-btn" class="btn btn-secondary" style="position: absolute; top: 10px; left: 10px; z-index: 1000; font-size: 12px;">Edit Mode</button>
        </div>
        <div class="reveal">
            <div class="slides">
                ${slideData.slides.map(slide => createSlideHTML(slide)).join('')}
            </div>
        </div>
    `;

    if (!slidesDom.previewContainer) {
        console.error('Preview container not found!');
        return;
    }

    console.log('Setting innerHTML for preview container...');
    slidesDom.previewContainer.innerHTML = revealHTML;
    console.log('HTML set successfully');

    // Wait for Reveal.js to be available before initializing
    if (typeof Reveal === 'undefined') {
        console.log('Reveal.js not available, creating basic presentation...');
        createBasicPresentation(slideData);
        return;
    }

    // Initialize Reveal.js
    console.log('Initializing Reveal.js...');
    initializeReveal();
}

// Create basic presentation when Reveal.js is not available
function createBasicPresentation(slideData) {
    console.log('Creating basic slide presentation without Reveal.js');

    const basicHTML = `
        <div class="basic-slides" style="max-width: 800px; margin: 0 auto; padding: 20px;">
            <h1 style="text-align: center; margin-bottom: 30px;">${slideData.title}</h1>
            ${slideData.slides.map((slide, index) => `
                <div class="basic-slide" style="border: 1px solid #ddd; margin: 20px 0; padding: 20px; border-radius: 8px; background: white;">
                    <h2 style="color: #333; margin-top: 0;">Slide ${slide.slideNumber}: ${slide.title}</h2>
                    <ul style="line-height: 1.6;">
                        ${slide.content ? slide.content.map(item => `<li>${item}</li>`).join('') : ''}
                    </ul>
                    ${slide.speakerNotes ? `<div style="background: #f5f5f5; padding: 10px; margin-top: 15px; border-radius: 4px; font-style: italic;"><strong>Notes:</strong> ${slide.speakerNotes}</div>` : ''}
                </div>
            `).join('')}
            <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f0f0f0; border-radius: 8px;">
                <p style="margin: 0;"><strong>Slides generated successfully!</strong> For the full interactive experience with navigation and themes, please ensure you have a stable internet connection to load Reveal.js.</p>
            </div>
        </div>
    `;

    slidesDom.previewContainer.innerHTML = basicHTML;
}

// Create HTML for a single slide
function createSlideHTML(slide) {
    const contentHTML = slide.content ?
        `<ul>${slide.content.map(item => `<li>${item}</li>`).join('')}</ul>` : '';

    const notesHTML = slide.speakerNotes ?
        `<aside class="notes">${slide.speakerNotes}</aside>` : '';

    return `
        <section data-slide-number="${slide.slideNumber}">
            <h2>${slide.title}</h2>
            ${contentHTML}
            ${notesHTML}
        </section>
    `;
}

// Initialize Reveal.js instance
function initializeReveal() {
    // Check if Reveal.js is available
    if (typeof Reveal === 'undefined') {
        console.error('Reveal.js is not loaded. Waiting for it to load...');
        setTimeout(initializeReveal, 500);
        return;
    }

    // Destroy existing instance if it exists
    if (slidesAppState.reveal) {
        slidesAppState.reveal.destroy();
    }

    // Check which plugins are available
    const availablePlugins = [];
    if (typeof RevealMarkdown !== 'undefined') availablePlugins.push(RevealMarkdown);
    if (typeof RevealHighlight !== 'undefined') availablePlugins.push(RevealHighlight);
    if (typeof RevealNotes !== 'undefined') availablePlugins.push(RevealNotes);
    if (typeof RevealMath !== 'undefined') availablePlugins.push(RevealMath);
    if (typeof RevealSearch !== 'undefined') availablePlugins.push(RevealSearch);
    if (typeof RevealZoom !== 'undefined') availablePlugins.push(RevealZoom);

    console.log('Available Reveal.js plugins:', availablePlugins.length);

    // Initialize new Reveal.js instance
    slidesAppState.reveal = new Reveal({
        hash: false,
        controls: true,
        progress: true,
        center: true,
        transition: 'slide',
        width: 960,
        height: 600,
        margin: 0.1,
        minScale: 0.4,
        maxScale: 1.0,
        embedded: true,
        keyboard: {
            27: null, // Disable ESC
            37: null, // Disable left arrow for global nav
            38: null, // Disable up arrow for global nav
            39: null, // Disable right arrow for global nav
            40: null  // Disable down arrow for global nav
        },
        plugins: availablePlugins
    });

    slidesAppState.reveal.initialize().then(() => {
        console.log('Reveal.js initialized successfully');
        // Force a layout update
        setTimeout(() => {
            slidesAppState.reveal.layout();
            // Update UI to show export buttons now that slides exist
            updateUI();
            // Setup edit mode
            setupEditMode();
        }, 100);
    });
}

// Setup edit mode functionality
function setupEditMode() {
    const editBtn = document.getElementById('edit-mode-btn');
    let editMode = false;

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            editMode = !editMode;
            editBtn.textContent = editMode ? 'View Mode' : 'Edit Mode';
            editBtn.className = editMode ? 'btn btn-warning' : 'btn btn-secondary';

            // Get all slide content elements
            const slideElements = document.querySelectorAll('#preview-container .reveal .slides section h2, #preview-container .reveal .slides section li');

            slideElements.forEach(element => {
                if (editMode) {
                    // Enable editing
                    element.contentEditable = true;
                    element.style.outline = '1px dashed #007bff';
                    element.style.padding = '2px';
                    element.title = 'Click to edit';
                } else {
                    // Disable editing and save changes
                    element.contentEditable = false;
                    element.style.outline = 'none';
                    element.style.padding = '';
                    element.title = '';
                    saveEditedContent();
                }
            });

            if (editMode) {
                console.log('Edit mode enabled - click on slide content to edit');
            } else {
                console.log('Edit mode disabled - changes saved');
            }
        });
    }
}

// Save edited content back to slide data
function saveEditedContent() {
    if (!slidesAppState.currentSlideData) return;

    const slides = document.querySelectorAll('#preview-container .reveal .slides section');
    slides.forEach((slideElement, index) => {
        if (slidesAppState.currentSlideData.slides[index]) {
            // Update title
            const titleElement = slideElement.querySelector('h2');
            if (titleElement) {
                slidesAppState.currentSlideData.slides[index].title = titleElement.textContent;
            }

            // Update content
            const listItems = slideElement.querySelectorAll('li');
            const content = Array.from(listItems).map(li => li.textContent);
            slidesAppState.currentSlideData.slides[index].content = content;
        }
    });

    // Save to localStorage
    saveSlides(slidesAppState.currentSlideData);
    console.log('Slide content saved');
}

// Change presentation theme
function changeTheme() {
    const newTheme = slidesDom.themeSelect.value;
    slidesAppState.currentTheme = newTheme;
    saveTheme(newTheme);

    // Apply theme to Reveal.js
    if (typeof Reveal !== 'undefined' && slidesAppState.reveal) {
        // Remove existing theme links
        const existingThemes = document.querySelectorAll('link[href*="reveal"][href*="theme"]');
        existingThemes.forEach(link => link.remove());

        // Add new theme
        const themeLink = document.createElement('link');
        themeLink.rel = 'stylesheet';
        themeLink.href = `https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/dist/theme/${newTheme}.css`;
        themeLink.id = 'reveal-theme';
        document.head.appendChild(themeLink);
    }
}

// Export to PDF
function exportToPdf() {
    if (!slidesAppState.reveal) {
        alert('No presentation to export');
        return;
    }

    // For Reveal.js PDF export, we need to append ?print-pdf to URL
    const currentUrl = window.location.href;
    const pdfUrl = currentUrl.includes('?') ? currentUrl + '&print-pdf' : currentUrl + '?print-pdf';

    // Open in new tab for PDF printing
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
        printWindow.onload = function() {
            setTimeout(() => {
                printWindow.print();
            }, 1000);
        };
    } else {
        alert('Please allow popups to export PDF');
    }
}

// Export to PowerPoint (simplified - creates downloadable HTML)
function exportToPowerPoint() {
    if (!slidesAppState.currentSlideData) {
        alert('No slides to export');
        return;
    }

    const htmlContent = generateStandaloneHTML();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${slidesAppState.currentSlideData.title || 'presentation'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Generate standalone HTML file
function generateStandaloneHTML() {
    const slideData = slidesAppState.currentSlideData;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${slideData.title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/dist/reveal.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/dist/theme/${slidesAppState.currentTheme}.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/plugin/highlight/monokai.css">
</head>
<body>
    <div class="reveal">
        <div class="slides">
            ${slideData.slides.map(slide => createSlideHTML(slide)).join('')}
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/dist/reveal.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/plugin/notes/notes.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/plugin/markdown/markdown.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/plugin/highlight/highlight.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/plugin/math/math.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/plugin/search/search.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/plugin/zoom/zoom.js"></script>

    <script>
        Reveal.initialize({
            hash: true,
            controls: true,
            progress: true,
            center: true,
            transition: 'slide',
            plugins: [RevealMarkdown, RevealHighlight, RevealNotes, RevealMath, RevealSearch, RevealZoom]
        });
    </script>
</body>
</html>`;
}

// Update UI state
function updateUI() {
    if (slidesDom.generateBtn) {
        slidesDom.generateBtn.disabled = slidesAppState.isGenerating;
        slidesDom.generateBtn.textContent = slidesAppState.isGenerating ? 'Generating...' : 'Generate Presentation';
    }

    // Show/hide export buttons based on whether slides exist
    const hasSlides = slidesAppState.currentSlideData && slidesAppState.currentSlideData.slides;
    console.log('updateUI: hasSlides =', hasSlides, 'slideCount =', hasSlides ? slidesAppState.currentSlideData.slides.length : 0);

    if (slidesDom.exportPdfBtn) {
        slidesDom.exportPdfBtn.style.display = hasSlides ? 'inline-block' : 'none';
        console.log('PDF button display:', slidesDom.exportPdfBtn.style.display);
    }
    if (slidesDom.exportPptBtn) {
        slidesDom.exportPptBtn.style.display = hasSlides ? 'inline-block' : 'none';
        console.log('PPT button display:', slidesDom.exportPptBtn.style.display);
    }
}

// Save slides to localStorage
function saveSlides(slideData) {
    try {
        localStorage.setItem(SLIDES_STORAGE_KEY, JSON.stringify(slideData));
    } catch (error) {
        console.error('Error saving slides:', error);
    }
}

// Load slides from localStorage
function loadSavedSlides() {
    try {
        const saved = localStorage.getItem(SLIDES_STORAGE_KEY);
        if (saved) {
            console.log('Found saved slides, loading them...');
            const slideData = JSON.parse(saved);
            slidesAppState.currentSlideData = slideData;
            createRevealPresentation(slideData);
        } else {
            console.log('No saved slides found');
        }
    } catch (error) {
        console.error('Error loading saved slides:', error);
    }
}

// Save theme to localStorage
function saveTheme(theme) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
        console.error('Error saving theme:', error);
    }
}

// Load theme from localStorage
function loadSavedTheme() {
    try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved) {
            slidesAppState.currentTheme = saved;
            if (slidesDom.themeSelect) {
                slidesDom.themeSelect.value = saved;
            }
        }
    } catch (error) {
        console.error('Error loading saved theme:', error);
    }
}

// Counter to prevent infinite waiting
let dependencyCheckCount = 0;
const MAX_DEPENDENCY_CHECKS = 50; // 5 seconds max wait

// Wait for all scripts to load before initializing
function waitForDependencies() {
    dependencyCheckCount++;

    console.log(`Dependency check ${dependencyCheckCount}: Reveal=${typeof Reveal !== 'undefined'}, currentProvider=${!!window.currentProvider}`);

    // Check if Reveal.js is loaded
    if (typeof Reveal === 'undefined') {
        if (dependencyCheckCount < MAX_DEPENDENCY_CHECKS) {
            setTimeout(waitForDependencies, 200); // Increased interval
            return;
        } else {
            console.error('Reveal.js failed to load after 10 seconds. Using basic presentation mode.');
            // Initialize without Reveal.js for basic functionality
            initializeSlidesSystem();
            return;
        }
    }

    // Check if currentProvider is available (from unified system)
    if (!window.currentProvider) {
        if (dependencyCheckCount < MAX_DEPENDENCY_CHECKS) {
            setTimeout(waitForDependencies, 200);
            return;
        } else {
            console.error('Provider system failed to load. Some features may not work.');
            // Continue with initialization anyway
        }
    }

    console.log('All dependencies loaded successfully!');
    initializeSlidesSystem();
}

// Initialize when DOM is ready, but wait for all dependencies
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(waitForDependencies, 500); // Increased initial delay
});

// Also try when window fully loads (including external scripts)
window.addEventListener('load', () => {
    if (typeof Reveal !== 'undefined' && !slidesAppState.reveal) {
        console.log('Reveal.js detected on window load, initializing...');
        dependencyCheckCount = 0; // Reset counter
        waitForDependencies();
    }
});

// Clear saved slides (for debugging)
function clearSavedSlides() {
    localStorage.removeItem(SLIDES_STORAGE_KEY);
    localStorage.removeItem(THEME_STORAGE_KEY);
    slidesAppState.currentSlideData = null;
    if (slidesDom.previewContainer) {
        slidesDom.previewContainer.innerHTML = '<!-- Slides will appear here after generation -->';
    }
    console.log('Saved slides cleared');
}

// Export for global access
window.slidesAppState = slidesAppState;
window.slidesDom = slidesDom;
window.clearSavedSlides = clearSavedSlides;