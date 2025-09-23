// Konva.js Canvas Editor Integration
// Visual canvas-based editing experience for slide content

let Konva;

// Load Konva.js dependencies
async function loadKonvaJS() {
    if (typeof Konva !== 'undefined') return true;

    try {
        // Try local library first, then CDN fallbacks
        const cdnUrls = [
            './assets/js/vendor/konva/9.2.0/konva.min.js',
            'https://unpkg.com/konva@9.2.0/konva.min.js',
            'https://unpkg.com/konva@9.2.0/lib/index.js',
            'https://cdn.jsdelivr.net/npm/konva@9.2.0/konva.min.js'
        ];

        for (const url of cdnUrls) {
            try {
                // Try loading via script tag for better compatibility
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = url;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });

                if (window.Konva) {
                    Konva = window.Konva;
                    console.log('Konva.js loaded successfully from:', url);
                    return true;
                }
            } catch (e) {
                console.warn('Failed to load from:', url);
                continue;
            }
        }

        throw new Error('All CDN attempts failed');
    } catch (error) {
        console.warn('Failed to load Konva.js, falling back to contentEditable:', error);
        return false;
    }
}

// Konva.js Editor Component
class KonvaSlideEditor {
    constructor(element, initialValue, onChange) {
        this.element = element;
        this.initialValue = initialValue;
        this.onChange = onChange;
        this.stage = null;
        this.layer = null;
        this.transformer = null;
        this.selectedObject = null;
        this.textObjects = [];
        this.isEditing = false;

        // Canvas dimensions
        this.width = 800;
        this.height = 600;

        this.init();
    }

    async init() {
        const konvaLoaded = await loadKonvaJS();

        if (!konvaLoaded) {
            // Fall back to enhanced contentEditable
            this.initFallbackEditor();
            return;
        }

        try {
            this.initKonvaEditor();
        } catch (error) {
            console.warn('Konva editor initialization failed, using fallback:', error);
            this.initFallbackEditor();
        }
    }

    initKonvaEditor() {
        // Clear the element and set up canvas container
        this.element.innerHTML = '';
        this.element.style.position = 'relative';

        // Create canvas container
        const canvasContainer = document.createElement('div');
        canvasContainer.id = `konva-container-${Date.now()}`;
        canvasContainer.style.width = `${this.width}px`;
        canvasContainer.style.height = `${this.height}px`;
        canvasContainer.style.border = '2px solid #e5e7eb';
        canvasContainer.style.borderRadius = '8px';
        canvasContainer.style.background = '#ffffff';
        canvasContainer.style.margin = '0 auto';

        this.element.appendChild(canvasContainer);

        // Create Konva stage
        this.stage = new Konva.Stage({
            container: canvasContainer.id,
            width: this.width,
            height: this.height
        });

        // Create main layer
        this.layer = new Konva.Layer();
        this.stage.add(this.layer);

        // Create transformer for object manipulation
        this.transformer = new Konva.Transformer({
            resizeEnabled: true,
            rotateEnabled: true,
            borderStroke: '#60a5fa',
            borderStrokeWidth: 2,
            anchorStroke: '#60a5fa',
            anchorFill: '#ffffff',
            anchorSize: 8
        });
        this.layer.add(this.transformer);

        // Add toolbar
        this.createToolbar();

        // Set up event handlers
        this.setupEventHandlers();

        // Load initial content if provided
        if (this.initialValue && this.initialValue !== '') {
            this.setValue(this.initialValue);
        } else {
            // Add default text
            this.addTextObject('Click to edit text', this.width / 2, this.height / 2);
        }

        this.layer.draw();
    }

    createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'konva-toolbar';
        toolbar.innerHTML = `
            <div class="konva-toolbar-group">
                <button type="button" class="konva-btn" data-command="addText" title="Add Text">
                    <span>T</span>
                </button>
                <button type="button" class="konva-btn" data-command="addRect" title="Add Rectangle">
                    <span>□</span>
                </button>
                <button type="button" class="konva-btn" data-command="addCircle" title="Add Circle">
                    <span>○</span>
                </button>
            </div>
            <div class="konva-toolbar-group">
                <button type="button" class="konva-btn" data-command="delete" title="Delete Selected">
                    <span>🗑</span>
                </button>
                <button type="button" class="konva-btn" data-command="clear" title="Clear All">
                    <span>🧹</span>
                </button>
            </div>
            <div class="konva-toolbar-group">
                <input type="color" class="konva-color-picker" id="text-color" value="#000000" title="Text Color">
                <input type="range" class="konva-font-size" min="12" max="72" value="24" title="Font Size">
            </div>
        `;

        // Insert toolbar before the canvas
        this.element.insertBefore(toolbar, this.element.firstChild);

        // Add toolbar event listeners
        toolbar.addEventListener('click', (e) => {
            const button = e.target.closest('.konva-btn');
            if (button) {
                e.preventDefault();
                const command = button.dataset.command;
                this.execCommand(command);
            }
        });

        // Color picker event
        const colorPicker = toolbar.querySelector('#text-color');
        colorPicker.addEventListener('change', (e) => {
            this.updateSelectedObjectColor(e.target.value);
        });

