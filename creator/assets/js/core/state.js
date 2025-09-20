/**
 * Centralized State Management - Following CLAUDE.md Guidelines
 * Unified state management with persistence and event-driven updates
 */

import { EventEmitter, storage, logger } from './utils.js';

/**
 * Application state manager
 */
export class StateManager extends EventEmitter {
    constructor() {
        super();
        this.state = new Map();
        this.watchers = new Map();
        this.persistenceKey = 'creator_app_state';
        this.autoSave = true;
        this.saveDelay = 500; // Debounce save operations
        this.saveTimeout = null;

        // Load initial state
        this.loadPersistedState();
    }

    /**
     * Get state value
     * @param {string} key - State key
     * @param {any} defaultValue - Default value if key doesn't exist
     * @returns {any} State value
     */
    get(key, defaultValue = null) {
        return this.state.has(key) ? this.state.get(key) : defaultValue;
    }

    /**
     * Set state value
     * @param {string} key - State key
     * @param {any} value - State value
     * @param {boolean} persist - Whether to persist to storage
     */
    set(key, value, persist = true) {
        const oldValue = this.state.get(key);
        this.state.set(key, value);

        // Emit change event
        this.emit('stateChange', { key, value, oldValue });
        this.emit(`stateChange:${key}`, { value, oldValue });

        // Run watchers
        if (this.watchers.has(key)) {
            this.watchers.get(key).forEach(callback => {
                try {
                    callback(value, oldValue);
                } catch (error) {
                    logger.error('State watcher error:', error);
                }
            });
        }

        // Auto-save if enabled
        if (persist && this.autoSave) {
            this.scheduleSave();
        }
    }

    /**
     * Update state object (shallow merge)
     * @param {string} key - State key
     * @param {Object} updates - Updates to merge
     * @param {boolean} persist - Whether to persist to storage
     */
    update(key, updates, persist = true) {
        const current = this.get(key, {});
        const newValue = { ...current, ...updates };
        this.set(key, newValue, persist);
    }

    /**
     * Delete state value
     * @param {string} key - State key
     * @param {boolean} persist - Whether to persist to storage
     */
    delete(key, persist = true) {
        if (this.state.has(key)) {
            const oldValue = this.state.get(key);
            this.state.delete(key);

            this.emit('stateChange', { key, value: undefined, oldValue });
            this.emit(`stateChange:${key}`, { value: undefined, oldValue });

            if (persist && this.autoSave) {
                this.scheduleSave();
            }
        }
    }

    /**
     * Check if state has key
     * @param {string} key - State key
     * @returns {boolean} True if key exists
     */
    has(key) {
        return this.state.has(key);
    }

    /**
     * Get all state as object
     * @returns {Object} State object
     */
    getAll() {
        return Object.fromEntries(this.state);
    }

    /**
     * Set multiple state values
     * @param {Object} stateObject - State object
     * @param {boolean} persist - Whether to persist to storage
     */
    setAll(stateObject, persist = true) {
        Object.entries(stateObject).forEach(([key, value]) => {
            this.set(key, value, false); // Don't save individually
        });

        if (persist && this.autoSave) {
            this.scheduleSave();
        }
    }

    /**
     * Clear all state
     * @param {boolean} persist - Whether to persist to storage
     */
    clear(persist = true) {
        const oldState = this.getAll();
        this.state.clear();

        this.emit('stateCleared', { oldState });

        if (persist && this.autoSave) {
            this.scheduleSave();
        }
    }

    /**
     * Watch state changes
     * @param {string} key - State key to watch
     * @param {Function} callback - Callback function
     * @returns {Function} Unwatch function
     */
    watch(key, callback) {
        if (!this.watchers.has(key)) {
            this.watchers.set(key, new Set());
        }
        this.watchers.get(key).add(callback);

        // Return unwatch function
        return () => {
            const keyWatchers = this.watchers.get(key);
            if (keyWatchers) {
                keyWatchers.delete(callback);
                if (keyWatchers.size === 0) {
                    this.watchers.delete(key);
                }
            }
        };
    }

