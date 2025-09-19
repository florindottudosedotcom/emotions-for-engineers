/**
 * Konva Components
 *
 * Reusable Konva UI components for slide editing.
 * Extracted from konva-slide-system.js as part of the modular architecture optimization.
 */

import { KonvaUtils, KonvaEventManager } from './konva-core.js';

/**
 * Konva Toolbar Component
 */
export class KonvaToolbar {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            tools: ['text', 'rect', 'circle', 'line', 'organic'],
            onToolSelect: null,
            ...options
        };
        this.selectedTool = 'text';
        this.element = null;
        this.init();
    }

    init() {
        this.render();
        this.bindEvents();
    }

    render() {
        this.element = document.createElement('div');
        this.element.className = 'konva-toolbar';
        this.element.style.cssText = `
            display: flex;
            gap: 8px;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 8px;
            margin-bottom: 10px;
            flex-wrap: wrap;
        `;

        const tools = {
            text: { icon: '📝', label: 'Text' },
            rect: { icon: '⬜', label: 'Rectangle' },
            circle: { icon: '⭕', label: 'Circle' },
            line: { icon: '📏', label: 'Line' },
            organic: { icon: '🌊', label: 'Organic Shape' }
        };

        this.options.tools.forEach(toolKey => {
            const tool = tools[toolKey];
            if (!tool) return;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = `toolbar-btn ${toolKey === this.selectedTool ? 'active' : ''}`;
            button.dataset.tool = toolKey;
            button.title = tool.label;
            button.innerHTML = `${tool.icon} ${tool.label}`;
            button.style.cssText = `
                padding: 8px 12px;
                border: 2px solid ${toolKey === this.selectedTool ? '#667eea' : '#ddd'};
                border-radius: 6px;
                background: ${toolKey === this.selectedTool ? '#667eea' : 'white'};
                color: ${toolKey === this.selectedTool ? 'white' : '#333'};
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s ease;
            `;

            this.element.appendChild(button);
        });

        this.container.appendChild(this.element);
    }

    bindEvents() {
        this.element.addEventListener('click', (e) => {
            const button = e.target.closest('.toolbar-btn');
            if (!button) return;

            this.selectTool(button.dataset.tool);
        });
    }

    selectTool(toolName) {
        if (!this.options.tools.includes(toolName)) return;

        this.selectedTool = toolName;
        this.updateActiveButton();

        if (this.options.onToolSelect) {
            this.options.onToolSelect(toolName);
        }
    }

    updateActiveButton() {
        const buttons = this.element.querySelectorAll('.toolbar-btn');
        buttons.forEach(button => {
            const isActive = button.dataset.tool === this.selectedTool;
            button.className = `toolbar-btn ${isActive ? 'active' : ''}`;
            button.style.borderColor = isActive ? '#667eea' : '#ddd';
            button.style.background = isActive ? '#667eea' : 'white';
            button.style.color = isActive ? 'white' : '#333';
        });
    }

    getSelectedTool() {
        return this.selectedTool;
    }
}

/**
 * Konva Properties Panel Component
 */
