// Konva-based Slide System
// Replaces the HTML-based slide mechanism with a unified canvas approach

// Command pattern for undo/redo functionality
class Command {
    constructor(description) {
        this.description = description;
        this.timestamp = Date.now();
    }

    execute() {
        throw new Error('execute() must be implemented');
    }

    undo() {
        throw new Error('undo() must be implemented');
    }
}

class UndoRedoManager {
    constructor(maxHistorySize = 50) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySize = maxHistorySize;
    }

    executeCommand(command) {
        // Execute the command
        command.execute();

        // Add to undo stack
        this.undoStack.push(command);

        // Clear redo stack (new action invalidates redo history)
        this.redoStack = [];

        // Limit stack size
        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }

        console.log(`Executed: ${command.description}`);
    }

    undo() {
        if (this.undoStack.length === 0) {
            console.log('Nothing to undo');
            return false;
        }

        const command = this.undoStack.pop();
        command.undo();
        this.redoStack.push(command);

        console.log(`Undid: ${command.description}`);
        return true;
    }

    redo() {
        if (this.redoStack.length === 0) {
            console.log('Nothing to redo');
            return false;
        }

        const command = this.redoStack.pop();
        command.execute();
        this.undoStack.push(command);

        console.log(`Redid: ${command.description}`);
        return true;
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }

    getUndoDescription() {
        if (this.undoStack.length === 0) return '';
        return this.undoStack[this.undoStack.length - 1].description;
    }

    getRedoDescription() {
        if (this.redoStack.length === 0) return '';
        return this.redoStack[this.redoStack.length - 1].description;
    }
}

// Specific command implementations
class DeleteSlideCommand extends Command {
    constructor(slideSystem, slideIndex) {
        super(`Delete Slide ${slideIndex + 1}`);
        this.slideSystem = slideSystem;
        this.slideIndex = slideIndex;
        this.deletedSlide = null;
        this.deletedSlideObjects = null;
        this.wasCurrentSlide = false;
    }

    execute() {
        // Store the slide data before deletion
        this.deletedSlide = JSON.parse(JSON.stringify(this.slideSystem.slides[this.slideIndex]));
        this.deletedSlideObjects = [...this.slideSystem.slideObjects[this.slideIndex]];
        this.wasCurrentSlide = this.slideSystem.currentSlideIndex === this.slideIndex;

        // Perform the deletion
        this.slideSystem.slides.splice(this.slideIndex, 1);
        this.slideSystem.slideObjects.splice(this.slideIndex, 1);

        // Update slidesAppState
        if (window.slidesAppState && window.slidesAppState.currentSlideData) {
            window.slidesAppState.currentSlideData.slides.splice(this.slideIndex, 1);

            // Renumber remaining slides
            window.slidesAppState.currentSlideData.slides.forEach((slide, index) => {
                slide.slideNumber = index + 1;
            });
        }

        // Adjust current slide index
        if (this.slideSystem.currentSlideIndex >= this.slideSystem.slides.length) {
            this.slideSystem.currentSlideIndex = this.slideSystem.slides.length - 1;
        }

        // Update display
        this.slideSystem.showSlide(this.slideSystem.currentSlideIndex);
        this.slideSystem.updateNavigation();

        // Save changes
        if (window.saveSlides) {
            window.saveSlides();
        }
    }

    undo() {
        // Restore the deleted slide
        this.slideSystem.slides.splice(this.slideIndex, 0, this.deletedSlide);
        this.slideSystem.slideObjects.splice(this.slideIndex, 0, this.deletedSlideObjects);

        // Update slidesAppState
        if (window.slidesAppState && window.slidesAppState.currentSlideData) {
            window.slidesAppState.currentSlideData.slides.splice(this.slideIndex, 0, this.deletedSlide);

            // Renumber all slides
            window.slidesAppState.currentSlideData.slides.forEach((slide, index) => {
                slide.slideNumber = index + 1;
            });
        }

        // Restore current slide if it was the deleted one
        if (this.wasCurrentSlide) {
            this.slideSystem.currentSlideIndex = this.slideIndex;
        }

        // Update display
        this.slideSystem.showSlide(this.slideSystem.currentSlideIndex);
        this.slideSystem.updateNavigation();

        // Save changes
        if (window.saveSlides) {
            window.saveSlides();
        }
    }
}

class DeleteObjectCommand extends Command {
    constructor(slideSystem, obj) {
        super(`Delete ${obj.getClassName()}`);
        this.slideSystem = slideSystem;
        this.objectId = obj.id() || obj._id;
        this.objectData = this.captureObjectState(obj);
        this.slideIndex = slideSystem.currentSlideIndex;
        this.objectIndex = slideSystem.slideObjects[slideSystem.currentSlideIndex].indexOf(obj);
    }

    captureObjectState(obj) {
        // Capture complete object state for restoration
        const state = {
            className: obj.getClassName(),
            x: obj.x(),
            y: obj.y(),
            opacity: obj.opacity(),
            rotation: obj.rotation(),
            scaleX: obj.scaleX(),
            scaleY: obj.scaleY(),
            zIndex: obj.zIndex()
        };

        if (obj.getClassName() === 'Text') {
            state.text = obj.text();
            state.fontSize = obj.fontSize();
            state.fontFamily = obj.fontFamily();
            state.fill = obj.fill();
            state.align = obj.align();
            if (obj.fontWeight) state.fontWeight = obj.fontWeight();
            if (obj.fontStyle) state.fontStyle = obj.fontStyle();
            if (obj.textDecoration) state.textDecoration = obj.textDecoration();
        } else {
            state.fill = obj.fill();
            state.stroke = obj.stroke();
            state.strokeWidth = obj.strokeWidth();
            if (obj.width) state.width = obj.width();
            if (obj.height) state.height = obj.height();
            if (obj.radius) state.radius = obj.radius();
        }

        return state;
    }

    execute() {
        // Find and remove the object
        const slideObjects = this.slideSystem.slideObjects[this.slideIndex];
        const objIndex = slideObjects.findIndex(obj =>
            (obj.id() && obj.id() === this.objectId) || obj._id === this.objectId
        );

        if (objIndex > -1) {
            const obj = slideObjects[objIndex];
            slideObjects.splice(objIndex, 1);
            obj.destroy();
            this.slideSystem.selectObject(null);
            this.slideSystem.saveSlideState();
        }
    }

    undo() {
        // Recreate the object
        const recreatedObj = this.recreateObject(this.objectData);

        // Insert at original position
        this.slideSystem.slideObjects[this.slideIndex].splice(this.objectIndex, 0, recreatedObj);
        this.slideSystem.layer.add(recreatedObj);
        this.slideSystem.layer.draw();
        this.slideSystem.saveSlideState();
    }

    recreateObject(state) {
        let obj;

        if (state.className === 'Text') {
            obj = new Konva.Text({
                x: state.x,
                y: state.y,
                text: state.text,
                fontSize: state.fontSize,
                fontFamily: state.fontFamily,
                fill: state.fill,
                align: state.align,
                opacity: state.opacity,
                rotation: state.rotation,
                scaleX: state.scaleX,
                scaleY: state.scaleY,
                draggable: true
            });

            if (state.fontWeight) obj.fontWeight(state.fontWeight);
            if (state.fontStyle) obj.fontStyle(state.fontStyle);
            if (state.textDecoration) obj.textDecoration(state.textDecoration);
        } else if (state.className === 'Rect') {
            obj = new Konva.Rect({
                x: state.x,
                y: state.y,
                width: state.width,
                height: state.height,
                fill: state.fill,
                stroke: state.stroke,
                strokeWidth: state.strokeWidth,
                opacity: state.opacity,
                rotation: state.rotation,
                scaleX: state.scaleX,
                scaleY: state.scaleY,
                draggable: true
            });
        } else if (state.className === 'Circle') {
            obj = new Konva.Circle({
                x: state.x,
                y: state.y,
                radius: state.radius,
                fill: state.fill,
                stroke: state.stroke,
                strokeWidth: state.strokeWidth,
                opacity: state.opacity,
                rotation: state.rotation,
                scaleX: state.scaleX,
                scaleY: state.scaleY,
                draggable: true
            });
        }

        // Add standard event handlers
        if (obj) {
            obj.on('dragend', () => this.slideSystem.saveSlideState());
            obj.id(this.objectId);
        }

        return obj;
    }
}

