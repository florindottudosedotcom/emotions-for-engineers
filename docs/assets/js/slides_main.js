// Slides functionality - works with any provider (cloud, webllm, ollama)
const slidesAppState = {
    currentSlideData: null,
    isGenerating: false
};

const slidesDom = {};

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

    if (slidesDom.previewPresentationBtn) {
        slidesDom.previewPresentationBtn.addEventListener('click', showPresentationViewer);
    }

    if (slidesDom.closePresentationBtn) {
        slidesDom.closePresentationBtn.addEventListener('click', closePresentationViewer);
    }

    // Export event listeners
    if (slidesDom.exportPdfBtn) slidesDom.exportPdfBtn.addEventListener('click', () => exportPresentation('pdf'));
    if (slidesDom.exportPptxBtn) slidesDom.exportPptxBtn.addEventListener('click', () => exportPresentation('pptx'));
    if (slidesDom.exportHtmlBtn) slidesDom.exportHtmlBtn.addEventListener('click', () => exportPresentation('html'));
    if (slidesDom.exportJsonBtn) slidesDom.exportJsonBtn.addEventListener('click', () => exportPresentation('json'));

    console.log('Slides Creator functionality initialized successfully');
});

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
- Use professional color schemes (dark/light themes)
- Suggest relevant shapes: circle, rectangle, triangle, arrow
- Position options: top-left, top-right, bottom-left, bottom-right, center
- Layout options: left-text, center-text, right-text, full-width
- Size options: small, medium, large
- Provide specific image descriptions that match the content

Return ONLY the JSON, no additional text.`;
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
        updatePresentationPreview(slideData);
        showPresentationSection();

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

function updatePresentationPreview(slideData) {
    // Update title and slide count
    slidesDom.presentationTitle.textContent = slideData.title || 'Generated Presentation';
    slidesDom.totalSlides.textContent = slideData.slides.length;

    // Clear existing slides
    slidesDom.slidesPreview.innerHTML = '';

    // Generate slide previews
    slideData.slides.forEach((slide, index) => {
        const slideElement = createSlidePreviewElement(slide, index + 1);
        slidesDom.slidesPreview.appendChild(slideElement);
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

function updateGenerationStatus(message, type) {
    if (!slidesDom.generationStatus) return;

    slidesDom.generationStatus.textContent = message;
    slidesDom.generationStatus.className = `status-display status-${type}`;
}

function updateExportStatus(message, type) {
    if (!slidesDom.exportStatus) return;

    slidesDom.exportStatus.textContent = message;
    slidesDom.exportStatus.className = `status-display status-${type}`;
}

// Make slides functionality globally available for debugging
window.slidesAppState = slidesAppState;