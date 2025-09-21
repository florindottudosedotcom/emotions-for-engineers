/**
 * UI Manager - Following CLAUDE.md Guidelines
 * Manages user interface components and interactions
 */

import { DOM, Events } from '../core/dom.js';
import { logger } from '../core/utils.js';

export class UIManager {
    constructor(dom) {
        this.dom = dom;
        this.isInitialized = false;
        this.editorInstances = {};
        this.activeChapter = 0;
        this.nextChapterId = 0;
    }

    async init() {
        try {
            this.setupChapterManagement();
            this.setupTabSwitching();
            this.setupStatusDisplays();

            // Automatically add a chapter if none exist
            if (this.getChapterCount() === 0) {
                this.addChapter();
                logger.debug('Automatically added first chapter on initialization');
            }

            this.isInitialized = true;
            logger.info('UI Manager initialized');
        } catch (error) {
            logger.error('Failed to initialize UI Manager:', error);
            throw error;
        }
    }

    setupChapterManagement() {
        // Create modern + button in tab bar
        this.createAddChapterTab();
    }

    setupTabSwitching() {
        if (this.dom.chapterTabsContainer) {
            Events.on(this.dom.chapterTabsContainer, 'click', '.chapter-tab', (e) => {
                const tabElement = e.target.closest('.chapter-tab');
                if (tabElement) {
                    const chapterIndex = parseInt(tabElement.dataset.chapter);
                    this.switchToChapter(chapterIndex);
                }
            });
        }
    }

    setupStatusDisplays() {
        this.statusDisplays = {
            ai: this.dom.aiStatus,
            generation: this.dom.generationStatus,
            fileGeneration: this.dom.fileGenerationStatus
        };
    }

    addChapter() {
        const chapterIndex = this.getChapterCount();
        const chapterId = `chapter-${chapterIndex}`;

        this.createChapterTab(chapterIndex);
        this.createChapterContent(chapterIndex, chapterId);
        this.createChapterEditor(chapterId);
        this.switchToChapter(chapterIndex);
        this.updateRemoveButtonsVisibility();
        this.createAddChapterTab(); // Ensure + button is always at the end

        logger.debug(`Added chapter ${chapterIndex}`);
    }

    createChapterTab(index) {
        if (!this.dom.chapterTabsContainer) return;

        const tab = DOM.create('button', {
            className: `chapter-tab ${index === 0 ? 'active' : ''}`,
            'data-chapter': index,
            type: 'button'
        }, `Chapter ${index + 1}`);

        const removeBtn = DOM.create('span', {
            className: 'remove-chapter',
            'data-chapter': index,
            title: 'Remove Chapter'
        }, '×');

        Events.on(removeBtn, 'click', (e) => {
            e.stopPropagation();
            this.removeChapter(index);
        });

        tab.appendChild(removeBtn);
        this.dom.chapterTabsContainer.appendChild(tab);
    }

    createChapterContent(index, chapterId) {
        if (!this.dom.chapterContentContainer) return;

        const chapterDiv = DOM.create('div', {
            id: chapterId,
            className: `chapter-content ${index === 0 ? 'active' : ''}`,
            'data-chapter': index
        });

        const titleInput = DOM.create('input', {
            type: 'text',
            className: 'chapter-title',
            placeholder: `Chapter ${index + 1} Title`,
            'data-chapter': index
        });

        const editorContainer = DOM.create('div', {
            className: 'editor-container',
            id: `editor-${chapterId}`
        });

        chapterDiv.appendChild(titleInput);
        chapterDiv.appendChild(editorContainer);
        this.dom.chapterContentContainer.appendChild(chapterDiv);
    }

