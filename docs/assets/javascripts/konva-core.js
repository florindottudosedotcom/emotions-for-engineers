/**
 * Konva Core System
 *
 * Core Konva functionality and command pattern for slide editing.
 * Extracted and optimized from konva-slide-system.js.
 */

/**
 * Command pattern for undo/redo functionality
 */
export class Command {
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

/**
 * Undo/Redo Manager for maintaining command history
 */
export class UndoRedoManager {
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

/**
 * Delete Slide Command
 */
export class DeleteSlideCommand extends Command {
    constructor(slideSystem, slideIndex) {
        super(`Delete Slide ${slideIndex + 1}`);
        this.slideSystem = slideSystem;
        this.slideIndex = slideIndex;
        this.deletedSlide = null;
        this.wasCurrentSlide = false;
    }

    execute() {
        // Store the slide data before deletion
        this.deletedSlide = { ...this.slideSystem.slideData.slides[this.slideIndex] };
        this.wasCurrentSlide = this.slideSystem.currentSlideIndex === this.slideIndex;

        // Remove slide from data
        this.slideSystem.slideData.slides.splice(this.slideIndex, 1);

        // Update slide numbers
        this.slideSystem.slideData.slides.forEach((slide, index) => {
            slide.slideNumber = index + 1;
        });

        // Adjust current slide index if necessary
        if (this.slideSystem.currentSlideIndex >= this.slideIndex) {
            this.slideSystem.currentSlideIndex = Math.max(0, this.slideSystem.currentSlideIndex - 1);
        }

        // Ensure we don't exceed the new slide count
        if (this.slideSystem.currentSlideIndex >= this.slideSystem.slideData.slides.length) {
            this.slideSystem.currentSlideIndex = Math.max(0, this.slideSystem.slideData.slides.length - 1);
        }

        this.slideSystem.refreshDisplay();
    }

    undo() {
        // Re-insert the slide
        this.slideSystem.slideData.slides.splice(this.slideIndex, 0, this.deletedSlide);

        // Update slide numbers
        this.slideSystem.slideData.slides.forEach((slide, index) => {
            slide.slideNumber = index + 1;
        });

        // Restore current slide if it was the deleted one
        if (this.wasCurrentSlide) {
            this.slideSystem.currentSlideIndex = this.slideIndex;
        }

        this.slideSystem.refreshDisplay();
    }
}

/**
 * Delete Object Command
 */
export class DeleteObjectCommand extends Command {
    constructor(layer, object, slideSystem) {
        super(`Delete ${object.getClassName()}`);
        this.layer = layer;
        this.object = object;
        this.slideSystem = slideSystem;
        this.objectState = null;
    }

    execute() {
        // Store object state for undo
        this.objectState = {
            ...this.object.attrs,
            className: this.object.getClassName(),
            parent: this.object.getParent()
        };

        this.object.destroy();
        this.layer.draw();

        // Update slide data
        if (this.slideSystem) {
            this.slideSystem.saveCurrentSlideState();
        }
    }