        // Font size slider event
        const fontSizeSlider = toolbar.querySelector('.konva-font-size');
        fontSizeSlider.addEventListener('input', (e) => {
            this.updateSelectedObjectFontSize(parseInt(e.target.value));
        });
    }

    setupEventHandlers() {
        // Click to select objects
        this.stage.on('click tap', (e) => {
            if (e.target === this.stage) {
                // Clicked on empty area
                this.deselectAll();
                return;
            }

            // Select clicked object
            this.selectObject(e.target);
        });

        // Double click to edit text
        this.stage.on('dblclick dbltap', (e) => {
            if (e.target.getClassName() === 'Text') {
                this.editText(e.target);
            }
        });

        // Handle object transformations
        this.transformer.on('transformend', () => {
            this.triggerChange();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.closest('.konva-toolbar')) return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.selectedObject) {
                    this.deleteSelected();
                }
            }

            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 't':
                        e.preventDefault();
                        this.addTextObject('New Text', 100, 100);
                        break;
                }
            }
        });
    }

    addTextObject(text, x, y) {
        const textNode = new Konva.Text({
            x: x - 50, // Center the text
            y: y - 12,
            text: text,
            fontSize: 24,
            fontFamily: 'Arial, sans-serif',
            fill: '#000000',
            draggable: true,
            padding: 5
        });

        textNode.on('dragend', () => {
            this.triggerChange();
        });

        this.layer.add(textNode);
        this.textObjects.push(textNode);
        this.selectObject(textNode);
        this.layer.draw();
        this.triggerChange();

        return textNode;
    }

    addRectangle(x = 100, y = 100) {
        const rect = new Konva.Rect({
            x: x,
            y: y,
            width: 100,
            height: 60,
            fill: '#60a5fa',
            stroke: '#3b82f6',
            strokeWidth: 2,
            draggable: true
        });

        rect.on('dragend', () => {
            this.triggerChange();
        });

        this.layer.add(rect);
        this.selectObject(rect);
        this.layer.draw();
        this.triggerChange();

        return rect;
    }

    addCircle(x = 150, y = 150) {
        const circle = new Konva.Circle({
            x: x,
            y: y,
            radius: 40,
            fill: '#10b981',
            stroke: '#059669',
            strokeWidth: 2,
            draggable: true
        });

        circle.on('dragend', () => {
            this.triggerChange();
        });

        this.layer.add(circle);
        this.selectObject(circle);
        this.layer.draw();
        this.triggerChange();

        return circle;
    }

    selectObject(obj) {
        if (obj === this.transformer) return;

        this.selectedObject = obj;
        this.transformer.nodes([obj]);
        this.layer.draw();
    }

    deselectAll() {
        this.selectedObject = null;
        this.transformer.nodes([]);
        this.layer.draw();
    }

    editText(textNode) {
        if (this.isEditing) return;

        this.isEditing = true;

        // Get text position on stage
        const textPosition = textNode.absolutePosition();
        const stageBox = this.stage.container().getBoundingClientRect();

        // Create textarea for editing
        const textarea = document.createElement('textarea');
        textarea.value = textNode.text();
        textarea.style.position = 'absolute';
        textarea.style.top = (stageBox.top + textPosition.y) + 'px';
        textarea.style.left = (stageBox.left + textPosition.x) + 'px';
        textarea.style.width = Math.max(textNode.width(), 100) + 'px';
        textarea.style.height = Math.max(textNode.height(), 30) + 'px';
        textarea.style.fontSize = textNode.fontSize() + 'px';
        textarea.style.fontFamily = textNode.fontFamily();
        textarea.style.color = textNode.fill();
        textarea.style.background = 'rgba(255, 255, 255, 0.9)';
        textarea.style.border = '2px solid #60a5fa';
        textarea.style.borderRadius = '4px';
        textarea.style.padding = '4px';
        textarea.style.resize = 'none';
        textarea.style.zIndex = '1000';

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        // Hide original text while editing
        textNode.hide();
        this.layer.draw();

        const finishEdit = () => {
            const newText = textarea.value.trim();
            if (newText) {
                textNode.text(newText);
            }
            textNode.show();
            document.body.removeChild(textarea);
            this.isEditing = false;
            this.layer.draw();
            this.triggerChange();
        };

        textarea.addEventListener('blur', finishEdit);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                finishEdit();
            }
            if (e.key === 'Escape') {
                // Cancel editing
                textNode.show();
                document.body.removeChild(textarea);
                this.isEditing = false;
                this.layer.draw();
            }
        });
    }

    updateSelectedObjectColor(color) {
        if (!this.selectedObject) return;

        if (this.selectedObject.getClassName() === 'Text') {
            this.selectedObject.fill(color);
        } else {
            this.selectedObject.fill(color);
        }

        this.layer.draw();
        this.triggerChange();
    }

    updateSelectedObjectFontSize(size) {
        if (!this.selectedObject || this.selectedObject.getClassName() !== 'Text') return;

        this.selectedObject.fontSize(size);
        this.layer.draw();
        this.triggerChange();
    }

    execCommand(command) {
        switch (command) {
            case 'addText':
                this.addTextObject('New Text', 100, 100);
                break;
            case 'addRect':
                this.addRectangle();
                break;
            case 'addCircle':
                this.addCircle();
                break;
            case 'delete':
                this.deleteSelected();
                break;
            case 'clear':
                this.clearAll();
                break;
        }
    }

    deleteSelected() {
        if (!this.selectedObject) return;

        this.selectedObject.destroy();
        this.selectedObject = null;
        this.transformer.nodes([]);

        // Remove from textObjects array if it's a text
        this.textObjects = this.textObjects.filter(obj => !obj.isDestroyed());

        this.layer.draw();
        this.triggerChange();
    }

    clearAll() {
        this.layer.destroyChildren();
        this.textObjects = [];
        this.selectedObject = null;

        // Re-add transformer
        this.layer.add(this.transformer);
        this.layer.draw();
        this.triggerChange();
    }

    initFallbackEditor() {
        // Simple enhanced contentEditable fallback
        this.element.contentEditable = true;
        this.element.classList.add('konva-fallback-editor');
        this.element.style.minHeight = '100px';
        this.element.style.padding = '12px';
        this.element.style.border = '2px solid #e5e7eb';
        this.element.style.borderRadius = '8px';
        this.element.style.background = 'rgba(255, 255, 255, 0.9)';

        this.element.addEventListener('input', () => {
            this.triggerChange();
        });
    }

    triggerChange() {
        if (this.onChange) {
            const content = this.getValue();
            console.log('Konva editor content changed:', content);
            this.onChange(content);
        }
    }

    getValue() {
        if (!this.stage) {
            // Fallback editor
            return this.element.textContent || this.element.innerText || '';
        }

        // Export canvas content as JSON
        const stageData = this.stage.toJSON();

        // Also extract text content for search/compatibility
        const textContent = this.textObjects
            .map(textObj => textObj.text())
            .filter(text => text.trim())
            .join(' ');

        return JSON.stringify({
            type: 'konva',
            stage: stageData,
            textContent: textContent
        });
    }

    setValue(value) {
        if (!this.stage) {
            // Fallback editor
            this.element.innerHTML = typeof value === 'string' ? value : '';
            return;
        }

        try {
            let data;
            if (typeof value === 'string') {
                if (value.startsWith('{')) {
                    data = JSON.parse(value);
                } else {
                    // Plain text - create a text object
                    this.clearAll();
                    if (value.trim()) {
                        this.addTextObject(value, this.width / 2, this.height / 2);
                    }
                    return;
                }
            } else {
                data = value;
            }

            if (data && data.type === 'konva' && data.stage) {
                // Load Konva stage data
                this.clearAll();
                const stage = Konva.Node.create(data.stage, this.stage.container());

                // Copy all layers except transformer
                stage.children.forEach(layer => {
                    if (layer.getClassName() === 'Layer') {
                        layer.children.forEach(child => {
                            if (child.getClassName() !== 'Transformer') {
                                const clonedChild = child.clone();
                                this.layer.add(clonedChild);

                                if (clonedChild.getClassName() === 'Text') {
                                    this.textObjects.push(clonedChild);
                                }

                                // Re-add event handlers
                                if (clonedChild.draggable()) {
                                    clonedChild.on('dragend', () => {
                                        this.triggerChange();
                                    });
                                }
                            }
                        });
                    }
                });

                this.layer.draw();
                stage.destroy();
            }
        } catch (error) {
            console.warn('Failed to load Konva data, creating text object:', error);
            this.clearAll();
            if (value && typeof value === 'string') {
                this.addTextObject(value, this.width / 2, this.height / 2);
            }
        }
    }

    destroy() {
        if (this.stage) {
            this.stage.destroy();
        }

        // Clean up toolbar
        const toolbar = this.element.querySelector('.konva-toolbar');
        if (toolbar) {
            toolbar.remove();
        }

        // Remove editor classes
        this.element.classList.remove('konva-fallback-editor');
        this.element.contentEditable = false;
        this.element.innerHTML = '';
    }
}

