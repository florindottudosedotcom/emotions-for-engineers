/**
 * Konva Editor Component - Following CLAUDE.md Guidelines
 * Integrates with KonvaSlideSystem for full accordion interface
 */

import { DOM, Events } from '../core/dom.js';
import { logger } from '../core/utils.js';

export class KonvaEditor {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = null;
        this.options = {
            width: 1000,
            height: 700,
            backgroundColor: '#ffffff',
            enableAccordion: true,
            ...options
        };
        this.konvaSlideSystem = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the Konva Editor with accordion interface
     */
    async init() {
        try {
            this.container = DOM.query(`#${this.containerId}`);
            if (!this.container) {
                throw new Error(`Container #${this.containerId} not found`);
            }

            // Prevent double initialization
            if (this.container.dataset.konvaInitialized === 'true') {
                console.warn('KonvaEditor already initialized for this container, skipping...');
                return;
            }

            // Mark as initializing
            this.container.dataset.konvaInitialized = 'true';

            // Load Konva if not already loaded
            await this.loadKonva();

            // Load KonvaSlideSystem script
            await this.loadKonvaSlideSystem();

            // Initialize the accordion-based slide system
            await this.initializeKonvaSlideSystem();

            this.isInitialized = true;
            logger.info('KonvaEditor with accordion interface initialized');
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
     * Load KonvaSlideSystem script
     */
    async loadKonvaSlideSystem() {
        if (window.KonvaSlideSystem) {
            return;
        }

        // Check if script exists, if not create it
        let slideSystemScript = document.querySelector('#konva-slide-system-script');
        if (!slideSystemScript) {
            slideSystemScript = DOM.create('script', {
                id: 'konva-slide-system-script',
                src: './assets/js/konva-slide-system.js'
            });
            document.head.appendChild(slideSystemScript);
        }

        return new Promise((resolve, reject) => {
            if (window.KonvaSlideSystem) {
                resolve();
                return;
            }

            slideSystemScript.onload = () => {
                logger.info('KonvaSlideSystem loaded successfully');
                resolve();
            };

            slideSystemScript.onerror = () => {
                reject(new Error('Failed to load KonvaSlideSystem'));
            };
        });
    }

    /**
     * Initialize the KonvaSlideSystem with accordion interface
     */
    async initializeKonvaSlideSystem() {
        if (!window.KonvaSlideSystem) {
            throw new Error('KonvaSlideSystem not loaded');
        }

        // Create the accordion-based slide system
        this.konvaSlideSystem = new window.KonvaSlideSystem(this.container, {
            textColor: '#000000',
            borderColor: '#60a5fa',
            fillColor: '#e6e6fa'
        });

        await this.konvaSlideSystem.init();

        // Make system globally available for compatibility
        window.konvaSlideSystem = this.konvaSlideSystem;

        logger.info('KonvaSlideSystem initialized with accordion interface');
    }

    /**
     * Get the slide system instance
     */
    getSlideSystem() {
        return this.konvaSlideSystem;
    }

    /**
     * Add a new slide
     */
    addSlide() {
        if (this.konvaSlideSystem) {
            return this.konvaSlideSystem.addSlide();
        }
    }

    /**
     * Delete current slide
     */
    deleteSlide() {
        if (this.konvaSlideSystem) {
            return this.konvaSlideSystem.deleteSlide();
        }
    }

    /**
     * Go to specific slide
     */
    goToSlide(index) {
        if (this.konvaSlideSystem) {
            return this.konvaSlideSystem.goToSlide(index);
        }
    }

    /**
     * Export as image
     */
    exportAsImage(format = 'png') {
        if (this.konvaSlideSystem) {
            return this.konvaSlideSystem.exportAsImage(format);
        }
    }

    /**
     * Get slides data
     */
    getSlidesData() {
        if (this.konvaSlideSystem) {
            return this.konvaSlideSystem.exportSlidesData();
        }
    }

    /**
     * Load slides data
     */
    loadSlidesData(data) {
        if (this.konvaSlideSystem) {
            return this.konvaSlideSystem.loadSlidesData(data);
        }
    }

    /**
     * Event emitter for compatibility
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
        if (this.konvaSlideSystem) {
            this.konvaSlideSystem.destroy();
            this.konvaSlideSystem = null;
        }

        if (this.container) {
            this.container.innerHTML = '';
        }

        // Clean up global references
        if (window.konvaSlideSystem === this.konvaSlideSystem) {
            window.konvaSlideSystem = null;
        }

        this.isInitialized = false;
        logger.info('KonvaEditor destroyed');
    }
}