export class KonvaPropertiesPanel {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            onPropertyChange: null,
            ...options
        };
        this.selectedObject = null;
        this.element = null;
        this.init();
    }

    init() {
        this.render();
    }

    render() {
        this.element = document.createElement('div');
        this.element.className = 'konva-properties-panel';
        this.element.style.cssText = `
            background: #f9f9f9;
            border-radius: 8px;
            padding: 15px;
            margin-top: 10px;
            border: 1px solid #e0e0e0;
        `;

        this.element.innerHTML = `
            <h4 style="margin: 0 0 15px 0; color: #333;">Properties</h4>
            <div class="properties-content">
                <div class="no-selection" style="color: #666; font-style: italic;">
                    Select an object to edit its properties
                </div>
            </div>
        `;

        this.container.appendChild(this.element);
    }

    selectObject(object) {
        this.selectedObject = object;
        this.updatePropertiesPanel();
    }

    updatePropertiesPanel() {
        const content = this.element.querySelector('.properties-content');

        if (!this.selectedObject) {
            content.innerHTML = `
                <div class="no-selection" style="color: #666; font-style: italic;">
                    Select an object to edit its properties
                </div>
            `;
            return;
        }

        const className = this.selectedObject.getClassName();
        content.innerHTML = this.generatePropertiesHTML(className);
        this.bindPropertyEvents();
    }

    generatePropertiesHTML(className) {
        const commonProps = `
            <div class="property-group">
                <label>Position X:</label>
                <input type="number" id="prop-x" value="${Math.round(this.selectedObject.x())}" step="1">
            </div>
            <div class="property-group">
                <label>Position Y:</label>
                <input type="number" id="prop-y" value="${Math.round(this.selectedObject.y())}" step="1">
            </div>
        `;

        let specificProps = '';

        switch (className) {
            case 'Text':
                specificProps = `
                    <div class="property-group">
                        <label>Text:</label>
                        <input type="text" id="prop-text" value="${this.selectedObject.text()}">
                    </div>
                    <div class="property-group">
                        <label>Font Size:</label>
                        <input type="number" id="prop-fontsize" value="${this.selectedObject.fontSize()}" min="8" max="72">
                    </div>
                    <div class="property-group">
                        <label>Font Family:</label>
                        <select id="prop-fontfamily">
                            <option value="Arial" ${this.selectedObject.fontFamily() === 'Arial' ? 'selected' : ''}>Arial</option>
                            <option value="Times New Roman" ${this.selectedObject.fontFamily() === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
                            <option value="Helvetica" ${this.selectedObject.fontFamily() === 'Helvetica' ? 'selected' : ''}>Helvetica</option>
                        </select>
                    </div>
                    <div class="property-group">
                        <label>Text Color:</label>
                        <input type="color" id="prop-fill" value="${this.selectedObject.fill()}">
                    </div>
                `;
                break;
            case 'Rect':
                specificProps = `
                    <div class="property-group">
                        <label>Width:</label>
                        <input type="number" id="prop-width" value="${Math.round(this.selectedObject.width())}" min="1">
                    </div>
                    <div class="property-group">
                        <label>Height:</label>
                        <input type="number" id="prop-height" value="${Math.round(this.selectedObject.height())}" min="1">
                    </div>
                    <div class="property-group">
                        <label>Fill Color:</label>
                        <input type="color" id="prop-fill" value="${this.selectedObject.fill()}">
                    </div>
                    <div class="property-group">
                        <label>Border Color:</label>
                        <input type="color" id="prop-stroke" value="${this.selectedObject.stroke()}">
                    </div>
                    <div class="property-group">
                        <label>Border Width:</label>
                        <input type="number" id="prop-strokewidth" value="${this.selectedObject.strokeWidth()}" min="0">
                    </div>
                `;
                break;
            case 'Circle':
                specificProps = `
                    <div class="property-group">
                        <label>Radius:</label>
                        <input type="number" id="prop-radius" value="${Math.round(this.selectedObject.radius())}" min="1">
                    </div>
                    <div class="property-group">
                        <label>Fill Color:</label>
                        <input type="color" id="prop-fill" value="${this.selectedObject.fill()}">
                    </div>
                    <div class="property-group">
                        <label>Border Color:</label>
                        <input type="color" id="prop-stroke" value="${this.selectedObject.stroke()}">
                    </div>
                    <div class="property-group">
                        <label>Border Width:</label>
                        <input type="number" id="prop-strokewidth" value="${this.selectedObject.strokeWidth()}" min="0">
                    </div>
                `;
                break;
            case 'Line':
                specificProps = `
                    <div class="property-group">
                        <label>Line Color:</label>
                        <input type="color" id="prop-stroke" value="${this.selectedObject.stroke()}">
                    </div>
                    <div class="property-group">
                        <label>Line Width:</label>
                        <input type="number" id="prop-strokewidth" value="${this.selectedObject.strokeWidth()}" min="1">
                    </div>
                `;
                break;
        }

        return `
            <style>
                .property-group {
                    margin-bottom: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .property-group label {
                    font-weight: 500;
                    color: #333;
                    font-size: 14px;
                }
                .property-group input,
                .property-group select {
                    padding: 6px 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }
            </style>
            ${commonProps}
            ${specificProps}
        `;
    }

    bindPropertyEvents() {
        if (!this.selectedObject) return;

        const inputs = this.element.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateObjectProperty(input);
            });
        });
    }

    updateObjectProperty(input) {
        if (!this.selectedObject) return;

        const prop = input.id.replace('prop-', '');
        const value = input.type === 'number' ? parseFloat(input.value) : input.value;

        // Map property names to Konva methods
        const propertyMap = {
            'x': 'x',
            'y': 'y',
            'text': 'text',
            'fontsize': 'fontSize',
            'fontfamily': 'fontFamily',
            'fill': 'fill',
            'stroke': 'stroke',
            'strokewidth': 'strokeWidth',
            'width': 'width',
            'height': 'height',
            'radius': 'radius'
        };

        const konvaProperty = propertyMap[prop];
        if (konvaProperty && typeof this.selectedObject[konvaProperty] === 'function') {
            this.selectedObject[konvaProperty](value);
            this.selectedObject.getLayer().draw();

            if (this.options.onPropertyChange) {
                this.options.onPropertyChange(this.selectedObject, prop, value);
            }
        }
    }
}

