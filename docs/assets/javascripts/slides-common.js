/**
 * Slides Common Utilities
 *
 * Shared utilities and state management for slide creator functionality.
 * Extracted from slides_main.js as part of the modular architecture optimization.
 */

// Storage keys for slides functionality
export const SLIDES_STORAGE_KEY = 'aiSlidesCreator_slides';
export const THEME_STORAGE_KEY = 'aiSlidesCreator_theme';
export const CUSTOM_COLORS_STORAGE_KEY = 'aiSlidesCreator_customColors';

// Enhanced editing flag and state
export let enhancedEditingEnabled = true;
export let konvaEditors = new Map();
export let konvaSlideSystem = null;

// Global slides application state
export const slidesAppState = {
    currentSlideData: null,
    isGenerating: false,
    currentTheme: null
};

// DOM references cache
export const slidesDom = {};

// Predefined harmonious pastel color themes
export const ORIGINAL_COLOR_THEMES = {
    lavender: {
        name: 'Lavender Dreams',
        textColor: '#4c1d95',      // Dark purple for text
        borderColor: '#8b5cf6',    // Medium purple for borders
        fillColor: '#e6e6fa',      // Light lavender for fills
        backgroundColor: '#faf5ff' // Very light background that matches
    },
    mint: {
        name: 'Mint Fresh',
        textColor: '#065f46',      // Dark green for text
        borderColor: '#10b981',    // Medium green for borders
        fillColor: '#d1f2eb',      // Light mint for fills
        backgroundColor: '#f0fdfa' // Very light background that matches
    },
    rose: {
        name: 'Rose Blush',
        textColor: '#9f1239',      // Dark rose for text
        borderColor: '#e11d48',    // Medium rose for borders
        fillColor: '#fce7f3',      // Light pink for fills
        backgroundColor: '#fdf2f8' // Very light background that matches
    },
    sky: {
        name: 'Sky Blue',
        textColor: '#1e3a8a',      // Dark blue for text
        borderColor: '#2563eb',    // Medium blue for borders
        fillColor: '#dbeafe',      // Light blue for fills
        backgroundColor: '#f0f9ff' // Very light background that matches
    },
    peach: {
        name: 'Peach Cream',
        textColor: '#9a3412',      // Dark orange for text
        borderColor: '#ea580c',    // Medium orange for borders
        fillColor: '#fed7aa',      // Light peach for fills
        backgroundColor: '#fff7ed' // Very light background that matches
    },
    sage: {
        name: 'Sage Green',
        textColor: '#14532d',      // Dark sage for text
        borderColor: '#16a34a',    // Medium sage for borders
        fillColor: '#dcfce7',      // Light sage for fills
        backgroundColor: '#f0fdf4' // Very light background that matches
    }
};

// Working copy of themes (can be modified)
export const COLOR_THEMES = {
    lavender: { ...ORIGINAL_COLOR_THEMES.lavender },
    mint: { ...ORIGINAL_COLOR_THEMES.mint },
    rose: { ...ORIGINAL_COLOR_THEMES.rose },
    sky: { ...ORIGINAL_COLOR_THEMES.sky },
    peach: { ...ORIGINAL_COLOR_THEMES.peach },
    sage: { ...ORIGINAL_COLOR_THEMES.sage }
};

// Make COLOR_THEMES globally accessible for konva-slide-system
if (typeof window !== 'undefined') {
    window.COLOR_THEMES = COLOR_THEMES;
}

/**
 * Load custom colors from localStorage
 */
export function loadCustomColors() {
    try {
        if (typeof localStorage === 'undefined') return;

        const savedColors = localStorage.getItem(CUSTOM_COLORS_STORAGE_KEY);
        if (savedColors) {
            const customColors = JSON.parse(savedColors);
            // Merge custom colors with default themes
            Object.assign(COLOR_THEMES, customColors);
        }
    } catch (error) {
        console.warn('Failed to load custom colors:', error);
    }
}

