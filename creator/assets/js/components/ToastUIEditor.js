/**
 * ToastUI Editor Component - Following CLAUDE.md Guidelines
 * Modular wrapper for ToastUI Editor with consistent interface
 */

import { DOM, Events } from '../core/dom.js';
import { logger } from '../core/utils.js';
import { loadEditorAssets } from '../utils/lazy-loader.js';

export class ToastUIEditor {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = null;
        this.options = {
            height: '400px',
            initialEditType: 'wysiwyg',
            previewStyle: 'vertical',
            useCommandShortcut: true,
            usageStatistics: false,
            hideModeSwitch: false,
            theme: 'light',
            language: 'en-US',
            placeholder: 'Enter your content here...',
            ...options
        };
        this.editor = null;
        this.isInitialized = false;
        this.content = '';
    }

    /**
     * Initialize the ToastUI Editor
     */
    async init() {
        try {
            this.container = DOM.query(`#${this.containerId}`);
            if (!this.container) {
                throw new Error(`Container #${this.containerId} not found`);
            }

            // Load ToastUI assets if not already loaded
            await this.loadAssets();

            // Create editor container
            this.createEditorContainer();

            // Initialize ToastUI Editor
            await this.initializeEditor();

            // Setup event listeners
            this.setupEventListeners();

            this.isInitialized = true;
            logger.info('ToastUIEditor initialized');
        } catch (error) {
            logger.error('Failed to initialize ToastUIEditor:', error);
            throw error;
        }
    }

    /**
     * Load ToastUI Editor assets
     */
    async loadAssets() {
        try {
            await loadEditorAssets();

            // Wait for ToastUI to be available
            let attempts = 0;
            while (!window.toastui && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!window.toastui) {
                throw new Error('ToastUI Editor failed to load');
            }
        } catch (error) {
            logger.error('Failed to load ToastUI assets:', error);
            throw error;
        }
    }

    /**
     * Create editor container element
     */
    createEditorContainer() {
        this.container.innerHTML = `
            <div class="toastui-editor-container">
                <div id="${this.containerId}-editor" class="toastui-editor"></div>
            </div>
        `;
    }

    /**
     * Initialize ToastUI Editor instance
     */
    async initializeEditor() {
        const editorElement = DOM.query(`#${this.containerId}-editor`);
        if (!editorElement) {
            throw new Error('Editor element not found');
        }

        // Configure editor options
        const editorConfig = {
            el: editorElement,
            height: this.options.height,
            initialEditType: this.options.initialEditType,
            previewStyle: this.options.previewStyle,
            useCommandShortcut: this.options.useCommandShortcut,
            usageStatistics: this.options.usageStatistics,
            hideModeSwitch: this.options.hideModeSwitch,
            placeholder: this.options.placeholder,
            language: this.options.language
        };

        // Set theme
        if (this.options.theme === 'dark') {
            editorConfig.theme = 'dark';
        }

        // Initialize editor
        this.editor = new window.toastui.Editor(editorConfig);

        // Set initial content if provided
        if (this.content) {
            this.editor.setMarkdown(this.content);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.editor) return;

        // Content change events
        this.editor.on('change', () => {
            this.content = this.editor.getMarkdown();
            this.emit('contentChanged', {
                content: this.content,
                html: this.editor.getHTML()
            });
        });

        // Focus events
        this.editor.on('focus', () => {
            this.emit('focus');
        });

        this.editor.on('blur', () => {
            this.emit('blur');
        });

        // Selection change
        this.editor.on('caretChange', () => {
            this.emit('caretChange', {
                range: this.editor.getRange()
            });
        });
    }

    /**
     * Get editor content as markdown
     */
    getMarkdown() {
        return this.editor ? this.editor.getMarkdown() : this.content;
    }

    /**
     * Get editor content as HTML
     */
    getHTML() {
        return this.editor ? this.editor.getHTML() : '';
    }

    /**
     * Set editor content
     */
    setContent(content, type = 'markdown') {
        this.content = content;

        if (this.editor) {
            if (type === 'markdown') {
                this.editor.setMarkdown(content);
            } else if (type === 'html') {
                this.editor.setHTML(content);
            }
        }
    }

    /**
     * Insert text at cursor position
     */
    insertText(text) {
        if (this.editor) {
            this.editor.insertText(text);
        }
    }

    /**
     * Replace selection with text
     */
    replaceSelection(text) {
        if (this.editor) {
            const range = this.editor.getRange();
            this.editor.setSelection(range);
            this.editor.replaceSelection(text);
        }
    }

    /**
     * Get current selection
     */
    getSelection() {
        return this.editor ? this.editor.getSelectedText() : '';
    }

    /**
     * Focus the editor
     */
    focus() {
        if (this.editor) {
            this.editor.focus();
        }
    }

    /**
     * Blur the editor
     */
    blur() {
        if (this.editor) {
            this.editor.blur();
        }
    }

    /**
     * Set editor mode
     */
    setMode(mode) {
        if (this.editor && (mode === 'markdown' || mode === 'wysiwyg')) {
            this.editor.changeMode(mode);
        }
    }

    /**
     * Get current editor mode
     */
    getMode() {
        return this.editor ? this.editor.getCurrentModeType() : this.options.initialEditType;
    }

    /**
     * Show/hide editor
     */
    show() {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * Enable/disable editor
     */
    enable() {
        if (this.editor) {
            this.editor.setOptions({ disabled: false });
        }
    }

    disable() {
        if (this.editor) {
            this.editor.setOptions({ disabled: true });
        }
    }

    /**
     * Set editor theme
     */
    setTheme(theme) {
        this.options.theme = theme;
        if (this.editor) {
            // ToastUI doesn't support dynamic theme switching,
            // so we need to recreate the editor
            this.destroy();
            this.init();
        }
    }

    /**
     * Clear editor content
     */
    clear() {
        this.setContent('');
    }

    /**
     * Check if editor has content
     */
    hasContent() {
        const content = this.getMarkdown().trim();
        return content.length > 0;
    }

    /**
     * Get editor word count
     */
    getWordCount() {
        const text = this.getMarkdown().replace(/[#*`_\[\]()]/g, '').trim();
        return text ? text.split(/\s+/).length : 0;
    }

    /**
     * Get editor character count
     */
    getCharCount() {
        return this.getMarkdown().length;
    }

    /**
     * Export content in different formats
     */
    export(format = 'markdown') {
        switch (format) {
            case 'markdown':
                return this.getMarkdown();
            case 'html':
                return this.getHTML();
            case 'text':
                return this.getMarkdown().replace(/[#*`_\[\]()]/g, '').trim();
            default:
                return this.getMarkdown();
        }
    }

    /**
     * Add custom toolbar button
     */
    addToolbarButton(buttonConfig) {
        if (this.editor && this.editor.getUI) {
            const toolbar = this.editor.getUI().getToolbar();
            if (toolbar && toolbar.addButton) {
                toolbar.addButton(buttonConfig);
            }
        }
    }

    /**
     * Set editor placeholder
     */
    setPlaceholder(placeholder) {
        this.options.placeholder = placeholder;
        if (this.editor) {
            // ToastUI doesn't support dynamic placeholder change
            // Store for next initialization
        }
    }

    /**
     * Simple event emitter
     */
    emit(eventName, data = {}) {
        if (!this.container) return;

        const event = new CustomEvent(`toastuiEditor:${eventName}`, {
            detail: { ...data, editorId: this.containerId },
            bubbles: true
        });
        this.container.dispatchEvent(event);
    }

    /**
     * Add event listener
     */
    on(eventName, callback) {
        if (this.container) {
            Events.on(this.container, `toastuiEditor:${eventName}`, callback);
        }
    }

    /**
     * Remove event listener
     */
    off(eventName, callback) {
        if (this.container) {
            Events.off(this.container, `toastuiEditor:${eventName}`, callback);
        }
    }

    /**
     * Get editor status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasContent: this.hasContent(),
            mode: this.getMode(),
            wordCount: this.getWordCount(),
            charCount: this.getCharCount(),
            theme: this.options.theme
        };
    }

    /**
     * Validate editor content
     */
    validate() {
        const content = this.getMarkdown().trim();
        const errors = [];

        if (!content) {
            errors.push('Content is required');
        }

        if (content.length > 10000) {
            errors.push('Content is too long (max 10,000 characters)');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Destroy the editor and cleanup
     */
    destroy() {
        if (this.editor) {
            this.editor.destroy();
            this.editor = null;
        }

        if (this.container) {
            this.container.innerHTML = '';
        }

        this.isInitialized = false;
        this.content = '';
        logger.info('ToastUIEditor destroyed');
    }
}