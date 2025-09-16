// PDFKit Integration for Professional PDF Exports
// Enhanced PDF generation with better layout and typography

let PDFDocument;
let blobStream;

// Load PDFKit dependencies
async function loadPDFKit() {
    if (typeof PDFDocument !== 'undefined') return true;

    try {
        // Load PDFKit and blob-stream
        const pdfkitScript = document.createElement('script');
        pdfkitScript.src = 'https://unpkg.com/pdfkit@0.13.0/js/pdfkit.standalone.js';

        const blobStreamScript = document.createElement('script');
        blobStreamScript.src = 'https://unpkg.com/blob-stream@0.1.3/blob-stream.js';

        await Promise.all([
            new Promise((resolve, reject) => {
                pdfkitScript.onload = resolve;
                pdfkitScript.onerror = reject;
                document.head.appendChild(pdfkitScript);
            }),
            new Promise((resolve, reject) => {
                blobStreamScript.onload = resolve;
                blobStreamScript.onerror = reject;
                document.head.appendChild(blobStreamScript);
            })
        ]);

        PDFDocument = window.PDFDocument;
        blobStream = window.blobStream;

        console.log('PDFKit loaded successfully');
        return true;
    } catch (error) {
        console.error('Failed to load PDFKit:', error);
        return false;
    }
}

class ProfessionalPDFExporter {
    constructor(slideData, options = {}) {
        this.slideData = slideData;
        this.options = {
            pageSize: 'LETTER',
            margin: 50,
            includeNotes: false,
            theme: 'white',
            font: 'Helvetica',
            ...options
        };

        this.doc = null;
        this.stream = null;
    }

    async generatePDF() {
        try {
            const loaded = await loadPDFKit();
            if (!loaded) {
                throw new Error('Failed to load PDFKit dependencies');
            }

            // Create PDF document
            this.doc = new PDFDocument({
                size: this.options.pageSize,
                margin: this.options.margin,
                info: {
                    Title: this.slideData.title || 'Presentation',
                    Author: 'AI Slides Creator',
                    Subject: 'AI-Generated Presentation',
                    Creator: 'Slides Creator App'
                }
            });

            // Create blob stream
            this.stream = this.doc.pipe(blobStream());

            // Add title page
            this.addTitlePage();

            // Add slides
            for (let i = 0; i < this.slideData.slides.length; i++) {
                const slide = this.slideData.slides[i];
                this.doc.addPage();
                this.addSlide(slide, i + 1);
            }

            // Add notes section if requested
            if (this.options.includeNotes && this.hasNotes()) {
                this.addNotesSection();
            }

            // Finalize PDF
            this.doc.end();

            // Return blob promise
            return new Promise((resolve, reject) => {
                this.stream.on('finish', () => {
                    try {
                        const blob = this.stream.toBlob('application/pdf');
                        resolve(blob);
                    } catch (error) {
                        reject(error);
                    }
                });

                this.stream.on('error', reject);
            });

        } catch (error) {
            console.error('PDF generation error:', error);
            throw error;
        }
    }

    addTitlePage() {
        const { doc } = this;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;

        // Title
        doc.fontSize(28)
           .font('Helvetica-Bold')
           .fillColor('#2563eb')
           .text(this.slideData.title || 'Untitled Presentation',
                 this.options.margin,
                 pageHeight / 3,
                 { align: 'center', width: pageWidth - (this.options.margin * 2) });

        // Subtitle/Date
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        doc.fontSize(14)
           .font('Helvetica')
           .fillColor('#6b7280')
           .text(`Generated on ${dateStr}`,
                 this.options.margin,
                 pageHeight / 2,
                 { align: 'center', width: pageWidth - (this.options.margin * 2) });

        // Slide count
        doc.fontSize(12)
           .text(`${this.slideData.slides.length} slides`,
                 this.options.margin,
                 pageHeight / 2 + 30,
                 { align: 'center', width: pageWidth - (this.options.margin * 2) });

        // Footer
        doc.fontSize(10)
           .fillColor('#9ca3af')
           .text('Created with AI Slides Creator',
                 this.options.margin,
                 pageHeight - 100,
                 { align: 'center', width: pageWidth - (this.options.margin * 2) });
    }

