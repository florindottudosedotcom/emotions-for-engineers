// Konva-based Slide System
// Replaces the HTML-based slide mechanism with a unified canvas approach

class KonvaSlideSystem {
    constructor(container, theme = null) {
        this.container = container;
        this.stage = null;
        this.layer = null;
        this.currentSlideIndex = 0;
        this.slides = [];
        this.slideObjects = []; // Store Konva objects for each slide

        // Canvas dimensions
        this.slideWidth = 1000;
        this.slideHeight = 700;

        // Theme support
        this.currentTheme = theme || this.getDefaultTheme();

        this.init();
    }

    getDefaultTheme() {
        return {
            textColor: '#1e40af',
            borderColor: '#2563eb',
            fillColor: '#dbeafe',
            backgroundColor: '#f0f9ff'
        };
    }

    init() {
        // Clear container
        this.container.innerHTML = '';

        // Create navigation controls
        this.createNavigationControls();

        // Create Konva stage with responsive sizing
        const canvasContainer = document.createElement('div');
        canvasContainer.id = 'konva-slide-stage';
        canvasContainer.style.cssText = `
            width: 100%;
            max-width: ${this.slideWidth}px;
            height: auto;
            background: ${this.currentTheme.backgroundColor};
            margin: 20px auto;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border-radius: 8px;
        `;

        this.container.appendChild(canvasContainer);

        // Store reference to canvas container for theme updates
        this.canvasContainer = canvasContainer;

        // Calculate responsive dimensions
        this.calculateResponsiveDimensions(canvasContainer);

        // Initialize Konva stage with responsive dimensions
        this.stage = new Konva.Stage({
            container: canvasContainer.id,
            width: this.actualWidth,
            height: this.actualHeight
        });

        this.layer = new Konva.Layer();
        this.stage.add(this.layer);

        // Apply border radius to the canvas element to match container
        const canvas = this.stage.content.querySelector('canvas');
        if (canvas) {
            canvas.style.borderRadius = '8px';
        }

        // Handle window resize
        this.setupResizeHandler(canvasContainer);

        // Create toolbar for adding content
        this.createContentToolbar();
    }

    calculateResponsiveDimensions(container) {
        // Get container width
        const containerWidth = container.clientWidth || this.container.clientWidth;
        const maxWidth = Math.min(containerWidth - 40, this.slideWidth); // 40px for margins

        // Calculate scale factor
        this.scaleFactor = maxWidth / this.slideWidth;

        // Set actual dimensions
        this.actualWidth = maxWidth;
        this.actualHeight = this.slideHeight * this.scaleFactor;

        console.log('Calculated dimensions:', {
            containerWidth,
            scaleFactor: this.scaleFactor,
            actualWidth: this.actualWidth,
            actualHeight: this.actualHeight
        });
    }

    setupResizeHandler(container) {
        const resizeObserver = new ResizeObserver(() => {
            this.handleResize(container);
        });
        resizeObserver.observe(this.container);

        // Store reference for cleanup
        this.resizeObserver = resizeObserver;
    }

    handleResize(container) {
        const oldWidth = this.actualWidth;
        const oldHeight = this.actualHeight;

        this.calculateResponsiveDimensions(container);

        if (this.actualWidth !== oldWidth || this.actualHeight !== oldHeight) {
            // Update stage size
            this.stage.width(this.actualWidth);
            this.stage.height(this.actualHeight);

            // Scale all objects
            this.scaleAllObjects(this.scaleFactor);

            this.layer.draw();
        }
    }

    scaleAllObjects(scale) {
        // Scale all objects in current slide
        if (this.slideObjects[this.currentSlideIndex]) {
            this.slideObjects[this.currentSlideIndex].forEach(obj => {
                obj.scaleX(scale);
                obj.scaleY(scale);
            });
        }
    }

