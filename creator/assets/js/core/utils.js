/**
 * Utility Functions - Following CLAUDE.md Guidelines
 * Shared utility functions used across the application
 */

/**
 * Debounce function to limit expensive operations
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function to limit function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 100) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * Generate a unique ID
 * @param {string} prefix - Optional prefix
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Sanitize string for safe use in HTML
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Escape HTML characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format date in ISO format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}

/**
 * Check if device is mobile
 * @returns {boolean} True if mobile
 */
export function isMobile() {
    return window.innerWidth <= 767;
}

/**
 * Check if device is tablet
 * @returns {boolean} True if tablet
 */
export function isTablet() {
    return window.innerWidth >= 768 && window.innerWidth <= 1023;
}

/**
 * Check if device is desktop
 * @returns {boolean} True if desktop
 */
export function isDesktop() {
    return window.innerWidth >= 1024;
}

/**
 * Get viewport dimensions
 * @returns {Object} Viewport width and height
 */
export function getViewport() {
    return {
        width: window.innerWidth,
        height: window.innerHeight
    };
}

/**
 * Scroll to element smoothly
 * @param {string|Element} target - Target element or selector
 * @param {number} offset - Offset from top
 */
export function scrollTo(target, offset = 0) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (element) {
        const top = element.offsetTop - offset;
        window.scrollTo({
            top,
            behavior: 'smooth'
        });
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (fallbackErr) {
            document.body.removeChild(textArea);
            return false;
        }
    }
}

/**
 * Download data as file
 * @param {string|Blob} data - Data to download
 * @param {string} filename - Filename
 * @param {string} mimeType - MIME type
 */
export function downloadFile(data, filename, mimeType = 'application/octet-stream') {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Storage helpers with error handling
 */
export const storage = {
    /**
     * Get item from localStorage
     * @param {string} key - Storage key
     * @param {any} defaultValue - Default value if not found
     * @returns {any} Parsed value or default
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('Storage get error:', error);
            return defaultValue;
        }
    },

    /**
     * Set item in localStorage
     * @param {string} key - Storage key
     * @param {any} value - Value to store
     * @returns {boolean} True if successful
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('Storage set error:', error);
            return false;
        }
    },

    /**
     * Remove item from localStorage
     * @param {string} key - Storage key
     * @returns {boolean} True if successful
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Storage remove error:', error);
            return false;
        }
    },

    /**
     * Clear all localStorage
     * @returns {boolean} True if successful
     */
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.warn('Storage clear error:', error);
            return false;
        }
    }
};

/**
 * Session storage helpers
 */
export const sessionStorage = {
    get(key, defaultValue = null) {
        try {
            const item = window.sessionStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('Session storage get error:', error);
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            window.sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('Session storage set error:', error);
            return false;
        }
    },

    remove(key) {
        try {
            window.sessionStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Session storage remove error:', error);
            return false;
        }
    },

    clear() {
        try {
            window.sessionStorage.clear();
            return true;
        } catch (error) {
            console.warn('Session storage clear error:', error);
            return false;
        }
    }
};

/**
 * Event emitter for loosely coupled communication
 */
export class EventEmitter {
    constructor() {
        this.events = {};
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }

    /**
     * Emit event
     * @param {string} event - Event name
     * @param {any} data - Event data
     */
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Event callback error:', error);
                }
            });
        }
    }

    /**
     * Add one-time event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    once(event, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(event, onceCallback);
        };
        this.on(event, onceCallback);
    }
}

/**
 * Simple logger with levels
 */
export const logger = {
    levels: {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3
    },

    currentLevel: 2, // INFO by default

    error(...args) {
        if (this.currentLevel >= this.levels.ERROR) {
            console.error('[ERROR]', ...args);
        }
    },

    warn(...args) {
        if (this.currentLevel >= this.levels.WARN) {
            console.warn('[WARN]', ...args);
        }
    },

    info(...args) {
        if (this.currentLevel >= this.levels.INFO) {
            console.info('[INFO]', ...args);
        }
    },

    debug(...args) {
        if (this.currentLevel >= this.levels.DEBUG) {
            console.debug('[DEBUG]', ...args);
        }
    },

    setLevel(level) {
        this.currentLevel = typeof level === 'string' ? this.levels[level.toUpperCase()] : level;
    }
};

/**
 * Performance measurement utilities
 */
export const perf = {
    marks: new Map(),

    /**
     * Start performance measurement
     * @param {string} name - Measurement name
     */
    start(name) {
        this.marks.set(name, performance.now());
    },

    /**
     * End performance measurement and log result
     * @param {string} name - Measurement name
     * @returns {number} Duration in milliseconds
     */
    end(name) {
        const start = this.marks.get(name);
        if (start) {
            const duration = performance.now() - start;
            logger.debug(`Performance [${name}]: ${duration.toFixed(2)}ms`);
            this.marks.delete(name);
            return duration;
        }
        return 0;
    }
};

/**
 * Error handling utilities
 */
export const errorHandler = {
    /**
     * Global error handler
     * @param {Error} error - Error object
     * @param {string} context - Error context
     */
    handle(error, context = 'Unknown') {
        logger.error(`Error in ${context}:`, error);

        // You could extend this to send errors to a logging service
        // or show user-friendly error messages
    },

    /**
     * Wrap async function with error handling
     * @param {Function} fn - Async function to wrap
     * @param {string} context - Error context
     * @returns {Function} Wrapped function
     */
    wrapAsync(fn, context) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handle(error, context);
                throw error;
            }
        };
    }
};