    createChapterEditor(chapterId) {
        const editorContainer = DOM.query(`#editor-${chapterId}`);
        if (!editorContainer) return;

        const iframe = DOM.create('iframe', {
            src: './editor.html',
            className: 'chapter-editor',
            'data-chapter-id': chapterId
        });

        editorContainer.appendChild(iframe);

        this.editorInstances[chapterId] = {
            iframe: iframe,
            content: '',
            isReady: false,
            pendingContent: null
        };

        Events.on(iframe, 'load', () => {
            const instance = this.editorInstances[chapterId];
            if (instance && iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    type: 'init',
                    id: chapterId
                }, '*');
            }
        });
    }

    switchToChapter(index) {
        this.activeChapter = index;

        const tabs = DOM.queryAll('.chapter-tab');
        const contents = DOM.queryAll('.chapter-content');

        tabs.forEach((tab, i) => {
            if (i === index) {
                DOM.addClass(tab, 'active');
            } else {
                DOM.removeClass(tab, 'active');
            }
        });

        contents.forEach((content, i) => {
            if (i === index) {
                DOM.addClass(content, 'active');
            } else {
                DOM.removeClass(content, 'active');
            }
        });

        logger.debug(`Switched to chapter ${index}`);
    }

    removeChapter(index) {
        const chapterCount = this.getChapterCount();
        if (chapterCount <= 1) {
            this.showMessage('Cannot remove the last chapter', 'warning');
            return;
        }

        if (!confirm(`Are you sure you want to remove Chapter ${index + 1}?`)) {
            return;
        }

        const chapterId = `chapter-${index}`;
        const tab = DOM.query(`[data-chapter="${index}"]`);
        const content = DOM.query(`#${chapterId}`);

        if (this.editorInstances[chapterId]) {
            delete this.editorInstances[chapterId];
        }

        if (tab) tab.remove();
        if (content) content.remove();

        this.reindexChapters();

        if (this.activeChapter >= index && this.activeChapter > 0) {
            this.switchToChapter(this.activeChapter - 1);
        } else if (this.activeChapter === index) {
            this.switchToChapter(0);
        }

        this.updateRemoveButtonsVisibility();
        this.createAddChapterTab(); // Ensure + button is always at the end
        logger.debug(`Removed chapter ${index}`);
    }

    reindexChapters() {
        const tabs = DOM.queryAll('.chapter-tab');
        const contents = DOM.queryAll('.chapter-content');

        tabs.forEach((tab, index) => {
            tab.dataset.chapter = index;
            tab.textContent = `Chapter ${index + 1}`;

            const removeBtn = DOM.create('span', {
                className: 'remove-chapter',
                'data-chapter': index,
                title: 'Remove Chapter'
            }, '×');

            Events.on(removeBtn, 'click', (e) => {
                e.stopPropagation();
                this.removeChapter(index);
            });

            tab.appendChild(removeBtn);
        });

        contents.forEach((content, index) => {
            content.dataset.chapter = index;
            content.id = `chapter-${index}`;

            const titleInput = content.querySelector('.chapter-title');
            if (titleInput) {
                titleInput.dataset.chapter = index;
                titleInput.placeholder = `Chapter ${index + 1} Title`;
            }
        });
    }

    getChapterCount() {
        return this.dom.chapterContentContainer?.children.length || 0;
    }

    getChapterData() {
        const chapters = [];
        const chapterElements = this.dom.chapterContentContainer?.children || [];

        for (let i = 0; i < chapterElements.length; i++) {
            const titleInput = chapterElements[i].querySelector('.chapter-title');
            const chapterId = `chapter-${i}`;
            const editorInstance = this.editorInstances[chapterId];

            chapters.push({
                title: titleInput?.value || '',
                content: editorInstance?.content || ''
            });
        }

        return chapters;
    }

    setChapterData(chapters) {
        this.clearAllChapters();

        chapters.forEach((chapter, index) => {
            this.addChapter();
            const titleInput = DOM.query(`#chapter-${index} .chapter-title`);
            if (titleInput) {
                titleInput.value = chapter.title;
            }

            setTimeout(() => {
                const chapterId = `chapter-${index}`;
                const editorInstance = this.editorInstances[chapterId];
                if (editorInstance && chapter.content) {
                    editorInstance.content = chapter.content;
                    if (editorInstance.isReady) {
                        editorInstance.iframe.contentWindow.postMessage({
                            type: 'set-content',
                            content: chapter.content
                        }, '*');
                    } else {
                        editorInstance.pendingContent = chapter.content;
                    }
                }
            }, 100 * index);
        });
    }

    clearAllChapters() {
        if (this.dom.chapterTabsContainer) {
            this.dom.chapterTabsContainer.innerHTML = '';
        }
        if (this.dom.chapterContentContainer) {
            this.dom.chapterContentContainer.innerHTML = '';
        }
        this.editorInstances = {};
        this.activeChapter = 0;
    }

    showMessage(message, type = 'info', duration = 3000) {
        const messageDiv = DOM.create('div', {
            className: `status-display status-${type} show`,
            style: 'position: fixed; top: 20px; right: 20px; z-index: 1000; max-width: 400px;'
        }, message);

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, duration);

        logger.info(`Message shown: ${message} (${type})`);
    }

    updateStatus(statusType, message, type = 'info') {
        const statusElement = this.statusDisplays[statusType];
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-display status-${type} show`;
        }
    }

    showLoading(element, text = 'Loading...') {
        if (element) {
            element.disabled = true;
            element.dataset.originalText = element.textContent;
            element.textContent = `🔄 ${text}`;
        }
    }

    hideLoading(element) {
        if (element && element.dataset.originalText) {
            element.disabled = false;
            element.textContent = element.dataset.originalText;
            delete element.dataset.originalText;
        }
    }

    enableDownload(url, filename) {
        if (this.dom.downloadZipLink) {
            this.dom.downloadZipLink.href = url;
            this.dom.downloadZipLink.download = filename;
            DOM.removeClass(this.dom.downloadSection, 'hidden');
        }
    }

    disableDownload() {
        if (this.dom.downloadZipLink) {
            this.dom.downloadZipLink.href = '#';
            this.dom.downloadZipLink.download = '';
            DOM.addClass(this.dom.downloadSection, 'hidden');
        }
    }

    createAddChapterTab() {
        if (!this.dom.chapterTabsContainer) return;

        // Remove existing add button if it exists
        const existingAddBtn = DOM.query('.add-chapter-tab');
        if (existingAddBtn) {
            existingAddBtn.remove();
        }

        const addTab = DOM.create('button', {
            className: 'add-chapter-tab',
            type: 'button',
            title: 'Add New Chapter'
        }, '+');

        Events.on(addTab, 'click', () => {
            this.addChapter();
        });

        this.dom.chapterTabsContainer.appendChild(addTab);
    }

    updateRemoveButtonsVisibility() {
        const chapterCount = this.getChapterCount();
        const removeButtons = DOM.queryAll('.remove-chapter');

        removeButtons.forEach(button => {
            if (chapterCount <= 1) {
                button.style.display = 'none';
            } else {
                button.style.display = '';
            }
        });
    }

    destroy() {
        Object.values(this.editorInstances).forEach(instance => {
            if (instance.iframe) {
                instance.iframe.remove();
            }
        });

        this.editorInstances = {};
        this.isInitialized = false;
        logger.info('UI Manager destroyed');
    }
}