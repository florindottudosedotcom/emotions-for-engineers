// Slate.js Rich Text Editor Integration
// Enhanced editing experience for slide content

let SlateReact, Slate, SlateHistory;

// Load Slate.js dependencies
async function loadSlateJS() {
    if (typeof SlateReact !== 'undefined') return;

    try {
        // Import Slate.js modules
        const slateModule = await import('https://unpkg.com/slate@0.103.0/dist/index.es.js');
        const slateReactModule = await import('https://unpkg.com/slate-react@0.103.0/dist/index.es.js');
        const slateHistoryModule = await import('https://unpkg.com/slate-history@0.100.0/dist/index.es.js');

        Slate = slateModule;
        SlateReact = slateReactModule;
        SlateHistory = slateHistoryModule;

        console.log('Slate.js loaded successfully');
        return true;
    } catch (error) {
        console.warn('Failed to load Slate.js, falling back to contentEditable:', error);
        return false;
    }
}

// Slate.js Editor Component
class SlateSlideEditor {
    constructor(element, initialValue, onChange) {
        this.element = element;
        this.onChange = onChange;
        this.editor = null;
        this.initialValue = initialValue || [
            {
                type: 'paragraph',
                children: [{ text: '' }],
            },
        ];

        this.init();
    }

    async init() {
        const slateLoaded = await loadSlateJS();

        if (!slateLoaded) {
            // Fall back to enhanced contentEditable
            this.initFallbackEditor();
            return;
        }

        try {
            // Create Slate editor
            this.editor = SlateHistory.withHistory(Slate.createEditor());

            // Set up the editor with React (if available)
            this.initSlateEditor();
        } catch (error) {
            console.warn('Slate editor initialization failed, using fallback:', error);
            this.initFallbackEditor();
        }
    }

    initSlateEditor() {
        // This would require React integration
        // For now, let's enhance the contentEditable approach with Slate-like features
        this.initEnhancedEditor();
    }

    initEnhancedEditor() {
        // Enhanced contentEditable with rich text features
        this.element.contentEditable = true;
        this.element.classList.add('slate-enhanced-editor');

        // Add rich text toolbar
        this.createToolbar();

        // Enhanced keyboard shortcuts
        this.addKeyboardShortcuts();

        // Better paste handling
        this.addPasteHandling();

        // Auto-formatting
        this.addAutoFormatting();
    }

    initFallbackEditor() {
        // Simple enhanced contentEditable
        this.element.contentEditable = true;
        this.element.classList.add('slate-fallback-editor');

        // Basic formatting
        this.addBasicFormatting();
    }

    createToolbar() {
        console.log('Creating Slate toolbar for element:', this.element);

        const toolbar = document.createElement('div');
        toolbar.className = 'slate-toolbar';
        toolbar.innerHTML = `
            <div class="slate-toolbar-group">
                <button type="button" class="slate-btn" data-command="bold" title="Bold (Ctrl+B)">
                    <strong>B</strong>
                </button>
                <button type="button" class="slate-btn" data-command="italic" title="Italic (Ctrl+I)">
                    <em>I</em>
                </button>
                <button type="button" class="slate-btn" data-command="underline" title="Underline (Ctrl+U)">
                    <u>U</u>
                </button>
            </div>
            <div class="slate-toolbar-group">
                <button type="button" class="slate-btn" data-command="insertOrderedList" title="Numbered List">
                    1.
                </button>
                <button type="button" class="slate-btn" data-command="insertUnorderedList" title="Bullet List">
                    •
                </button>
            </div>
        `;

        // Insert toolbar before the editor
        this.element.parentNode.insertBefore(toolbar, this.element);
        console.log('Toolbar inserted, parent node:', this.element.parentNode);
        console.log('Toolbar display style:', getComputedStyle(toolbar).display);

        // Add toolbar event listeners
        toolbar.addEventListener('click', (e) => {
            const button = e.target.closest('.slate-btn');
            if (button) {
                e.preventDefault();
                const command = button.dataset.command;
                this.execCommand(command);
                this.element.focus();
            }
        });

        // Make toolbar always visible for enhanced editing
        toolbar.style.display = 'flex';
        toolbar.style.opacity = '1';

        // Highlight toolbar on focus
        this.element.addEventListener('focus', () => {
            toolbar.style.opacity = '1';
            toolbar.style.borderColor = 'var(--accent-color, #60a5fa)';
        });

        this.element.addEventListener('blur', (e) => {
            // Don't hide if clicking on toolbar
            if (!toolbar.contains(e.relatedTarget)) {
                setTimeout(() => {
                    toolbar.style.opacity = '0.8';
                    toolbar.style.borderColor = '#e5e7eb';
                }, 100);
            }
        });
    }

