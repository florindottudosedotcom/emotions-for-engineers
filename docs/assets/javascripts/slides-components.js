/**
 * Slides Components
 *
 * Reusable UI components for slide creator functionality.
 * Extracted from slides_main.js as part of the modular architecture optimization.
 */

import {
    COLOR_THEMES,
    slidesAppState,
    slidesDom,
    getCurrentTheme,
    setCurrentTheme,
    saveSlides,
    showUserMessage,
    createDomElement,
    debounce
} from './slides-common.js';

/**
 * Theme Selector Component
 * Creates and manages the color theme selection interface
 */
export class ThemeSelector {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            showCustomColors: true,
            onThemeChange: null,
            ...options
        };
        this.container = null;
        this.currentTheme = getCurrentTheme();
        this.init();
    }

    init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.warn(`Theme selector container ${this.containerId} not found`);
            return;
        }

        this.render();
        this.bindEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="theme-selector">
                <h3>Choose Color Theme</h3>
                <div class="theme-tiles">
                    ${Object.keys(COLOR_THEMES).map(themeKey => this.renderThemeTile(themeKey)).join('')}
                </div>
                ${this.options.showCustomColors ? this.renderCustomColorsSection() : ''}
            </div>
        `;

        // Mark current theme as selected
        this.updateSelection();
    }

    renderThemeTile(themeKey) {
        const theme = COLOR_THEMES[themeKey];
        return `
            <div class="theme-tile" data-theme="${themeKey}" title="${theme.name}">
                <div class="theme-preview" style="
                    background: linear-gradient(135deg,
                        ${theme.backgroundColor} 0%,
                        ${theme.fillColor} 50%,
                        ${theme.borderColor} 100%);
                    border: 2px solid ${theme.borderColor};
                ">
                    <div class="theme-text-sample" style="color: ${theme.textColor};">Aa</div>
                </div>
                <div class="theme-name">${theme.name}</div>
            </div>
        `;
    }

    renderCustomColorsSection() {
        return `
            <div class="custom-colors-section">
                <h4>Custom Colors</h4>
                <div class="color-inputs">
                    <div class="color-input-group">
                        <label>Text Color:</label>
                        <input type="color" id="custom-text-color" value="#000000">
                    </div>
                    <div class="color-input-group">
                        <label>Background:</label>
                        <input type="color" id="custom-bg-color" value="#ffffff">
                    </div>
                    <div class="color-input-group">
                        <label>Accent:</label>
                        <input type="color" id="custom-accent-color" value="#0066cc">
                    </div>
                </div>
                <button type="button" class="btn btn-secondary" id="apply-custom-theme">
                    Apply Custom Theme
                </button>
            </div>
        `;
    }

    bindEvents() {
        // Theme tile selection
        this.container.addEventListener('click', (e) => {
            const themeTile = e.target.closest('.theme-tile');
            if (themeTile) {
                this.selectTheme(themeTile.dataset.theme);
            }
        });

        // Custom colors
        if (this.options.showCustomColors) {
            const applyBtn = this.container.querySelector('#apply-custom-theme');
            if (applyBtn) {
                applyBtn.addEventListener('click', () => this.applyCustomTheme());
            }
        }
    }

    selectTheme(themeKey) {
        if (!COLOR_THEMES[themeKey]) return;

        this.currentTheme = themeKey;
        setCurrentTheme(themeKey);
        this.updateSelection();

        if (this.options.onThemeChange) {
            this.options.onThemeChange(themeKey, COLOR_THEMES[themeKey]);
        }

        showUserMessage(`Applied ${COLOR_THEMES[themeKey].name} theme`, 'success');
    }

    applyCustomTheme() {
        const textColor = this.container.querySelector('#custom-text-color')?.value || '#000000';
        const bgColor = this.container.querySelector('#custom-bg-color')?.value || '#ffffff';
        const accentColor = this.container.querySelector('#custom-accent-color')?.value || '#0066cc';

        const customTheme = {
            name: 'Custom Theme',
            textColor: textColor,
            borderColor: accentColor,
            fillColor: this.lightenColor(bgColor, 0.1),
            backgroundColor: bgColor
        };

        // Add to COLOR_THEMES
        COLOR_THEMES.custom = customTheme;

        // Re-render to include custom theme
        this.render();

        // Select the custom theme
        this.selectTheme('custom');
    }

    updateSelection() {
        const tiles = this.container.querySelectorAll('.theme-tile');
        tiles.forEach(tile => {
            tile.classList.toggle('selected', tile.dataset.theme === this.currentTheme);
        });
    }

    lightenColor(color, amount) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * amount * 100);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
}

/**
 * Slide Preview Component
 * Renders individual slide previews with editing capabilities
 */
export class SlidePreview {
    constructor(slide, index, options = {}) {
        this.slide = slide;
        this.index = index;
        this.options = {
            editable: true,
            theme: getCurrentTheme(),
            onContentChange: null,
            ...options
        };
        this.element = null;
    }

    render() {
        const theme = COLOR_THEMES[this.options.theme] || COLOR_THEMES.lavender;

        this.element = createDomElement('div', {
            className: 'slide-preview',
            style: {
                backgroundColor: theme.backgroundColor,
                border: `2px solid ${theme.borderColor}`,
                borderRadius: '8px',
                margin: '20px 0',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }
        });

        this.element.innerHTML = `
            <div class="slide-header">
                <h3 class="slide-title" style="color: ${theme.textColor};" ${this.options.editable ? 'contenteditable="true"' : ''}>
                    ${this.escapeHtml(this.slide.title)}
                </h3>
                <span class="slide-counter" style="color: ${theme.borderColor};">
                    Slide ${this.index + 1}
                </span>
            </div>
            <div class="slide-content">
                ${this.renderContent()}
            </div>
            <div class="visual-design-info" style="background-color: ${theme.fillColor};">
                ${this.renderVisualDesign()}
            </div>
            ${this.options.editable ? this.renderEditControls() : ''}
        `;

        if (this.options.editable) {
            this.bindEditEvents();
        }

        return this.element;
    }

    renderContent() {
        if (!Array.isArray(this.slide.content)) return '';

        return `
            <ul class="slide-content-list">
                ${this.slide.content.map((item, i) => `
                    <li ${this.options.editable ? 'contenteditable="true"' : ''} data-index="${i}">
                        ${this.escapeHtml(item)}
                    </li>
                `).join('')}
            </ul>
            ${this.options.editable ? `
                <button type="button" class="btn btn-sm add-content-btn">+ Add Bullet Point</button>
            ` : ''}
        `;
    }

    renderVisualDesign() {
        const design = this.slide.visualDesign || {};
        return `
            <strong>Visual Design:</strong>
            Layout: ${design.layout || 'Standard'} |
            Theme: ${design.theme || 'Default'} |
            Elements: ${design.shapes?.length || 0} shapes
        `;
    }

    renderEditControls() {
        return `
            <div class="slide-edit-controls">
                <button type="button" class="btn btn-sm btn-secondary duplicate-slide-btn">
                    📋 Duplicate
                </button>
                <button type="button" class="btn btn-sm btn-danger delete-slide-btn">
                    🗑️ Delete
                </button>
                <button type="button" class="btn btn-sm btn-primary edit-design-btn">
                    🎨 Edit Design
                </button>
            </div>
        `;
    }

    bindEditEvents() {
        if (!this.element) return;

        // Title editing
        const titleElement = this.element.querySelector('.slide-title');
        if (titleElement) {
            titleElement.addEventListener('blur', () => {
                this.slide.title = titleElement.textContent.trim();
                this.notifyChange();
            });
        }

        // Content editing
        const contentItems = this.element.querySelectorAll('.slide-content-list li');
        contentItems.forEach((item, index) => {
            item.addEventListener('blur', () => {
                this.slide.content[index] = item.textContent.trim();
                this.notifyChange();
            });
        });

        // Add content button
        const addBtn = this.element.querySelector('.add-content-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.slide.content.push('New bullet point');
                this.refresh();
                this.notifyChange();
            });
        }

        // Control buttons
        this.bindControlButtons();
    }

    bindControlButtons() {
        const duplicateBtn = this.element.querySelector('.duplicate-slide-btn');
        const deleteBtn = this.element.querySelector('.delete-slide-btn');
        const editDesignBtn = this.element.querySelector('.edit-design-btn');

        if (duplicateBtn) {
            duplicateBtn.addEventListener('click', () => this.duplicateSlide());
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteSlide());
        }

        if (editDesignBtn) {
            editDesignBtn.addEventListener('click', () => this.editDesign());
        }
    }

    duplicateSlide() {
        if (this.options.onSlideAction) {
            this.options.onSlideAction('duplicate', this.index, this.slide);
        }
    }

    deleteSlide() {
        if (confirm('Are you sure you want to delete this slide?')) {
            if (this.options.onSlideAction) {
                this.options.onSlideAction('delete', this.index, this.slide);
            }
        }
    }

    editDesign() {
        if (this.options.onSlideAction) {
            this.options.onSlideAction('editDesign', this.index, this.slide);
        }
    }

    refresh() {
        if (this.element && this.element.parentNode) {
            const newElement = this.render();
            this.element.parentNode.replaceChild(newElement, this.element);
        }
    }

    notifyChange() {
        if (this.options.onContentChange) {
            this.options.onContentChange(this.slide, this.index);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/**
 * Export Options Component
 * Manages the export modal and functionality
 */
export class ExportOptions {
    constructor(containerId, slideData, options = {}) {
        this.containerId = containerId;
        this.slideData = slideData;
        this.options = {
            formats: ['pdf', 'pptx', 'html', 'json'],
            onExport: null,
            ...options
        };
        this.modal = null;
        this.init();
    }

    init() {
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        // Create modal backdrop
        this.modal = createDomElement('div', {
            id: 'export-modal',
            className: 'export-modal',
            style: {
                display: 'none',
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 1000,
                justifyContent: 'center',
                alignItems: 'center'
            }
        });

        // Modal content
        const modalContent = createDomElement('div', {
            className: 'export-modal-content',
            style: {
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '30px',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }
        });

        modalContent.innerHTML = `
            <div class="export-modal-header">
                <h2>Export Presentation</h2>
                <button type="button" class="close-modal-btn" id="close-export-modal-btn">&times;</button>
            </div>
            <div class="export-modal-body">
                <p>Choose your preferred export format:</p>
                <div class="export-format-grid">
                    ${this.renderExportFormats()}
                </div>
                <div class="export-status" id="export-status"></div>
            </div>
        `;

        this.modal.appendChild(modalContent);
        document.body.appendChild(this.modal);
    }

    renderExportFormats() {
        const formatInfo = {
            pdf: { icon: '📄', name: 'PDF Document', desc: 'Portable document format' },
            pptx: { icon: '📊', name: 'PowerPoint', desc: 'Microsoft PowerPoint format' },
            html: { icon: '🌐', name: 'HTML Slides', desc: 'Web-based presentation' },
            json: { icon: '📋', name: 'JSON Data', desc: 'Raw slide data' }
        };

        return this.options.formats.map(format => {
            const info = formatInfo[format];
            return `
                <div class="export-format-card" data-format="${format}">
                    <div class="export-format-icon">${info.icon}</div>
                    <div class="export-format-name">${info.name}</div>
                    <div class="export-format-desc">${info.desc}</div>
                    <button type="button" class="btn btn-primary export-btn" data-format="${format}">
                        Export as ${format.toUpperCase()}
                    </button>
                </div>
            `;
        }).join('');
    }

    bindEvents() {
        // Close modal events
        const closeBtn = this.modal.querySelector('#close-export-modal-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // Export button events
        const exportBtns = this.modal.querySelectorAll('.export-btn');
        exportBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.export(btn.dataset.format);
            });
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'flex') {
                this.hide();
            }
        });
    }

    show() {
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    hide() {
        this.modal.style.display = 'none';
        document.body.style.overflow = ''; // Restore scroll
    }

    async export(format) {
        const statusEl = this.modal.querySelector('#export-status');
        const exportBtn = this.modal.querySelector(`[data-format="${format}"]`);

        try {
            exportBtn.disabled = true;
            exportBtn.textContent = 'Exporting...';
            statusEl.textContent = `Preparing ${format.toUpperCase()} export...`;
            statusEl.className = 'export-status exporting';

            if (this.options.onExport) {
                await this.options.onExport(format, this.slideData);
            }

            statusEl.textContent = `${format.toUpperCase()} export completed!`;
            statusEl.className = 'export-status success';

            setTimeout(() => this.hide(), 2000);
        } catch (error) {
            console.error(`Export failed:`, error);
            statusEl.textContent = `Export failed: ${error.message}`;
            statusEl.className = 'export-status error';
        } finally {
            exportBtn.disabled = false;
            exportBtn.textContent = `Export as ${format.toUpperCase()}`;
        }
    }

    updateSlideData(newSlideData) {
        this.slideData = newSlideData;
    }
}

/**
 * Slide Progress Indicator Component
 */
export class SlideProgressIndicator {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            showPercentage: true,
            showStepName: true,
            ...options
        };
        this.container = null;
        this.init();
    }

    init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.warn(`Progress indicator container ${this.containerId} not found`);
            return;
        }
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="slide-progress-indicator">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="progress-info">
                    <span class="progress-percentage">0%</span>
                    <span class="progress-step">Ready</span>
                </div>
            </div>
        `;
    }

    update(percentage, stepName = '') {
        if (!this.container) return;

        const fillEl = this.container.querySelector('.progress-fill');
        const percentageEl = this.container.querySelector('.progress-percentage');
        const stepEl = this.container.querySelector('.progress-step');

        if (fillEl) {
            fillEl.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        }

        if (percentageEl && this.options.showPercentage) {
            percentageEl.textContent = `${Math.round(percentage)}%`;
        }

        if (stepEl && this.options.showStepName) {
            stepEl.textContent = stepName;
        }
    }

    complete(message = 'Complete!') {
        this.update(100, message);
        setTimeout(() => {
            if (this.container) {
                this.container.classList.add('completed');
            }
        }, 500);
    }

    error(message = 'Error occurred') {
        if (this.container) {
            this.container.classList.add('error');
            const stepEl = this.container.querySelector('.progress-step');
            if (stepEl) {
                stepEl.textContent = message;
            }
        }
    }

    reset() {
        if (this.container) {
            this.container.classList.remove('completed', 'error');
            this.update(0, 'Ready');
        }
    }
}