/**
 * Konva Layer Manager Component
 */
export class KonvaLayerManager {
    constructor(container, stage, options = {}) {
        this.container = container;
        this.stage = stage;
        this.options = {
            onLayerChange: null,
            ...options
        };
        this.layers = new Map();
        this.element = null;
        this.init();
    }

    init() {
        this.render();
    }

    render() {
        this.element = document.createElement('div');
        this.element.className = 'konva-layer-manager';
        this.element.style.cssText = `
            background: #f9f9f9;
            border-radius: 8px;
            padding: 15px;
            margin-top: 10px;
            border: 1px solid #e0e0e0;
        `;

        this.element.innerHTML = `
            <h4 style="margin: 0 0 15px 0; color: #333;">Layers</h4>
            <div class="layers-list"></div>
            <button type="button" class="add-layer-btn" style="
                width: 100%;
                padding: 8px;
                border: 1px dashed #ccc;
                background: transparent;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
            ">+ Add Layer</button>
        `;

        this.container.appendChild(this.element);
        this.bindEvents();
    }

    bindEvents() {
        const addBtn = this.element.querySelector('.add-layer-btn');
        addBtn.addEventListener('click', () => {
            this.addLayer(`Layer ${this.layers.size + 1}`);
        });
    }

    addLayer(name) {
        const layer = new Konva.Layer();
        this.stage.add(layer);
        this.layers.set(name, layer);
        this.updateLayersList();

        if (this.options.onLayerChange) {
            this.options.onLayerChange('add', name, layer);
        }

        return layer;
    }

    removeLayer(name) {
        const layer = this.layers.get(name);
        if (layer) {
            layer.destroy();
            this.layers.delete(name);
            this.updateLayersList();

            if (this.options.onLayerChange) {
                this.options.onLayerChange('remove', name, layer);
            }
        }
    }