    undo() {
        if (!this.objectState) return;

        let newObject;

        // Recreate object based on its class
        if (this.objectState.className === 'Text') {
            newObject = new Konva.Text({
                x: this.objectState.x,
                y: this.objectState.y,
                text: this.objectState.text,
                fontSize: this.objectState.fontSize,
                fontFamily: this.objectState.fontFamily,
                fill: this.objectState.fill,
                align: this.objectState.align,
                verticalAlign: this.objectState.verticalAlign,
                width: this.objectState.width,
                height: this.objectState.height,
                draggable: true
            });
        } else if (this.objectState.className === 'Rect') {
            newObject = new Konva.Rect({
                x: this.objectState.x,
                y: this.objectState.y,
                width: this.objectState.width,
                height: this.objectState.height,
                fill: this.objectState.fill,
                stroke: this.objectState.stroke,
                strokeWidth: this.objectState.strokeWidth,
                cornerRadius: this.objectState.cornerRadius,
                draggable: true
            });
        } else if (this.objectState.className === 'Circle') {
            newObject = new Konva.Circle({
                x: this.objectState.x,
                y: this.objectState.y,
                radius: this.objectState.radius,
                fill: this.objectState.fill,
                stroke: this.objectState.stroke,
                strokeWidth: this.objectState.strokeWidth,
                draggable: true
            });
        }

        if (newObject && this.objectState.parent) {
            this.objectState.parent.add(newObject);
            this.layer.draw();

            // Add event listeners for deletion
            if (this.slideSystem) {
                this.slideSystem.addObjectEventListeners(newObject);
                this.slideSystem.saveCurrentSlideState();
            }
        }
    }
}

/**
 * Konva Utilities
 */
export class KonvaUtils {
    /**
     * Create a text object with default styling
     */
    static createText(config = {}) {
        const defaultConfig = {
            fontSize: 16,
            fontFamily: 'Arial',
            fill: '#000000',
            align: 'left',
            verticalAlign: 'top',
            draggable: true,
            width: 200
        };

        return new Konva.Text({ ...defaultConfig, ...config });
    }

    /**
     * Create a rectangle with default styling
     */
    static createRect(config = {}) {
        const defaultConfig = {
            width: 100,
            height: 80,
            fill: '#ffffff',
            stroke: '#000000',
            strokeWidth: 2,
            cornerRadius: 5,
            draggable: true
        };

        return new Konva.Rect({ ...defaultConfig, ...config });
    }

    /**
     * Create a circle with default styling
     */
    static createCircle(config = {}) {
        const defaultConfig = {
            radius: 50,
            fill: '#ffffff',
            stroke: '#000000',
            strokeWidth: 2,
            draggable: true
        };

        return new Konva.Circle({ ...defaultConfig, ...config });
    }

    /**
     * Create an organic shape using a path
     */
    static createOrganicShape(config = {}) {
        const defaultConfig = {
            data: 'M50,50 Q100,20 150,50 Q120,100 50,50',
            fill: '#ffffff',
            stroke: '#000000',
            strokeWidth: 2,
            draggable: true
        };

        return new Konva.Path({ ...defaultConfig, ...config });
    }

    /**
     * Create a line/polyline
     */
    static createLine(config = {}) {
        const defaultConfig = {
            points: [0, 0, 100, 100],
            stroke: '#000000',
            strokeWidth: 2,
            lineCap: 'round',
            lineJoin: 'round',
            draggable: true
        };

        return new Konva.Line({ ...defaultConfig, ...config });
    }

    /**
     * Generate organic curve points
     */
    static generateOrganicCurve(startX, startY, endX, endY, curvature = 0.3) {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;

        // Add some randomness for organic feel
        const offsetX = (Math.random() - 0.5) * curvature * Math.abs(endX - startX);
        const offsetY = (Math.random() - 0.5) * curvature * Math.abs(endY - startY);

        return [
            startX, startY,
            midX + offsetX, midY + offsetY,
            endX, endY
        ];
    }

    /**
     * Apply theme colors to a Konva object
     */
    static applyThemeToObject(object, theme) {
        if (!object || !theme) return;

        const className = object.getClassName();

        switch (className) {
            case 'Text':
                object.fill(theme.textColor);
                break;
            case 'Rect':
            case 'Circle':
                object.fill(theme.fillColor);
                object.stroke(theme.borderColor);
                break;
            case 'Line':
            case 'Path':
                object.stroke(theme.borderColor);
                break;
        }
    }

    /**
     * Get object bounds for alignment operations
     */
    static getObjectBounds(object) {
        const box = object.getClientRect();
        return {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            centerX: box.x + box.width / 2,
            centerY: box.y + box.height / 2
        };
    }