// CSS for Konva editor
function addKonvaEditorStyles() {
    if (document.getElementById('konva-editor-styles')) return;

    const style = document.createElement('style');
    style.id = 'konva-editor-styles';
    style.textContent = `
        .konva-fallback-editor {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            line-height: 1.6;
            transition: all 0.2s ease;
        }

        .konva-fallback-editor::before {
            content: '⚠️ Canvas Editor Unavailable';
            position: absolute;
            top: -8px;
            left: 12px;
            background: #ef4444;
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
        }

        .konva-fallback-editor:focus {
            outline: none;
            border-color: var(--accent-color, #60a5fa);
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
        }

        .konva-toolbar {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            padding: 12px;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            align-items: center;
        }

        .konva-toolbar-group {
            display: flex;
            gap: 4px;
            align-items: center;
            padding: 0 8px;
            border-right: 1px solid #e5e7eb;
        }

        .konva-toolbar-group:last-child {
            border-right: none;
        }

        .konva-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border: 1px solid transparent;
            border-radius: 6px;
            background: none;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            color: #374151;
        }

        .konva-btn:hover {
            background: #f3f4f6;
            border-color: #d1d5db;
            transform: translateY(-1px);
        }

        .konva-btn:active {
            background: #e5e7eb;
            transform: translateY(0);
        }

        .konva-color-picker {
            width: 40px;
            height: 36px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .konva-color-picker:hover {
            border-color: #60a5fa;
        }

        .konva-font-size {
            width: 80px;
            height: 6px;
            margin-left: 8px;
            cursor: pointer;
        }

        .konva-font-size::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #60a5fa;
            cursor: pointer;
        }

        .konva-font-size::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #60a5fa;
            cursor: pointer;
            border: none;
        }
    `;

    document.head.appendChild(style);
}

// Initialize Konva editor for an element
function createKonvaEditor(element, initialValue, onChange) {
    addKonvaEditorStyles();
    return new KonvaSlideEditor(element, initialValue, onChange);
}

// Export for use in slides_main.js
window.KonvaEditor = {
    create: createKonvaEditor,
    loadDependencies: loadKonvaJS
};