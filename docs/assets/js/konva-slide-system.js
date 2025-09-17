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

        // Animation and transition support
        this.slideTransition = 'fade'; // Default transition type

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
                <label>Images:</label>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.addImageFromURL()">🌐 URL</button>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.addImageFromFile()">📁 Upload</button>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.generateAIImage()">🤖 AI Image</button>
            </div>
            <div class="toolbar-group">
                <label>Layouts:</label>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.applyLayout('hero')">🎭 Hero</button>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.applyLayout('split')">⚏ Split</button>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.applyLayout('cards')">🃏 Cards</button>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.applyLayout('overlay')">🖼️ Overlay</button>
            </div>
            <div class="toolbar-group">
                <label>Effects:</label>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.applyTextEffect('shadow')">🌟 Shadow</button>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.applyTextEffect('glow')">✨ Glow</button>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.applyTextEffect('outline')">🔲 Outline</button>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.applyTextEffect('gradient')">🌈 Gradient</button>
            </div>
            <div class="toolbar-group">
                <label>Animations:</label>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.animateSelected('fadeIn')">🎭 Fade In</button>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.animateSelected('slideInLeft')">◀️ Slide Left</button>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.animateSelected('bounce')">🏀 Bounce</button>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.animateSelected('pulse')">💓 Pulse</button>
            </div>
            <div class="toolbar-group">
                <label>Advanced:</label>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.addAdvancedShape()">🔷 Shapes</button>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.addStyledText()">🎨 Styled Text</button>
                <button class="tool-btn" onclick="window.konvaSlideSystem?.setSlideTransition()">🎞️ Transition</button>
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

        // Show first slide with a small delay to ensure container is properly sized
        this.currentSlideIndex = 0;

        // Force recalculation of dimensions after slides are loaded
        setTimeout(() => {
            console.log('Forcing resize and redraw after slide load');
            this.calculateResponsiveDimensions();
            this.stage.width(this.actualWidth);
            this.stage.height(this.actualHeight);
            this.showSlide(0);
            this.updateNavigation();
        }, 100);
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

        // Add title
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
                align: isTitle ? 'center' : 'left', // Center align for title slides
                draggable: true
            });

            // Add interaction handlers
            this.addTextInteractionHandlers(titleText);
            slideObjects.push(titleText);
            yPosition += (isTitle ? 100 : 90) * this.scaleFactor; // Optimized space after title for better layout
        }

        // Add content - handle differently for title vs content slides
        if (slide.content && slide.content.length > 0) {
            slide.content.forEach((point, index) => {
                // Skip empty content
                if (!point || point.trim() === '') return;

                // For title slides, don't add bullet points, just center the text
                const bulletText = new Konva.Text({
                    x: isTitle ? padding : contentPadding,
                    y: yPosition,
                    text: isTitle ? point : `• ${point}`, // No bullets on title slides
                    fontSize: contentFontSize,
                    fontFamily: 'Arial, sans-serif',
                    fill: this.currentTheme.textColor,
                    width: this.actualWidth - (isTitle ? padding * 2 : contentPadding + padding),
                    align: isTitle ? 'center' : 'left', // Center align for title slides
                    fontStyle: isTitle && index === 0 ? 'italic' : 'normal', // Italic for subtitle
                    draggable: true
                });

                // Add interaction handlers
                this.addTextInteractionHandlers(bulletText);
                slideObjects.push(bulletText);
                yPosition += (isTitle ? 60 : 60) * this.scaleFactor; // Increased spacing for better readability
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

        // Clear current layer without destroying objects (we'll reuse them)
        this.layer.removeChildren();

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

        if (currentSpan) currentSpan.textContent = this.currentSlideIndex + 1;
        if (totalSpan) totalSpan.textContent = this.slideObjects.length;

        if (prevBtn) prevBtn.disabled = this.currentSlideIndex === 0;
        if (nextBtn) nextBtn.disabled = this.currentSlideIndex === this.slideObjects.length - 1;
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
            fill: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
        // Get the last clicked object for simplicity
        // In a real implementation, you'd track selection state
        const pos = this.stage.getPointerPosition();
        if (pos) {
            return this.stage.getIntersection(pos);
        }
        return null;
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
                const fillLinearGradient = {
                    start: { x: 0, y: 0 },
                    end: { x: textObj.width(), y: 0 },
                    colorStops: [0, '#667eea', 1, '#764ba2']
                };
                textObj.fillLinearGradient(fillLinearGradient);
            }
        };

        if (effects[effectType]) {
            effects[effectType]();
            this.layer.draw();
            this.saveSlideState();
        }
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
        this.addInteractionHandlers(textObj);

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
        this.addInteractionHandlers(shape);

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