    /**
     * Align objects
     */
    static alignObjects(objects, alignment, canvasWidth, canvasHeight) {
        if (!objects || objects.length === 0) return;

        switch (alignment) {
            case 'left':
                const leftX = Math.min(...objects.map(obj => obj.x()));
                objects.forEach(obj => obj.x(leftX));
                break;
            case 'right':
                const rightX = Math.max(...objects.map(obj => obj.x() + obj.width()));
                objects.forEach(obj => obj.x(rightX - obj.width()));
                break;
            case 'center-horizontal':
                const centerX = canvasWidth / 2;
                objects.forEach(obj => obj.x(centerX - obj.width() / 2));
                break;
            case 'top':
                const topY = Math.min(...objects.map(obj => obj.y()));
                objects.forEach(obj => obj.y(topY));
                break;
            case 'bottom':
                const bottomY = Math.max(...objects.map(obj => obj.y() + obj.height()));
                objects.forEach(obj => obj.y(bottomY - obj.height()));
                break;
            case 'center-vertical':
                const centerY = canvasHeight / 2;
                objects.forEach(obj => obj.y(centerY - obj.height() / 2));
                break;
        }
    }

    /**
     * Distribute objects evenly
     */
    static distributeObjects(objects, direction) {
        if (!objects || objects.length < 3) return;

        objects.sort((a, b) => {
            return direction === 'horizontal' ? a.x() - b.x() : a.y() - b.y();
        });

        const first = objects[0];
        const last = objects[objects.length - 1];
        const totalSpace = direction === 'horizontal'
            ? last.x() - first.x()
            : last.y() - first.y();
        const spacing = totalSpace / (objects.length - 1);

        objects.forEach((obj, index) => {
            if (index === 0 || index === objects.length - 1) return;

            if (direction === 'horizontal') {
                obj.x(first.x() + spacing * index);
            } else {
                obj.y(first.y() + spacing * index);
            }
        });
    }

    /**
     * Create a grid snap function
     */
    static createGridSnap(gridSize = 10) {
        return (value) => Math.round(value / gridSize) * gridSize;
    }

    /**
     * Export stage as image
     */
    static async exportStageAsImage(stage, config = {}) {
        const defaultConfig = {
            mimeType: 'image/png',
            quality: 1,
            pixelRatio: 2
        };

        const finalConfig = { ...defaultConfig, ...config };

        return new Promise((resolve) => {
            stage.toDataURL({
                ...finalConfig,
                callback: (dataUrl) => resolve(dataUrl)
            });
        });
    }

    /**
     * Load image and create Konva Image object
     */
    static loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const konvaImage = new Konva.Image({
                    image: img,
                    draggable: true
                });
                resolve(konvaImage);
            };
            img.onerror = reject;
            img.src = src;
        });
    }

    /**
     * Create a gradient background
     */
    static createGradientRect(width, height, colors, direction = 'vertical') {
        const gradient = direction === 'vertical'
            ? [0, 0, 0, height]
            : [0, 0, width, 0];

        return new Konva.Rect({
            width,
            height,
            fillLinearGradientStartPoint: { x: gradient[0], y: gradient[1] },
            fillLinearGradientEndPoint: { x: gradient[2], y: gradient[3] },
            fillLinearGradientColorStops: colors
        });
    }

    /**
     * Animate object properties
     */
    static animateObject(object, properties, duration = 500, easing = Konva.Easings.EaseInOut) {
        return new Promise((resolve) => {
            const tween = new Konva.Tween({
                node: object,
                duration: duration / 1000, // Konva uses seconds
                easing: easing,
                ...properties,
                onFinish: resolve
            });
            tween.play();
        });
    }
}

/**
 * Konva Event Manager
 */
export class KonvaEventManager {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Add standard editing event listeners to an object
     */
    addEditingEvents(object, layer, undoRedoManager) {
        // Double-click to edit text
        if (object.getClassName() === 'Text') {
            object.on('dblclick', () => {
                this.editText(object, layer);
            });
        }

        // Right-click context menu
        object.on('contextmenu', (e) => {
            e.evt.preventDefault();
            this.showContextMenu(e, object, layer, undoRedoManager);
        });

        // Drag events for snapping
        object.on('dragmove', () => {
            // Optional: Add grid snapping here
            layer.draw();
        });

        object.on('dragend', () => {
            // Save state after drag
            layer.draw();
        });
    }

