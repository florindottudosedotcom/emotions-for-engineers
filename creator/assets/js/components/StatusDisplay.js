/**
 * Status Display Component - Following CLAUDE.md Guidelines
 * Standardized status and loading indicators for both creators
 */

import { DOM, Events } from '../core/dom.js';
import { logger } from '../core/utils.js';

export class StatusDisplay {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = null;
        this.options = {
            showIcon: true,
            autoHide: true,
            autoHideDelay: 5000,
            position: 'relative', // 'relative', 'fixed', 'absolute'
            ...options
        };
        this.currentStatus = null;
        this.autoHideTimer = null;
        this.isInitialized = false;
    }

    /**
     * Get status type configuration
     */
    getStatusConfig() {
        return {
            info: {
                icon: 'ℹ️',
                className: 'status-info',
                color: '#3b82f6'
            },
            success: {
                icon: '✅',
                className: 'status-success',
                color: '#10b981'
            },
            warning: {
                icon: '⚠️',
                className: 'status-warning',
                color: '#f59e0b'
            },
            error: {
                icon: '❌',
                className: 'status-error',
                color: '#ef4444'
            },
            loading: {
                icon: '🔄',
                className: 'status-loading',
                color: '#6b7280'
            }
        };
    }

    /**
     * Initialize the status display
     */
    async init() {
        try {
            this.container = DOM.query(`#${this.containerId}`);
            if (!this.container) {
                throw new Error(`Container #${this.containerId} not found`);
            }

            // Set initial classes
            DOM.addClass(this.container, 'status-display');

            // Set position if specified
            if (this.options.position === 'fixed') {
                DOM.addClass(this.container, 'status-fixed');
            }

            this.isInitialized = true;
            logger.info('StatusDisplay initialized');
        } catch (error) {
            logger.error('Failed to initialize StatusDisplay:', error);
            throw error;
        }
    }

    /**
     * Show status message
     */
    showStatus(message, type = 'info', options = {}) {
        if (!this.isInitialized) {
            logger.warn('StatusDisplay not initialized');
            return;
        }

        const config = this.getStatusConfig()[type] || this.getStatusConfig().info;
        const mergedOptions = { ...this.options, ...options };

        // Clear any existing auto-hide timer
        this.clearAutoHideTimer();

        // Build message content
        let content = '';
        if (mergedOptions.showIcon) {
            content += `<span class="status-icon">${config.icon}</span> `;
        }
        content += `<span class="status-message">${message}</span>`;

        // Update container
        this.container.innerHTML = content;
        this.container.className = `status-display ${config.className} show`;

        // Store current status
        this.currentStatus = { message, type, timestamp: Date.now() };

        // Set auto-hide timer if enabled
        if (mergedOptions.autoHide && type !== 'loading') {
            this.autoHideTimer = setTimeout(() => {
                this.hide();
            }, mergedOptions.autoHideDelay);
        }

        // Emit status change event
        this.emit('statusChanged', {
            message,
            type,
            visible: true
        });

        logger.debug(`Status displayed: ${type} - ${message}`);
    }

    /**
     * Show loading status with optional progress
     */
    showLoading(message = 'Loading...', progress = null) {
        let content = '';
        if (this.options.showIcon) {
            content += '<span class="status-icon loading-spinner">🔄</span> ';
        }
        content += `<span class="status-message">${message}</span>`;

        if (progress !== null && progress >= 0 && progress <= 100) {
            content += `
                <div class="progress-bar-container">
                    <div class="progress-bar" data-progress="${progress}"></div>
                </div>
                <span class="progress-text">${Math.round(progress)}%</span>
            `;
        }

        this.container.innerHTML = content;
        this.container.className = 'status-display status-loading show';

        // Update the progress bar width via CSS custom property after DOM update
        if (progress !== null && progress >= 0 && progress <= 100) {
            setTimeout(() => {
                const progressBar = this.container.querySelector('.progress-bar[data-progress]');
                if (progressBar) {
                    progressBar.style.setProperty('--progress-width', `${progress}%`);
                }
            }, 10);
        }

        // Add loading spinner class
        const spinner = this.container.querySelector('.loading-spinner');
        if (spinner) {
            DOM.addClass(spinner, 'loading-spinner');
        }

        this.currentStatus = { message, type: 'loading', progress, timestamp: Date.now() };

        this.emit('statusChanged', {
            message,
            type: 'loading',
            progress,
            visible: true
        });
    }

    /**
     * Update loading progress
     */
    updateProgress(progress, message = null) {
        if (this.currentStatus && this.currentStatus.type === 'loading') {
            const currentMessage = message || this.currentStatus.message;
            this.showLoading(currentMessage, progress);
        }
    }

    /**
     * Show success message
     */
    showSuccess(message, options = {}) {
        this.showStatus(message, 'success', options);
    }

    /**
     * Show error message
     */
    showError(message, options = {}) {
        this.showStatus(message, 'error', { ...options, autoHide: false });
    }

    /**
     * Show warning message
     */
    showWarning(message, options = {}) {
        this.showStatus(message, 'warning', options);
    }

    /**
     * Show info message
     */
    showInfo(message, options = {}) {
        this.showStatus(message, 'info', options);
    }

    /**
     * Hide status display
     */
    hide() {
        if (!this.isInitialized) return;

        this.clearAutoHideTimer();
        this.container.innerHTML = '';
        this.container.className = 'status-display';
        this.currentStatus = null;

        this.emit('statusChanged', {
            message: '',
            type: 'hidden',
            visible: false
        });
    }

    /**
     * Clear status after a delay
     */
    clearAfter(delay = 3000) {
        this.clearAutoHideTimer();
        this.autoHideTimer = setTimeout(() => {
            this.hide();
        }, delay);
    }

    /**
     * Clear auto-hide timer
     */
    clearAutoHideTimer() {
        if (this.autoHideTimer) {
            clearTimeout(this.autoHideTimer);
            this.autoHideTimer = null;
        }
    }

    /**
     * Get current status
     */
    getCurrentStatus() {
        return this.currentStatus;
    }

    /**
     * Check if currently showing a status
     */
    isVisible() {
        return this.currentStatus !== null;
    }

    /**
     * Check if currently showing loading
     */
    isLoading() {
        return this.currentStatus && this.currentStatus.type === 'loading';
    }

    /**
     * Toggle visibility
     */
    toggle() {
        if (this.isVisible()) {
            this.hide();
        } else {
            this.showInfo('Status display ready');
        }
    }

    /**
     * Set position programmatically
     */
    setPosition(position, coordinates = {}) {
        if (!this.container) return;

        // Remove existing position classes
        DOM.removeClass(this.container, 'status-fixed');

        if (position === 'fixed') {
            DOM.addClass(this.container, 'status-fixed');
        } else {
            this.container.style.position = position;
        }

        // Apply coordinate styles only for non-predefined positions
        if (position !== 'fixed') {
            if (coordinates.top !== undefined) {
                this.container.style.top = typeof coordinates.top === 'number' ?
                    `${coordinates.top}px` : coordinates.top;
            }
            if (coordinates.right !== undefined) {
                this.container.style.right = typeof coordinates.right === 'number' ?
                    `${coordinates.right}px` : coordinates.right;
            }
            if (coordinates.bottom !== undefined) {
                this.container.style.bottom = typeof coordinates.bottom === 'number' ?
                    `${coordinates.bottom}px` : coordinates.bottom;
            }
            if (coordinates.left !== undefined) {
                this.container.style.left = typeof coordinates.left === 'number' ?
                    `${coordinates.left}px` : coordinates.left;
            }
        }
    }

    /**
     * Create floating status notification
     */
    static createFloatingStatus(message, type = 'info', duration = 3000) {
        const config = new StatusDisplay().getStatusConfig()[type] ||
                      new StatusDisplay().getStatusConfig().info;

        const statusDiv = DOM.create('div', {
            className: `status-display ${config.className} show floating-status slide-in-right`
        });

        let content = `<span class="status-icon">${config.icon}</span> `;
        content += `<span class="status-message">${message}</span>`;
        statusDiv.innerHTML = content;

        document.body.appendChild(statusDiv);

        // Auto-remove after duration
        setTimeout(() => {
            DOM.removeClass(statusDiv, 'slide-in-right');
            DOM.addClass(statusDiv, 'slide-out-right');
            setTimeout(() => {
                if (statusDiv.parentNode) {
                    statusDiv.parentNode.removeChild(statusDiv);
                }
            }, 300);
        }, duration);

        return statusDiv;
    }

    /**
     * Simple event emitter
     */
    emit(eventName, data) {
        if (!this.container) return;

        const event = new CustomEvent(`statusDisplay:${eventName}`, {
            detail: data,
            bubbles: true
        });
        this.container.dispatchEvent(event);
    }


    /**
     * Destroy the component and cleanup
     */
    destroy() {
        this.clearAutoHideTimer();
        if (this.container) {
            this.container.innerHTML = '';
            this.container.className = 'status-display';
        }
        this.currentStatus = null;
        this.isInitialized = false;
        logger.info('StatusDisplay destroyed');
    }
}