    /**
     * Schedule auto-save (debounced)
     * @private
     */
    scheduleSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => {
            this.saveToStorage();
        }, this.saveDelay);
    }

    /**
     * Save state to storage
     * @returns {boolean} True if successful
     */
    saveToStorage() {
        try {
            const stateObject = this.getAll();
            const success = storage.set(this.persistenceKey, stateObject);
            if (success) {
                this.emit('stateSaved', stateObject);
                logger.debug('State saved to storage');
            }
            return success;
        } catch (error) {
            logger.error('Failed to save state:', error);
            return false;
        }
    }

    /**
     * Load state from storage
     * @returns {boolean} True if successful
     */
    loadPersistedState() {
        try {
            const stateObject = storage.get(this.persistenceKey, {});
            if (stateObject && typeof stateObject === 'object') {
                this.setAll(stateObject, false);
                this.emit('stateLoaded', stateObject);
                logger.debug('State loaded from storage');
                return true;
            }
            return false;
        } catch (error) {
            logger.error('Failed to load state:', error);
            return false;
        }
    }

    /**
     * Export state as JSON
     * @returns {string} JSON string
     */
    export() {
        return JSON.stringify(this.getAll(), null, 2);
    }

    /**
     * Import state from JSON
     * @param {string} jsonString - JSON string
     * @param {boolean} merge - Whether to merge with existing state
     * @returns {boolean} True if successful
     */
    import(jsonString, merge = false) {
        try {
            const stateObject = JSON.parse(jsonString);
            if (merge) {
                this.setAll(stateObject);
            } else {
                this.clear(false);
                this.setAll(stateObject);
            }
            return true;
        } catch (error) {
            logger.error('Failed to import state:', error);
            return false;
        }
    }
}

/**
 * Application-specific state manager
 */
export class AppState extends StateManager {
    constructor() {
        super();
        this.persistenceKey = 'course_creator_state';

        // Initialize default state
        this.initializeDefaults();
    }

    /**
     * Initialize default state values
     * @private
     */
    initializeDefaults() {
        const defaults = {
            // UI State
            currentProvider: 'cloud',
            currentTheme: 'auto',
            sidebarCollapsed: false,

            // Course State
            courseName: '',
            courseDescription: '',
            masterPrompt: '',
            numChapters: 5,
            selectedLanguages: ['en'],
            chapters: [],

            // Provider Settings
            apiKeys: {},
            providerConfigs: {},

            // Editor State
            activeChapter: 0,
            editorInstances: {},

            // Generation State
            isGenerating: false,
            generationProgress: 0,
            lastGenerated: null,

            // Download State
            lastDownload: null,
            downloadHistory: []
        };

        // Only set defaults that don't already exist
        Object.entries(defaults).forEach(([key, value]) => {
            if (!this.has(key)) {
                this.set(key, value, false);
            }
        });
    }

    /**
     * Get course data
     * @returns {Object} Course data object
     */
    getCourseData() {
        return {
            name: this.get('courseName'),
            description: this.get('courseDescription'),
            masterPrompt: this.get('masterPrompt'),
            numChapters: this.get('numChapters'),
            languages: this.get('selectedLanguages'),
            chapters: this.get('chapters')
        };
    }

    /**
     * Set course data
     * @param {Object} courseData - Course data object
     */
    setCourseData(courseData) {
        const updates = {
            courseName: courseData.name || '',
            courseDescription: courseData.description || '',
            masterPrompt: courseData.masterPrompt || '',
            numChapters: courseData.numChapters || 5,
            selectedLanguages: courseData.languages || ['en'],
            chapters: courseData.chapters || []
        };
        this.setAll(updates);
    }

    /**
     * Add or update chapter
     * @param {number} index - Chapter index
     * @param {Object} chapterData - Chapter data
     */
    setChapter(index, chapterData) {
        const chapters = [...this.get('chapters', [])];
        chapters[index] = { ...chapters[index], ...chapterData };
        this.set('chapters', chapters);
    }

    /**
     * Remove chapter
     * @param {number} index - Chapter index
     */
    removeChapter(index) {
        const chapters = this.get('chapters', []);
        chapters.splice(index, 1);
        this.set('chapters', chapters);
    }

    /**
     * Clear course data
     */
    clearCourse() {
        this.setAll({
            courseName: '',
            courseDescription: '',
            masterPrompt: '',
            chapters: [],
            activeChapter: 0,
            editorInstances: {}
        });
    }

    /**
     * Get provider configuration
     * @param {string} provider - Provider name
     * @returns {Object} Provider config
     */
    getProviderConfig(provider) {
        const configs = this.get('providerConfigs', {});
        return configs[provider] || {};
    }

    /**
     * Set provider configuration
     * @param {string} provider - Provider name
     * @param {Object} config - Provider config
     */
    setProviderConfig(provider, config) {
        const configs = { ...this.get('providerConfigs', {}) };
        configs[provider] = { ...configs[provider], ...config };
        this.set('providerConfigs', configs);
    }

    /**
     * Get API key for provider
     * @param {string} provider - Provider name
     * @returns {string|null} API key
     */
    getApiKey(provider) {
        const keys = this.get('apiKeys', {});
        return keys[provider] || null;
    }

    /**
     * Set API key for provider (stored in session storage for security)
     * @param {string} provider - Provider name
     * @param {string} key - API key
     */
    setApiKey(provider, key) {
        // Store in memory state
        const keys = { ...this.get('apiKeys', {}) };
        keys[provider] = key;
        this.set('apiKeys', keys, false); // Don't persist API keys

        // Store in session storage for this session only
        try {
            const sessionKeys = JSON.parse(sessionStorage.getItem('courseCreatorApiKeys') || '{}');
            sessionKeys[provider] = key;
            sessionStorage.setItem('courseCreatorApiKeys', JSON.stringify(sessionKeys));
        } catch (error) {
            logger.error('Failed to store API key in session storage:', error);
        }
    }