    /**
     * Edit text in-place
     */
    editText(textObject, layer) {
        // Hide the text object
        textObject.hide();
        layer.draw();

        // Create input element
        const stage = layer.getStage();
        const stageBox = stage.container().getBoundingClientRect();
        const areaPosition = {
            x: stageBox.left + textObject.x(),
            y: stageBox.top + textObject.y()
        };

        const input = document.createElement('textarea');
        input.value = textObject.text();
        input.style.position = 'absolute';
        input.style.top = areaPosition.y + 'px';
        input.style.left = areaPosition.x + 'px';
        input.style.width = textObject.width() + 'px';
        input.style.fontSize = textObject.fontSize() + 'px';
        input.style.border = 'none';
        input.style.padding = '0px';
        input.style.margin = '0px';
        input.style.overflow = 'hidden';
        input.style.background = 'none';
        input.style.outline = 'none';
        input.style.resize = 'none';
        input.style.lineHeight = textObject.lineHeight();
        input.style.fontFamily = textObject.fontFamily();
        input.style.transformOrigin = 'left top';
        input.style.textAlign = textObject.align();
        input.style.color = textObject.fill();

        document.body.appendChild(input);
        input.focus();
        input.select();

        const finishEdit = () => {
            textObject.text(input.value);
            textObject.show();
            layer.draw();
            document.body.removeChild(input);
        };

        input.addEventListener('blur', finishEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                finishEdit();
            }
            if (e.key === 'Escape') {
                textObject.show();
                layer.draw();
                document.body.removeChild(input);
            }
        });
    }

    /**
     * Show context menu
     */
    showContextMenu(e, object, layer, undoRedoManager) {
        // Remove existing menu
        const existingMenu = document.querySelector('.konva-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.className = 'konva-context-menu';
        menu.style.cssText = `
            position: absolute;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            padding: 4px 0;
            min-width: 120px;
        `;

        const menuItems = [
            { label: 'Delete', action: () => this.deleteObject(object, layer, undoRedoManager) },
            { label: 'Duplicate', action: () => this.duplicateObject(object, layer) },
            { label: 'Bring to Front', action: () => this.bringToFront(object, layer) },
            { label: 'Send to Back', action: () => this.sendToBack(object, layer) }
        ];

        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.textContent = item.label;
            menuItem.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                font-size: 14px;
            `;
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = '#f0f0f0';
            });
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = 'transparent';
            });
            menuItem.addEventListener('click', () => {
                item.action();
                menu.remove();
            });
            menu.appendChild(menuItem);
        });

        const stage = layer.getStage();
        const containerRect = stage.container().getBoundingClientRect();
        menu.style.left = (containerRect.left + stage.getPointerPosition().x) + 'px';
        menu.style.top = (containerRect.top + stage.getPointerPosition().y) + 'px';

        document.body.appendChild(menu);

        // Close menu when clicking elsewhere
        const closeMenu = (event) => {
            if (!menu.contains(event.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    }

    /**
     * Delete object with undo support
     */
    deleteObject(object, layer, undoRedoManager) {
        if (undoRedoManager) {
            const command = new DeleteObjectCommand(layer, object);
            undoRedoManager.executeCommand(command);
        } else {
            object.destroy();
            layer.draw();
        }
    }

    /**
     * Duplicate object
     */
    duplicateObject(object, layer) {
        const clone = object.clone({
            x: object.x() + 20,
            y: object.y() + 20
        });
        layer.add(clone);
        layer.draw();

        // Add events to the clone
        this.addEditingEvents(clone, layer);
    }

    /**
     * Bring object to front
     */
    bringToFront(object, layer) {
        object.moveToTop();
        layer.draw();
    }

    /**
     * Send object to back
     */
    sendToBack(object, layer) {
        object.moveToBottom();
        layer.draw();
    }
}