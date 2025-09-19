/**
 * Optimized Slides Main
 *
 * This is the new optimized main file for slides functionality.
 * It coordinates all the modular components and replaces the original slides_main.js.
 */

import {
    slidesAppState,
    slidesDom,
    loadSavedSlides,
    loadFormState,
    saveFormState,
    loadCustomColors,
    initializeEnhancedComponents,
    addClearButtonToBottom,
    clearAllSlides
} from './slides-common.js';

import {
    ThemeSelector,
    ExportOptions,
    SlideProgressIndicator,
    SlidesNavigation
} from './slides-components.js';

import {
    displaySlides,
    generatePresentation,
    showPresentationSection,
    initializeEmptyPresentation,
    updateGenerationStatus,
    applyThemeToSlides
} from './slides-konva-integration.js';

/**
 * Initialize slides functionality
 */
async function initializeSlides() {
    console.log('Initializing optimized slides functionality...');

    try {
        // Wait for provider to be loaded
        await waitForProvider();

        // Initialize DOM references
        initializeDOMReferences();

        // Initialize enhanced editing components
        await initializeEnhancedComponents();

        // Load saved data
        loadCustomColors();
        loadSavedSlides();

        // Setup UI components
        setupThemeSelector();
        setupEventListeners();

        // Load form state after a short delay to ensure DOM is ready
        setTimeout(() => {
            loadFormState();
        }, 100);

        // Initialize presentation if no saved slides
        if (!slidesAppState.currentSlideData) {
            initializeEmptyPresentation();
            showPresentationSection();
        }

        // Add bottom controls
        addClearButtonToBottom();

        console.log('Slides functionality initialized successfully');
    } catch (error) {
        console.error('Failed to initialize slides:', error);
        updateGenerationStatus('Failed to initialize slides functionality', 'error');
    }
}

/**
 * Wait for provider to be available
 */
function waitForProvider() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max

        const checkProvider = () => {
            if (window.currentProvider) {
                resolve(window.currentProvider);
                return;
            }

            attempts++;
            if (attempts >= maxAttempts) {
                reject(new Error('Provider not loaded within timeout'));
                return;
            }

            setTimeout(checkProvider, 100);
        };

        checkProvider();
    });
}

/**
 * Initialize DOM references
 */
function initializeDOMReferences() {
    slidesDom.presentationTopicTextarea = document.getElementById('presentation-topic');
    slidesDom.numSlidesSelect = document.getElementById('num-slides');
    slidesDom.generateSlidesBtn = document.getElementById('generate-slides-btn');
    slidesDom.generationStatus = document.getElementById('generation-status');
    slidesDom.presentationSection = document.getElementById('presentation-section');
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

    console.log('DOM references initialized:', {
        presentationTopicTextarea: !!slidesDom.presentationTopicTextarea,
        numSlidesSelect: !!slidesDom.numSlidesSelect,
        generateSlidesBtn: !!slidesDom.generateSlidesBtn
    });
}

/**
 * Setup theme selector
 */