    addKeyboardShortcuts() {
        this.element.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        this.execCommand('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.execCommand('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.execCommand('underline');
                        break;
                    case 'z':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.execCommand('redo');
                        } else {
                            e.preventDefault();
                            this.execCommand('undo');
                        }
                        break;
                }
            }

            // Auto-formatting on Enter
            if (e.key === 'Enter') {
                this.handleEnterKey(e);
            }
        });
    }

    addPasteHandling() {
        this.element.addEventListener('paste', (e) => {
            e.preventDefault();

            // Get plain text
            const text = e.clipboardData.getData('text/plain');

            // Insert as plain text to avoid formatting issues
            document.execCommand('insertText', false, text);

            // Trigger change event
            this.triggerChange();
        });
    }

    addAutoFormatting() {
        let timeout;
        this.element.addEventListener('input', () => {
            // Trigger change immediately for persistence
            this.triggerChange();

            clearTimeout(timeout);
            timeout = setTimeout(() => {
                this.applyAutoFormatting();
            }, 300);
        });
    }

    addBasicFormatting() {
        this.element.addEventListener('input', () => {
            this.triggerChange();
        });
    }

    execCommand(command) {
        document.execCommand(command, false, null);

        // Immediate persistence for toolbar actions
        setTimeout(() => {
            this.triggerChange();
        }, 10);
    }

    handleEnterKey(e) {
        // Custom enter handling for better list behavior
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const container = range.commonAncestorContainer;

            // Check if we're in a list
            const listItem = container.closest ? container.closest('li') :
                              (container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement).closest('li');

            if (listItem) {
                // Let default behavior handle list items
                return;
            }
        }
    }

    applyAutoFormatting() {
        const content = this.element.textContent;

        // Auto-format markdown-like patterns
        // **bold** -> bold text
        if (content.includes('**')) {
            this.element.innerHTML = this.element.innerHTML.replace(
                /\*\*(.*?)\*\*/g,
                '<strong>$1</strong>'
            );
        }

        // *italic* -> italic text
        if (content.includes('*') && !content.includes('**')) {
            this.element.innerHTML = this.element.innerHTML.replace(
                /\*(.*?)\*/g,
                '<em>$1</em>'
            );
        }
    }

    triggerChange() {
        if (this.onChange) {
            // Get both HTML and plain text content
            const htmlContent = this.element.innerHTML;
            const textContent = this.element.textContent || this.element.innerText || '';

            // For persistence, use plain text to maintain compatibility
            // but preserve formatting in the editor
            console.log('Slate editor content changed:', { html: htmlContent, text: textContent });
            this.onChange(textContent.trim());
        }
    }

    getValue() {
        return this.element.innerHTML;
    }

    setValue(value) {
        if (typeof value === 'string') {
            this.element.innerHTML = value;
        } else {
            // If it's Slate.js format, convert to HTML
            this.element.textContent = this.slateToText(value);
        }
    }

    slateToText(slateValue) {
        if (!Array.isArray(slateValue)) return '';

        return slateValue.map(node => {
            if (node.children) {
                return node.children.map(child => child.text || '').join('');
            }
            return node.text || '';
        }).join('\\n');
    }

    destroy() {
        // Clean up toolbar
        const toolbar = this.element.parentNode.querySelector('.slate-toolbar');
        if (toolbar) {
            toolbar.remove();
        }

        // Remove editor classes
        this.element.classList.remove('slate-enhanced-editor', 'slate-fallback-editor');
        this.element.contentEditable = false;
    }
}

// CSS for Slate editor
function addSlateEditorStyles() {
    if (document.getElementById('slate-editor-styles')) return;

    const style = document.createElement('style');
    style.id = 'slate-editor-styles';
    style.textContent = `
        .slate-enhanced-editor,
        .slate-fallback-editor {
            min-height: 100px;
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.9);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            line-height: 1.6;
            transition: all 0.2s ease;
            position: relative;
        }

        .slate-enhanced-editor::before {
            content: '✨ Enhanced Editor';
            position: absolute;
            top: -8px;
            left: 12px;
            background: #60a5fa;
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
        }

        .slate-enhanced-editor:focus,
        .slate-fallback-editor:focus {
            outline: none;
            border-color: var(--accent-color, #60a5fa);
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
        }

        .slate-toolbar {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            padding: 8px;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            margin-bottom: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
            visibility: visible;
            opacity: 1;
        }

        .slate-toolbar-group {
            display: flex;
            gap: 2px;
            padding: 0 4px;
            border-right: 1px solid #e5e7eb;
        }

        .slate-toolbar-group:last-child {
            border-right: none;
        }

        .slate-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border: 1px solid transparent;
            border-radius: 4px;
            background: none;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            color: #374151;
        }

        .slate-btn:hover {
            background: #f3f4f6;
            border-color: #d1d5db;
        }

        .slate-btn:active {
            background: #e5e7eb;
            transform: translateY(0.5px);
        }

        .slate-enhanced-editor ul,
        .slate-fallback-editor ul {
            margin: 8px 0;
            padding-left: 20px;
        }

        .slate-enhanced-editor li,
        .slate-fallback-editor li {
            margin: 4px 0;
        }

        .slate-enhanced-editor strong,
        .slate-fallback-editor strong {
            font-weight: 600;
        }

        .slate-enhanced-editor em,
        .slate-fallback-editor em {
            font-style: italic;
        }
    `;

    document.head.appendChild(style);
}

// Initialize Slate editor for an element
function createSlateEditor(element, initialValue, onChange) {
    addSlateEditorStyles();
    return new SlateSlideEditor(element, initialValue, onChange);
}

// Export for use in slides_main.js
window.SlateEditor = {
    create: createSlateEditor,
    loadDependencies: loadSlateJS
};