    createNavigationControls() {
        const navContainer = document.createElement('div');
        navContainer.className = 'konva-slide-navigation';
        navContainer.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 15px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        `;

        navContainer.innerHTML = `
            <div class="slide-counter">
                <span class="current-slide">1</span> / <span class="total-slides">1</span>
            </div>
            <div class="slide-title-display">
                <h2 id="current-slide-title" contenteditable="true" style="margin: 0; padding: 8px; border: 2px solid transparent; border-radius: 4px;">Slide Title</h2>
            </div>
            <div class="navigation-buttons">
                <button class="nav-btn prev-btn" onclick="window.konvaSlideSystem?.previousSlide()">◀ Previous</button>
                <button class="nav-btn next-btn" onclick="window.konvaSlideSystem?.nextSlide()">Next ▶</button>
            </div>
        `;

        this.container.appendChild(navContainer);

        // Add styles for navigation
        if (!document.getElementById('konva-slide-nav-styles')) {
            const style = document.createElement('style');
            style.id = 'konva-slide-nav-styles';
            style.textContent = `
                .nav-btn {
                    padding: 8px 16px;
                    margin: 0 4px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    background: white;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                }
                .nav-btn:hover {
                    background: #f3f4f6;
                    border-color: #60a5fa;
                }
                .nav-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .slide-counter {
                    font-weight: 600;
                    color: #374151;
                }
                #current-slide-title:focus {
                    border-color: #60a5fa;
                    background: rgba(255, 255, 255, 0.95);
                    outline: none;
                }
            `;
            document.head.appendChild(style);
        }
    }

    createContentToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'konva-slide-toolbar';
        toolbar.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            padding: 15px 20px;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-top: 15px;
            align-items: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        `;

        toolbar.innerHTML = `
            <div class="toolbar-group">
                <label>Add Content:</label>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.addTitle()">📝 Title</button>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.addBulletPoint()">• Bullet</button>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.addTextBox()">📄 Text Box</button>
            </div>
            <div class="toolbar-group">
                <label>Shapes:</label>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.addRectangle()">⬜ Rectangle</button>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.addCircle()">⭕ Circle</button>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.addArrow()">➡️ Arrow</button>
            </div>
            <div class="toolbar-group">
                <label>Style:</label>
                <input type="color" id="text-color" value="#000000" onchange="window.konvaSlideSystem?.updateSelectedColor(this.value)">
                <input type="range" id="font-size" min="12" max="72" value="24" onchange="window.konvaSlideSystem?.updateSelectedFontSize(this.value)">
                <span id="font-size-display">24px</span>
            </div>
            <div class="toolbar-group">
                <button class="tool-btn delete-btn" onclick="window.konvaSlideSystem?.deleteSelected()">🗑️ Delete</button>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.clearSlide()">🧹 Clear Slide</button>
            </div>
        `;

        this.container.appendChild(toolbar);