/**
 * Slides Navigation Component
 * For navigating between slides in presentation mode
 */
export class SlidesNavigation {
    constructor(slides, options = {}) {
        this.slides = slides;
        this.currentSlide = 0;
        this.options = {
            showCounter: true,
            showThumbnails: false,
            onSlideChange: null,
            ...options
        };
        this.element = null;
    }

    render() {
        this.element = createDomElement('div', {
            className: 'slides-navigation'
        });

        this.element.innerHTML = `
            <div class="nav-controls">
                <button type="button" class="nav-btn prev-btn" ${this.currentSlide === 0 ? 'disabled' : ''}>
                    ◀ Previous
                </button>
                ${this.options.showCounter ? `
                    <span class="slide-counter">
                        <span class="current-slide">${this.currentSlide + 1}</span> /
                        <span class="total-slides">${this.slides.length}</span>
                    </span>
                ` : ''}
                <button type="button" class="nav-btn next-btn" ${this.currentSlide === this.slides.length - 1 ? 'disabled' : ''}>
                    Next ▶
                </button>
            </div>
            ${this.options.showThumbnails ? this.renderThumbnails() : ''}
        `;

        this.bindEvents();
        return this.element;
    }

    renderThumbnails() {
        return `
            <div class="slide-thumbnails">
                ${this.slides.map((slide, index) => `
                    <div class="thumbnail ${index === this.currentSlide ? 'active' : ''}" data-slide="${index}">
                        <div class="thumbnail-content">
                            ${slide.title}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    bindEvents() {
        if (!this.element) return;

        const prevBtn = this.element.querySelector('.prev-btn');
        const nextBtn = this.element.querySelector('.next-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousSlide());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextSlide());
        }

        // Thumbnail clicks
        if (this.options.showThumbnails) {
            this.element.addEventListener('click', (e) => {
                const thumbnail = e.target.closest('.thumbnail');
                if (thumbnail) {
                    this.goToSlide(parseInt(thumbnail.dataset.slide));
                }
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.previousSlide();
            if (e.key === 'ArrowRight') this.nextSlide();
        });
    }

    previousSlide() {
        if (this.currentSlide > 0) {
            this.goToSlide(this.currentSlide - 1);
        }
    }

    nextSlide() {
        if (this.currentSlide < this.slides.length - 1) {
            this.goToSlide(this.currentSlide + 1);
        }
    }

    goToSlide(index) {
        if (index >= 0 && index < this.slides.length) {
            this.currentSlide = index;
            this.updateNavigation();

            if (this.options.onSlideChange) {
                this.options.onSlideChange(index, this.slides[index]);
            }
        }
    }

    updateNavigation() {
        if (!this.element) return;

        // Update counter
        const currentEl = this.element.querySelector('.current-slide');
        if (currentEl) {
            currentEl.textContent = this.currentSlide + 1;
        }

        // Update button states
        const prevBtn = this.element.querySelector('.prev-btn');
        const nextBtn = this.element.querySelector('.next-btn');

        if (prevBtn) {
            prevBtn.disabled = this.currentSlide === 0;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentSlide === this.slides.length - 1;
        }

        // Update thumbnails
        if (this.options.showThumbnails) {
            const thumbnails = this.element.querySelectorAll('.thumbnail');
            thumbnails.forEach((thumb, index) => {
                thumb.classList.toggle('active', index === this.currentSlide);
            });
        }
    }
}