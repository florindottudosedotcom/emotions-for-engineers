/**
 * Virtual Chapter Manager - Optimizes performance for large numbers of chapters
 * Only renders visible/active chapters to reduce memory usage and DOM overhead
 */

import { logger } from '../core/utils.js';
import { DOM, Events } from '../core/dom.js';
import { loadingManager } from './loading-manager.js';

export class VirtualChapterManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.virtualChapters = new Map(); // Store chapter data without DOM
        this.renderedChapters = new Set(); // Track which chapters are rendered
        this.activeChapter = 0;
        this.maxRenderedChapters = 3; // Keep max 3 chapters rendered at once
        this.renderBuffer = 1; // Render 1 chapter before/after active
    }

    /**
     * Initialize virtual chapter system
     */
    init() {
        this.setupIntersectionObserver();
        logger.debug('Virtual Chapter Manager initialized');
    }

    /**
     * Set up intersection observer for lazy rendering
     */
    setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) {
            logger.warn('IntersectionObserver not supported, falling back to immediate rendering');
            return;
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const chapterIndex = parseInt(entry.target.dataset.chapterIndex);
                    this.renderChapterIfNeeded(chapterIndex);
                }
            });
        }, {
            rootMargin: '50px', // Start loading 50px before becoming visible
            threshold: 0.1
        });
    }

    /**
     * Add a virtual chapter (data only, no immediate DOM rendering)
     */
    addVirtualChapter(data = { title: '', content: '' }) {
        const chapterIndex = this.virtualChapters.size;
        const chapterId = `chapter-${chapterIndex}`;

        this.virtualChapters.set(chapterIndex, {
            id: chapterId,
            title: data.title || `Chapter ${chapterIndex + 1}`,
            content: data.content || '',
            isRendered: false,
            lastAccessed: Date.now()
        });

        // Create tab immediately (lightweight)
        this.createVirtualTab(chapterIndex);

        // Create placeholder content container
        this.createPlaceholderContent(chapterIndex);

        // Render if it's the first chapter or within render buffer
        if (chapterIndex === 0 || this.shouldRenderChapter(chapterIndex)) {
            this.renderChapter(chapterIndex);
        }

        logger.debug(`Added virtual chapter ${chapterIndex}`);
        return chapterIndex;
    }

    /**
     * Create lightweight tab for chapter
     */
    createVirtualTab(index) {
        if (!this.uiManager.dom.chapterTabsContainer) return;

        const tab = DOM.create('button', {
            className: `chapter-tab ${index === 0 ? 'active' : ''}`,
            'data-chapter': index,
            type: 'button'
        }, this.virtualChapters.get(index).title);

        const removeBtn = DOM.create('span', {
            className: 'remove-chapter',
            'data-chapter': index,
            title: 'Remove Chapter'
        }, '×');

        Events.on(removeBtn, 'click', (e) => {
            e.stopPropagation();
            this.removeVirtualChapter(index);
        });

        tab.appendChild(removeBtn);

        // Insert before add button
        const addButton = this.uiManager.dom.chapterTabsContainer.querySelector('.add-chapter-tab');
        if (addButton) {
            this.uiManager.dom.chapterTabsContainer.insertBefore(tab, addButton);
        } else {
            this.uiManager.dom.chapterTabsContainer.appendChild(tab);
        }
    }

    /**
     * Create placeholder content container
     */
    createPlaceholderContent(index) {
        if (!this.uiManager.dom.chapterContentContainer) return;

        const chapterId = `chapter-${index}`;
        const placeholder = DOM.create('div', {
            className: `chapter-content ${index === 0 ? 'active' : ''}`,
            id: chapterId,
            'data-chapter-index': index
        });

        placeholder.innerHTML = `
            <div class="virtual-chapter-placeholder">
                <div class="loading-indicator">
                    <div class="loading-message">Chapter ${index + 1} will load when needed</div>
                </div>
            </div>
        `;

        this.uiManager.dom.chapterContentContainer.appendChild(placeholder);

        // Observe for intersection
        if (this.observer) {
            this.observer.observe(placeholder);
        }
    }

    /**
     * Determine if chapter should be rendered
     */
    shouldRenderChapter(index) {
        const distance = Math.abs(index - this.activeChapter);
        return distance <= this.renderBuffer;
    }

    /**
     * Render chapter content and editor
     */
    async renderChapter(index) {
        if (this.renderedChapters.has(index)) {
            return; // Already rendered
        }

        const chapterData = this.virtualChapters.get(index);
        if (!chapterData) return;

        const chapterId = chapterData.id;
        const container = DOM.query(`#${chapterId}`);
        if (!container) return;

        logger.debug(`Rendering chapter ${index}`);

        // Show loading state
        const loadingController = loadingManager.showLoading(`virtual-chapter-${index}`, 'Loading chapter...', {
            container: container
        });

        try {
            // Create actual chapter content
            const titleInput = DOM.create('input', {
                type: 'text',
                className: 'chapter-title',
                placeholder: `Chapter ${index + 1} Title`,
                value: chapterData.title
            });

            const editorContainer = DOM.create('div', {
                className: 'editor-container',
                id: `editor-${chapterId}`
            });

            // Clear placeholder and add real content
            container.innerHTML = '';
            container.appendChild(titleInput);
            container.appendChild(editorContainer);

            // Create editor
            await this.createChapterEditor(chapterId, editorContainer, chapterData.content);

            // Mark as rendered
            this.renderedChapters.add(index);
            chapterData.isRendered = true;
            chapterData.lastAccessed = Date.now();

            loadingController.finish();

            // Set up input listener for title
            Events.on(titleInput, 'input', () => {
                chapterData.title = titleInput.value;
                this.updateTabTitle(index, titleInput.value);
            });

        } catch (error) {
            logger.error(`Failed to render chapter ${index}:`, error);
            loadingController.finish();
        }

        // Clean up old chapters if we have too many rendered
        this.cleanupOldChapters();
    }

    /**
     * Create editor for rendered chapter
     */
    async createChapterEditor(chapterId, container, content = '') {
        try {
            // Import ToastUIEditor component
            const { ToastUIEditor } = await import('../components/ToastUIEditor.js');

            // Create ToastUI editor instance
            const editor = new ToastUIEditor(`editor-${chapterId}`, {
                height: '400px',
                initialEditType: 'wysiwyg',
                previewStyle: 'vertical',
                placeholder: 'Enter chapter content here...'
            });

            await editor.init();

            // Store editor instance
            this.uiManager.editorInstances[chapterId] = {
                editor: editor,
                content: content,
                isReady: true,
                pendingContent: null
            };

            // Set up content change listener
            editor.on('contentChanged', (event) => {
                const instance = this.uiManager.editorInstances[chapterId];
                if (instance) {
                    instance.content = event.detail.content;
                }
            });

            // Set content if available
            if (content) {
                editor.setContent(content);
            }

        } catch (error) {
            logger.error(`Failed to create editor for ${chapterId}:`, error);
            throw error;
        }
    }

    /**
     * Render chapter if needed (lazy loading trigger)
     */
    renderChapterIfNeeded(index) {
        if (!this.renderedChapters.has(index) && this.virtualChapters.has(index)) {
            this.renderChapter(index);
        }
    }

    /**
     * Switch to chapter with virtual loading
     */
    async switchToChapter(index) {
        this.activeChapter = index;

        // Update tab states
        const tabs = DOM.queryAll('.chapter-tab');
        tabs.forEach((tab, i) => {
            if (i === index) {
                DOM.addClass(tab, 'active');
            } else {
                DOM.removeClass(tab, 'active');
            }
        });

        // Update content visibility
        const contents = DOM.queryAll('.chapter-content');
        contents.forEach((content, i) => {
            if (i === index) {
                DOM.addClass(content, 'active');
            } else {
                DOM.removeClass(content, 'active');
            }
        });

        // Ensure active chapter is rendered
        await this.renderChapterIfNeeded(index);

        // Preload adjacent chapters
        const adjacentIndexes = [index - 1, index + 1].filter(i =>
            i >= 0 && i < this.virtualChapters.size && !this.renderedChapters.has(i)
        );

        for (const adjacentIndex of adjacentIndexes) {
            if (this.shouldRenderChapter(adjacentIndex)) {
                setTimeout(() => this.renderChapter(adjacentIndex), 100);
            }
        }

        logger.debug(`Switched to virtual chapter ${index}`);
    }

    /**
     * Update tab title
     */
    updateTabTitle(index, title) {
        const tab = DOM.query(`[data-chapter="${index}"]`);
        if (tab) {
            const textNode = Array.from(tab.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
            if (textNode) {
                textNode.textContent = title || `Chapter ${index + 1}`;
            }
        }
    }

    /**
     * Remove virtual chapter
     */
    removeVirtualChapter(index) {
        if (this.virtualChapters.size <= 1) {
            this.uiManager.showMessage('Cannot remove the last chapter', 'warning');
            return;
        }

        if (!confirm(`Are you sure you want to remove Chapter ${index + 1}?`)) {
            return;
        }

        // Remove from virtual storage
        this.virtualChapters.delete(index);
        this.renderedChapters.delete(index);

        // Remove DOM elements
        const tab = DOM.query(`[data-chapter="${index}"]`);
        const content = DOM.query(`#chapter-${index}`);
        const chapterId = `chapter-${index}`;

        if (this.uiManager.editorInstances[chapterId]) {
            if (this.uiManager.editorInstances[chapterId].editor) {
                this.uiManager.editorInstances[chapterId].editor.destroy();
            }
            delete this.uiManager.editorInstances[chapterId];
        }

        if (tab) tab.remove();
        if (content) content.remove();

        // Reindex remaining chapters
        this.reindexVirtualChapters();

        // Switch to valid chapter if needed
        if (index === this.activeChapter && this.virtualChapters.size > 0) {
            const newIndex = Math.min(index, this.virtualChapters.size - 1);
            this.switchToChapter(newIndex);
        }

        logger.debug(`Removed virtual chapter ${index}`);
    }

    /**
     * Reindex chapters after removal
     */
    reindexVirtualChapters() {
        // This is complex with virtual system, simplified for now
        // In a production system, you'd want to maintain stable IDs
        // and update the mapping efficiently
    }

    /**
     * Clean up old rendered chapters to free memory
     */
    cleanupOldChapters() {
        if (this.renderedChapters.size <= this.maxRenderedChapters) {
            return;
        }

        // Find chapters that are far from active and haven't been accessed recently
        const chaptersToCleanup = [];

        for (const index of this.renderedChapters) {
            const distance = Math.abs(index - this.activeChapter);
            const chapterData = this.virtualChapters.get(index);

            if (distance > this.renderBuffer && chapterData) {
                const timeSinceAccess = Date.now() - chapterData.lastAccessed;
                if (timeSinceAccess > 30000) { // 30 seconds
                    chaptersToCleanup.push({ index, distance, timeSinceAccess });
                }
            }
        }

        // Sort by distance and time, cleanup furthest and oldest
        chaptersToCleanup
            .sort((a, b) => (b.distance + b.timeSinceAccess) - (a.distance + a.timeSinceAccess))
            .slice(0, Math.max(0, this.renderedChapters.size - this.maxRenderedChapters))
            .forEach(({ index }) => this.unrenderChapter(index));
    }

    /**
     * Convert rendered chapter back to placeholder
     */
    unrenderChapter(index) {
        if (!this.renderedChapters.has(index)) return;

        const chapterData = this.virtualChapters.get(index);
        if (!chapterData) return;

        const container = DOM.query(`#chapter-${index}`);
        if (!container) return;

        // Save current state
        const titleInput = container.querySelector('.chapter-title');
        if (titleInput) {
            chapterData.title = titleInput.value;
        }

        // Save editor content
        const chapterId = chapterData.id;
        const editorInstance = this.uiManager.editorInstances[chapterId];
        if (editorInstance) {
            chapterData.content = editorInstance.content || '';
            if (editorInstance.editor) {
                editorInstance.editor.destroy();
            }
            delete this.uiManager.editorInstances[chapterId];
        }

        // Replace with placeholder
        container.innerHTML = `
            <div class="virtual-chapter-placeholder">
                <div class="loading-indicator">
                    <div class="loading-message">Chapter ${index + 1} (tap to reload)</div>
                </div>
            </div>
        `;

        // Mark as unrendered
        this.renderedChapters.delete(index);
        chapterData.isRendered = false;

        logger.debug(`Unrendered chapter ${index} to save memory`);
    }

    /**
     * Get all chapter data
     */
    getAllChapterData() {
        const chapters = [];

        for (let i = 0; i < this.virtualChapters.size; i++) {
            const chapterData = this.virtualChapters.get(i);
            if (chapterData) {
                // Get current content from editor if rendered
                let content = chapterData.content;
                if (this.renderedChapters.has(i)) {
                    const editorInstance = this.uiManager.editorInstances[chapterData.id];
                    if (editorInstance) {
                        content = editorInstance.content || content;
                    }
                }

                chapters.push({
                    title: chapterData.title,
                    content: content
                });
            }
        }

        return chapters;
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            totalChapters: this.virtualChapters.size,
            renderedChapters: this.renderedChapters.size,
            memoryEfficiency: `${Math.round((1 - this.renderedChapters.size / Math.max(1, this.virtualChapters.size)) * 100)}%`,
            activeChapter: this.activeChapter
        };
    }

    /**
     * Destroy virtual chapter manager
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.virtualChapters.clear();
        this.renderedChapters.clear();
    }
}