class KonvaSlideSystem {
    constructor(container, theme = null) {
        this.container = container;
        this.stage = null;
        this.layer = null;
        this.currentSlideIndex = 0;
        this.slides = [];
        this.isInitialized = false;
        this.isInitializing = false; // Flag to track initial loading state
        this.pendingSaveOperations = []; // Queue save operations until state is ready
        this.slideObjects = []; // Store Konva objects for each slide

        // Canvas dimensions
        this.slideWidth = 1000;
        this.slideHeight = 700;

        // Theme support
        this.currentTheme = theme || this.getDefaultTheme();

        // Animation and transition support
        this.slideTransition = 'fade'; // Default transition type

        // Selection system
        this.selectedObject = null;
        this.selectedSlide = false; // Track if entire slide is selected
        this.transformer = null;

        // Undo/Redo system
        this.undoRedoManager = new UndoRedoManager();

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
        // Prevent double initialization
        if (this.isInitialized) {
            return;
        }

        // Force clear container and remove any existing accordions
        this.container.innerHTML = '';

        // Remove any existing accordion containers that might be floating around
        const existingAccordions = document.querySelectorAll('.accordion-container, .konva-editor-layout, .konva-slide-sidebar');
        existingAccordions.forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });

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
            touch-action: manipulation;
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;
        `;

        // Add mobile-specific responsive behavior
        if (window.innerWidth <= 767) {
            canvasContainer.style.margin = '10px auto';
            canvasContainer.style.maxWidth = '100%';
            canvasContainer.style.borderRadius = '6px';
        }

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

        // Create transformer for visual selection feedback
        this.transformer = new Konva.Transformer({
            enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
            borderStroke: '#60a5fa', // Soft blue color
            borderStrokeWidth: 1.5,
            anchorStroke: '#3b82f6',
            anchorFill: '#ffffff',
            anchorStrokeWidth: 1,
            anchorSize: 8,
            rotateEnabled: false,
            keepRatio: false,
            centeredScaling: false,
            boundBoxFunc: (oldBox, newBox) => {
                // Ensure minimum size for visibility
                return {
                    ...newBox,
                    width: Math.max(newBox.width, 10),
                    height: Math.max(newBox.height, 10)
                };
            }
        });
        this.layer.add(this.transformer);

        // Setup selection system
        this.setupSelection();

        // Apply border radius to the canvas element to match container
        const canvas = this.stage.content.querySelector('canvas');
        if (canvas) {
            canvas.style.borderRadius = '8px';
        }

        // Handle window resize
        this.setupResizeHandler(canvasContainer);

        // Create toolbar for adding content
        this.createContentToolbar();

        // Create initial demo slide if no slides exist
        this.createInitialSlide();

        // Mark as initialized to prevent double initialization
        this.isInitialized = true;
    }

    calculateResponsiveDimensions(container) {
        // Get container width - ensure we have a proper container reference
        if (!container) container = this.canvasContainer || this.container;

        const containerWidth = container.clientWidth || this.container.clientWidth || this.slideWidth;
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

    handleResize(container = null) {
        const oldWidth = this.actualWidth;
        const oldHeight = this.actualHeight;

        this.calculateResponsiveDimensions(container || this.canvasContainer);

        if (this.actualWidth !== oldWidth || this.actualHeight !== oldHeight) {
            // Update stage size
            this.stage.width(this.actualWidth);
            this.stage.height(this.actualHeight);

            // Redraw current slide to apply new dimensions
            this.showSlide(this.currentSlideIndex);
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
                <button class="nav-btn undo-btn" onclick="window.konvaSlideSystem?.undo()" title="Undo (Ctrl+Z)">↶ Undo</button>
                <button class="nav-btn redo-btn" onclick="window.konvaSlideSystem?.redo()" title="Redo (Ctrl+Y)">↷ Redo</button>
                <span style="margin: 0 8px; border-left: 1px solid #d1d5db; height: 20px;"></span>
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

                /* Dark mode for navigation buttons */
                @media (prefers-color-scheme: dark) {
                    .nav-btn {
                        background: #334155 !important;
                        border-color: #475569 !important;
                        color: #F8FAFC !important;
                    }
                    .nav-btn:hover {
                        background: #475569 !important;
                        border-color: #60A5FA !important;
                    }
                    .slide-counter {
                        color: #F8FAFC !important;
                    }
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
        // Create main container with left sidebar layout
        const mainContainer = document.createElement('div');
        mainContainer.className = 'konva-editor-layout';
        mainContainer.style.cssText = `
            display: flex;
            gap: 20px;
            margin-top: 15px;
            height: auto;
            min-height: 600px;
        `;

        // Create left sidebar toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'konva-slide-sidebar';
        toolbar.style.cssText = `
            width: 280px;
            min-width: 280px;
            background: rgba(255, 255, 255, 0.98);
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            backdrop-filter: blur(10px);
            max-height: 90vh;
            overflow-y: auto;
            position: sticky;
            top: 20px;
        `;

        // Create content area wrapper for slides
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'konva-content-wrapper';
        contentWrapper.style.cssText = `
            flex: 1;
            min-width: 0;
        `;

        toolbar.innerHTML = `
            <div class="accordion-container">
            <!-- Accordion Category: Color Schemes -->
            <div class="accordion-category" data-category="colors">
                <div class="category-header">
                    <div class="category-icon"><span class="icon-tint"></span></div>
                    <span class="category-title">Color Schemes</span>
                    <div class="chevron">&#8250;</div>
                </div>
                <div class="category-content">
                    <div class="color-schemes-grid">
                    <div class="color-scheme-tile" data-scheme="lavender" title="Lavender Dreams">
                        <div class="scheme-preview">
                            <div class="color-stripe" style="background: #4c1d95;" title="Text Color"></div>
                            <div class="color-stripe" style="background: #8b5cf6;" title="Border Color"></div>
                            <div class="color-stripe" style="background: #e6e6fa;" title="Fill Color"></div>
                            <div class="edit-theme-btn" title="Edit Colors">✎</div>
                        </div>
                        <span class="scheme-name">Lavender Dreams</span>
                    </div>
                    <div class="color-scheme-tile" data-scheme="mint" title="Mint Fresh">
                        <div class="scheme-preview">
                            <div class="color-stripe" style="background: #065f46;" title="Text Color"></div>
                            <div class="color-stripe" style="background: #10b981;" title="Border Color"></div>
                            <div class="color-stripe" style="background: #d1f2eb;" title="Fill Color"></div>
                            <div class="edit-theme-btn" title="Edit Colors">✎</div>
                        </div>
                        <span class="scheme-name">Mint Fresh</span>
                    </div>
                    <div class="color-scheme-tile" data-scheme="rose" title="Rose Blush">
                        <div class="scheme-preview">
                            <div class="color-stripe" style="background: #9f1239;" title="Text Color"></div>
                            <div class="color-stripe" style="background: #e11d48;" title="Border Color"></div>
                            <div class="color-stripe" style="background: #fce7f3;" title="Fill Color"></div>
                            <div class="edit-theme-btn" title="Edit Colors">✎</div>
                        </div>
                        <span class="scheme-name">Rose Blush</span>
                    </div>
                    <div class="color-scheme-tile" data-scheme="sky" title="Sky Blue">
                        <div class="scheme-preview">
                            <div class="color-stripe" style="background: #1e3a8a;" title="Text Color"></div>
                            <div class="color-stripe" style="background: #2563eb;" title="Border Color"></div>
                            <div class="color-stripe" style="background: #dbeafe;" title="Fill Color"></div>
                            <div class="edit-theme-btn" title="Edit Colors">✎</div>
                        </div>
                        <span class="scheme-name">Sky Blue</span>
                    </div>
                    <div class="color-scheme-tile" data-scheme="peach" title="Peach Cream">
                        <div class="scheme-preview">
                            <div class="color-stripe" style="background: #9a3412;" title="Text Color"></div>
                            <div class="color-stripe" style="background: #ea580c;" title="Border Color"></div>
                            <div class="color-stripe" style="background: #fed7aa;" title="Fill Color"></div>
                            <div class="edit-theme-btn" title="Edit Colors">✎</div>
                        </div>
                        <span class="scheme-name">Peach Cream</span>
                    </div>
                    <div class="color-scheme-tile" data-scheme="sage" title="Sage Green">
                        <div class="scheme-preview">
                            <div class="color-stripe" style="background: #14532d;" title="Text Color"></div>
                            <div class="color-stripe" style="background: #16a34a;" title="Border Color"></div>
                            <div class="color-stripe" style="background: #dcfce7;" title="Fill Color"></div>
                            <div class="edit-theme-btn" title="Edit Colors">✎</div>
                        </div>
                        <span class="scheme-name">Sage Green</span>
                    </div>
                    </div>
                </div>
            </div>

            <!-- Accordion Category: Content -->
            <div class="accordion-category" data-category="content">
                <div class="category-header">
                    <div class="category-icon"><span class="icon-plus"></span></div>
                    <span class="category-title">Add Content</span>
                    <div class="chevron">&#8250;</div>
                </div>
                <div class="category-content">
                    <div class="tool-grid">
                        <button class="sidebar-tool-btn" onclick="console.log('New slide button clicked'); if(window.addNewSlide) { window.addNewSlide(); } else { console.error('addNewSlide function not available'); }" title="Add New Slide">
                            <div class="tool-icon">📄</div>
                            <span>New Slide</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.addTitle()" title="Add Title">
                            <div class="tool-icon">&#9998;</div>
                            <span>Title</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.addBulletPoint()" title="Add Bullet Point">
                            <div class="tool-icon">&#8226;</div>
                            <span>Bullet</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.addTextBox()" title="Add Text Box">
                            <div class="tool-icon">&#128196;</div>
                            <span>Text Box</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.addStyledText()" title="Add Styled Text">
                            <div class="tool-icon">&#127912;</div>
                            <span>Styled Text</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Accordion Category: Shapes -->
            <div class="accordion-category" data-category="shapes">
                <div class="category-header">
                    <div class="category-icon"><span class="icon-stop"></span></div>
                    <span class="category-title">Shapes</span>
                    <div class="chevron">&#8250;</div>
                </div>
                <div class="category-content">
                    <div class="tool-grid">
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.addRectangle()" title="Add Rectangle">
                            <div class="tool-icon">&#9643;</div>
                            <span>Rectangle</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.addCircle()" title="Add Circle">
                            <div class="tool-icon">&#9675;</div>
                            <span>Circle</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.addArrow()" title="Add Arrow">
                            <div class="tool-icon">&#8594;</div>
                            <span>Arrow</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.addAdvancedShape()" title="More Shapes">
                            <div class="tool-icon">&#9671;</div>
                            <span>More Shapes</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Accordion Category: Images -->
            <div class="accordion-category" data-category="images">
                <div class="category-header">
                    <div class="category-icon"><span class="icon-picture"></span></div>
                    <span class="category-title">Images</span>
                    <div class="chevron">&#8250;</div>
                </div>
                <div class="category-content">
                    <div class="tool-grid">
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.addImageFromURL()" title="Add Image from URL">
                            <div class="tool-icon">&#127760;</div>
                            <span>URL Image</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.addImageFromFile()" title="Upload Image">
                            <div class="tool-icon">&#128193;</div>
                            <span>Upload</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.generateAIImage()" title="Generate AI Image">
                            <div class="tool-icon">&#129302;</div>
                            <span>AI Image</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Accordion Category: Layouts -->
            <div class="accordion-category" data-category="layouts">
                <div class="category-header">
                    <div class="category-icon"><span class="icon-th-large"></span></div>
                    <span class="category-title">Layouts</span>
                    <div class="chevron">&#8250;</div>
                </div>
                <div class="category-content">
                    <div class="tool-grid">
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.applyLayout('hero')" title="Hero Layout">
                            <div class="tool-icon">&#127917;</div>
                            <span>Hero</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.applyLayout('split')" title="Split Layout">
                            <div class="tool-icon">&#8944;</div>
                            <span>Split</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.applyLayout('cards')" title="Cards Layout">
                            <div class="tool-icon">&#127183;</div>
                            <span>Cards</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.applyLayout('overlay')" title="Overlay Layout">
                            <div class="tool-icon">&#128444;</div>
                            <span>Overlay</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Accordion Category: Effects -->
            <div class="accordion-category" data-category="effects">
                <div class="category-header">
                    <div class="category-icon"><span class="icon-flash"></span></div>
                    <span class="category-title">Effects</span>
                    <div class="chevron">&#8250;</div>
                </div>
                <div class="category-content">
                    <div class="tool-grid">
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.applyTextEffect('shadow')" title="Shadow Effect">
                            <div class="tool-icon">&#127775;</div>
                            <span>Shadow</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.applyTextEffect('glow')" title="Glow Effect">
                            <div class="tool-icon">&#10024;</div>
                            <span>Glow</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.applyTextEffect('outline')" title="Outline Effect">
                            <div class="tool-icon">&#9633;</div>
                            <span>Outline</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.applyTextEffect('gradient')" title="Gradient Effect">
                            <div class="tool-icon">&#127752;</div>
                            <span>Gradient</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Accordion Category: Animations -->
            <div class="accordion-category" data-category="animations">
                <div class="category-header">
                    <div class="category-icon"><span class="icon-play-circle"></span></div>
                    <span class="category-title">Animations</span>
                    <div class="chevron">&#8250;</div>
                </div>
                <div class="category-content">
                    <div class="tool-grid">
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.animateSelected('fadeIn')" title="Fade In Animation">
                            <div class="tool-icon">&#127917;</div>
                            <span>Fade In</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.animateSelected('slideInLeft')" title="Slide Left Animation">
                            <div class="tool-icon">&#9664;</div>
                            <span>Slide Left</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.animateSelected('bounce')" title="Bounce Animation">
                            <div class="tool-icon">&#9934;</div>
                            <span>Bounce</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.animateSelected('pulse')" title="Pulse Animation">
                            <div class="tool-icon">&#128147;</div>
                            <span>Pulse</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Accordion Category: Style -->
            <div class="accordion-category" data-category="style">
                <div class="category-header">
                    <div class="category-icon"><span class="icon-brush"></span></div>
                    <span class="category-title">Style</span>
                    <div class="chevron">&#8250;</div>
                </div>
                <div class="category-content">
                    <div class="style-controls">
                        <div class="control-group">
                            <label for="text-color">Text Color:</label>
                            <input type="color" id="text-color" value="#000000" onchange="window.konvaSlideSystem?.updateSelectedColor(this.value)">
                        </div>
                        <div class="control-group">
                            <label for="font-size">Font Size: <span id="font-size-display">24px</span></label>
                            <input type="range" id="font-size" min="12" max="72" value="24" onchange="window.konvaSlideSystem?.updateSelectedFontSize(this.value)">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Accordion Category: Advanced -->
            <div class="accordion-category" data-category="advanced">
                <div class="category-header">
                    <div class="category-icon"><span class="icon-cog"></span></div>
                    <span class="category-title">Advanced</span>
                    <div class="chevron">&#8250;</div>
                </div>
                <div class="category-content">
                    <div class="tool-grid">
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.setSlideTransition()" title="Slide Transitions">
                            <div class="tool-icon">&#127902;</div>
                            <span>Transitions</span>
                        </button>
                        <button class="sidebar-tool-btn delete-btn" onclick="window.konvaSlideSystem?.deleteSelected()" title="Delete Selected">
                            <div class="tool-icon">&#128465;</div>
                            <span>Delete</span>
                        </button>
                        <button class="sidebar-tool-btn" onclick="window.konvaSlideSystem?.clearSlide()" title="Clear Slide">
                            <div class="tool-icon">&#129529;</div>
                            <span>Clear Slide</span>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        `;

        // Set up the layout
        mainContainer.appendChild(toolbar);
        mainContainer.appendChild(contentWrapper);

        // Move the existing slide container into the content wrapper
        const originalContainer = this.container;
        originalContainer.parentNode.insertBefore(mainContainer, originalContainer);
        contentWrapper.appendChild(originalContainer);

        // Update container reference
        this.mainContainer = mainContainer;
        this.sidebar = toolbar;
        this.contentWrapper = contentWrapper;

        // Set up color scheme functionality
        this.setupColorSchemes();

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

                /* Sidebar Layout */
                .konva-slide-sidebar {
                    scrollbar-width: thin;
                    scrollbar-color: #d1d5db #f9fafb;
                }

                .konva-slide-sidebar::-webkit-scrollbar {
                    width: 8px;
                }

                .konva-slide-sidebar::-webkit-scrollbar-track {
                    background: #f9fafb;
                    border-radius: 4px;
                }

                .konva-slide-sidebar::-webkit-scrollbar-thumb {
                    background: #d1d5db;
                    border-radius: 4px;
                }

                .konva-slide-sidebar::-webkit-scrollbar-thumb:hover {
                    background: #9ca3af;
                }

                /* Accordion Container */
                .accordion-container {
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    overflow: hidden;
                    background: white;
                    margin: 0;
                    padding: 0;
                }

                /* Dark mode for accordion container */
                @media (prefers-color-scheme: dark) {
                    .accordion-container {
                        border-color: #475569 !important;
                        background: #1E293B !important;
                    }

                    .category-header {
                        background: #334155 !important;
                        border-color: #475569 !important;
                        color: #F8FAFC !important;
                    }

                    .category-header:hover {
                        background: #475569 !important;
                    }

                    .accordion-category.expanded .category-header {
                        background: #1E40AF !important;
                        border-color: #475569 !important;
                    }

                    .category-icon {
                        color: #F8FAFC !important;
                    }

                    .accordion-category.expanded .category-icon {
                        color: #BFDBFE !important;
                    }

                    .color-scheme-tile {
                        background: #334155 !important;
                        border-color: #475569 !important;
                        color: #F8FAFC !important;
                    }

                    .color-scheme-tile:hover {
                        border-color: #60A5FA !important;
                        background: #475569 !important;
                    }

                    .color-scheme-tile.selected {
                        border-color: #3B82F6 !important;
                        background: #1E40AF !important;
                    }

                    .category-content {
                        background: #1E293B !important;
                    }

                    .sidebar-tool-btn {
                        background: #334155 !important;
                        border-color: #475569 !important;
                        color: #F8FAFC !important;
                    }

                    .sidebar-tool-btn:hover {
                        background: #475569 !important;
                        border-color: #60A5FA !important;
                    }

                    .sidebar-tool-btn.delete-btn:hover {
                        background: #7F1D1D !important;
                        border-color: #EF4444 !important;
                    }

                    .sidebar-tool-btn span {
                        color: #CBD5E1 !important;
                    }

                    .scheme-preview {
                        border-color: rgba(148, 163, 184, 0.3) !important;
                    }

                    .edit-theme-btn {
                        background: rgba(30, 41, 59, 0.95) !important;
                        color: #F8FAFC !important;
                    }
                }

                /* Accordion Categories */
                .accordion-category {
                    margin: 0;
                    border: none;
                    border-radius: 0;
                    overflow: hidden;
                    transition: all 0.2s ease;
                }

                .category-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px 18px;
                    background: #f8fafc;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border-top: 1px solid #e5e7eb;
                    position: relative;
                }

                .accordion-category:first-child .category-header {
                    border-top: none;
                }

                .category-header:hover {
                    background: #f1f5f9;
                }

                .accordion-category.expanded .category-header {
                    background: #eff6ff;
                    border-bottom: 1px solid #e5e7eb;
                }

                .category-icon {
                    font-size: 24px;
                    line-height: 1;
                    color: #374151;
                    transition: all 0.2s ease;
                    min-width: 32px;
                    width: auto;
                    text-align: center;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .accordion-category.expanded .category-icon {
                    color: #1e40af;
                    transform: scale(1.1);
                }

                /* Custom CSS Icons */
                .category-icon span[class^="icon-"] {
                    color: #374151;
                    font-size: 20px;
                    line-height: 1;
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    position: relative;
                }

                .accordion-category.expanded .category-icon span[class^="icon-"] {
                    color: #1e40af;
                }

                /* Icon definitions using CSS */
                .icon-tint:before { content: "●"; }
                .icon-plus:before { content: "+"; font-weight: bold; }
                .icon-stop:before { content: "■"; }
                .icon-picture:before { content: "🖼"; }
                .icon-th-large:before { content: "▦"; }
                .icon-flash:before { content: "✦"; }
                .icon-play-circle:before { content: "▶"; }
                .icon-brush:before { content: "🖌"; }
                .icon-cog:before { content: "⚙"; }

                .category-title {
                    font-size: 15px;
                    font-weight: 600;
                    color: #374151;
                    flex: 1;
                    transition: color 0.2s ease;
                }

                .accordion-category.expanded .category-title {
                    color: #1e40af;
                }

                .chevron {
                    font-size: 16px;
                    color: #9ca3af;
                    transition: all 0.2s ease;
                    font-weight: bold;
                }

                .accordion-category.expanded .chevron {
                    transform: rotate(90deg);
                    color: #2563eb;
                }

                .category-content {
                    padding: 0;
                    margin: 0;
                    max-height: 0;
                    overflow: hidden;
                    transition: all 0.3s ease;
                    background: #fafbfc;
                    opacity: 0;
                    border: none;
                    box-sizing: border-box;
                }

                .accordion-category.expanded .category-content {
                    padding: 18px;
                    max-height: 500px; /* Large enough for content but still allows animation */
                    opacity: 1;
                    overflow: visible; /* Ensure content isn't clipped */
                }

                /* Content Area Reset */
                .category-content * {
                    margin: 0 !important;
                    box-sizing: border-box;
                }

                .category-content {
                    margin: 0 !important;
                }

                /* Color Schemes Grid */
                .color-schemes-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin: 0;
                    min-height: fit-content;
                    width: 100%;
                }

                .color-scheme-tile {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 12px 8px;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background: white;
                    min-height: 80px;
                    width: 100%;
                    box-sizing: border-box;
                }

                .color-scheme-tile:hover {
                    border-color: #60a5fa;
                    background: #f8fafc;
                }

                .color-scheme-tile.selected {
                    border-color: #2563eb;
                    background: #eff6ff;
                }

                .scheme-preview {
                    display: flex;
                    flex-direction: row;
                    height: 40px;
                    border-radius: 4px;
                    overflow: hidden;
                    position: relative;
                    margin-bottom: 6px;
                    border: 1px solid rgba(0, 0, 0, 0.1);
                    width: 100%;
                }

                .color-stripe {
                    flex: 1 1 33.333%;
                    height: 100%;
                    border: none;
                    display: block;
                    min-width: 12px;
                    width: auto;
                }

                .edit-theme-btn {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    width: 20px;
                    height: 20px;
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 50%;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 12px;
                    color: #666;
                    border: 1px solid #ddd;
                    font-weight: normal;
                    z-index: 10;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .edit-theme-btn:hover {
                    background: rgba(255, 255, 255, 1);
                    color: #333;
                    transform: scale(1.1);
                }

                .scheme-name {
                    font-size: 11px;
                    font-weight: 600;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                /* Tool Grid */
                .tool-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    margin: 0;
                }

                .sidebar-tool-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    padding: 12px 8px;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    background: white;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-decoration: none;
                    color: inherit;
                    min-height: 60px;
                }

                .sidebar-tool-btn:hover {
                    background: #f8fafc;
                    border-color: #60a5fa;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                }

                .sidebar-tool-btn.delete-btn:hover {
                    background: #fef2f2;
                    border-color: #ef4444;
                }

                .tool-icon {
                    font-size: 20px;
                    line-height: 1;
                    filter: grayscale(0.2);
                }

                .sidebar-tool-btn:hover .tool-icon {
                    filter: grayscale(0);
                    transform: scale(1.1);
                }

                .sidebar-tool-btn span {
                    font-size: 11px;
                    font-weight: 600;
                    color: #6b7280;
                    text-align: center;
                    line-height: 1.2;
                }

                /* Style Controls */
                .style-controls {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin: 0;
                }

                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .control-group label {
                    font-size: 12px;
                    font-weight: 600;
                    color: #6b7280;
                }

                .control-group input[type="color"] {
                    width: 100%;
                    height: 36px;
                    border: 1px solid #e5e7eb;
                    border-radius: 6px;
                    cursor: pointer;
                    background: white;
                }

                .control-group input[type="range"] {
                    width: 100%;
                    height: 6px;
                    background: #e5e7eb;
                    border-radius: 3px;
                    outline: none;
                    cursor: pointer;
                }

                .control-group input[type="range"]::-webkit-slider-thumb {
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    background: #2563eb;
                    border-radius: 50%;
                    cursor: pointer;
                }

                .control-group input[type="range"]::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    background: #2563eb;
                    border-radius: 50%;
                    cursor: pointer;
                    border: none;
                }

                /* Responsive adjustments */
                @media (max-width: 1200px) {
                    .konva-slide-sidebar {
                        width: 240px;
                        min-width: 240px;
                    }
                }

                @media (max-width: 768px) {
                    .konva-editor-layout {
                        flex-direction: column;
                    }

                    .konva-slide-sidebar {
                        width: 100%;
                        position: static;
                        max-height: none;
                        order: 2;
                    }

                    .tool-grid {
                        grid-template-columns: repeat(4, 1fr);
                    }

                    .color-schemes-grid {
                        grid-template-columns: repeat(4, 1fr);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Load slides from the AI-generated data format
    loadSlidesFromData(slideData) {
        // Set initialization flag to prevent premature state saving
        this.isInitializing = true;

        this.slides = slideData.slides || [];
        this.slideObjects = [];

        // Ensure slidesAppState is properly initialized here to fix race condition
        if (!window.slidesAppState) {
            window.slidesAppState = {
                currentSlideData: slideData,
                currentSlideIndex: 0,
                currentTheme: null
            };
            console.log('🔧 Initialized slidesAppState within KonvaSlideSystem');
        } else {
            // Update existing state with new data
            window.slidesAppState.currentSlideData = slideData;
            console.log('🔄 Updated existing slidesAppState with new slide data');
        }

        console.log('Loading slides data:', slideData);
        console.log('Number of slides to load:', this.slides.length);

        // Convert each slide data to Konva objects
        this.slides.forEach((slide, index) => {
            console.log(`🎯 Processing slide ${index + 1}:`, {
                title: slide.title,
                contentType: typeof slide.content,
                contentLength: slide.content?.length || 0,
                contentPreview: typeof slide.content === 'string'
                    ? slide.content.substring(0, 100) + '...'
                    : Array.isArray(slide.content)
                        ? slide.content.slice(0, 2)
                        : slide.content,
                visualSuggestions: slide.visualSuggestions
            });
            try {
                const slideContent = this.createSlideFromData(slide, index);
                console.log(`✅ Created ${slideContent.length} objects for slide ${index + 1}`);
                this.slideObjects.push(slideContent);
            } catch (error) {
                console.error(`❌ Error creating slide ${index + 1}:`, error);
                this.slideObjects.push([]); // Add empty slide to maintain indexing
            }
        });

        console.log('Created slide objects:', this.slideObjects.length);

        // Restore current slide index from persistence, default to 0
        this.currentSlideIndex = slideData.currentSlideIndex || 0;

        // Ensure slide index is within bounds
        if (this.currentSlideIndex >= this.slides.length) {
            this.currentSlideIndex = this.slides.length - 1;
        }
        if (this.currentSlideIndex < 0) {
            this.currentSlideIndex = 0;
        }

        // Force recalculation of dimensions after slides are loaded
        setTimeout(() => {
            console.log('Forcing resize and redraw after slide load');
            this.calculateResponsiveDimensions();
            this.stage.width(this.actualWidth);
            this.stage.height(this.actualHeight);
            this.showSlide(this.currentSlideIndex);
            this.updateNavigation();

            // Clear initialization flag - now ready for state saving
            this.isInitializing = false;
            console.log('✅ Slide initialization complete - state saving now enabled');

            // Process any queued save operations
            if (this.pendingSaveOperations.length > 0) {
                console.log(`🔄 Processing ${this.pendingSaveOperations.length} queued save operations`);
                // Execute the last save operation (most recent state)
                const lastSave = this.pendingSaveOperations.pop();
                this.pendingSaveOperations = []; // Clear the queue
                if (lastSave) lastSave();
            }
        }, 100);
    }

    addSlideFromData(slideData) {
        console.log('Adding new slide to Konva system:', slideData);

        // Add to slides array
        this.slides.push(slideData);

        // Create slide objects for this slide
        const slideIndex = this.slides.length - 1;
        try {
            const slideContent = this.createSlideFromData(slideData, slideIndex);
            console.log(`Created ${slideContent.length} objects for new slide ${slideIndex + 1}`);
            this.slideObjects.push(slideContent);
        } catch (error) {
            console.error(`Error creating new slide ${slideIndex + 1}:`, error);
            this.slideObjects.push([]); // Add empty slide to maintain indexing
        }

        // Show the new slide immediately
        this.showSlide(slideIndex);

        console.log(`Added slide ${slideIndex + 1}, total slides: ${this.slides.length}`);
        return slideIndex;
    }

    createSlideFromData(slide, slideIndex) {
        const slideObjects = [];

        // Use relative positioning based on actual slide dimensions
        const padding = this.actualWidth * 0.05; // 5% padding from edges
        const contentPadding = this.actualWidth * 0.08; // 8% padding for content
        let yPosition = this.actualHeight * 0.12; // Start at 12% from top

        // Check if this is a title slide
        const isTitle = slide.isTitle || slide.slideNumber === 1 || slideIndex === 0;

        // Calculate font sizes relative to slide size
        const titleFontSize = (isTitle ? 48 : 36) * this.scaleFactor;
        const contentFontSize = (isTitle ? 24 : 20) * this.scaleFactor;

        // Professional enhancement: Apply layout template for certain slide types
        if (isTitle && slideIndex === 0) {
            // Apply Hero layout for first slide
            this.applyEnhancedTitleSlide(slide, slideObjects);
            return slideObjects;
        } else if (slideIndex === 1 && slide.content && slide.content.length >= 3) {
            // Apply Split or Cards layout for content-heavy slides
            this.applyEnhancedContentSlide(slide, slideObjects, 'split');
            return slideObjects;
        }

        // Enhanced title with automatic effects
        if (slide.title) {
            const titleText = new Konva.Text({
                x: padding,
                y: yPosition,
                text: slide.title,
                fontSize: titleFontSize,
                fontFamily: 'Arial, sans-serif',
                fill: this.currentTheme.textColor,
                fontStyle: 'bold',
                width: this.actualWidth - (padding * 2),
                align: isTitle ? 'center' : 'left',
                draggable: true
            });

            // Auto-apply professional effects based on slide type
            if (isTitle) {
                // Title slides get glow effect
                this.addTextEffect(titleText, 'glow');
            } else {
                // Content slides get shadow effect
                this.addTextEffect(titleText, 'shadow');
            }

            // Add interaction handlers
            this.addTextInteractionHandlers(titleText);
            slideObjects.push(titleText);

            // Store animation info for later application
            titleText._pendingAnimation = {
                type: isTitle ? 'slideInTop' : 'fadeIn',
                duration: 800,
                delay: 200
            };

            yPosition += (isTitle ? 100 : 90) * this.scaleFactor;
        }

        // Enhanced content with staggered animations
        if (slide.content && slide.content.length > 0) {
            // Handle both string and array content formats
            let contentArray;
            if (typeof slide.content === 'string') {
                // Split string content by bullet points, newlines, or semicolons
                contentArray = slide.content.split(/[•\n;]/)
                    .map(item => item.trim())
                    .filter(item => item.length > 0);
                console.log(`📝 Converted string content to array for slide ${slideIndex + 1}:`, {
                    originalString: slide.content.substring(0, 200) + '...',
                    arrayLength: contentArray.length,
                    arrayItems: contentArray.slice(0, 3)
                });
            } else if (Array.isArray(slide.content)) {
                contentArray = slide.content;
                console.log(`📋 Using array content for slide ${slideIndex + 1}:`, {
                    arrayLength: contentArray.length,
                    arrayItems: contentArray.slice(0, 3)
                });
            } else {
                contentArray = [String(slide.content)];
                console.log(`🔄 Converted other content type to array for slide ${slideIndex + 1}:`, typeof slide.content);
            }

            contentArray.forEach((point, index) => {
                // Skip empty content
                if (!point || point.trim() === '') return;

                const bulletText = new Konva.Text({
                    x: isTitle ? padding : contentPadding,
                    y: yPosition,
                    text: isTitle ? point : `• ${point}`,
                    fontSize: contentFontSize,
                    fontFamily: 'Arial, sans-serif',
                    fill: this.currentTheme.textColor,
                    width: this.actualWidth - (isTitle ? padding * 2 : contentPadding + padding),
                    align: isTitle ? 'center' : 'left',
                    fontStyle: isTitle && index === 0 ? 'italic' : 'normal',
                    draggable: true
                });

                // Auto-apply subtle effects for better readability
                if (!isTitle && index < 3) {
                    // Apply outline effect to first 3 bullet points for emphasis
                    this.addTextEffect(bulletText, 'outline');
                }

                // Add interaction handlers
                this.addTextInteractionHandlers(bulletText);
                slideObjects.push(bulletText);

                // Store staggered animation info for later application
                bulletText._pendingAnimation = {
                    type: 'slideInLeft',
                    duration: 600,
                    delay: 500 + (index * 200)
                };

                yPosition += (isTitle ? 60 : 60) * this.scaleFactor;
            });
        }

        // Auto-add decorative shapes for visual interest
        if (!isTitle && slideObjects.length > 2) {
            this.addDecorativeElements(slideObjects, slideIndex);
        }

        return slideObjects;
    }

    // Enhanced slide templates for automatic application
    applyEnhancedTitleSlide(slide, slideObjects) {
        // Create gradient background
        const background = new Konva.Rect({
            x: 0,
            y: 0,
            width: this.actualWidth,
            height: this.actualHeight,
            fillLinearGradient: {
                start: { x: 0, y: 0 },
                end: { x: this.actualWidth, y: this.actualHeight },
                colorStops: [0, 'rgba(102, 126, 234, 0.1)', 1, 'rgba(118, 75, 162, 0.1)']
            }
        });
        slideObjects.push(background);

        // Enhanced title with effects
        const title = new Konva.Text({
            x: this.actualWidth * 0.1,
            y: this.actualHeight * 0.35,
            text: slide.title,
            fontSize: 52 * this.scaleFactor,
            fontFamily: 'Arial, sans-serif',
            fill: this.currentTheme.textColor,
            fontStyle: 'bold',
            width: this.actualWidth * 0.8,
            align: 'center',
            draggable: true
        });

        // Apply gradient effect to title
        this.addTextEffect(title, 'gradient');
        this.addTextInteractionHandlers(title);
        slideObjects.push(title);

        // Enhanced subtitle
        if (slide.content && slide.content[0]) {
            const subtitle = new Konva.Text({
                x: this.actualWidth * 0.1,
                y: this.actualHeight * 0.55,
                text: slide.content[0],
                fontSize: 28 * this.scaleFactor,
                fontFamily: 'Arial, sans-serif',
                fill: this.currentTheme.textColor,
                fontStyle: 'italic',
                width: this.actualWidth * 0.8,
                align: 'center',
                draggable: true
            });

            this.addTextEffect(subtitle, 'glow');
            this.addTextInteractionHandlers(subtitle);
            slideObjects.push(subtitle);

            // Store animation info for later application
            title._pendingAnimation = {
                type: 'slideInTop',
                duration: 1000,
                delay: 300
            };
            subtitle._pendingAnimation = {
                type: 'fadeIn',
                duration: 1200,
                delay: 300
            };
        }
    }

    applyEnhancedContentSlide(slide, slideObjects, layoutType) {
        // Apply split layout with enhanced styling
        const titleFontSize = 32 * this.scaleFactor;
        const contentFontSize = 18 * this.scaleFactor;

        // Enhanced title
        const title = new Konva.Text({
            x: this.actualWidth * 0.05,
            y: this.actualHeight * 0.15,
            text: slide.title,
            fontSize: titleFontSize,
            fontFamily: 'Arial, sans-serif',
            fill: this.currentTheme.textColor,
            fontStyle: 'bold',
            width: this.actualWidth * 0.45,
            draggable: true
        });

        this.addTextEffect(title, 'shadow');
        this.addTextInteractionHandlers(title);
        slideObjects.push(title);

        // Enhanced content with cards
        if (slide.content) {
            // Handle both string and array content
            let contentArray;
            if (typeof slide.content === 'string') {
                // Split string content by bullet points or newlines
                contentArray = slide.content.split(/[•\n]/)
                    .map(item => item.trim())
                    .filter(item => item.length > 0)
                    .slice(0, 3);
            } else if (Array.isArray(slide.content)) {
                contentArray = slide.content.slice(0, 3);
            } else {
                contentArray = [String(slide.content)];
            }

            contentArray.forEach((point, index) => {
                const cardY = this.actualHeight * 0.3 + (index * 120 * this.scaleFactor);

                // Card background
                const cardBg = new Konva.Rect({
                    x: this.actualWidth * 0.05,
                    y: cardY - 10 * this.scaleFactor,
                    width: this.actualWidth * 0.45,
                    height: 80 * this.scaleFactor,
                    fill: this.currentTheme.fillColor,
                    stroke: this.currentTheme.borderColor,
                    strokeWidth: 1,
                    cornerRadius: 8 * this.scaleFactor,
                    opacity: 0.8,
                    draggable: true
                });
                slideObjects.push(cardBg);

                // Card content
                const cardText = new Konva.Text({
                    x: this.actualWidth * 0.07,
                    y: cardY,
                    text: `${index + 1}. ${point}`,
                    fontSize: contentFontSize,
                    fontFamily: 'Arial, sans-serif',
                    fill: this.currentTheme.textColor,
                    width: this.actualWidth * 0.41,
                    draggable: true
                });

                this.addTextInteractionHandlers(cardText);
                slideObjects.push(cardText);

                // Store staggered animation info for later application
                cardBg._pendingAnimation = {
                    type: 'slideInLeft',
                    duration: 600,
                    delay: 400 + (index * 300)
                };
                cardText._pendingAnimation = {
                    type: 'fadeIn',
                    duration: 800,
                    delay: 400 + (index * 300)
                };
            });
        }

        // Right side visual placeholder
        const visualPlaceholder = new Konva.Rect({
            x: this.actualWidth * 0.55,
            y: this.actualHeight * 0.2,
            width: this.actualWidth * 0.4,
            height: this.actualHeight * 0.6,
            fill: 'rgba(102, 126, 234, 0.1)',
            stroke: this.currentTheme.borderColor,
            strokeWidth: 2,
            cornerRadius: 12 * this.scaleFactor,
            draggable: true
        });
        slideObjects.push(visualPlaceholder);

        const placeholderText = new Konva.Text({
            x: this.actualWidth * 0.55,
            y: this.actualHeight * 0.45,
            text: '📊 Visual Content\nClick to add image',
            fontSize: 20 * this.scaleFactor,
            fontFamily: 'Arial, sans-serif',
            fill: this.currentTheme.textColor,
            width: this.actualWidth * 0.4,
            align: 'center',
            draggable: true
        });
        this.addTextInteractionHandlers(placeholderText);
        slideObjects.push(placeholderText);

        // Store animation info for later application
        title._pendingAnimation = {
            type: 'slideInTop',
            duration: 800,
            delay: 200
        };
        visualPlaceholder._pendingAnimation = {
            type: 'slideInRight',
            duration: 1000,
            delay: 200
        };
        placeholderText._pendingAnimation = {
            type: 'fadeIn',
            duration: 1200,
            delay: 200
        };
    }

    addDecorativeElements(slideObjects, slideIndex) {
        // Add subtle decorative shapes based on slide index
        const decorativeShapes = ['circle', 'triangle', 'star'];
        const shapeType = decorativeShapes[slideIndex % decorativeShapes.length];

        const decorativeShape = this.addShape(shapeType, {
            x: this.actualWidth * 0.85,
            y: this.actualHeight * 0.8,
            width: this.actualWidth * 0.08,
            height: this.actualWidth * 0.08,
            fill: this.currentTheme.fillColor,
            stroke: this.currentTheme.borderColor,
            opacity: 0.3
        });

        // Store animation info for later application
        decorativeShape._pendingAnimation = {
            type: 'bounce',
            duration: 1000,
            delay: 1500
        };
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

    addShapeInteractionHandlers(shapeObj) {
        shapeObj.on('dragend', () => this.saveSlideState());

        // Add visual feedback
        shapeObj.on('mouseenter', () => {
            this.stage.container().style.cursor = 'move';
        });

        shapeObj.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
        });
    }

    showSlide(index) {
        console.log(`Showing slide ${index + 1} of ${this.slideObjects.length}`);
        if (index < 0 || index >= this.slideObjects.length) {
            console.log('Invalid slide index:', index);
            return;
        }

        // Clear current layer but preserve the transformer and slide selection
        const childrenToRemove = this.layer.children.filter(child =>
            child !== this.transformer && child.name() !== 'slide-selection'
        );
        childrenToRemove.forEach(child => child.remove());

        // Add background rectangle first (for PDF export) using actual dimensions
        const backgroundRect = new Konva.Rect({
            x: 0,
            y: 0,
            width: this.actualWidth,
            height: this.actualHeight,
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

        // Ensure transformer is in the layer after switching slides
        if (this.transformer.getParent() !== this.layer) {
            console.log('Re-adding transformer to layer after slide switch');
            this.layer.add(this.transformer);
        }

        this.layer.draw();
        this.currentSlideIndex = index;

        // Apply any pending animations now that objects are in the layer
        this.applyPendingAnimations(index);

        // Update slide title in navigation
        const titleElement = document.getElementById('current-slide-title');
        if (titleElement && this.slides[index]) {
            titleElement.textContent = this.slides[index].title || `Slide ${index + 1}`;
        }
    }

    nextSlide() {
        if (this.currentSlideIndex < this.slideObjects.length - 1) {
            this.applySlideTransition(this.slideTransition, () => {
                this.showSlide(this.currentSlideIndex + 1);
            });
            this.updateNavigation();
        }
    }

    previousSlide() {
        if (this.currentSlideIndex > 0) {
            this.applySlideTransition(this.slideTransition, () => {
                this.showSlide(this.currentSlideIndex - 1);
            });
            this.updateNavigation();
        }
    }

    updateNavigation() {
        const currentSpan = document.querySelector('.current-slide');
        const totalSpan = document.querySelector('.total-slides');
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        const titleElement = document.getElementById('current-slide-title');

        // Update slide counter
        if (currentSpan) currentSpan.textContent = this.currentSlideIndex + 1;
        if (totalSpan) totalSpan.textContent = this.slideObjects.length;

        // Update slide title
        if (titleElement && this.slides[this.currentSlideIndex]) {
            titleElement.textContent = this.slides[this.currentSlideIndex].title || `Slide ${this.currentSlideIndex + 1}`;
        }

        // Update button states
        if (prevBtn) prevBtn.disabled = this.currentSlideIndex === 0;
        if (nextBtn) nextBtn.disabled = this.currentSlideIndex === this.slideObjects.length - 1;

        console.log(`Navigation updated: Slide ${this.currentSlideIndex + 1} of ${this.slideObjects.length}`);

        // Update undo/redo button states
        this.updateUndoRedoButtons();
    }


    // Content creation methods
    addTitle() {
        const padding = this.actualWidth * 0.05;
        const titleText = new Konva.Text({
            x: padding,
            y: this.actualHeight * 0.1,
            text: 'New Title',
            fontSize: 36 * this.scaleFactor,
            fontFamily: 'Arial, sans-serif',
            fill: this.currentTheme.textColor,
            fontStyle: 'bold',
            width: this.actualWidth - (padding * 2),
            draggable: true
        });

        this.addObjectToCurrentSlide(titleText);
    }

    addBulletPoint() {
        const contentPadding = this.actualWidth * 0.08;
        const bulletText = new Konva.Text({
            x: contentPadding,
            y: this.actualHeight * 0.3,
            text: '• New bullet point',
            fontSize: 20 * this.scaleFactor,
            fontFamily: 'Arial, sans-serif',
            fill: this.currentTheme.textColor,
            width: this.actualWidth - contentPadding - (this.actualWidth * 0.05),
            draggable: true
        });

        this.addObjectToCurrentSlide(bulletText);
    }

    addTextBox() {
        const padding = this.actualWidth * 0.1;
        const textBox = new Konva.Text({
            x: padding,
            y: this.actualHeight * 0.4,
            text: 'New text box',
            fontSize: 18 * this.scaleFactor,
            fontFamily: 'Arial, sans-serif',
            fill: this.currentTheme.textColor,
            width: this.actualWidth - (padding * 2),
            padding: 10 * this.scaleFactor,
            draggable: true
        });

        this.addObjectToCurrentSlide(textBox);
    }

    addRectangle() {
        const rect = new Konva.Rect({
            x: this.actualWidth * 0.3,
            y: this.actualHeight * 0.4,
            width: 150 * this.scaleFactor,
            height: 100 * this.scaleFactor,
            fill: this.currentTheme.fillColor,
            stroke: this.currentTheme.borderColor,
            strokeWidth: 2 * this.scaleFactor,
            draggable: true
        });

        this.addObjectToCurrentSlide(rect);
    }

    addCircle() {
        const circle = new Konva.Circle({
            x: this.actualWidth * 0.5,
            y: this.actualHeight * 0.5,
            radius: 50 * this.scaleFactor,
            fill: this.currentTheme.fillColor,
            stroke: this.currentTheme.borderColor,
            strokeWidth: 2 * this.scaleFactor,
            draggable: true
        });

        this.addObjectToCurrentSlide(circle);
    }

    addArrow() {
        const arrow = new Konva.Arrow({
            x: this.actualWidth * 0.2,
            y: this.actualHeight * 0.6,
            points: [0, 0, 150 * this.scaleFactor, 0],
            pointerLength: 20 * this.scaleFactor,
            pointerWidth: 20 * this.scaleFactor,
            fill: this.currentTheme.borderColor,
            stroke: this.currentTheme.borderColor,
            strokeWidth: 3 * this.scaleFactor,
            draggable: true
        });

        this.addObjectToCurrentSlide(arrow);
    }

    // Image methods for Phase 1
    addImageFromURL() {
        const url = prompt('Enter image URL:');
        if (url) {
            this.createImageFromURL(url);
        }
    }

    addImageFromFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.createImageFromURL(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }

    createImageFromURL(url) {
        const imageObj = new Image();
        imageObj.onload = () => {
            // Calculate responsive dimensions
            const maxWidth = this.actualWidth * 0.4; // 40% of slide width
            const maxHeight = this.actualHeight * 0.5; // 50% of slide height

            // Calculate aspect ratio
            const aspectRatio = imageObj.width / imageObj.height;
            let width = Math.min(maxWidth, imageObj.width * this.scaleFactor);
            let height = width / aspectRatio;

            // Adjust if height is too large
            if (height > maxHeight) {
                height = maxHeight;
                width = height * aspectRatio;
            }

            const konvaImage = new Konva.Image({
                x: this.actualWidth * 0.5, // Center position
                y: this.actualHeight * 0.3,
                image: imageObj,
                width: width,
                height: height,
                draggable: true,
                stroke: this.currentTheme.borderColor,
                strokeWidth: 1 * this.scaleFactor
            });

            // Add interaction handlers
            this.addImageInteractionHandlers(konvaImage);
            this.addObjectToCurrentSlide(konvaImage);
        };

        imageObj.onerror = () => {
            alert('Failed to load image. Please check the URL and try again.');
        };

        imageObj.src = url;
    }

    addImageInteractionHandlers(imageObj) {
        imageObj.on('dragend', () => this.saveSlideState());

        imageObj.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
            imageObj.stroke(this.currentTheme.textColor);
            imageObj.strokeWidth(2 * this.scaleFactor);
            this.layer.draw();
        });

        imageObj.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            imageObj.stroke(this.currentTheme.borderColor);
            imageObj.strokeWidth(1 * this.scaleFactor);
            this.layer.draw();
        });

        // Double-click to resize/edit
        imageObj.on('dblclick', () => this.editImage(imageObj));
    }

    editImage(imageObj) {
        const newWidth = prompt('Enter new width (pixels):', Math.round(imageObj.width()));
        const newHeight = prompt('Enter new height (pixels):', Math.round(imageObj.height()));

        if (newWidth && newHeight) {
            imageObj.width(parseInt(newWidth));
            imageObj.height(parseInt(newHeight));
            this.layer.draw();
            this.saveSlideState();
        }
    }

    // Phase 2: AI Image Generation
    async generateAIImage() {
        const modal = this.createImageGenerationModal();
        document.body.appendChild(modal);
    }

    createImageGenerationModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;

        content.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #333;">🤖 AI Image Generation</h3>

            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Service:</label>
                <select id="ai-service" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                    <option value="openai">OpenAI DALL-E</option>
                    <option value="stability">Stability AI</option>
                    <option value="unsplash">Unsplash (Free)</option>
                </select>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Image Description:</label>
                <textarea id="image-prompt" placeholder="Describe the image you want to generate..."
                    style="width: 100%; height: 100px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; resize: vertical;"></textarea>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Style:</label>
                <select id="image-style" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                    <option value="professional">Professional/Corporate</option>
                    <option value="golden">Golden/Warm tones</option>
                    <option value="modern">Modern/Minimalist</option>
                    <option value="artistic">Artistic/Creative</option>
                    <option value="photographic">Photographic/Realistic</option>
                </select>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Size:</label>
                <select id="image-size" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                    <option value="1024x1024">Square (1024x1024)</option>
                    <option value="1792x1024">Landscape (1792x1024)</option>
                    <option value="1024x1792">Portrait (1024x1792)</option>
                </select>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancel-generation" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">Cancel</button>
                <button id="generate-image" style="padding: 10px 20px; border: none; background: #1976d2; color: white; border-radius: 6px; cursor: pointer;">🎨 Generate Image</button>
            </div>

            <div id="generation-status" style="margin-top: 20px; text-align: center; display: none;"></div>
        `;

        modal.appendChild(content);

        // Event handlers
        content.querySelector('#cancel-generation').onclick = () => modal.remove();
        content.querySelector('#generate-image').onclick = () => this.handleImageGeneration(modal);

        return modal;
    }

    async handleImageGeneration(modal) {
        const service = modal.querySelector('#ai-service').value;
        const prompt = modal.querySelector('#image-prompt').value.trim();
        const style = modal.querySelector('#image-style').value;
        const size = modal.querySelector('#image-size').value;
        const statusDiv = modal.querySelector('#generation-status');

        if (!prompt) {
            alert('Please enter an image description.');
            return;
        }

        // Show loading status
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = '⏳ Generating image...';
        modal.querySelector('#generate-image').disabled = true;

        try {
            let imageUrl;

            if (service === 'unsplash') {
                imageUrl = await this.generateUnsplashImage(prompt, style);
            } else if (service === 'openai') {
                imageUrl = await this.generateOpenAIImage(prompt, style, size);
            } else if (service === 'stability') {
                imageUrl = await this.generateStabilityImage(prompt, style, size);
            }

            if (imageUrl) {
                statusDiv.innerHTML = '✅ Image generated successfully!';
                setTimeout(() => {
                    this.createImageFromURL(imageUrl);
                    modal.remove();
                }, 1000);
            } else {
                throw new Error('Failed to generate image');
            }

        } catch (error) {
            console.error('Image generation error:', error);
            statusDiv.innerHTML = `❌ Error: ${error.message}`;
            modal.querySelector('#generate-image').disabled = false;
        }
    }

    async generateUnsplashImage(prompt, style) {
        // Free Unsplash API for demo purposes
        const styleQueries = {
            professional: 'business corporate professional',
            golden: 'golden warm sunset autumn',
            modern: 'minimal modern clean',
            artistic: 'creative art artistic',
            photographic: 'photography realistic'
        };

        const query = `${prompt} ${styleQueries[style] || ''}`.trim();
        const url = `https://source.unsplash.com/1200x800/?${encodeURIComponent(query)}`;

        return url;
    }

    async generateOpenAIImage(prompt, style, size) {
        const apiKey = localStorage.getItem('openai_api_key');
        if (!apiKey) {
            const key = prompt('Enter your OpenAI API key:');
            if (key) localStorage.setItem('openai_api_key', key);
            else throw new Error('OpenAI API key required');
        }

        const stylePrompts = {
            professional: 'professional corporate style, clean and polished',
            golden: 'warm golden tones, soft lighting, golden hour aesthetic',
            modern: 'modern minimalist style, clean lines, contemporary',
            artistic: 'artistic creative style, expressive and unique',
            photographic: 'photorealistic, high quality photography'
        };

        const enhancedPrompt = `${prompt}, ${stylePrompts[style]}, high quality, detailed`;

        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: enhancedPrompt,
                n: 1,
                size: size,
                quality: 'standard'
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.data[0].url;
    }

    async generateStabilityImage(prompt, style, size) {
        const apiKey = localStorage.getItem('stability_api_key');
        if (!apiKey) {
            const key = prompt('Enter your Stability AI API key:');
            if (key) localStorage.setItem('stability_api_key', key);
            else throw new Error('Stability AI API key required');
        }

        // Convert size format
        const [width, height] = size.split('x').map(Number);

        const stylePrompts = {
            professional: ', professional corporate style',
            golden: ', warm golden tones, golden hour lighting',
            modern: ', modern minimalist style',
            artistic: ', artistic and creative style',
            photographic: ', photorealistic style'
        };

        const enhancedPrompt = `${prompt}${stylePrompts[style]}`;

        const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-v1-6/text-to-image', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text_prompts: [{ text: enhancedPrompt }],
                cfg_scale: 7,
                width: width,
                height: height,
                steps: 30,
                samples: 1
            })
        });

        if (!response.ok) {
            throw new Error(`Stability AI API error: ${response.status}`);
        }

        const data = await response.json();
        const base64Image = data.artifacts[0].base64;
        return `data:image/png;base64,${base64Image}`;
    }

    // Phase 3: Layout Templates
    applyLayout(layoutType) {
        switch(layoutType) {
            case 'hero':
                this.applyHeroLayout();
                break;
            case 'split':
                this.applySplitLayout();
                break;
            case 'cards':
                this.applyCardsLayout();
                break;
            case 'overlay':
                this.applyOverlayLayout();
                break;
            default:
                console.warn('Unknown layout type:', layoutType);
        }
    }

    applyHeroLayout() {
        // Clear current slide
        this.clearSlide();

        // Add background image placeholder
        this.addLayoutElement('background-rect', {
            x: 0,
            y: 0,
            width: this.actualWidth,
            height: this.actualHeight,
            fill: '#2563EB',
            opacity: 0.8
        });

        // Add large centered title
        this.addLayoutElement('hero-title', {
            x: this.actualWidth * 0.1,
            y: this.actualHeight * 0.3,
            text: 'Hero Title',
            fontSize: 48 * this.scaleFactor,
            fontFamily: 'Arial, sans-serif',
            fill: 'white',
            fontStyle: 'bold',
            width: this.actualWidth * 0.8,
            align: 'center'
        });

        // Add subtitle
        this.addLayoutElement('hero-subtitle', {
            x: this.actualWidth * 0.1,
            y: this.actualHeight * 0.5,
            text: 'Compelling subtitle that draws attention',
            fontSize: 24 * this.scaleFactor,
            fontFamily: 'Arial, sans-serif',
            fill: 'white',
            width: this.actualWidth * 0.8,
            align: 'center'
        });
    }

    applySplitLayout() {
        // Clear current slide
        this.clearSlide();

        // Left side content area
        this.addLayoutElement('split-title', {
            x: this.actualWidth * 0.05,
            y: this.actualHeight * 0.15,
            text: 'Split Layout Title',
            fontSize: 36 * this.scaleFactor,
            fontFamily: 'Arial, sans-serif',
            fill: this.currentTheme.textColor,
            fontStyle: 'bold',
            width: this.actualWidth * 0.4
        });

        // Bullet points on left
        const bullets = [
            'First key point with detailed information',
            'Second important point to consider',
            'Third compelling argument or fact'
        ];

        bullets.forEach((bullet, index) => {
            this.addLayoutElement(`split-bullet-${index}`, {
                x: this.actualWidth * 0.05,
                y: this.actualHeight * 0.3 + (index * 60 * this.scaleFactor),
                text: `• ${bullet}`,
                fontSize: 18 * this.scaleFactor,
                fontFamily: 'Arial, sans-serif',
                fill: this.currentTheme.textColor,
                width: this.actualWidth * 0.4
            });
        });

        // Right side image placeholder
        this.addLayoutElement('split-image-bg', {
            x: this.actualWidth * 0.55,
            y: this.actualHeight * 0.15,
            width: this.actualWidth * 0.4,
            height: this.actualHeight * 0.7,
            fill: this.currentTheme.fillColor,
            stroke: this.currentTheme.borderColor,
            strokeWidth: 2 * this.scaleFactor,
            cornerRadius: 12 * this.scaleFactor
        });

        this.addLayoutElement('split-image-text', {
            x: this.actualWidth * 0.55,
            y: this.actualHeight * 0.5,
            text: 'Image Area\n📸 Add your image here',
            fontSize: 20 * this.scaleFactor,
            fontFamily: 'Arial, sans-serif',
            fill: this.currentTheme.textColor,
            width: this.actualWidth * 0.4,
            align: 'center'
        });
    }

    applyCardsLayout() {
        // Clear current slide
        this.clearSlide();

        // Title
        this.addLayoutElement('cards-title', {
            x: this.actualWidth * 0.05,
            y: this.actualHeight * 0.1,
            text: 'Card Layout Title',
            fontSize: 36 * this.scaleFactor,
            fontFamily: 'Arial, sans-serif',
            fill: this.currentTheme.textColor,
            fontStyle: 'bold',
            width: this.actualWidth * 0.9,
            align: 'center'
        });

        // Three cards
        const cardData = [
            { title: 'Card 1', content: 'First key point with details' },
            { title: 'Card 2', content: 'Second important insight' },
            { title: 'Card 3', content: 'Third compelling argument' }
        ];

        cardData.forEach((card, index) => {
            const cardX = this.actualWidth * (0.05 + index * 0.3);
            const cardY = this.actualHeight * 0.3;
            const cardWidth = this.actualWidth * 0.25;
            const cardHeight = this.actualHeight * 0.5;

            // Card background
            this.addLayoutElement(`card-bg-${index}`, {
                x: cardX,
                y: cardY,
                width: cardWidth,
                height: cardHeight,
                fill: this.currentTheme.fillColor,
                stroke: this.currentTheme.borderColor,
                strokeWidth: 2 * this.scaleFactor,
                cornerRadius: 12 * this.scaleFactor,
                shadowColor: 'rgba(0,0,0,0.1)',
                shadowBlur: 10,
                shadowOffset: { x: 0, y: 5 }
            });

            // Card title
            this.addLayoutElement(`card-title-${index}`, {
                x: cardX + cardWidth * 0.1,
                y: cardY + cardHeight * 0.15,
                text: card.title,
                fontSize: 24 * this.scaleFactor,
                fontFamily: 'Arial, sans-serif',
                fill: this.currentTheme.textColor,
                fontStyle: 'bold',
                width: cardWidth * 0.8,
                align: 'center'
            });

            // Card content
            this.addLayoutElement(`card-content-${index}`, {
                x: cardX + cardWidth * 0.1,
                y: cardY + cardHeight * 0.4,
                text: card.content,
                fontSize: 16 * this.scaleFactor,
                fontFamily: 'Arial, sans-serif',
                fill: this.currentTheme.textColor,
                width: cardWidth * 0.8,
                align: 'center'
            });
        });
    }

    applyOverlayLayout() {
        // Clear current slide
        this.clearSlide();

        // Background image placeholder (full screen)
        this.addLayoutElement('overlay-bg', {
            x: 0,
            y: 0,
            width: this.actualWidth,
            height: this.actualHeight,
            fill: 'linear-gradient(45deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)',
            opacity: 0.3
        });

        // Dark overlay for text readability
        this.addLayoutElement('overlay-dark', {
            x: 0,
            y: this.actualHeight * 0.6,
            width: this.actualWidth,
            height: this.actualHeight * 0.4,
            fill: 'rgba(0,0,0,0.7)'
        });

        // Large overlay title
        this.addLayoutElement('overlay-title', {
            x: this.actualWidth * 0.05,
            y: this.actualHeight * 0.65,
            text: 'Overlay Title',
            fontSize: 42 * this.scaleFactor,
            fontFamily: 'Arial, sans-serif',
            fill: 'white',
            fontStyle: 'bold',
            width: this.actualWidth * 0.9
        });

        // Overlay subtitle
        this.addLayoutElement('overlay-subtitle', {
            x: this.actualWidth * 0.05,
            y: this.actualHeight * 0.78,
            text: 'Supporting text that provides context and detail',
            fontSize: 20 * this.scaleFactor,
            fontFamily: 'Arial, sans-serif',
            fill: 'white',
            width: this.actualWidth * 0.9
        });
    }

    addLayoutElement(id, properties) {
        let element;

        if (properties.text !== undefined) {
            // Text element
            element = new Konva.Text(properties);
            this.addTextInteractionHandlers(element);
        } else {
            // Shape element
            element = new Konva.Rect(properties);
        }

        element.id(id);
        element.draggable(true);

        this.addObjectToCurrentSlide(element);
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
        if (this.selectedObject) {
            if (this.selectedObject.getClassName() === 'Text') {
                this.selectedObject.fill(color);
            } else if (this.selectedObject.fill) {
                this.selectedObject.fill(color);
            } else if (this.selectedObject.stroke) {
                this.selectedObject.stroke(color);
            }
            this.layer.draw();
            this.saveSlideState();
        } else {
            console.log('No object selected. Click an element first to change its color.');
        }
    }

    updateSelectedFontSize(size) {
        if (this.selectedObject && this.selectedObject.getClassName() === 'Text') {
            this.selectedObject.fontSize(parseInt(size));
            this.layer.draw();
            this.saveSlideState();
        } else {
            console.log('No text object selected. Click a text element first to change its font size.');
        }

        const display = document.getElementById('font-size-display');
        if (display) {
            display.textContent = `${size}px`;
        }
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
        // Destroy all children except the transformer and slide selection
        const childrenToDestroy = this.layer.children.filter(child =>
            child !== this.transformer && child.name() !== 'slide-selection'
        );
        childrenToDestroy.forEach(child => child.destroy());

        // Re-add transformer if it was removed
        if (this.transformer.getParent() !== this.layer) {
            this.layer.add(this.transformer);
        }

        this.slideObjects[this.currentSlideIndex] = [];
        this.layer.draw();
        this.saveSlideState();
    }

    saveSlideState() {
        // Skip if slides haven't been loaded yet
        if (!this.slides || this.slides.length === 0) {
            console.log('⏭️ Skipping saveSlideState - no slides loaded yet');
            return;
        }

        // Sync Konva objects back to slidesAppState for persistence
        console.log('🔄 saveSlideState called, checking slidesAppState...', {
            hasWindow: !!window,
            hasSlidesAppState: !!window.slidesAppState,
            hasCurrentSlideData: !!(window.slidesAppState?.currentSlideData),
            currentSlideIndex: this.currentSlideIndex,
            totalSlides: this.slides?.length || 0
        });

        if (!window.slidesAppState || !window.slidesAppState.currentSlideData) {
            // If we're still initializing or don't have slide data, skip silently
            if (this.isInitializing || !this.slides || this.slides.length === 0) {
                console.log('⏳ Skipping saveSlideState - slides not ready yet', {
                    isInitializing: this.isInitializing,
                    hasSlides: this.slides?.length > 0
                });
                return;
            }

            // slidesAppState should now be initialized early during app startup
            if (!window.slidesAppState) {
                console.error('❌ No slidesAppState available for saving - this should not happen after initialization fix:', {
                    hasWindow: !!window,
                    isInitializing: this.isInitializing,
                    slideCount: this.slides?.length || 0
                });
                return;
            }
        }

        try {
            // Skip saving during initialization when no slides exist yet
            if (!window.slidesAppState.currentSlideData.slides ||
                window.slidesAppState.currentSlideData.slides.length === 0) {
                // This is normal during initialization - no warning needed
                return;
            }

            // Ensure we have a slide to save to at the current index
            if (!window.slidesAppState.currentSlideData.slides[this.currentSlideIndex]) {
                console.warn(`No slide data at index ${this.currentSlideIndex}`);
                return;
            }

            const slide = window.slidesAppState.currentSlideData.slides[this.currentSlideIndex];
            const slideObjects = this.slideObjects[this.currentSlideIndex] || [];

            // Convert Konva objects back to slide data format
            const textElements = [];
            const shapes = [];

            slideObjects.forEach((obj, index) => {
                if (obj.getClassName() === 'Text') {
                    textElements.push({
                        id: obj.id() || `text_${index}`,
                        text: obj.text(),
                        x: obj.x(),
                        y: obj.y(),
                        fontSize: obj.fontSize(),
                        fill: obj.fill(),
                        fontFamily: obj.fontFamily() || 'Arial',
                        fontWeight: obj.fontWeight ? obj.fontWeight() : 'normal',
                        fontStyle: obj.fontStyle ? obj.fontStyle() : 'normal',
                        textDecoration: obj.textDecoration ? obj.textDecoration() : 'none',
                        align: obj.align() || 'left',
                        opacity: obj.opacity(),
                        rotation: obj.rotation(),
                        scaleX: obj.scaleX(),
                        scaleY: obj.scaleY(),
                        zIndex: obj.zIndex()
                    });
                } else if (['Rect', 'Circle', 'Arrow', 'Line'].includes(obj.getClassName())) {
                    shapes.push({
                        id: obj.id() || `shape_${index}`,
                        type: obj.getClassName().toLowerCase(),
                        x: obj.x(),
                        y: obj.y(),
                        width: obj.width ? obj.width() : undefined,
                        height: obj.height ? obj.height() : undefined,
                        radius: obj.radius ? obj.radius() : undefined,
                        fill: obj.fill(),
                        stroke: obj.stroke(),
                        strokeWidth: obj.strokeWidth(),
                        opacity: obj.opacity(),
                        rotation: obj.rotation(),
                        scaleX: obj.scaleX(),
                        scaleY: obj.scaleY(),
                        zIndex: obj.zIndex()
                    });
                } else if (obj.getClassName() === 'Image') {
                    // Handle image objects
                    shapes.push({
                        id: obj.id() || `image_${index}`,
                        type: 'image',
                        x: obj.x(),
                        y: obj.y(),
                        width: obj.width(),
                        height: obj.height(),
                        src: obj.image() ? obj.image().src : '',
                        opacity: obj.opacity(),
                        rotation: obj.rotation(),
                        scaleX: obj.scaleX(),
                        scaleY: obj.scaleY(),
                        zIndex: obj.zIndex()
                    });
                }
            });

            // Update slide content based on text elements (preserve backward compatibility)
            if (textElements.length > 0) {
                slide.content = textElements.map(elem => elem.text);
            }

            // Store complete object data for full restoration
            slide.objects = {
                texts: textElements,
                shapes: shapes
            };

            // Update visual design with shapes and theme
            if (!slide.visualDesign) {
                slide.visualDesign = {};
            }

            slide.visualDesign.shapes = shapes; // Keep for backward compatibility
            slide.visualDesign.backgroundColor = this.currentTheme.backgroundColor;
            slide.visualDesign.textColor = this.currentTheme.textColor;
            slide.visualDesign.accentColor = this.currentTheme.borderColor;

            // Save current slide index to persistence
            if (window.slidesAppState.currentSlideData) {
                window.slidesAppState.currentSlideData.currentSlideIndex = this.currentSlideIndex;
            }

            // Save to localStorage
            if (window.saveSlides) {
                window.saveSlides();
            }

            console.log(`Slide ${this.currentSlideIndex + 1} state saved to persistence`);

        } catch (error) {
            console.error('Error saving slide state:', error);
        }
    }

    syncAllSlidesToPersistence() {
        // Sync all slides back to slidesAppState
        if (!window.slidesAppState || !window.slidesAppState.currentSlideData) {
            console.warn('No slidesAppState available for syncing all slides');
            return;
        }

        console.log('Syncing all slides to persistence...');

        try {
            const currentSlideIndex = this.currentSlideIndex;

            // Save each slide
            for (let i = 0; i < this.slides.length; i++) {
                this.currentSlideIndex = i;
                this.saveSlideState();
            }

            // Restore current slide index
            this.currentSlideIndex = currentSlideIndex;

            console.log(`Synced ${this.slides.length} slides to persistence`);

        } catch (error) {
            console.error('Error syncing all slides:', error);
        }
    }

    // Phase 4: Toolbar Wrapper Methods
    applyTextEffect(effectType) {
        const selected = this.getSelectedObject();
        if (selected && selected.getClassName() === 'Text') {
            this.addTextEffect(selected, effectType);
        } else {
            alert('Please select a text element first');
        }
    }

    animateSelected(animationType) {
        const selected = this.getSelectedObject();
        if (selected) {
            this.animateElement(selected, animationType);
        } else {
            alert('Please select an element first');
        }
    }

    addAdvancedShape() {
        this.showShapeModal();
    }

    addStyledText() {
        this.showStyledTextModal();
    }

    setSlideTransition() {
        this.showTransitionModal();
    }

    getSelectedObject() {
        return this.selectedObject;
    }

    setupSelection() {
        console.log('Setting up selection system');

        // Click on empty space to deselect or select slide
        this.stage.on('click tap', (e) => {
            console.log('Stage clicked, target:', e.target.getClassName());

            // If clicking on empty space
            if (e.target === this.stage) {
                // If Ctrl is held, select the entire slide
                if (e.evt && e.evt.ctrlKey) {
                    console.log('Ctrl+Click on empty space, selecting slide');
                    this.selectSlide();
                } else {
                    console.log('Clicked on empty space, deselecting');
                    this.selectObject(null);
                    this.deselectSlide();
                }
                return;
            }

            // If clicking on an object
            const clickedObject = e.target;
            if (clickedObject.getClassName() !== 'Transformer') {
                console.log('Selecting object:', clickedObject.getClassName());
                this.selectObject(clickedObject);
                this.deselectSlide(); // Deselect slide when selecting object
            }
        });

        // Double click on empty space to select slide
        this.stage.on('dblclick dbltap', (e) => {
            if (e.target === this.stage) {
                console.log('Double-click on empty space, selecting slide');
                this.selectSlide();
            }
        });

        // Ensure stage is focusable and focused for keyboard events
        this.stage.container().tabIndex = 1;
        this.stage.container().focus();

        // Setup keyboard events
        this.setupKeyboardHandlers();

        console.log('Selection system setup complete');

        // Add global function for debugging transformer visibility
        window.debugTransformer = () => {
            console.log('Transformer debug info:');
            console.log('- Visible:', this.transformer.visible());
            console.log('- Nodes:', this.transformer.nodes().length);
            console.log('- Position:', this.transformer.position());
            console.log('- Size:', this.transformer.size());
            console.log('- Layer children:', this.layer.children.length);
            console.log('- Stage size:', this.stage.size());
        };
    }

    selectObject(obj) {
        console.log('Selecting object:', obj ? obj.getClassName() : 'null');
        this.selectedObject = obj;

        if (obj) {
            // Ensure transformer is in the layer first
            if (this.transformer.getParent() !== this.layer) {
                console.log('Re-adding transformer to layer');
                this.layer.add(this.transformer);
            }

            // Attach transformer to selected object
            this.transformer.nodes([obj]);
            this.transformer.show();

            // Move to top only if it has a parent
            if (this.transformer.getParent()) {
                this.transformer.moveToTop();
                console.log('Transformer moved to top');
            }

            console.log('Transformer attached and shown');
            console.log('Transformer visible:', this.transformer.visible());
            console.log('Transformer nodes:', this.transformer.nodes().length);
            console.log('Transformer parent:', this.transformer.getParent() ? 'has parent' : 'no parent');
        } else {
            // Hide transformer when nothing is selected
            this.transformer.nodes([]);
            this.transformer.hide();
            console.log('Transformer hidden');
        }

        // Force layer redraw with debug
        this.layer.batchDraw();
        console.log('Layer redrawn, children count:', this.layer.children.length);

        // Additional debug: force stage redraw
        this.stage.batchDraw();
        console.log('Stage also redrawn');
    }

    selectSlide() {
        console.log('Selecting entire slide');
        this.selectedSlide = true;
        this.selectObject(null); // Deselect any objects

        // Add visual indicator for selected slide
        this.showSlideSelection();
    }

    deselectSlide() {
        if (this.selectedSlide) {
            console.log('Deselecting slide');
            this.selectedSlide = false;
            this.hideSlideSelection();
        }
    }

    showSlideSelection() {
        // Remove existing slide selection indicator
        this.hideSlideSelection();

        // Create a border around the entire slide area
        this.slideSelectionRect = new Konva.Rect({
            x: 0,
            y: 0,
            width: this.actualWidth,
            height: this.actualHeight,
            stroke: '#3b82f6',
            strokeWidth: 3,
            fill: 'transparent',
            dash: [10, 5],
            listening: false,
            name: 'slide-selection'
        });

        this.layer.add(this.slideSelectionRect);
        this.slideSelectionRect.moveToTop();
        this.layer.batchDraw();
    }

    hideSlideSelection() {
        if (this.slideSelectionRect) {
            this.slideSelectionRect.destroy();
            this.slideSelectionRect = null;
            this.layer.batchDraw();
        }
    }

    setupKeyboardHandlers() {
        console.log('Setting up keyboard handlers');

        // Make stage focusable - redundant call but ensure it's set
        this.stage.container().tabIndex = 1;
        this.stage.container().focus();

        // Handle keydown events
        this.stage.container().addEventListener('keydown', (e) => {
            console.log('Key pressed:', e.key, 'Selected object:', this.selectedObject, 'Selected slide:', this.selectedSlide);

            // Delete selected object or slide with Delete key
            if (e.key === 'Delete') {
                if (this.selectedObject) {
                    console.log('Deleting selected object');
                    this.deleteSelectedObject();
                    e.preventDefault();
                } else if (this.selectedSlide) {
                    console.log('Deleting selected slide');
                    this.deleteCurrentSlide();
                    e.preventDefault();
                }
            }

            // Add new slide with Ctrl+M
            if (e.ctrlKey && e.key.toLowerCase() === 'm') {
                console.log('Ctrl+M pressed, adding new slide');
                if (window.addNewSlide) {
                    window.addNewSlide();
                } else {
                    console.error('addNewSlide function not available');
                }
                e.preventDefault();
            }

            // Undo with Ctrl+Z
            if (e.ctrlKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                console.log('Ctrl+Z pressed, undo');
                this.undo();
                e.preventDefault();
            }

            // Redo with Ctrl+Y or Ctrl+Shift+Z
            if ((e.ctrlKey && e.key.toLowerCase() === 'y') ||
                (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z')) {
                console.log('Ctrl+Y or Ctrl+Shift+Z pressed, redo');
                this.redo();
                e.preventDefault();
            }
        });

        console.log('Keyboard handlers setup complete');
    }

    deleteSelectedObject() {
        if (!this.selectedObject) return;

        // Use command pattern for undo/redo capability
        const command = new DeleteObjectCommand(this, this.selectedObject);
        this.undoRedoManager.executeCommand(command);

        console.log('Deleted selected object (undoable)');
    }

    deleteCurrentSlide() {
        if (this.slides.length <= 1) {
            console.log('Cannot delete the last slide');
            // Show notification instead of alert
            this.showNotification('Cannot delete the last slide', 'warning');
            return;
        }

        // Use command pattern for undo/redo capability (no confirmation dialog)
        const command = new DeleteSlideCommand(this, this.currentSlideIndex);
        this.undoRedoManager.executeCommand(command);

        // Deselect slide
        this.deselectSlide();

        // Show undo notification
        this.showNotification(`Slide ${this.currentSlideIndex + 2} deleted. Press Ctrl+Z to undo.`, 'info');

        console.log(`Slide deleted (undoable). Showing slide ${this.currentSlideIndex + 1} of ${this.slides.length}`);
    }

    showNotification(message, type = 'info') {
        // Create or update notification element
        let notification = document.getElementById('konva-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'konva-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 6px;
                color: white;
                font-size: 14px;
                font-weight: 500;
                z-index: 1000;
                max-width: 300px;
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
            `;
            document.body.appendChild(notification);
        }

        // Set message and style based on type
        notification.textContent = message;
        const colors = {
            info: '#3b82f6',
            warning: '#f59e0b',
            error: '#ef4444',
            success: '#10b981'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        // Show notification
        notification.style.opacity = '1';

        // Hide after 4 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
        }, 4000);
    }

    undo() {
        const success = this.undoRedoManager.undo();
        if (success) {
            this.updateUndoRedoButtons();
            this.showNotification(`Undid: ${this.undoRedoManager.getRedoDescription()}`, 'success');
        } else {
            this.showNotification('Nothing to undo', 'warning');
        }
    }

    redo() {
        const success = this.undoRedoManager.redo();
        if (success) {
            this.updateUndoRedoButtons();
            this.showNotification(`Redid: ${this.undoRedoManager.getUndoDescription()}`, 'success');
        } else {
            this.showNotification('Nothing to redo', 'warning');
        }
    }

    updateUndoRedoButtons() {
        const undoBtn = document.querySelector('.undo-btn');
        const redoBtn = document.querySelector('.redo-btn');

        if (undoBtn) {
            undoBtn.disabled = !this.undoRedoManager.canUndo();
            undoBtn.title = this.undoRedoManager.canUndo() ?
                `Undo: ${this.undoRedoManager.getUndoDescription()} (Ctrl+Z)` :
                'Nothing to undo (Ctrl+Z)';
        }

        if (redoBtn) {
            redoBtn.disabled = !this.undoRedoManager.canRedo();
            redoBtn.title = this.undoRedoManager.canRedo() ?
                `Redo: ${this.undoRedoManager.getRedoDescription()} (Ctrl+Y)` :
                'Nothing to redo (Ctrl+Y)';
        }
    }

    showShapeModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            min-width: 300px;
        `;

        modal.innerHTML = `
            <h3 style="margin-top: 0;">Add Shape</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0;">
                <button onclick="window.konvaSlideSystem.addShape('rectangle'); document.body.removeChild(this.closest('div').parentElement)">Rectangle</button>
                <button onclick="window.konvaSlideSystem.addShape('circle'); document.body.removeChild(this.closest('div').parentElement)">Circle</button>
                <button onclick="window.konvaSlideSystem.addShape('triangle'); document.body.removeChild(this.closest('div').parentElement)">Triangle</button>
                <button onclick="window.konvaSlideSystem.addShape('star'); document.body.removeChild(this.closest('div').parentElement)">Star</button>
                <button onclick="window.konvaSlideSystem.addShape('arrow'); document.body.removeChild(this.closest('div').parentElement)">Arrow</button>
            </div>
            <button onclick="document.body.removeChild(this)" style="width: 100%;">Cancel</button>
        `;

        document.body.appendChild(modal);
    }

    showStyledTextModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            min-width: 400px;
        `;

        modal.innerHTML = `
            <h3 style="margin-top: 0;">Add Styled Text</h3>
            <div style="margin: 20px 0;">
                <label>Text:</label>
                <input type="text" id="styled-text-input" value="Sample Text" style="width: 100%; margin: 5px 0; padding: 8px;">

                <label>Font Family:</label>
                <select id="styled-font-family" style="width: 100%; margin: 5px 0; padding: 8px;">
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Impact">Impact</option>
                </select>

                <label>Font Style:</label>
                <select id="styled-font-style" style="width: 100%; margin: 5px 0; padding: 8px;">
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                    <option value="italic">Italic</option>
                </select>

                <label>Effect:</label>
                <select id="styled-text-effect" style="width: 100%; margin: 5px 0; padding: 8px;">
                    <option value="">None</option>
                    <option value="shadow">Shadow</option>
                    <option value="glow">Glow</option>
                    <option value="outline">Outline</option>
                    <option value="gradient">Gradient</option>
                </select>

                <label>Animation:</label>
                <select id="styled-text-animation" style="width: 100%; margin: 5px 0; padding: 8px;">
                    <option value="">None</option>
                    <option value="fadeIn">Fade In</option>
                    <option value="slideInLeft">Slide In Left</option>
                    <option value="slideInRight">Slide In Right</option>
                    <option value="bounce">Bounce</option>
                </select>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="window.konvaSlideSystem.createStyledText(); document.body.removeChild(this.closest('div').parentElement)" style="flex: 1;">Add Text</button>
                <button onclick="document.body.removeChild(this)" style="flex: 1;">Cancel</button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    showTransitionModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            min-width: 300px;
        `;

        modal.innerHTML = `
            <h3 style="margin-top: 0;">Set Slide Transition</h3>
            <div style="display: grid; grid-template-columns: 1fr; gap: 10px; margin: 20px 0;">
                <button onclick="window.konvaSlideSystem.slideTransition = 'fade'; document.body.removeChild(this.closest('div').parentElement)">Fade</button>
                <button onclick="window.konvaSlideSystem.slideTransition = 'slideLeft'; document.body.removeChild(this.closest('div').parentElement)">Slide Left</button>
                <button onclick="window.konvaSlideSystem.slideTransition = 'slideRight'; document.body.removeChild(this.closest('div').parentElement)">Slide Right</button>
                <button onclick="window.konvaSlideSystem.slideTransition = 'scale'; document.body.removeChild(this.closest('div').parentElement)">Scale</button>
            </div>
            <button onclick="document.body.removeChild(this)" style="width: 100%;">Cancel</button>
        `;

        document.body.appendChild(modal);
    }

    createStyledText() {
        const text = document.getElementById('styled-text-input').value;
        const fontFamily = document.getElementById('styled-font-family').value;
        const fontStyle = document.getElementById('styled-font-style').value;
        const effect = document.getElementById('styled-text-effect').value;
        const animation = document.getElementById('styled-text-animation').value;

        this.addTextWithTypography({
            text: text,
            fontFamily: fontFamily,
            fontStyle: fontStyle,
            effect: effect || null,
            animation: animation || null
        });
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
                    } else if (obj.getClassName() === 'Image') {
                        // Update image border color for theme consistency
                        obj.stroke(this.currentTheme.borderColor);
                    }
                });
            }
        });

        // Update canvas container background color
        if (this.canvasContainer) {
            this.canvasContainer.style.background = this.currentTheme.backgroundColor;
        }

        // Force a complete redraw of the current slide with new theme
        if (this.layer && this.currentSlideIndex >= 0) {
            this.showSlide(this.currentSlideIndex);
        }

        console.log('Theme updated for Konva slides:', newTheme);
    }

    // Phase 4: Advanced Features - Effects and Animations
    addTextEffect(textObj, effectType) {
        const effects = {
            shadow: () => {
                textObj.shadowColor('rgba(0, 0, 0, 0.5)');
                textObj.shadowBlur(4);
                textObj.shadowOffset({ x: 2, y: 2 });
                textObj.shadowOpacity(0.8);
            },
            glow: () => {
                textObj.shadowColor(textObj.fill());
                textObj.shadowBlur(10);
                textObj.shadowOffset({ x: 0, y: 0 });
                textObj.shadowOpacity(0.6);
            },
            outline: () => {
                textObj.stroke('#333333');
                textObj.strokeWidth(2);
            },
            gradient: () => {
                // For Konva text gradients, we need to set the property directly
                textObj.setAttrs({
                    fillLinearGradient: {
                        start: { x: 0, y: 0 },
                        end: { x: textObj.width(), y: 0 },
                        colorStops: [0, '#2563EB', 1, '#2563EB']
                    }
                });
            }
        };

        if (effects[effectType]) {
            effects[effectType]();
            this.layer.draw();
            this.saveSlideState();
        }
    }

    applyPendingAnimations(slideIndex) {
        if (!this.slideObjects[slideIndex]) return;

        this.slideObjects[slideIndex].forEach(obj => {
            if (obj._pendingAnimation) {
                const { type, duration, delay } = obj._pendingAnimation;

                // Apply animation with the stored delay
                setTimeout(() => {
                    // Double-check the object is still in the layer before animating
                    if (obj.getLayer()) {
                        this.animateElement(obj, type, duration);
                    }
                }, delay);

                // Clear the pending animation to avoid re-applying
                delete obj._pendingAnimation;
            }
        });
    }

    animateElement(element, animationType, duration = 1000) {
        const animations = {
            fadeIn: () => {
                element.opacity(0);
                const tween = new Konva.Tween({
                    node: element,
                    duration: duration / 1000,
                    opacity: 1,
                    easing: Konva.Easings.EaseInOut
                });
                tween.play();
            },
            slideInLeft: () => {
                const originalX = element.x();
                element.x(-element.width());
                const tween = new Konva.Tween({
                    node: element,
                    duration: duration / 1000,
                    x: originalX,
                    easing: Konva.Easings.EaseOut
                });
                tween.play();
            },
            slideInRight: () => {
                const originalX = element.x();
                element.x(this.actualWidth + element.width());
                const tween = new Konva.Tween({
                    node: element,
                    duration: duration / 1000,
                    x: originalX,
                    easing: Konva.Easings.EaseOut
                });
                tween.play();
            },
            slideInTop: () => {
                const originalY = element.y();
                element.y(-element.height());
                const tween = new Konva.Tween({
                    node: element,
                    duration: duration / 1000,
                    y: originalY,
                    easing: Konva.Easings.EaseOut
                });
                tween.play();
            },
            bounce: () => {
                const tween = new Konva.Tween({
                    node: element,
                    duration: 0.5,
                    scaleX: 1.2,
                    scaleY: 1.2,
                    easing: Konva.Easings.EaseInOut,
                    onFinish: () => {
                        const bounceBack = new Konva.Tween({
                            node: element,
                            duration: 0.3,
                            scaleX: 1,
                            scaleY: 1,
                            easing: Konva.Easings.EaseOut
                        });
                        bounceBack.play();
                    }
                });
                tween.play();
            },
            pulse: () => {
                const pulse = () => {
                    const tween = new Konva.Tween({
                        node: element,
                        duration: 0.8,
                        scaleX: 1.1,
                        scaleY: 1.1,
                        easing: Konva.Easings.EaseInOut,
                        onFinish: () => {
                            const tween2 = new Konva.Tween({
                                node: element,
                                duration: 0.8,
                                scaleX: 1,
                                scaleY: 1,
                                easing: Konva.Easings.EaseInOut,
                                onFinish: pulse
                            });
                            tween2.play();
                        }
                    });
                    tween.play();
                };
                pulse();
            }
        };

        if (animations[animationType]) {
            animations[animationType]();
        }
    }

    addTextWithTypography(options) {
        const {
            text = 'Sample Text',
            x = this.actualWidth * 0.1,
            y = this.actualHeight * 0.1,
            fontFamily = 'Arial',
            fontSize = 24,
            fontStyle = 'normal',
            textDecoration = 'none',
            letterSpacing = 0,
            lineHeight = 1.2,
            textAlign = 'left',
            fill = this.currentTheme.textColor,
            effect = null,
            animation = null
        } = options;

        const textObj = new Konva.Text({
            x: x,
            y: y,
            text: text,
            fontSize: fontSize * this.scaleFactor,
            fontFamily: fontFamily,
            fontStyle: fontStyle,
            textDecoration: textDecoration,
            letterSpacing: letterSpacing,
            lineHeight: lineHeight,
            align: textAlign,
            fill: fill,
            width: this.actualWidth * 0.8,
            draggable: true
        });

        // Apply text effect if specified
        if (effect) {
            this.addTextEffect(textObj, effect);
        }

        // Add interaction handlers
        this.addTextInteractionHandlers(textObj);

        // Add to current slide
        if (!this.slideObjects[this.currentSlideIndex]) {
            this.slideObjects[this.currentSlideIndex] = [];
        }
        this.slideObjects[this.currentSlideIndex].push(textObj);

        this.layer.add(textObj);
        this.layer.draw();

        // Apply animation if specified
        if (animation) {
            this.animateElement(textObj, animation);
        }

        this.saveSlideState();
        return textObj;
    }

    addShape(shapeType, options = {}) {
        const {
            x = this.actualWidth * 0.3,
            y = this.actualHeight * 0.3,
            width = this.actualWidth * 0.3,
            height = this.actualHeight * 0.2,
            fill = this.currentTheme.fillColor,
            stroke = this.currentTheme.borderColor,
            strokeWidth = 2,
            opacity = 1,
            cornerRadius = 0,
            animation = null
        } = options;

        let shape;

        switch (shapeType) {
            case 'rectangle':
                shape = new Konva.Rect({
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    fill: fill,
                    stroke: stroke,
                    strokeWidth: strokeWidth,
                    opacity: opacity,
                    cornerRadius: cornerRadius,
                    draggable: true
                });
                break;

            case 'circle':
                shape = new Konva.Circle({
                    x: x + width / 2,
                    y: y + height / 2,
                    radius: Math.min(width, height) / 2,
                    fill: fill,
                    stroke: stroke,
                    strokeWidth: strokeWidth,
                    opacity: opacity,
                    draggable: true
                });
                break;

            case 'triangle':
                shape = new Konva.RegularPolygon({
                    x: x + width / 2,
                    y: y + height / 2,
                    sides: 3,
                    radius: Math.min(width, height) / 2,
                    fill: fill,
                    stroke: stroke,
                    strokeWidth: strokeWidth,
                    opacity: opacity,
                    draggable: true
                });
                break;

            case 'star':
                shape = new Konva.Star({
                    x: x + width / 2,
                    y: y + height / 2,
                    numPoints: 5,
                    innerRadius: Math.min(width, height) / 4,
                    outerRadius: Math.min(width, height) / 2,
                    fill: fill,
                    stroke: stroke,
                    strokeWidth: strokeWidth,
                    opacity: opacity,
                    draggable: true
                });
                break;

            case 'arrow':
                shape = new Konva.Arrow({
                    x: x,
                    y: y + height / 2,
                    points: [0, 0, width, 0],
                    pointerLength: 20,
                    pointerWidth: 20,
                    fill: fill,
                    stroke: stroke,
                    strokeWidth: strokeWidth,
                    opacity: opacity,
                    draggable: true
                });
                break;

            default:
                console.warn('Unknown shape type:', shapeType);
                return;
        }

        // Add interaction handlers
        this.addShapeInteractionHandlers(shape);

        // Add to current slide
        if (!this.slideObjects[this.currentSlideIndex]) {
            this.slideObjects[this.currentSlideIndex] = [];
        }
        this.slideObjects[this.currentSlideIndex].push(shape);

        this.layer.add(shape);
        this.layer.draw();

        // Apply animation if specified
        if (animation) {
            this.animateElement(shape, animation);
        }

        this.saveSlideState();
        return shape;
    }

    applySlideTransition(transitionType, callback) {
        const transitions = {
            fade: () => {
                this.layer.opacity(0);
                if (callback) callback();
                const tween = new Konva.Tween({
                    node: this.layer,
                    duration: 0.5,
                    opacity: 1,
                    easing: Konva.Easings.EaseInOut
                });
                tween.play();
            },
            slideLeft: () => {
                this.layer.x(this.actualWidth);
                if (callback) callback();
                const tween = new Konva.Tween({
                    node: this.layer,
                    duration: 0.6,
                    x: 0,
                    easing: Konva.Easings.EaseOut
                });
                tween.play();
            },
            slideRight: () => {
                this.layer.x(-this.actualWidth);
                if (callback) callback();
                const tween = new Konva.Tween({
                    node: this.layer,
                    duration: 0.6,
                    x: 0,
                    easing: Konva.Easings.EaseOut
                });
                tween.play();
            },
            scale: () => {
                this.layer.scaleX(0);
                this.layer.scaleY(0);
                if (callback) callback();
                const tween = new Konva.Tween({
                    node: this.layer,
                    duration: 0.5,
                    scaleX: 1,
                    scaleY: 1,
                    easing: Konva.Easings.BackEaseOut
                });
                tween.play();
            }
        };

        if (transitions[transitionType]) {
            transitions[transitionType]();
        } else {
            if (callback) callback();
        }
    }

    setupColorSchemes() {
        // Use the COLOR_THEMES from slides_main.js if available, otherwise fallback
        const colorSchemes = window.COLOR_THEMES || {
            lavender: {
                name: 'Lavender Dreams',
                textColor: '#4c1d95',
                borderColor: '#8b5cf6',
                fillColor: '#e6e6fa',
                backgroundColor: '#faf5ff'
            },
            mint: {
                name: 'Mint Fresh',
                textColor: '#065f46',
                borderColor: '#10b981',
                fillColor: '#d1f2eb',
                backgroundColor: '#f0fdfa'
            },
            rose: {
                name: 'Rose Blush',
                textColor: '#9f1239',
                borderColor: '#e11d48',
                fillColor: '#fce7f3',
                backgroundColor: '#fdf2f8'
            },
            sky: {
                name: 'Sky Blue',
                textColor: '#1e3a8a',
                borderColor: '#2563eb',
                fillColor: '#dbeafe',
                backgroundColor: '#f0f9ff'
            },
            peach: {
                name: 'Peach Cream',
                textColor: '#9a3412',
                borderColor: '#ea580c',
                fillColor: '#fed7aa',
                backgroundColor: '#fff7ed'
            },
            sage: {
                name: 'Sage Green',
                textColor: '#14532d',
                borderColor: '#16a34a',
                fillColor: '#dcfce7',
                backgroundColor: '#f0fdf4'
            }
        };

        // Add click handlers to color scheme tiles
        this.sidebar.querySelectorAll('.color-scheme-tile').forEach(tile => {
            // Add hover effect for edit button
            tile.addEventListener('mouseenter', () => {
                const editBtn = tile.querySelector('.edit-theme-btn');
                if (editBtn) {
                    editBtn.style.display = 'flex';
                }
            });

            tile.addEventListener('mouseleave', () => {
                const editBtn = tile.querySelector('.edit-theme-btn');
                if (editBtn) {
                    editBtn.style.display = 'none';
                }
            });

            // Tile click handler
            tile.addEventListener('click', (e) => {
                // Don't trigger tile selection if edit button was clicked
                if (e.target.classList.contains('edit-theme-btn')) {
                    return;
                }

                const scheme = tile.dataset.scheme;
                if (colorSchemes[scheme]) {
                    // Update active state
                    this.sidebar.querySelectorAll('.color-scheme-tile').forEach(t => {
                        t.classList.remove('selected');
                    });
                    tile.classList.add('selected');

                    // Apply theme to Konva system
                    this.updateTheme(colorSchemes[scheme]);

                    // Sync with main slides system if available
                    if (window.applyTheme && window.slidesAppState) {
                        window.slidesAppState.currentTheme = { key: scheme, ...colorSchemes[scheme] };
                        window.applyTheme(colorSchemes[scheme]);
                    }
                }
            });

            // Edit button click handler
            const editBtn = tile.querySelector('.edit-theme-btn');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent tile selection
                    const scheme = tile.dataset.scheme;
                    console.log('Edit button clicked for scheme:', scheme);
                    if (colorSchemes[scheme]) {
                        console.log('Opening color editor for:', scheme, colorSchemes[scheme]);
                        this.openColorEditor(scheme, colorSchemes[scheme]);
                    } else {
                        console.error('Color scheme not found:', scheme);
                    }
                });
            }
        });

        // Set default selection (lavender)
        const defaultTile = this.sidebar.querySelector('.color-scheme-tile[data-scheme="lavender"]');
        if (defaultTile) {
            defaultTile.classList.add('selected');
        }

        // Setup accordion functionality
        this.setupAccordion();
    }

    setupAccordion() {
        const categoryHeaders = this.sidebar.querySelectorAll('.category-header');

        categoryHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const category = header.parentElement;
                const content = category.querySelector('.category-content');
                const chevron = header.querySelector('.chevron');

                // Toggle expanded state
                const isExpanded = category.classList.contains('expanded');

                if (isExpanded) {
                    // Collapse
                    category.classList.remove('expanded');
                    content.style.maxHeight = '0px';
                    content.style.padding = '0px';
                    content.style.opacity = '0';
                    chevron.style.transform = 'rotate(0deg)';
                } else {
                    // Collapse all other categories first
                    categoryHeaders.forEach(otherHeader => {
                        // Skip the current header to prevent visual flicker
                        if (otherHeader === header) return;

                        const otherCategory = otherHeader.parentElement;
                        const otherContent = otherCategory.querySelector('.category-content');
                        const otherChevron = otherHeader.querySelector('.chevron');

                        otherCategory.classList.remove('expanded');
                        otherContent.style.maxHeight = '0px';
                        otherContent.style.padding = '0px';
                        otherContent.style.opacity = '0';
                        // Remove inline transform to let CSS handle it
                        otherChevron.style.transform = '';
                    });

                    // Expand this category
                    category.classList.add('expanded');
                    // Let CSS handle the expansion with proper height calculation
                    content.style.maxHeight = 'none';
                    content.style.padding = '18px';
                    content.style.opacity = '1';
                    chevron.style.transform = 'rotate(90deg)';
                }
            });
        });

        // Set default expanded category (Color Schemes)
        const defaultCategory = this.sidebar.querySelector('.accordion-category[data-category="colors"]');
        if (defaultCategory) {
            const header = defaultCategory.querySelector('.category-header');
            if (header) {
                header.click();
            }
        }
    }

    updateColorSchemeTile(themeKey, updatedTheme) {
        // Find the specific tile for this theme
        const tile = this.sidebar.querySelector(`.color-scheme-tile[data-scheme="${themeKey}"]`);
        if (!tile) return;

        // Update the color stripes with new values
        const stripes = tile.querySelectorAll('.color-stripe');
        if (stripes.length >= 3) {
            stripes[0].style.background = updatedTheme.textColor;
            stripes[0].title = 'Text Color';
            stripes[1].style.background = updatedTheme.borderColor;
            stripes[1].title = 'Border Color';
            stripes[2].style.background = updatedTheme.fillColor;
            stripes[2].title = 'Fill Color';
        }

        console.log('Updated color scheme tile preview for:', themeKey, updatedTheme);
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

    /**
     * Create initial demo slide with default color scheme
     */
    createInitialSlide() {
        // Only create if no slides exist
        if (this.slides.length > 0) {
            return;
        }

        // Create a sample slide with default lavender theme
        const initialSlide = {
            title: "Welcome to your presentation",
            content: [
                "Click any element to edit",
                "Use the sidebar tools to add content",
                "Choose colors, shapes, and layouts",
                "Export when ready"
            ],
            visualSuggestions: {
                backgroundColor: "#f0f9ff",
                accentColor: "#8b5cf6",
                layout: "hero"
            },
            isTitle: true,
            slideNumber: 1
        };

        // Add the slide
        this.slides.push(initialSlide);

        // Create visual objects for the slide
        const slideObjects = this.createSlideFromData(initialSlide, 0);
        this.slideObjects.push(slideObjects);

        // Show the slide
        this.showSlide(0);
        this.updateNavigation();

        console.log('Created initial demo slide with default theme');
    }

    /**
     * Open color editor modal for editing color schemes
     */
    openColorEditor(schemeKey, currentScheme) {
        const modal = document.createElement('div');
        modal.className = 'color-editor-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div class="color-editor-content" style="
                background: white;
                border-radius: 12px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            ">
                <h3 style="margin-top: 0; margin-bottom: 20px;">Edit ${schemeKey.charAt(0).toUpperCase() + schemeKey.slice(1)} Color Scheme</h3>

                <div class="color-inputs" style="display: flex; flex-direction: column; gap: 15px;">
                    <div class="input-group">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Text Color:</label>
                        <input type="color" id="edit-text-color" value="${currentScheme.textColor}" style="width: 100%; height: 40px; border-radius: 6px; border: 1px solid #ddd;">
                    </div>
                    <div class="input-group">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Border Color:</label>
                        <input type="color" id="edit-border-color" value="${currentScheme.borderColor}" style="width: 100%; height: 40px; border-radius: 6px; border: 1px solid #ddd;">
                    </div>
                    <div class="input-group">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Fill Color:</label>
                        <input type="color" id="edit-fill-color" value="${currentScheme.fillColor}" style="width: 100%; height: 40px; border-radius: 6px; border: 1px solid #ddd;">
                    </div>
                </div>

                <div class="color-preview" style="
                    margin: 20px 0;
                    padding: 15px;
                    border-radius: 8px;
                    border: 2px solid var(--border-color, ${currentScheme.borderColor});
                    background-color: var(--fill-color, ${currentScheme.fillColor});
                    color: var(--text-color, ${currentScheme.textColor});
                    text-align: center;
                    font-weight: 500;
                ">Preview: Sample Text</div>

                <div class="modal-buttons" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 25px;">
                    <button type="button" class="btn-cancel" style="
                        padding: 8px 16px;
                        border: 1px solid #ddd;
                        background: white;
                        border-radius: 6px;
                        cursor: pointer;
                    ">Cancel</button>
                    <button type="button" class="btn-save" style="
                        padding: 8px 16px;
                        border: none;
                        background: #3b82f6;
                        color: white;
                        border-radius: 6px;
                        cursor: pointer;
                    ">Save Changes</button>
                </div>
            </div>
        `;

        // Add event listeners
        const textColorInput = modal.querySelector('#edit-text-color');
        const borderColorInput = modal.querySelector('#edit-border-color');
        const fillColorInput = modal.querySelector('#edit-fill-color');
        const preview = modal.querySelector('.color-preview');

        const updatePreview = () => {
            preview.style.color = textColorInput.value;
            preview.style.borderColor = borderColorInput.value;
            preview.style.backgroundColor = fillColorInput.value;
        };

        textColorInput.addEventListener('input', updatePreview);
        borderColorInput.addEventListener('input', updatePreview);
        fillColorInput.addEventListener('input', updatePreview);

        // Save button
        modal.querySelector('.btn-save').addEventListener('click', () => {
            const updatedScheme = {
                textColor: textColorInput.value,
                borderColor: borderColorInput.value,
                fillColor: fillColorInput.value
            };

            this.updateColorScheme(schemeKey, updatedScheme);
            document.body.removeChild(modal);
        });

        // Cancel button
        modal.querySelector('.btn-cancel').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        document.body.appendChild(modal);
    }

    /**
     * Update color scheme and refresh UI
     */
    updateColorScheme(schemeKey, newScheme) {
        // Update the color schemes object (assuming it exists globally)
        if (window.colorSchemes) {
            window.colorSchemes[schemeKey] = newScheme;
        }

        // Update the visual tile in the sidebar
        this.updateColorSchemeTile(schemeKey, newScheme);

        // Apply to current theme if this scheme is selected
        const selectedTile = this.sidebar.querySelector('.color-scheme-tile.selected');
        if (selectedTile && selectedTile.dataset.scheme === schemeKey) {
            this.currentTheme = newScheme;
            this.applyThemeToCurrentSlide();
        }

        console.log(`Updated color scheme '${schemeKey}':`, newScheme);
    }

    /**
     * Handle window resize for mobile responsiveness
     */
    handleWindowResize() {
        if (this.canvasContainer && this.stage) {
            // Update container styles for mobile
            if (window.innerWidth <= 767) {
                this.canvasContainer.style.margin = '10px auto';
                this.canvasContainer.style.maxWidth = '100%';
                this.canvasContainer.style.borderRadius = '6px';
            } else {
                this.canvasContainer.style.margin = '20px auto';
                this.canvasContainer.style.maxWidth = `${this.slideWidth}px`;
                this.canvasContainer.style.borderRadius = '8px';
            }

            // Recalculate responsive dimensions
            this.calculateResponsiveDimensions(this.canvasContainer);

            // Update stage size
            if (this.stage) {
                this.stage.width(this.containerWidth);
                this.stage.height(this.containerHeight);
                this.stage.draw();
            }
        }
    }
}

// Export for global use
window.KonvaSlideSystem = KonvaSlideSystem;

// Add global resize handler for mobile responsiveness
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (window.konvaSlideSystem && typeof window.konvaSlideSystem.handleWindowResize === 'function') {
            window.konvaSlideSystem.handleWindowResize();
        }
    }, 250);
});