function setupThemeSelector() {
    // Create theme selector container if it doesn't exist
    let themeContainer = document.getElementById('theme-selector-container');
    if (!themeContainer) {
        themeContainer = document.createElement('div');
        themeContainer.id = 'theme-selector-container';

        // Insert before the presentation generator fieldset
        const presentationFieldset = document.querySelector('fieldset');
        if (presentationFieldset) {
            presentationFieldset.parentNode.insertBefore(themeContainer, presentationFieldset);
        }
    }

    // Initialize theme selector component
    const themeSelector = new ThemeSelector('theme-selector-container', {
        showCustomColors: true,
        onThemeChange: (themeName, theme) => {
            console.log('Theme changed:', themeName);
            applyThemeToSlides();
        }
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Generate slides button
    if (slidesDom.generateSlidesBtn) {
        slidesDom.generateSlidesBtn.addEventListener('click', generatePresentation);
    }

    // Auto-save form state
    if (slidesDom.presentationTopicTextarea) {
        const debouncedSave = window.common ? window.common.debounce(saveFormState, 500) : saveFormState;
        slidesDom.presentationTopicTextarea.addEventListener('input', debouncedSave);
        slidesDom.presentationTopicTextarea.addEventListener('blur', saveFormState);

        // Select all text on focus
        slidesDom.presentationTopicTextarea.addEventListener('focus', (e) => {
            setTimeout(() => e.target.select(), 0);
        });
    }

    if (slidesDom.numSlidesSelect) {
        slidesDom.numSlidesSelect.addEventListener('change', saveFormState);
    }

    // Close presentation viewer
    if (slidesDom.closePresentationBtn) {
        slidesDom.closePresentationBtn.addEventListener('click', closePresentationViewer);
    }

    // Export modal events
    setupExportModalEvents();
}

/**
 * Setup export modal events
 */
function setupExportModalEvents() {
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
    const exportButtons = {
        'export-pdf-btn': () => exportPresentation('pdf'),
        'export-pptx-btn': () => exportPresentation('pptx'),
        'export-html-btn': () => exportPresentation('html'),
        'export-json-btn': () => exportPresentation('json')
    };

    Object.entries(exportButtons).forEach(([id, handler]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', handler);
        }
    });
}

/**
 * Show export modal
 */
function showExportModal() {
    const exportModal = document.getElementById('export-modal');
    if (exportModal) {
        exportModal.style.display = 'flex';
    }
}

/**
 * Hide export modal
 */
function hideExportModal() {
    const exportModal = document.getElementById('export-modal');
    if (exportModal) {
        exportModal.style.display = 'none';
    }
}

/**
 * Export presentation
 */
async function exportPresentation(format) {
    if (!slidesAppState.currentSlideData) {
        if (window.common) {
            window.common.showError('No slides to export. Please generate slides first.');
        }
        return;
    }

    try {
        updateGenerationStatus(`Exporting as ${format.toUpperCase()}...`, 'loading');

        // Use existing export functionality or implement new export logic
        const includeNotes = document.getElementById('include-speaker-notes')?.checked || false;

        switch (format) {
            case 'json':
                exportAsJSON();
                break;
            case 'html':
                exportAsHTML(includeNotes);
                break;
            case 'pdf':
                await exportAsPDF(includeNotes);
                break;
            case 'pptx':
                await exportAsPowerPoint(includeNotes);
                break;
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }

        updateGenerationStatus(`Exported as ${format.toUpperCase()} successfully!`, 'success');

        if (window.common) {
            window.common.showSuccess(`Presentation exported as ${format.toUpperCase()}`);
        }

        setTimeout(hideExportModal, 1000);
    } catch (error) {
        console.error('Export failed:', error);
        updateGenerationStatus(`Export failed: ${error.message}`, 'error');

        if (window.common) {
            window.common.showError(`Export failed: ${error.message}`);
        }
    }
}

/**
 * Export as JSON
 */
function exportAsJSON() {
    const jsonData = JSON.stringify(slidesAppState.currentSlideData, null, 2);
    const filename = `${slidesAppState.currentSlideData.title || 'presentation'}.json`;

    if (window.common) {
        window.common.downloadAsFile(jsonData, filename, 'application/json');
    } else {
        // Fallback download
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }
}

/**
 * Export as HTML
 */
function exportAsHTML(includeNotes) {
    const slides = slidesAppState.currentSlideData.slides;
    const title = slidesAppState.currentSlideData.title || 'Presentation';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        .slide {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .slide h2 {
            color: #333;
            margin-top: 0;
        }
        .slide ul {
            padding-left: 20px;
        }
        .slide li {
            margin: 8px 0;
        }
        .speaker-notes {
            background: #f8f9fa;
            border-left: 4px solid #007bff;
            padding: 10px;
            margin-top: 15px;
            font-style: italic;
        }
        .slide-counter {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${slides.map((slide, index) => `
        <div class="slide">
            <div class="slide-counter">Slide ${index + 1} of ${slides.length}</div>
            <h2>${slide.title}</h2>
            ${Array.isArray(slide.content) ? `
                <ul>
                    ${slide.content.map(item => `<li>${item}</li>`).join('')}
                </ul>
            ` : `<p>${slide.content}</p>`}
            ${includeNotes && slide.speakerNotes ? `
                <div class="speaker-notes">
                    <strong>Speaker Notes:</strong> ${slide.speakerNotes}
                </div>
            ` : ''}
        </div>
    `).join('')}
</body>
</html>`;

    const filename = `${title.replace(/[^a-z0-9]/gi, '_')}.html`;

    if (window.common) {
        window.common.downloadAsFile(htmlContent, filename, 'text/html');
    }
}

/**
 * Export as PDF (placeholder - requires external library)
 */
async function exportAsPDF(includeNotes) {
    if (typeof jsPDF === 'undefined') {
        throw new Error('PDF export library not loaded');
    }

    // Implementation would use jsPDF or similar library
    throw new Error('PDF export not yet implemented');
}

/**
 * Export as PowerPoint (placeholder - requires external library)
 */
async function exportAsPowerPoint(includeNotes) {
    if (typeof PptxGenJS === 'undefined') {
        throw new Error('PowerPoint export library not loaded');
    }

    // Implementation would use PptxGenJS or similar library
    throw new Error('PowerPoint export not yet implemented');
}

/**
 * Close presentation viewer
 */
function closePresentationViewer() {
    if (slidesDom.presentationViewer) {
        slidesDom.presentationViewer.style.display = 'none';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeSlides);

// Export functions for global access
if (typeof window !== 'undefined') {
    window.slidesMain = {
        initializeSlides,
        generatePresentation,
        exportPresentation,
        displaySlides
    };
}