/**
 * Save custom colors to localStorage
 */
export function saveCustomColors() {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(COLOR_THEMES));
    } catch (error) {
        console.warn('Failed to save custom colors:', error);
    }
}

/**
 * Save slides data to localStorage
 */
export function saveSlides() {
    try {
        if (typeof localStorage === 'undefined') return;
        if (slidesAppState.currentSlideData) {
            localStorage.setItem(SLIDES_STORAGE_KEY, JSON.stringify(slidesAppState.currentSlideData));
        }
    } catch (error) {
        console.warn('Failed to save slides:', error);
    }
}

/**
 * Save form state to localStorage
 */
export function saveFormState() {
    try {
        if (typeof localStorage === 'undefined') return;

        const formData = {
            topic: slidesDom.topicInput?.value || '',
            language: slidesDom.languageSelect?.value || 'en',
            theme: slidesDom.themeSelect?.value || 'lavender'
        };
        localStorage.setItem('aiSlidesCreator_formState', JSON.stringify(formData));
    } catch (error) {
        console.warn('Failed to save form state:', error);
    }
}

/**
 * Load form state from localStorage
 */
export function loadFormState() {
    try {
        if (typeof localStorage === 'undefined') return;

        const savedState = localStorage.getItem('aiSlidesCreator_formState');
        if (savedState) {
            const formData = JSON.parse(savedState);

            if (slidesDom.topicInput && formData.topic) {
                slidesDom.topicInput.value = formData.topic;
            }
            if (slidesDom.languageSelect && formData.language) {
                slidesDom.languageSelect.value = formData.language;
            }
            if (slidesDom.themeSelect && formData.theme) {
                slidesDom.themeSelect.value = formData.theme;
                slidesAppState.currentTheme = formData.theme;
            }
        }
    } catch (error) {
        console.warn('Failed to load form state:', error);
    }
}

/**
 * Load saved slides from localStorage
 */
export function loadSavedSlides() {
    try {
        if (typeof localStorage === 'undefined') return null;

        const savedSlides = localStorage.getItem(SLIDES_STORAGE_KEY);
        if (savedSlides) {
            return JSON.parse(savedSlides);
        }
    } catch (error) {
        console.warn('Failed to load saved slides:', error);
    }
    return null;
}

/**
 * Clear all slides data
 */
export function clearAllSlides() {
    try {
        // Clear localStorage
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(SLIDES_STORAGE_KEY);
        }

        // Clear application state
        slidesAppState.currentSlideData = null;

        // Clear UI
        const slidesContainer = document.querySelector('.slides-container');
        if (slidesContainer) {
            slidesContainer.innerHTML = '';
        }

        // Hide export options
        const exportSection = document.querySelector('.export-options');
        if (exportSection) {
            exportSection.style.display = 'none';
        }

        // Cleanup Konva editors
        cleanupKonvaEditors();

        console.log('All slides cleared successfully');
    } catch (error) {
        console.error('Failed to clear slides:', error);
    }
}

/**
 * Clean up Konva editors
 */
export function cleanupKonvaEditors() {
    try {
        // Clean up individual Konva editors
        konvaEditors.forEach((editor, slideId) => {
            if (editor && typeof editor.destroy === 'function') {
                editor.destroy();
            }
        });
        konvaEditors.clear();

        // Clean up unified slide system
        if (konvaSlideSystem && typeof konvaSlideSystem.destroy === 'function') {
            konvaSlideSystem.destroy();
            konvaSlideSystem = null;
        }

        // Clean up global reference
        if (typeof window !== 'undefined') {
            window.konvaSlideSystem = null;
        }
    } catch (error) {
        console.warn('Error during Konva cleanup:', error);
    }
}

/**
 * Initialize enhanced editing components
 */