    addSlide(slide, slideNumber) {
        const { doc } = this;
        const pageWidth = doc.page.width;
        const margin = this.options.margin;
        let y = margin;

        // Header with slide number
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#9ca3af')
           .text(`Slide ${slideNumber}`, pageWidth - margin - 60, margin - 10, { width: 60, align: 'right' });

        // Slide title
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .fillColor('#1f2937')
           .text(slide.title, margin, y, { width: pageWidth - (margin * 2) });

        y += 50;

        // Slide content
        if (slide.content && slide.content.length > 0) {
            doc.fontSize(12)
               .font('Helvetica')
               .fillColor('#374151');

            slide.content.forEach((item, index) => {
                if (y > doc.page.height - 100) {
                    // Start new page if content doesn't fit
                    doc.addPage();
                    y = margin;

                    // Add continuation header
                    doc.fontSize(10)
                       .fillColor('#9ca3af')
                       .text(`Slide ${slideNumber} (continued)`, pageWidth - margin - 100, margin - 10, { width: 100, align: 'right' });

                    y += 20;
                    doc.fontSize(12).fillColor('#374151');
                }

                // Bullet point
                doc.circle(margin + 5, y + 6, 2)
                   .fillAndStroke('#6b7280', '#6b7280');

                // Content text
                const textOptions = {
                    width: pageWidth - margin * 2 - 20,
                    continued: false
                };

                doc.text(this.cleanText(item), margin + 15, y, textOptions);
                y += doc.heightOfString(this.cleanText(item), textOptions) + 8;
            });
        }

        // Visual design elements (if any)
        if (slide.visualDesign) {
            this.addVisualElements(slide.visualDesign, slideNumber);
        }

        // Speaker notes (if included and available)
        if (this.options.includeNotes && slide.speakerNotes) {
            y += 20;
            if (y > doc.page.height - 150) {
                doc.addPage();
                y = margin;
            }

            doc.fontSize(10)
               .font('Helvetica-Oblique')
               .fillColor('#6b7280')
               .text('Speaker Notes:', margin, y);

            y += 15;

            doc.fontSize(9)
               .font('Helvetica')
               .fillColor('#9ca3af')
               .text(this.cleanText(slide.speakerNotes), margin, y, {
                   width: pageWidth - (margin * 2)
               });
        }
    }

    addVisualElements(visualDesign, slideNumber) {
        // Add basic visual elements representation
        const { doc } = this;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;

        // Add color accent if background color is specified
        if (visualDesign.backgroundColor && visualDesign.backgroundColor !== '#ffffff') {
            const color = this.hexToRgb(visualDesign.backgroundColor);
            if (color) {
                doc.rect(pageWidth - 100, 50, 50, pageHeight - 150)
                   .fillOpacity(0.1)
                   .fill(color.r, color.g, color.b)
                   .fillOpacity(1);
            }
        }

        // Add design elements as simple shapes
        if (visualDesign.designElements) {
            visualDesign.designElements.forEach((element, index) => {
                this.addSimpleDesignElement(element, index, pageWidth, pageHeight);
            });
        }
    }

    addSimpleDesignElement(element, index, pageWidth, pageHeight) {
        const { doc } = this;

        // Simple representation of design elements
        const positions = {
            'top-right': { x: pageWidth - 120, y: 80 },
            'center-right': { x: pageWidth - 120, y: pageHeight / 2 },
            'bottom-center': { x: pageWidth / 2, y: pageHeight - 120 },
            'center-left': { x: 80, y: pageHeight / 2 }
        };

        const pos = positions[element.position] || positions['center-right'];

        switch (element.type) {
            case 'organic-shape':
                // Simple circle to represent organic shapes
                doc.circle(pos.x, pos.y, 20)
                   .fillOpacity(0.2)
                   .fill('#3b82f6')
                   .fillOpacity(1);
                break;

            case 'polyline-accent':
                // Simple line
                doc.moveTo(pos.x - 30, pos.y)
                   .lineTo(pos.x + 30, pos.y - 10)
                   .lineTo(pos.x + 20, pos.y + 10)
                   .stroke('#3b82f6');
                break;

            default:
                // Default rectangle
                doc.rect(pos.x - 15, pos.y - 15, 30, 30)
                   .fillOpacity(0.1)
                   .fill('#6b7280')
                   .fillOpacity(1);
                break;
        }
    }

    addNotesSection() {
        const { doc } = this;
        const pageWidth = doc.page.width;
        const margin = this.options.margin;

        doc.addPage();

        // Section title
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .fillColor('#1f2937')
           .text('Speaker Notes', margin, margin);

        let y = margin + 40;

        this.slideData.slides.forEach((slide, index) => {
            if (slide.speakerNotes) {
                if (y > doc.page.height - 100) {
                    doc.addPage();
                    y = margin;
                }

                // Slide reference
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .fillColor('#374151')
                   .text(`Slide ${index + 1}: ${slide.title}`, margin, y);

                y += 20;

                // Notes content
                doc.fontSize(10)
                   .font('Helvetica')
                   .fillColor('#6b7280')
                   .text(this.cleanText(slide.speakerNotes), margin, y, {
                       width: pageWidth - (margin * 2)
                   });

                y += doc.heightOfString(this.cleanText(slide.speakerNotes), {
                    width: pageWidth - (margin * 2)
                }) + 20;
            }
        });
    }

    hasNotes() {
        return this.slideData.slides.some(slide => slide.speakerNotes && slide.speakerNotes.trim());
    }

    cleanText(text) {
        if (!text) return '';
        return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
}

// PDF Export function
async function exportToPDF(slideData, options = {}) {
    try {
        const exporter = new ProfessionalPDFExporter(slideData, options);
        const pdfBlob = await exporter.generatePDF();

        // Create download link
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${slideData.title || 'presentation'}.pdf`;

        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        return true;
    } catch (error) {
        console.error('PDF export failed:', error);
        throw error;
    }
}

// Export for use in slides_main.js
window.PDFKitExporter = {
    exportToPDF,
    ProfessionalPDFExporter
};