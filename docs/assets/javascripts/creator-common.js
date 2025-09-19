/**
 * Creator Common Utilities
 *
 * Shared utilities between course and slide creators.
 * This integrates the optimized course creator utilities with slide functionality.
 */

/**
 * Common DOM manipulation utilities
 */
class CreatorCommon {
    constructor() {
        this.initialized = false;
        this.init();
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        console.log('CreatorCommon initialized');
    }

    /**
     * Show success message to user
     */
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    /**
     * Show error message to user
     */
    showError(message) {
        this.showToast(message, 'error');
    }

    /**
     * Show warning message to user
     */
    showWarning(message) {
        this.showToast(message, 'warning');
    }

    /**
     * Show info message to user
     */
    showInfo(message) {
        this.showToast(message, 'info');
    }

    /**
     * Display toast notification
     */
    showToast(message, type = 'info') {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.creator-toast');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `creator-toast toast-${type}`;

        const colors = {
            success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
            error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
            warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' },
            info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' }
        };

        const color = colors[type] || colors.info;

        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color.bg};
            border: 1px solid ${color.border};
            color: ${color.text};
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            font-size: 14px;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;

        // Add slide-in animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        toast.textContent = message;
        document.body.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    /**
     * Safely create DOM element
     */
    createElement(tagName, attributes = {}, textContent = '') {
        const element = document.createElement(tagName);

        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else {
                element.setAttribute(key, value);
            }
        });

        if (textContent) {
            element.textContent = textContent;
        }

        return element;
    }

    /**
     * Safely set element content
     */
    setElementContent(element, content) {
        if (!element) return;
        element.textContent = content;
    }

    /**
     * Safely get element by ID
     */
    getElementById(id) {
        return document.getElementById(id);
    }

    /**
     * Safely query selector
     */
    querySelector(selector) {
        return document.querySelector(selector);
    }

    /**
     * Safely query all selectors
     */
    querySelectorAll(selector) {
        return document.querySelectorAll(selector);
    }

    /**
     * Debounce function for performance
     */
    debounce(func, wait) {
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
     * Throttle function for performance
     */
    throttle(func, limit) {
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
     * Save data to localStorage safely
     */
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
            return false;
        }
    }

    /**
     * Load data from localStorage safely
     */
    loadFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
            return null;
        }
    }

    /**
     * Remove data from localStorage safely
     */
    removeFromLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Failed to remove from localStorage:', error);
            return false;
        }
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Download data as file
     */
    downloadAsFile(content, filename, mimeType = 'application/octet-stream') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showSuccess('Copied to clipboard');
            return true;
        } catch (error) {
            console.warn('Failed to copy to clipboard:', error);
            this.showError('Failed to copy to clipboard');
            return false;
        }
    }

    /**
     * Validate URL
     */
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * Sanitize filename
     */
    sanitizeFilename(filename) {
        return filename.replace(/[^a-z0-9.-]/gi, '_').replace(/_+/g, '_');
    }

    /**
     * Generate unique ID
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Wait for element to appear in DOM
     */
    waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }

    /**
     * Add CSS to document
     */
    addCSS(cssText) {
        const style = document.createElement('style');
        style.textContent = cssText;
        document.head.appendChild(style);
        return style;
    }

    /**
     * Escape HTML for safe display
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Parse JSON safely
     */
    parseJSON(jsonString) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('Failed to parse JSON:', error);
            return null;
        }
    }

    /**
     * Check if element is visible
     */
    isElementVisible(element) {
        return element && element.offsetParent !== null;
    }

    /**
     * Scroll element into view smoothly
     */
    scrollIntoView(element, options = {}) {
        if (element && element.scrollIntoView) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                ...options
            });
        }
    }

    /**
     * Create progress indicator
     */
    createProgressIndicator(container, options = {}) {
        const config = {
            text: 'Loading...',
            showPercentage: true,
            ...options
        };

        const progressContainer = this.createElement('div', {
            className: 'progress-container',
            style: {
                padding: '20px',
                textAlign: 'center',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                margin: '10px 0'
            }
        });

        const progressBar = this.createElement('div', {
            className: 'progress-bar',
            style: {
                width: '100%',
                height: '8px',
                backgroundColor: '#e9ecef',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '10px'
            }
        });

        const progressFill = this.createElement('div', {
            className: 'progress-fill',
            style: {
                width: '0%',
                height: '100%',
                backgroundColor: '#007bff',
                transition: 'width 0.3s ease'
            }
        });

        const progressText = this.createElement('div', {
            className: 'progress-text',
            style: {
                fontSize: '14px',
                color: '#666'
            }
        }, config.text);

        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(progressText);

        if (container) {
            container.appendChild(progressContainer);
        }

        return {
            element: progressContainer,
            update: (percentage, text) => {
                progressFill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
                if (text !== undefined) {
                    progressText.textContent = text;
                }
                if (config.showPercentage) {
                    progressText.textContent += ` (${Math.round(percentage)}%)`;
                }
            },
            complete: (text = 'Complete!') => {
                progressFill.style.width = '100%';
                progressFill.style.backgroundColor = '#28a745';
                progressText.textContent = text;
            },
            error: (text = 'Error occurred') => {
                progressFill.style.backgroundColor = '#dc3545';
                progressText.textContent = text;
                progressText.style.color = '#dc3545';
            },
            remove: () => {
                if (progressContainer.parentNode) {
                    progressContainer.parentNode.removeChild(progressContainer);
                }
            }
        };
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.common = new CreatorCommon();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CreatorCommon;
}