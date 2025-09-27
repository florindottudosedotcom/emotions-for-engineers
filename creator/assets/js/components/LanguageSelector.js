/**
 * Language Selector Component - Following CLAUDE.md Guidelines
 * Reusable language selection grid for course and slides creators
 */

import { DOM, Events } from '../core/dom.js';
import { logger } from '../core/utils.js';
import { templateEngine } from '../core/TemplateEngine.js';

export class LanguageSelector {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = null;
        this.options = {
            title: 'Course Languages',
            description: 'Select languages for translation',
            defaultLanguage: 'en',
            ...options
        };
        this.selectedLanguages = new Set([this.options.defaultLanguage]);
        this.isInitialized = false;
    }

    /**
     * Get available languages configuration
     */
    getLanguageConfig() {
        return [
            { code: 'en', name: 'English', flag: 'us.png', isDefault: true },
            { code: 'de', name: 'German', flag: 'de.png' },
            { code: 'zh', name: 'Mandarin Chinese', flag: 'cn.png' },
            { code: 'es', name: 'Spanish', flag: 'es.png' },
            { code: 'hi', name: 'Hindi', flag: 'in.png' },
            { code: 'pt', name: 'Portuguese', flag: 'pt.png' },
            { code: 'ru', name: 'Russian', flag: 'ru.png' },
            { code: 'ja', name: 'Japanese', flag: 'jp.png' },
            { code: 'fr', name: 'French', flag: 'fr.png' },
            { code: 'it', name: 'Italian', flag: 'it.png' },
            { code: 'ro', name: 'Romanian', flag: 'ro.png' }
        ];
    }

    /**
     * Get template data for rendering
     */
    getTemplateData() {
        return {
            title: this.options.title,
            description: this.options.description,
            languages: this.getLanguageConfig()
        };
    }

    /**
     * Generate HTML template for the language selector
     */
    async getTemplate() {
        const templateData = this.getTemplateData();
        return await templateEngine.loadTemplate('components/language-selector.html', templateData);
    }

    /**
     * Initialize the language selector
     */
    async init() {
        try {
            this.container = DOM.query(`#${this.containerId}`);
            if (!this.container) {
                throw new Error(`Container #${this.containerId} not found`);
            }

            // Inject HTML template
            this.container.innerHTML = await this.getTemplate();

            // Setup event listeners
            this.setupEventListeners();

            // Load saved state
            this.loadState();

            this.isInitialized = true;
            logger.info('LanguageSelector initialized');
        } catch (error) {
            logger.error('Failed to initialize LanguageSelector:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners for language selection
     */
    setupEventListeners() {
        Events.on(this.container, 'change', 'input[name="languages"]', (e) => {
            const checkbox = e.target;
            const langCode = checkbox.value;

            if (checkbox.checked) {
                this.selectedLanguages.add(langCode);
            } else {
                // Don't allow unchecking the default language
                if (langCode === this.options.defaultLanguage) {
                    checkbox.checked = true;
                    this.showMessage('Cannot unselect the default language', 'warning');
                    return;
                }
                this.selectedLanguages.delete(langCode);
            }

            // Emit change event
            this.emit('languageSelectionChanged', {
                selectedLanguages: Array.from(this.selectedLanguages),
                addedLanguage: checkbox.checked ? langCode : null,
                removedLanguage: !checkbox.checked ? langCode : null
            });

            // Save state
            this.saveState();
        });
    }

    /**
     * Get currently selected languages
     */
    getSelectedLanguages() {
        return Array.from(this.selectedLanguages);
    }

    /**
     * Set selected languages programmatically
     */
    setSelectedLanguages(languageCodes) {
        // Ensure default language is always included
        const languages = new Set([this.options.defaultLanguage, ...languageCodes]);

        this.selectedLanguages = languages;
        this.updateUI();
        this.saveState();
    }

    /**
     * Update UI to reflect current selection
     */
    updateUI() {
        const checkboxes = this.container.querySelectorAll('input[name="languages"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.selectedLanguages.has(checkbox.value);
        });
    }

    /**
     * Save state to localStorage
     */
    saveState() {
        try {
            const state = {
                selectedLanguages: Array.from(this.selectedLanguages)
            };
            localStorage.setItem(`languageSelector_${this.containerId}`, JSON.stringify(state));
        } catch (error) {
            logger.warn('Failed to save language selector state:', error);
        }
    }

    /**
     * Load state from localStorage
     */
    loadState() {
        try {
            const savedState = localStorage.getItem(`languageSelector_${this.containerId}`);
            if (savedState) {
                const state = JSON.parse(savedState);
                if (state.selectedLanguages) {
                    this.setSelectedLanguages(state.selectedLanguages);
                }
            }
        } catch (error) {
            logger.warn('Failed to load language selector state:', error);
        }
    }

    /**
     * Get language data for form submission
     */
    getFormData() {
        return {
            languages: this.getSelectedLanguages(),
            languageNames: this.getSelectedLanguages().map(code => {
                const lang = this.getLanguageConfig().find(l => l.code === code);
                return lang ? lang.name : code;
            })
        };
    }

    /**
     * Simple event emitter for component communication
     */
    emit(eventName, data) {
        const event = new CustomEvent(`languageSelector:${eventName}`, {
            detail: data,
            bubbles: true
        });
        this.container.dispatchEvent(event);
    }

    /**
     * Show temporary message to user
     */
    showMessage(message, type = 'info') {
        const messageDiv = DOM.create('div', {
            className: `status-display status-${type} show`,
            style: 'position: fixed; top: 20px; right: 20px; z-index: 1000; max-width: 400px;'
        }, message);

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    /**
     * Destroy the component and cleanup
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.selectedLanguages.clear();
        this.isInitialized = false;
        logger.info('LanguageSelector destroyed');
    }
}