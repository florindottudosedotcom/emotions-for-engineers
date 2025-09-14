import { SlidesProvider } from './providers/slides.js';

const appState = {
    currentSlideData: null,
    isGenerating: false
};

const dom = {};
let currentProvider = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Slides Creator...');

    // Set current provider
    currentProvider = SlidesProvider;

    // Update page title
    document.title = `${currentProvider.name} Creator`;

    // Inject provider-specific template
    const providerSection = document.getElementById('provider-section');
    if (providerSection) {
        providerSection.innerHTML = currentProvider.getTemplate();
    }

    // Get DOM elements
    dom.presentationTopicTextarea = document.getElementById('presentation-topic');
    dom.numSlidesSelect = document.getElementById('num-slides');
    dom.generateSlidesBtn = document.getElementById('generate-slides-btn');
    dom.generationStatus = document.getElementById('generation-status');
    dom.presentationSection = document.getElementById('presentation-section');
    dom.presentationTitle = document.getElementById('presentation-title');
    dom.totalSlides = document.getElementById('total-slides');
    dom.slidesPreview = document.getElementById('slides-preview');
    dom.previewPresentationBtn = document.getElementById('preview-presentation-btn');
    dom.regenerateSlidesBtn = document.getElementById('regenerate-slides-btn');
    dom.presentationViewer = document.getElementById('presentation-viewer');
    dom.closePresentationBtn = document.getElementById('close-presentation-btn');
    dom.revealPresentation = document.getElementById('reveal-presentation');

    // Export buttons
    dom.exportPdfBtn = document.getElementById('export-pdf-btn');
    dom.exportPptxBtn = document.getElementById('export-pptx-btn');
    dom.exportHtmlBtn = document.getElementById('export-html-btn');
    dom.exportJsonBtn = document.getElementById('export-json-btn');
    dom.exportStatus = document.getElementById('export-status');

    // Initialize provider
    currentProvider.init(dom, appState);

    // Event listeners
    dom.generateSlidesBtn.addEventListener('click', generatePresentation);
    dom.regenerateSlidesBtn.addEventListener('click', generatePresentation);
    dom.previewPresentationBtn.addEventListener('click', showPresentationViewer);
    dom.closePresentationBtn.addEventListener('click', closePresentationViewer);

    // Export event listeners
    dom.exportPdfBtn.addEventListener('click', () => exportPresentation('pdf'));
    dom.exportPptxBtn.addEventListener('click', () => exportPresentation('pptx'));
    dom.exportHtmlBtn.addEventListener('click', () => exportPresentation('html'));
    dom.exportJsonBtn.addEventListener('click', () => exportPresentation('json'));

    console.log('Slides Creator initialized successfully');
});

async function generatePresentation() {
    const topic = dom.presentationTopicTextarea.value.trim();
    const slideCount = parseInt(dom.numSlidesSelect.value);

    if (!topic) {
        updateGenerationStatus('Please enter a presentation topic.', 'error');
        return;
    }

    if (appState.isGenerating) {
        updateGenerationStatus('Generation already in progress...', 'warning');
        return;
    }

    try {
        appState.isGenerating = true;
        dom.generateSlidesBtn.disabled = true;
        dom.regenerateSlidesBtn.disabled = true;

        updateGenerationStatus('🎨 Generating AI-powered presentation...', 'loading');

        // Generate slide content using the provider
        const slideData = await currentProvider.generateSlideContent(topic, slideCount);

        if (!slideData || !slideData.slides || slideData.slides.length === 0) {
            throw new Error('No slide data generated');
        }

        appState.currentSlideData = slideData;

        // Update UI with generated slides
        updatePresentationPreview(slideData);
        showPresentationSection();

        updateGenerationStatus(`✅ Generated ${slideData.slides.length} slides successfully!`, 'success');

    } catch (error) {
        console.error('Error generating presentation:', error);
        updateGenerationStatus(`❌ Error: ${error.message}`, 'error');
    } finally {
        appState.isGenerating = false;
        dom.generateSlidesBtn.disabled = false;
        dom.regenerateSlidesBtn.disabled = false;
    }
}