        // Add toolbar styles
        if (!document.getElementById('konva-slide-toolbar-styles')) {
            const style = document.createElement('style');
            style.id = 'konva-slide-toolbar-styles';
            style.textContent = `
                .toolbar-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 0 12px;
                    border-right: 1px solid #e5e7eb;
                }
                .toolbar-group:last-child {
                    border-right: none;
                }
                .toolbar-group label {
                    font-weight: 600;
                    color: #374151;
                    margin-right: 4px;
                }
                .tool-btn {
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    background: white;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s ease;
                }
                .tool-btn:hover {
                    background: #f3f4f6;
                    border-color: #60a5fa;
                    transform: translateY(-1px);
                }
                .delete-btn:hover {
                    background: #fee2e2;
                    border-color: #ef4444;
                }
                #font-size {
                    width: 80px;
                }
                #text-color {
                    width: 40px;
                    height: 32px;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                    cursor: pointer;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Load slides from the AI-generated data format
    loadSlidesFromData(slideData) {
        this.slides = slideData.slides || [];
        this.slideObjects = [];

        console.log('Loading slides data:', slideData);
        console.log('Number of slides to load:', this.slides.length);

        // Convert each slide data to Konva objects
        this.slides.forEach((slide, index) => {
            console.log(`Processing slide ${index + 1}:`, slide);
            try {
                const slideContent = this.createSlideFromData(slide, index);
                console.log(`Created ${slideContent.length} objects for slide ${index + 1}`);
                this.slideObjects.push(slideContent);
            } catch (error) {
                console.error(`Error creating slide ${index + 1}:`, error);
                this.slideObjects.push([]); // Add empty slide to maintain indexing
            }
        });

        console.log('Created slide objects:', this.slideObjects.length);

        // Show first slide
        this.currentSlideIndex = 0;
        this.showSlide(0);
        this.updateNavigation();
    }

    createSlideFromData(slide, slideIndex) {
        const slideObjects = [];
        let yPosition = 80; // Start position for content

        // Check if this is a title slide
        const isTitle = slide.isTitle || slide.slideNumber === 1 || slideIndex === 0;

        // Add title
        if (slide.title) {
            const titleText = new Konva.Text({
                x: 50,
                y: yPosition,
                text: slide.title,
                fontSize: isTitle ? 48 : 36, // Larger font for title slides
                fontFamily: 'Arial, sans-serif',
                fill: this.currentTheme.textColor,
                fontStyle: 'bold',
                width: this.slideWidth - 100,
                align: isTitle ? 'center' : 'left', // Center align for title slides
                draggable: true
            });

            // Add interaction handlers
            this.addTextInteractionHandlers(titleText);
            slideObjects.push(titleText);
            yPosition += isTitle ? 120 : 80; // More space after title slide heading
        }

        // Add content - handle differently for title vs content slides
        if (slide.content && slide.content.length > 0) {
            slide.content.forEach((point, index) => {
                // Skip empty content
                if (!point || point.trim() === '') return;

                // For title slides, don't add bullet points, just center the text
                const bulletText = new Konva.Text({
                    x: isTitle ? 50 : 80,
                    y: yPosition,
                    text: isTitle ? point : `• ${point}`, // No bullets on title slides
                    fontSize: isTitle ? 24 : 20, // Larger subtitle text on title slides
                    fontFamily: 'Arial, sans-serif',
                    fill: this.currentTheme.textColor,
                    width: this.slideWidth - (isTitle ? 100 : 160),
                    align: isTitle ? 'center' : 'left', // Center align for title slides
                    fontStyle: isTitle && index === 0 ? 'italic' : 'normal', // Italic for subtitle
                    draggable: true
                });

                // Add interaction handlers
                this.addTextInteractionHandlers(bulletText);
                slideObjects.push(bulletText);
                yPosition += isTitle ? 50 : 40; // Different spacing for title slides
            });
        }

        return slideObjects;
    }

    addTextInteractionHandlers(textObj) {
        textObj.on('dragend', () => this.saveSlideState());
        textObj.on('dblclick', () => this.editText(textObj));

        // Add visual feedback
        textObj.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
        });

        textObj.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
        });
    }

    showSlide(index) {
        console.log(`Showing slide ${index + 1} of ${this.slideObjects.length}`);
        if (index < 0 || index >= this.slideObjects.length) {
            console.log('Invalid slide index:', index);
            return;
        }

        // Clear current layer
        this.layer.destroyChildren();

        // Add background rectangle first (for PDF export)
        const backgroundRect = new Konva.Rect({
            x: 0,
            y: 0,
            width: this.slideWidth,
            height: this.slideHeight,
            fill: this.currentTheme.backgroundColor,
            listening: false // Don't make it interactive
        });
        this.layer.add(backgroundRect);

        // Add objects for current slide
        if (this.slideObjects[index] && this.slideObjects[index].length > 0) {
            console.log(`Adding ${this.slideObjects[index].length} objects to slide ${index + 1}`);
            this.slideObjects[index].forEach(obj => {
                this.layer.add(obj);
            });
        } else {
            console.log(`No objects found for slide ${index + 1}`);
        }

        this.layer.draw();
        this.currentSlideIndex = index;

        // Update slide title in navigation
        const titleElement = document.getElementById('current-slide-title');
        if (titleElement && this.slides[index]) {
            titleElement.textContent = this.slides[index].title || `Slide ${index + 1}`;
        }
    }

    nextSlide() {
        if (this.currentSlideIndex < this.slideObjects.length - 1) {
            this.showSlide(this.currentSlideIndex + 1);
            this.updateNavigation();
        }
    }

    previousSlide() {
        if (this.currentSlideIndex > 0) {
            this.showSlide(this.currentSlideIndex - 1);
            this.updateNavigation();
        }
    }

    updateNavigation() {
        const currentSpan = document.querySelector('.current-slide');
        const totalSpan = document.querySelector('.total-slides');
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');

        if (currentSpan) currentSpan.textContent = this.currentSlideIndex + 1;
        if (totalSpan) totalSpan.textContent = this.slideObjects.length;

        if (prevBtn) prevBtn.disabled = this.currentSlideIndex === 0;
        if (nextBtn) nextBtn.disabled = this.currentSlideIndex === this.slideObjects.length - 1;
    }


    // Content creation methods
    addTitle() {
        const titleText = new Konva.Text({
            x: 50,
            y: 50,
            text: 'New Title',
            fontSize: 36,
            fontFamily: 'Arial, sans-serif',
            fill: this.currentTheme.textColor,
            fontStyle: 'bold',
            draggable: true
        });

        this.addObjectToCurrentSlide(titleText);
    }

    addBulletPoint() {
        const bulletText = new Konva.Text({
            x: 80,
            y: 150,
            text: '• New bullet point',
            fontSize: 20,
            fontFamily: 'Arial, sans-serif',
            fill: this.currentTheme.textColor,
            draggable: true
        });

        this.addObjectToCurrentSlide(bulletText);
    }

    addTextBox() {
        const textBox = new Konva.Text({
            x: 100,
            y: 200,
            text: 'New text box',
            fontSize: 18,
            fontFamily: 'Arial, sans-serif',
            fill: this.currentTheme.textColor,
            padding: 10,
            draggable: true
        });

        this.addObjectToCurrentSlide(textBox);
    }

    addRectangle() {
        const rect = new Konva.Rect({
            x: 200,
            y: 200,
            width: 150,
            height: 100,
            fill: this.currentTheme.fillColor,
            stroke: this.currentTheme.borderColor,
            strokeWidth: 2,
            draggable: true
        });

        this.addObjectToCurrentSlide(rect);
    }

    addCircle() {
        const circle = new Konva.Circle({
            x: 300,
            y: 300,
            radius: 50,
            fill: this.currentTheme.fillColor,
            stroke: this.currentTheme.borderColor,
            strokeWidth: 2,
            draggable: true
        });

        this.addObjectToCurrentSlide(circle);
    }

    addArrow() {
        const arrow = new Konva.Arrow({
            x: 100,
            y: 300,
            points: [0, 0, 150, 0],
            pointerLength: 20,
            pointerWidth: 20,
            fill: this.currentTheme.borderColor,
            stroke: this.currentTheme.borderColor,
            strokeWidth: 3,
            draggable: true
        });

        this.addObjectToCurrentSlide(arrow);
    }

    addObjectToCurrentSlide(obj) {
        // Add interaction handlers based on object type
        if (obj.getClassName() === 'Text') {
            this.addTextInteractionHandlers(obj);
        } else {
            // For non-text objects, just add drag handler
            obj.on('dragend', () => this.saveSlideState());
        }

        // Add to current slide objects
        if (!this.slideObjects[this.currentSlideIndex]) {
            this.slideObjects[this.currentSlideIndex] = [];
        }
        this.slideObjects[this.currentSlideIndex].push(obj);

        // Add to layer and draw
        this.layer.add(obj);
        this.layer.draw();

        this.saveSlideState();
    }

    editText(textObj) {
        if (textObj.getClassName() !== 'Text') return;

        // Prevent multiple edit boxes
        if (this.isEditing) return;
        this.isEditing = true;

        // Get text position relative to stage
        const textPosition = textObj.position();
        const stagePosition = this.stage.getPosition();
        const stageBox = this.stage.container().getBoundingClientRect();

        // Calculate scale factor for positioning
        const currentScale = this.scaleFactor || 1;

        // Calculate actual position considering scaling
        const actualX = textPosition.x * currentScale;
        const actualY = textPosition.y * currentScale;

        console.log('Edit text positioning:', {
            textPosition,
            stagePosition,
            stageBox,
            currentScale,
            actualX,
            actualY
        });

        // Create textarea for editing
        const textarea = document.createElement('textarea');
        textarea.value = textObj.text();

        // Calculate dimensions
        const textWidth = Math.max((textObj.width() || 200) * currentScale, 150);
        const textHeight = Math.max((textObj.height() || 30) * currentScale, 40);
        const fontSize = Math.max(textObj.fontSize() * currentScale, 12);

        textarea.style.cssText = `
            position: absolute;
            top: ${stageBox.top + actualY + window.scrollY}px;
            left: ${stageBox.left + actualX + window.scrollX}px;
            width: ${textWidth}px;
            height: ${textHeight}px;
            font-size: ${fontSize}px;
            font-family: ${textObj.fontFamily()};
            color: ${textObj.fill()};
            background: rgba(255, 255, 255, 0.95);
            border: 2px solid #60a5fa;
            border-radius: 4px;
            padding: 8px;
            resize: none;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            outline: none;
        `;

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        // Hide original text while editing
        textObj.hide();
        this.layer.draw();

        const finishEdit = () => {
            const newText = textarea.value.trim();
            if (newText) {
                textObj.text(newText);
            }
            textObj.show();

            try {
                document.body.removeChild(textarea);
            } catch (e) {
                console.warn('Textarea already removed');
            }

            this.isEditing = false;
            this.layer.draw();
            this.saveSlideState();
        };

        const cancelEdit = () => {
            textObj.show();

            try {
                document.body.removeChild(textarea);
            } catch (e) {
                console.warn('Textarea already removed');
            }

            this.isEditing = false;
            this.layer.draw();
        };

        // Event listeners
        textarea.addEventListener('blur', finishEdit);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                finishEdit();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });

        // Auto-resize textarea
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.max(textarea.scrollHeight, 40) + 'px';
        });
    }

    updateSelectedColor(color) {
        const selected = this.stage.getIntersection(this.stage.getPointerPosition());
        if (selected && selected.getClassName() === 'Text') {
            selected.fill(color);
            this.layer.draw();
            this.saveSlideState();
        }
    }

    updateSelectedFontSize(size) {
        const selected = this.stage.getIntersection(this.stage.getPointerPosition());
        if (selected && selected.getClassName() === 'Text') {
            selected.fontSize(parseInt(size));
            this.layer.draw();
            this.saveSlideState();
        }

        document.getElementById('font-size-display').textContent = `${size}px`;
    }

    deleteSelected() {
        // Find selected object (simplified - could be enhanced with proper selection)
        const pos = this.stage.getPointerPosition();
        if (pos) {
            const selected = this.stage.getIntersection(pos);
            if (selected) {
                selected.destroy();

                // Remove from slide objects array
                if (this.slideObjects[this.currentSlideIndex]) {
                    const index = this.slideObjects[this.currentSlideIndex].indexOf(selected);
                    if (index > -1) {
                        this.slideObjects[this.currentSlideIndex].splice(index, 1);
                    }
                }

                this.layer.draw();
                this.saveSlideState();
            }
        }
    }

    clearSlide() {
        this.layer.destroyChildren();
        this.slideObjects[this.currentSlideIndex] = [];
        this.layer.draw();
        this.saveSlideState();
    }

    saveSlideState() {
        // Update slides data structure with current Konva objects
        // This would sync back to the original slide data format if needed
        console.log('Slide state saved');
    }

    // Update theme for all slides
    updateTheme(newTheme) {
        if (!newTheme) return;

        this.currentTheme = newTheme;

        // Update all slide objects with new theme colors
        this.slideObjects.forEach((slideObjs, slideIndex) => {
            if (slideObjs) {
                slideObjs.forEach(obj => {
                    if (obj.getClassName() === 'Text') {
                        obj.fill(this.currentTheme.textColor);
                    } else if (obj.getClassName() === 'Rect' || obj.getClassName() === 'Circle') {
                        obj.fill(this.currentTheme.fillColor);
                        obj.stroke(this.currentTheme.borderColor);
                    } else if (obj.getClassName() === 'Arrow') {
                        obj.fill(this.currentTheme.borderColor);
                        obj.stroke(this.currentTheme.borderColor);
                    }
                });
            }
        });

        // Update canvas container background color
        if (this.canvasContainer) {
            this.canvasContainer.style.background = this.currentTheme.backgroundColor;
        }

        // Redraw the current slide
        if (this.layer) {
            this.layer.draw();
        }

        console.log('Theme updated for Konva slides:', newTheme);
    }

    destroy() {
        // Cleanup resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // Destroy Konva stage
        if (this.stage) {
            this.stage.destroy();
            this.stage = null;
        }

        // Clear references
        this.layer = null;
        this.slideObjects = [];
        this.canvasContainer = null;

        // Clear container
        this.container.innerHTML = '';
    }
}

// Export for global use
window.KonvaSlideSystem = KonvaSlideSystem;