export async function initializeEnhancedComponents() {
    console.log('Initializing enhanced editing components...');

    try {
        // Load Konva.js editor if available
        if (typeof window !== 'undefined' && window.KonvaEditor && window.KonvaEditor.loadDependencies) {
            enhancedEditingEnabled = await window.KonvaEditor.loadDependencies();
            console.log('Enhanced editing enabled:', enhancedEditingEnabled);
        }

        // Enhanced editing is now always enabled by default
        return enhancedEditingEnabled;
    } catch (error) {
        console.warn('Enhanced editing components failed to initialize:', error);
        enhancedEditingEnabled = false;
        return false;
    }
}

/**
 * Set enhanced editing enabled state
 */
export function setEnhancedEditingEnabled(enabled) {
    enhancedEditingEnabled = enabled;
}

/**
 * Set Konva slide system reference
 */
export function setKonvaSlideSystem(system) {
    konvaSlideSystem = system;
    if (typeof window !== 'undefined') {
        window.konvaSlideSystem = system;
    }
}

/**
 * Get current theme or default
 */
export function getCurrentTheme() {
    return slidesAppState.currentTheme || 'lavender';
}

/**
 * Set current theme
 */
export function setCurrentTheme(themeName) {
    if (COLOR_THEMES[themeName]) {
        slidesAppState.currentTheme = themeName;
        // Save to localStorage
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(THEME_STORAGE_KEY, themeName);
            }
        } catch (error) {
            console.warn('Failed to save theme:', error);
        }
    }
}

/**
 * Load saved theme from localStorage
 */
export function loadSavedTheme() {
    try {
        if (typeof localStorage === 'undefined') return 'lavender';

        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && COLOR_THEMES[savedTheme]) {
            slidesAppState.currentTheme = savedTheme;
            return savedTheme;
        }
    } catch (error) {
        console.warn('Failed to load saved theme:', error);
    }
    return 'lavender';
}

/**
 * Utility to safely get DOM element
 */
export function getDomElement(id) {
    if (typeof document === 'undefined') return null;
    return document.getElementById(id);
}

/**
 * Utility to create DOM element with safety checks
 */
export function createDomElement(tagName, properties = {}) {
    if (typeof document === 'undefined') return null;

    const element = document.createElement(tagName);

    // Apply properties safely
    Object.entries(properties).forEach(([key, value]) => {
        if (key === 'textContent') {
            element.textContent = value;
        } else if (key === 'innerHTML') {
            // Security: avoid innerHTML for user content
            console.warn('Using innerHTML - ensure content is sanitized');
            element.innerHTML = value;
        } else if (key === 'className') {
            element.className = value;
        } else if (key === 'style') {
            if (typeof value === 'string') {
                element.style.cssText = value;
            } else {
                Object.assign(element.style, value);
            }
        } else {
            element.setAttribute(key, value);
        }
    });

    return element;
}

/**
 * Debounce function for performance optimization
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Show user feedback message
 */
export function showUserMessage(message, type = 'info') {
    // Use existing common utilities if available
    if (typeof window !== 'undefined' && window.common && window.common.showSuccess) {
        if (type === 'success') {
            window.common.showSuccess(message);
        } else if (type === 'error') {
            window.common.showError(message);
        } else {
            console.log(message);
        }
        return;
    }

    // Fallback to console
    console.log(`[${type.toUpperCase()}] ${message}`);
}

/**
 * Validate slide data structure
 */
export function validateSlideData(slideData) {
    if (!slideData || typeof slideData !== 'object') {
        return false;
    }

    // Check required properties
    if (!slideData.title || typeof slideData.title !== 'string') {
        return false;
    }

    if (!Array.isArray(slideData.slides)) {
        return false;
    }

    // Validate each slide
    for (const slide of slideData.slides) {
        if (!slide.title || typeof slide.title !== 'string') {
            return false;
        }
        if (!Array.isArray(slide.content)) {
            return false;
        }
    }

    return true;
}

// Initialize when module loads
if (typeof window !== 'undefined') {
    // Load custom colors and theme on module load
    loadCustomColors();
    loadSavedTheme();
}