function updatePresentationPreview(slideData) {
    // Update title and slide count
    dom.presentationTitle.textContent = slideData.title || 'Generated Presentation';
    dom.totalSlides.textContent = slideData.slides.length;

    // Clear existing slides
    dom.slidesPreview.innerHTML = '';

    // Generate slide previews
    slideData.slides.forEach((slide, index) => {
        const slideElement = createSlidePreviewElement(slide, index + 1);
        dom.slidesPreview.appendChild(slideElement);
    });
}

function createSlidePreviewElement(slide, slideNumber) {
    const slideDiv = document.createElement('div');
    slideDiv.className = 'slide-preview';

    // Apply background color if provided
    if (slide.visualDesign && slide.visualDesign.backgroundColor) {
        slideDiv.style.background = slide.visualDesign.backgroundColor;
        slideDiv.style.color = slide.visualDesign.textColor || '#ffffff';
    }

    slideDiv.innerHTML = `
        <h3>Slide ${slideNumber}: ${slide.title}</h3>
        ${slide.content && slide.content.length > 0 ?
            `<ul>${slide.content.map(point => `<li>${point}</li>`).join('')}</ul>` :
            '<p><em>No content specified</em></p>'
        }

        ${slide.visualDesign ? `
            <div class="visual-design-info">
                <strong>Visual Design:</strong>
                Layout: ${slide.visualDesign.layout || 'center-text'} |
                Colors: ${slide.visualDesign.backgroundColor || '#ffffff'} / ${slide.visualDesign.textColor || '#000000'} |
                Accent: ${slide.visualDesign.accentColor || 'none'}
                ${slide.visualDesign.imageDescription ? `<br><strong>Image:</strong> ${slide.visualDesign.imageDescription}` : ''}
                ${slide.visualDesign.shapes && slide.visualDesign.shapes.length > 0 ?
                    `<br><strong>Shapes:</strong> ${slide.visualDesign.shapes.map(s => `${s.type} (${s.color})`).join(', ')}` : ''
                }
            </div>
        ` : ''}

        ${slide.speakerNotes ? `
            <div style="margin-top: 10px; font-size: 0.9em; font-style: italic; opacity: 0.8;">
                <strong>Speaker Notes:</strong> ${slide.speakerNotes}
            </div>
        ` : ''}
    `;

    return slideDiv;
}

function showPresentationSection() {
    dom.presentationSection.style.display = 'block';
    dom.presentationSection.scrollIntoView({ behavior: 'smooth' });
}

function showPresentationViewer() {
    if (!appState.currentSlideData) {
        updateGenerationStatus('No presentation data available', 'error');
        return;
    }

    // Create Reveal.js presentation
    createRevealPresentation(appState.currentSlideData);

    // Show the viewer
    dom.presentationViewer.style.display = 'block';
    dom.presentationViewer.scrollIntoView({ behavior: 'smooth' });

    // Initialize Reveal.js (will be implemented with Reveal.js integration)
    console.log('Reveal.js presentation ready');
}

function closePresentationViewer() {
    dom.presentationViewer.style.display = 'none';
    dom.presentationSection.scrollIntoView({ behavior: 'smooth' });
}

function createRevealPresentation(slideData) {
    const slidesContainer = dom.revealPresentation.querySelector('.slides');
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
    if (!appState.currentSlideData) {
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
                updateExportStatus('PDF export requires Reveal.js integration (coming soon)', 'warning');
                break;
            case 'pptx':
                updateExportStatus('PowerPoint export requires PptxGenJS library (coming soon)', 'warning');
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
    const dataStr = JSON.stringify(appState.currentSlideData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${appState.currentSlideData.title || 'presentation'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    updateExportStatus('✅ JSON exported successfully!', 'success');
}

function exportHTML() {
    const htmlContent = generateStandaloneHTML(appState.currentSlideData);
    const dataBlob = new Blob([htmlContent], {type: 'text/html'});

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${appState.currentSlideData.title || 'presentation'}.html`;
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

function updateGenerationStatus(message, type) {
    if (!dom.generationStatus) return;

    dom.generationStatus.textContent = message;
    dom.generationStatus.className = `status-display status-${type}`;
}

function updateExportStatus(message, type) {
    if (!dom.exportStatus) return;

    dom.exportStatus.textContent = message;
    dom.exportStatus.className = `status-display status-${type}`;
}

// Make provider globally available for debugging
window.currentProvider = currentProvider;
window.appState = appState;