    /**
     * Load API keys from session storage
     */
    loadApiKeys() {
        try {
            const sessionKeys = JSON.parse(sessionStorage.getItem('courseCreatorApiKeys') || '{}');
            this.set('apiKeys', sessionKeys, false);
        } catch (error) {
            logger.error('Failed to load API keys from session storage:', error);
        }
    }

    /**
     * Clear API keys
     */
    clearApiKeys() {
        this.set('apiKeys', {}, false);
        try {
            sessionStorage.removeItem('courseCreatorApiKeys');
        } catch (error) {
            logger.error('Failed to clear API keys from session storage:', error);
        }
    }
}

// Create global state instance
export const appState = new AppState();

// Export legacy functions for compatibility
export function initState(dom, state, ui) {
    // Load API keys from session storage
    appState.loadApiKeys();

    // Set up state watchers for UI updates
    appState.watch('courseName', (value) => {
        if (dom.courseNameInput) {
            dom.courseNameInput.value = value;
        }
    });

    appState.watch('courseDescription', (value) => {
        if (dom.courseDescTextarea) {
            dom.courseDescTextarea.value = value;
        }
    });

    appState.watch('masterPrompt', (value) => {
        if (dom.masterPromptTextarea) {
            dom.masterPromptTextarea.value = value;
        }
    });

    appState.watch('numChapters', (value) => {
        if (dom.numChaptersSelect) {
            dom.numChaptersSelect.value = value;
        }
    });

    logger.info('State management initialized');
}

export function saveState() {
    const dom = window.courseCreatorDom || {};

    // Save form data to state
    if (dom.courseNameInput) {
        appState.set('courseName', dom.courseNameInput.value);
    }
    if (dom.courseDescTextarea) {
        appState.set('courseDescription', dom.courseDescTextarea.value);
    }
    if (dom.masterPromptTextarea) {
        appState.set('masterPrompt', dom.masterPromptTextarea.value);
    }
    if (dom.numChaptersSelect) {
        appState.set('numChapters', parseInt(dom.numChaptersSelect.value));
    }

    // Save chapters data
    const chapters = [];
    const chapterElements = dom.chapterContentContainer?.children || [];
    for (let i = 0; i < chapterElements.length; i++) {
        const titleInput = chapterElements[i].querySelector('.chapter-title');
        const editorInstance = window.UI?.editorInstances?.[`chapter-${i}`];

        chapters.push({
            title: titleInput?.value || '',
            content: editorInstance?.content || ''
        });
    }
    appState.set('chapters', chapters);

    logger.debug('State saved');
}

export function loadState() {
    const dom = window.courseCreatorDom || {};

    // Load form data from state
    if (dom.courseNameInput) {
        dom.courseNameInput.value = appState.get('courseName', '');
    }
    if (dom.courseDescTextarea) {
        dom.courseDescTextarea.value = appState.get('courseDescription', '');
    }
    if (dom.masterPromptTextarea) {
        dom.masterPromptTextarea.value = appState.get('masterPrompt', '');
    }
    if (dom.numChaptersSelect) {
        dom.numChaptersSelect.value = appState.get('numChapters', 5);
    }

    // Load chapters
    const chapters = appState.get('chapters', []);
    if (chapters.length > 0 && window.UI) {
        // Clear existing chapters
        if (dom.chapterContentContainer) {
            dom.chapterContentContainer.innerHTML = '';
        }

        // Add chapters
        chapters.forEach((chapter, index) => {
            window.UI.addChapter();
            const titleInput = dom.chapterContentContainer?.querySelector(`#chapter-${index} .chapter-title`);
            if (titleInput) {
                titleInput.value = chapter.title || '';
            }

            // Set editor content after a delay to ensure editor is ready
            setTimeout(() => {
                const editorInstance = window.UI.editorInstances?.[`chapter-${index}`];
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
            }, 100);
        });
    }

    logger.debug('State loaded');
}

export function clearState() {
    if (confirm('Are you sure you want to clear all form data and start over?')) {
        appState.clearCourse();

        // Clear form
        const dom = window.courseCreatorDom || {};
        if (dom.courseForm) {
            dom.courseForm.reset();
        }

        // Clear chapters
        if (dom.chapterContentContainer) {
            dom.chapterContentContainer.innerHTML = '';
        }
        if (dom.chapterTabsContainer) {
            dom.chapterTabsContainer.innerHTML = '';
        }

        // Add default chapter
        if (window.UI) {
            window.UI.addChapter();
        }

        logger.info('State cleared');
    }
}