    updateLayersList() {
        const list = this.element.querySelector('.layers-list');
        list.innerHTML = '';

        this.layers.forEach((layer, name) => {
            const layerItem = document.createElement('div');
            layerItem.className = 'layer-item';
            layerItem.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                margin-bottom: 4px;
                background: white;
            `;

            layerItem.innerHTML = `
                <span class="layer-name">${name}</span>
                <div class="layer-controls">
                    <button type="button" class="toggle-visibility" title="Toggle Visibility">
                        ${layer.visible() ? '👁️' : '🚫'}
                    </button>
                    <button type="button" class="delete-layer" title="Delete Layer">🗑️</button>
                </div>
            `;

            // Bind layer control events
            const toggleBtn = layerItem.querySelector('.toggle-visibility');
            const deleteBtn = layerItem.querySelector('.delete-layer');

            toggleBtn.addEventListener('click', () => {
                layer.visible(!layer.visible());
                layer.getStage().draw();
                toggleBtn.textContent = layer.visible() ? '👁️' : '🚫';
            });

            deleteBtn.addEventListener('click', () => {
                if (this.layers.size > 1) { // Don't delete the last layer
                    this.removeLayer(name);
                }
            });

            list.appendChild(layerItem);
        });
    }

    getLayer(name) {
        return this.layers.get(name);
    }

    getAllLayers() {
        return Array.from(this.layers.values());
    }
}

/**
 * Konva Shape Generator Component
 */
export class KonvaShapeGenerator {
    constructor(layer, options = {}) {
        this.layer = layer;
        this.options = {
            defaultTheme: {
                textColor: '#000000',
                fillColor: '#ffffff',
                borderColor: '#333333',
                backgroundColor: '#f0f0f0'
            },
            ...options
        };
    }

    createText(config = {}) {
        const defaultConfig = {
            x: 50,
            y: 50,
            text: 'Double-click to edit',
            fontSize: 18,
            fontFamily: 'Arial',
            fill: this.options.defaultTheme.textColor,
            draggable: true
        };

        const text = KonvaUtils.createText({ ...defaultConfig, ...config });
        this.layer.add(text);
        this.layer.draw();
        return text;
    }

    createRect(config = {}) {
        const defaultConfig = {
            x: 50,
            y: 50,
            width: 120,
            height: 80,
            fill: this.options.defaultTheme.fillColor,
            stroke: this.options.defaultTheme.borderColor,
            strokeWidth: 2,
            cornerRadius: 5,
            draggable: true
        };

        const rect = KonvaUtils.createRect({ ...defaultConfig, ...config });
        this.layer.add(rect);
        this.layer.draw();
        return rect;
    }

    createCircle(config = {}) {
        const defaultConfig = {
            x: 100,
            y: 100,
            radius: 50,
            fill: this.options.defaultTheme.fillColor,
            stroke: this.options.defaultTheme.borderColor,
            strokeWidth: 2,
            draggable: true
        };

        const circle = KonvaUtils.createCircle({ ...defaultConfig, ...config });
        this.layer.add(circle);
        this.layer.draw();
        return circle;
    }

    createLine(config = {}) {
        const defaultConfig = {
            points: [50, 50, 200, 150],
            stroke: this.options.defaultTheme.borderColor,
            strokeWidth: 3,
            lineCap: 'round',
            draggable: true
        };

        const line = KonvaUtils.createLine({ ...defaultConfig, ...config });
        this.layer.add(line);
        this.layer.draw();
        return line;
    }

    createOrganicShape(config = {}) {
        const defaultConfig = {
            x: 50,
            y: 50,
            data: this.generateOrganicPath(),
            fill: this.options.defaultTheme.fillColor,
            stroke: this.options.defaultTheme.borderColor,
            strokeWidth: 2,
            draggable: true
        };

        const shape = KonvaUtils.createOrganicShape({ ...defaultConfig, ...config });
        this.layer.add(shape);
        this.layer.draw();
        return shape;
    }

    generateOrganicPath() {
        // Generate a random organic blob shape
        const centerX = 75;
        const centerY = 75;
        const radius = 50;
        const points = 8;

        let path = `M`;

        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const radiusVariation = radius + (Math.random() - 0.5) * 20;
            const x = centerX + Math.cos(angle) * radiusVariation;
            const y = centerY + Math.sin(angle) * radiusVariation;

            if (i === 0) {
                path += `${x},${y}`;
            } else {
                // Use quadratic curves for smooth organic shapes
                const prevAngle = ((i - 1) / points) * Math.PI * 2;
                const prevRadius = radius + (Math.random() - 0.5) * 20;
                const prevX = centerX + Math.cos(prevAngle) * prevRadius;
                const prevY = centerY + Math.sin(prevAngle) * prevRadius;

                const cpX = (prevX + x) / 2 + (Math.random() - 0.5) * 15;
                const cpY = (prevY + y) / 2 + (Math.random() - 0.5) * 15;

                path += ` Q${cpX},${cpY} ${x},${y}`;
            }
        }

        path += ' Z';
        return path;
    }

    applyTheme(theme) {
        this.options.defaultTheme = { ...this.options.defaultTheme, ...theme };
    }
}