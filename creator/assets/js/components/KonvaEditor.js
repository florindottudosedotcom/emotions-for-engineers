/**
 * Konva Editor Component - Following CLAUDE.md Guidelines
 * Modular wrapper for Konva-based visual/graphical editing in slides creator
 */

import { DOM, Events } from '../core/dom.js';
import { logger } from '../core/utils.js';

export class KonvaEditor {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = null;
        this.options = {
            width: 800,
            height: 600,
            backgroundColor: '#ffffff',
            enableGrid: false,
            gridSize: 20,
            enableSnapping: true,
            snapThreshold: 5,
            ...options
        };
        this.stage = null;
        this.layer = null;
        this.isInitialized = false;
        this.elements = [];
        this.selectedElement = null;
        this.history = [];
        this.historyIndex = -1;
    }

    /**
     * Initialize the Konva Editor
     */
    async init() {
        try {
            this.container = DOM.query(`#${this.containerId}`);
            if (!this.container) {
                throw new Error(`Container #${this.containerId} not found`);
            }

            // Load Konva if not already loaded
            await this.loadKonva();

            // Create editor container
            this.createEditorContainer();

            // Initialize Konva stage and layer
            this.initializeKonva();

            // Setup event listeners
            this.setupEventListeners();

            // Create initial state
            this.saveState();

            this.isInitialized = true;
            logger.info('KonvaEditor initialized');
        } catch (error) {
            logger.error('Failed to initialize KonvaEditor:', error);
            throw error;
        }
    }

    /**
     * Load Konva library if not already loaded
     */
    async loadKonva() {
        if (window.Konva) {
            return;
        }

        // Check if Konva script exists, if not create it
        let konvaScript = document.querySelector('#konva-script');
        if (!konvaScript) {
            konvaScript = DOM.create('script', {
                id: 'konva-script',
                src: './assets/js/vendor/konva/9.2.0/konva.min.js'
            });
            document.head.appendChild(konvaScript);
        }

        return new Promise((resolve, reject) => {
            if (window.Konva) {
                resolve();
                return;
            }

            konvaScript.onload = () => {
                logger.info('Konva loaded successfully');
                resolve();
            };

            konvaScript.onerror = () => {
                reject(new Error('Failed to load Konva'));
            };
        });
    }

    /**
     * Create editor container element
     */
    createEditorContainer() {
        this.container.innerHTML = `
            <div class="konva-editor-container">
                <div class="konva-toolbar">
                    <button type="button" class="tool-btn" data-tool="select" title="Select">
                        <span>👆</span>
                    </button>
                    <button type="button" class="tool-btn" data-tool="text" title="Add Text">
                        <span>📝</span>
                    </button>
                    <button type="button" class="tool-btn" data-tool="rect" title="Add Rectangle">
                        <span>⬛</span>
                    </button>
                    <button type="button" class="tool-btn" data-tool="circle" title="Add Circle">
                        <span>⭕</span>
                    </button>
                    <button type="button" class="tool-btn" data-tool="line" title="Add Line">
                        <span>📏</span>
                    </button>
                    <div class="toolbar-separator"></div>
                    <button type="button" class="action-btn" data-action="undo" title="Undo">
                        <span>↶</span>
                    </button>
                    <button type="button" class="action-btn" data-action="redo" title="Redo">
                        <span>↷</span>
                    </button>
                    <button type="button" class="action-btn" data-action="delete" title="Delete Selected">
                        <span>🗑️</span>
                    </button>
                    <button type="button" class="action-btn" data-action="clear" title="Clear All">
                        <span>🆑</span>
                    </button>
                </div>
                <div id="${this.containerId}-canvas" class="konva-canvas"></div>
                <div class="konva-properties" id="${this.containerId}-properties">
                    <div class="properties-content">
                        <p>Select an element to edit properties</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize Konva stage and layer
     */
    initializeKonva() {
        const canvasContainer = DOM.query(`#${this.containerId}-canvas`);
        if (!canvasContainer) {
            throw new Error('Canvas container not found');
        }

        // Create Konva stage
        this.stage = new window.Konva.Stage({
            container: canvasContainer,
            width: this.options.width,
            height: this.options.height
        });

        // Create main layer
        this.layer = new window.Konva.Layer();
        this.stage.add(this.layer);

        // Add background
        this.addBackground();

        // Add grid if enabled
        if (this.options.enableGrid) {
            this.addGrid();
        }

        this.layer.draw();
    }

    /**
     * Add background to the stage
     */
    addBackground() {
        const background = new window.Konva.Rect({
            x: 0,
            y: 0,
            width: this.options.width,
            height: this.options.height,
            fill: this.options.backgroundColor,
            listening: false
        });

        this.layer.add(background);
    }

    /**
     * Add grid to the stage
     */
    addGrid() {
        const gridSize = this.options.gridSize;
        const gridLayer = new window.Konva.Layer();

        // Vertical lines
        for (let i = 0; i <= this.options.width / gridSize; i++) {
            const line = new window.Konva.Line({
                points: [i * gridSize, 0, i * gridSize, this.options.height],
                stroke: '#ddd',
                strokeWidth: 1,
                listening: false
            });
            gridLayer.add(line);
        }

        // Horizontal lines
        for (let i = 0; i <= this.options.height / gridSize; i++) {
            const line = new window.Konva.Line({
                points: [0, i * gridSize, this.options.width, i * gridSize],
                stroke: '#ddd',
                strokeWidth: 1,
                listening: false
            });
            gridLayer.add(line);
        }

        this.stage.add(gridLayer);
        gridLayer.moveToBottom();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toolbar events
        Events.on(this.container, 'click', '.tool-btn', (e) => {
            const tool = e.target.closest('[data-tool]').dataset.tool;
            this.setTool(tool);
        });

        Events.on(this.container, 'click', '.action-btn', (e) => {
            const action = e.target.closest('[data-action]').dataset.action;
            this.executeAction(action);
        });

        // Stage events
        this.stage.on('click', (e) => {
            this.handleStageClick(e);
        });

        this.stage.on('dragend', () => {
            this.saveState();
        });

        // Keyboard events
        Events.on(document, 'keydown', (e) => {
            this.handleKeydown(e);
        });
    }

    /**
     * Set current tool
     */
    setTool(tool) {
        this.currentTool = tool;

        // Update toolbar UI
        const toolButtons = this.container.querySelectorAll('.tool-btn');
        toolButtons.forEach(btn => {
            btn.classList.remove('active');
        });

        const activeButton = this.container.querySelector(`[data-tool="${tool}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        // Update cursor
        this.updateCursor(tool);
    }

    /**
     * Update cursor based on tool
     */
    updateCursor(tool) {
        const cursors = {
            select: 'default',
            text: 'text',
            rect: 'crosshair',
            circle: 'crosshair',
            line: 'crosshair'
        };

        this.stage.container().style.cursor = cursors[tool] || 'default';
    }

    /**
     * Handle stage click events
     */
    handleStageClick(e) {
        const pos = this.stage.getPointerPosition();

        if (e.target === this.stage) {
            // Clicked on empty area
            this.deselectAll();

            if (this.currentTool && this.currentTool !== 'select') {
                this.createElement(this.currentTool, pos);
            }
        } else {
            // Clicked on an element
            this.selectElement(e.target);
        }
    }

    /**
     * Create element based on tool type
     */
    createElement(type, position) {
        let element;
        const id = `element_${Date.now()}`;

        switch (type) {
            case 'text':
                element = new window.Konva.Text({
                    x: position.x,
                    y: position.y,
                    text: 'Double-click to edit',
                    fontSize: 24,
                    fontFamily: 'Arial',
                    fill: '#000000',
                    draggable: true,
                    id: id
                });
                break;

            case 'rect':
                element = new window.Konva.Rect({
                    x: position.x - 50,
                    y: position.y - 25,
                    width: 100,
                    height: 50,
                    fill: '#3b82f6',
                    stroke: '#1e40af',
                    strokeWidth: 2,
                    draggable: true,
                    id: id
                });
                break;

            case 'circle':
                element = new window.Konva.Circle({
                    x: position.x,
                    y: position.y,
                    radius: 30,
                    fill: '#10b981',
                    stroke: '#059669',
                    strokeWidth: 2,
                    draggable: true,
                    id: id
                });
                break;

            case 'line':
                element = new window.Konva.Line({
                    points: [position.x - 50, position.y, position.x + 50, position.y],
                    stroke: '#ef4444',
                    strokeWidth: 3,
                    lineCap: 'round',
                    draggable: true,
                    id: id
                });
                break;
        }

        if (element) {
            this.addElement(element);
            this.selectElement(element);
            this.saveState();
        }
    }

    /**
     * Add element to the stage
     */
    addElement(element) {
        this.layer.add(element);
        this.elements.push(element);
        this.layer.draw();

        // Add double-click editing for text
        if (element.className === 'Text') {
            element.on('dblclick', () => {
                this.editText(element);
            });
        }

        this.emit('elementAdded', { element, id: element.id() });
    }

    /**
     * Select element
     */
    selectElement(element) {
        this.deselectAll();
        this.selectedElement = element;

        // Add transformer for visual feedback
        this.addTransformer(element);
        this.updatePropertiesPanel(element);

        this.emit('elementSelected', { element, id: element.id() });
    }

    /**
     * Deselect all elements
     */
    deselectAll() {
        this.selectedElement = null;

        // Remove transformers
        const transformers = this.layer.find('Transformer');
        transformers.forEach(transformer => transformer.destroy());

        this.updatePropertiesPanel(null);
        this.layer.draw();

        this.emit('selectionCleared');
    }

    /**
     * Add transformer to element
     */
    addTransformer(element) {
        const transformer = new window.Konva.Transformer({
            nodes: [element],
            keepRatio: false,
            enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        });

        this.layer.add(transformer);
        this.layer.draw();

        transformer.on('transformend', () => {
            this.saveState();
        });
    }

    /**
     * Update properties panel
     */
    updatePropertiesPanel(element) {
        const propertiesContainer = DOM.query(`#${this.containerId}-properties .properties-content`);
        if (!propertiesContainer) return;

        if (!element) {
            propertiesContainer.innerHTML = '<p>Select an element to edit properties</p>';
            return;
        }

        const elementType = element.className;
        let propertiesHTML = `<h4>${elementType} Properties</h4>`;

        // Common properties
        propertiesHTML += `
            <div class="property-group">
                <label>X Position:</label>
                <input type="number" data-property="x" value="${Math.round(element.x())}" min="0">
            </div>
            <div class="property-group">
                <label>Y Position:</label>
                <input type="number" data-property="y" value="${Math.round(element.y())}" min="0">
            </div>
        `;

        // Type-specific properties
        switch (elementType) {
            case 'Text':
                propertiesHTML += `
                    <div class="property-group">
                        <label>Text:</label>
                        <input type="text" data-property="text" value="${element.text()}">
                    </div>
                    <div class="property-group">
                        <label>Font Size:</label>
                        <input type="number" data-property="fontSize" value="${element.fontSize()}" min="8" max="72">
                    </div>
                    <div class="property-group">
                        <label>Color:</label>
                        <input type="color" data-property="fill" value="${element.fill()}">
                    </div>
                `;
                break;

            case 'Rect':
                propertiesHTML += `
                    <div class="property-group">
                        <label>Width:</label>
                        <input type="number" data-property="width" value="${Math.round(element.width())}" min="1">
                    </div>
                    <div class="property-group">
                        <label>Height:</label>
                        <input type="number" data-property="height" value="${Math.round(element.height())}" min="1">
                    </div>
                    <div class="property-group">
                        <label>Fill Color:</label>
                        <input type="color" data-property="fill" value="${element.fill()}">
                    </div>
                `;
                break;

            case 'Circle':
                propertiesHTML += `
                    <div class="property-group">
                        <label>Radius:</label>
                        <input type="number" data-property="radius" value="${Math.round(element.radius())}" min="1">
                    </div>
                    <div class="property-group">
                        <label>Fill Color:</label>
                        <input type="color" data-property="fill" value="${element.fill()}">
                    </div>
                `;
                break;
        }

        propertiesContainer.innerHTML = propertiesHTML;

        // Add event listeners for property changes
        Events.on(propertiesContainer, 'input', 'input[data-property]', (e) => {
            const property = e.target.dataset.property;
            const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
            element[property](value);
            this.layer.draw();
        });

        Events.on(propertiesContainer, 'change', 'input[data-property]', () => {
            this.saveState();
        });
    }

    /**
     * Edit text element
     */
    editText(textElement) {
        const textPosition = textElement.absolutePosition();
        const stageBox = this.stage.container().getBoundingClientRect();

        const textarea = DOM.create('textarea', {
            style: `
                position: absolute;
                top: ${stageBox.top + textPosition.y}px;
                left: ${stageBox.left + textPosition.x}px;
                width: ${textElement.width() || 200}px;
                font-size: ${textElement.fontSize()}px;
                font-family: ${textElement.fontFamily()};
                color: ${textElement.fill()};
                background: rgba(255, 255, 255, 0.8);
                border: 2px solid #3b82f6;
                border-radius: 4px;
                padding: 4px;
                resize: none;
                z-index: 1000;
            `
        });

        textarea.value = textElement.text();
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const finishEdit = () => {
            textElement.text(textarea.value);
            this.layer.draw();
            document.body.removeChild(textarea);
            this.updatePropertiesPanel(textElement);
            this.saveState();
        };

        Events.on(textarea, 'keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                finishEdit();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                document.body.removeChild(textarea);
            }
        });

        Events.on(textarea, 'blur', finishEdit);
    }

    /**
     * Execute toolbar actions
     */
    executeAction(action) {
        switch (action) {
            case 'undo':
                this.undo();
                break;
            case 'redo':
                this.redo();
                break;
            case 'delete':
                this.deleteSelected();
                break;
            case 'clear':
                this.clearAll();
                break;
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeydown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                    break;
                case 'a':
                    e.preventDefault();
                    this.selectAll();
                    break;
            }
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            this.deleteSelected();
        }
    }

    /**
     * Save current state for undo/redo
     */
    saveState() {
        const state = this.getCanvasData();

        // Remove states after current index
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Add new state
        this.history.push(state);
        this.historyIndex = this.history.length - 1;

        // Limit history size
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }

        this.emit('stateChanged', { canUndo: this.canUndo(), canRedo: this.canRedo() });
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.canUndo()) {
            this.historyIndex--;
            this.loadState(this.history[this.historyIndex]);
        }
    }

    /**
     * Redo last undone action
     */
    redo() {
        if (this.canRedo()) {
            this.historyIndex++;
            this.loadState(this.history[this.historyIndex]);
        }
    }

    /**
     * Check if can undo
     */
    canUndo() {
        return this.historyIndex > 0;
    }

    /**
     * Check if can redo
     */
    canRedo() {
        return this.historyIndex < this.history.length - 1;
    }

    /**
     * Delete selected element
     */
    deleteSelected() {
        if (this.selectedElement) {
            this.selectedElement.destroy();
            this.elements = this.elements.filter(el => el !== this.selectedElement);
            this.selectedElement = null;
            this.updatePropertiesPanel(null);
            this.layer.draw();
            this.saveState();
        }
    }

    /**
     * Clear all elements
     */
    clearAll() {
        if (confirm('Are you sure you want to clear all elements?')) {
            this.elements.forEach(element => element.destroy());
            this.elements = [];
            this.selectedElement = null;
            this.updatePropertiesPanel(null);
            this.layer.draw();
            this.saveState();
        }
    }

    /**
     * Get canvas data for export/save
     */
    getCanvasData() {
        return this.stage.toJSON();
    }

    /**
     * Load state from JSON
     */
    loadState(stateData) {
        // Clear current elements
        this.elements.forEach(element => element.destroy());
        this.elements = [];
        this.selectedElement = null;

        // Load state
        this.stage.destroy();
        this.initializeKonva();

        if (stateData) {
            this.stage = window.Konva.Node.create(stateData, this.stage.container());
            this.layer = this.stage.getLayers()[0];
        }

        this.updatePropertiesPanel(null);
    }

    /**
     * Export canvas as image
     */
    exportAsImage(format = 'png') {
        return this.stage.toDataURL({
            mimeType: `image/${format}`,
            quality: 1.0
        });
    }

    /**
     * Set canvas size
     */
    setSize(width, height) {
        this.options.width = width;
        this.options.height = height;
        this.stage.size({ width, height });
        this.layer.draw();
    }

    /**
     * Simple event emitter
     */
    emit(eventName, data = {}) {
        if (!this.container) return;

        const event = new CustomEvent(`konvaEditor:${eventName}`, {
            detail: { ...data, editorId: this.containerId },
            bubbles: true
        });
        this.container.dispatchEvent(event);
    }

    /**
     * Destroy the editor and cleanup
     */
    destroy() {
        if (this.stage) {
            this.stage.destroy();
            this.stage = null;
        }

        if (this.container) {
            this.container.innerHTML = '';
        }

        this.layer = null;
        this.elements = [];
        this.selectedElement = null;
        this.history = [];
        this.historyIndex = -1;
        this.isInitialized = false;

        logger.info('KonvaEditor destroyed');
    }
}