/**
 * Loading Manager - Provides loading states and progress indication
 * Following CLAUDE.md security and performance guidelines
 */

export class LoadingManager {
    constructor() {
        this.loadingStates = new Map();
        this.progressElements = new Map();
        this.loadingOverlay = null;
    }

    /**
     * Show loading state for a specific component
     */
    showLoading(componentId, message = 'Loading...', options = {}) {
        const {
            showProgress = false,
            progressMax = 100,
            showOverlay = false,
            container = null
        } = options;

        // Create loading state object
        const loadingState = {
            id: componentId,
            message,
            startTime: Date.now(),
            progress: 0,
            progressMax,
            showProgress
        };

        this.loadingStates.set(componentId, loadingState);

        // Create loading UI
        if (showOverlay) {
            this.createLoadingOverlay(message);
        } else if (container) {
            this.createLoadingIndicator(container, componentId, message, showProgress);
        }

        return {
            updateProgress: (progress) => this.updateProgress(componentId, progress),
            updateMessage: (newMessage) => this.updateMessage(componentId, newMessage),
            finish: () => this.hideLoading(componentId)
        };
    }

    /**
     * Create loading overlay for full page loading
     */
    createLoadingOverlay(message) {
        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
        }

        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.className = 'loading-overlay';
        this.loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-message">${this.escapeHtml(message)}</div>
            </div>
        `;

        document.body.appendChild(this.loadingOverlay);
    }

    /**
     * Create loading indicator for specific container
     */
    createLoadingIndicator(container, componentId, message, showProgress) {
        const loadingElement = document.createElement('div');
        loadingElement.className = 'loading-indicator';
        loadingElement.setAttribute('data-loading-id', componentId);

        const progressHtml = showProgress ? `
            <div class="loading-progress">
                <div class="loading-progress-bar">
                    <div class="loading-progress-fill" data-progress="0"></div>
                </div>
                <div class="loading-progress-text">0%</div>
            </div>
        ` : '';

        loadingElement.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-message">${this.escapeHtml(message)}</div>
                ${progressHtml}
            </div>
        `;

        // Replace container content with loading indicator
        const originalContent = container.innerHTML;
        container.setAttribute('data-original-content', originalContent);
        container.innerHTML = '';
        container.appendChild(loadingElement);

        this.progressElements.set(componentId, loadingElement);
    }

    /**
     * Update progress for a loading component
     */
    updateProgress(componentId, progress) {
        const loadingState = this.loadingStates.get(componentId);
        if (!loadingState) return;

        loadingState.progress = Math.min(progress, loadingState.progressMax);
        const percentage = Math.round((loadingState.progress / loadingState.progressMax) * 100);

        const element = this.progressElements.get(componentId);
        if (element) {
            const progressFill = element.querySelector('.loading-progress-fill');
            const progressText = element.querySelector('.loading-progress-text');

            if (progressFill) {
                progressFill.style.setProperty('--progress-width', `${percentage}%`);
                progressFill.setAttribute('data-progress', percentage);
            }
            if (progressText) {
                progressText.textContent = `${percentage}%`;
            }
        }
    }

    /**
     * Update message for a loading component
     */
    updateMessage(componentId, message) {
        const loadingState = this.loadingStates.get(componentId);
        if (!loadingState) return;

        loadingState.message = message;

        const element = this.progressElements.get(componentId);
        if (element) {
            const messageElement = element.querySelector('.loading-message');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }

        if (this.loadingOverlay) {
            const overlayMessage = this.loadingOverlay.querySelector('.loading-message');
            if (overlayMessage) {
                overlayMessage.textContent = message;
            }
        }
    }

    /**
     * Hide loading state
     */
    hideLoading(componentId) {
        const loadingState = this.loadingStates.get(componentId);
        if (!loadingState) return;

        const element = this.progressElements.get(componentId);
        if (element && element.parentNode) {
            const container = element.parentNode;
            const originalContent = container.getAttribute('data-original-content');

            if (originalContent) {
                container.innerHTML = originalContent;
                container.removeAttribute('data-original-content');
            } else {
                element.remove();
            }
        }

        this.loadingStates.delete(componentId);
        this.progressElements.delete(componentId);

        // Remove overlay if this was the last loading state
        if (this.loadingStates.size === 0 && this.loadingOverlay) {
            this.loadingOverlay.remove();
            this.loadingOverlay = null;
        }
    }

    /**
     * Hide all loading states
     */
    hideAllLoading() {
        const componentIds = Array.from(this.loadingStates.keys());
        componentIds.forEach(id => this.hideLoading(id));

        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
            this.loadingOverlay = null;
        }
    }

    /**
     * Show loading for async operation with automatic cleanup
     */
    async withLoading(componentId, asyncFn, options = {}) {
        const controller = this.showLoading(componentId, options.message, options);

        try {
            const result = await asyncFn(controller);
            controller.finish();
            return result;
        } catch (error) {
            controller.finish();
            throw error;
        }
    }

    /**
     * Track multiple async operations with combined progress
     */
    async trackMultipleOperations(componentId, operations, options = {}) {
        const controller = this.showLoading(componentId, options.message || 'Loading...', {
            ...options,
            showProgress: true,
            progressMax: operations.length
        });

        const results = [];

        try {
            for (let i = 0; i < operations.length; i++) {
                const operation = operations[i];

                if (operation.message) {
                    controller.updateMessage(operation.message);
                }

                const result = await operation.fn();
                results.push(result);

                controller.updateProgress(i + 1);
            }

            controller.finish();
            return results;
        } catch (error) {
            controller.finish();
            throw error;
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get current loading states (for debugging)
     */
    getLoadingStates() {
        return Array.from(this.loadingStates.entries()).map(([id, state]) => ({
            id,
            message: state.message,
            progress: state.progress,
            duration: Date.now() - state.startTime
        }));
    }
}

// Global instance
export const loadingManager = new LoadingManager();

// Add CSS for loading states
const loadingCSS = `
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(2px);
}

.loading-content {
    text-align: center;
    color: white;
    padding: 2rem;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.9);
    max-width: 300px;
}

.loading-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: var(--bg-secondary, #f8f9fa);
    border-radius: 8px;
    min-height: 120px;
}

.loading-indicator .loading-content {
    background: transparent;
    color: var(--text-primary, #333);
    padding: 0;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-primary, #e2e8f0);
    border-top: 3px solid var(--color-primary, #2563eb);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem auto;
}

.loading-message {
    font-weight: 500;
    margin-bottom: 1rem;
    font-size: 0.9rem;
}

.loading-progress {
    margin-top: 1rem;
}

.loading-progress-bar {
    width: 200px;
    height: 4px;
    background: var(--border-primary, #e2e8f0);
    border-radius: 2px;
    overflow: hidden;
    margin: 0 auto 0.5rem auto;
}

.loading-progress-fill {
    height: 100%;
    background: var(--color-primary, #2563eb);
    transition: width 0.3s ease;
}

.loading-progress-text {
    font-size: 0.8rem;
    color: var(--text-secondary, #666);
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@media (prefers-color-scheme: dark) {
    .loading-indicator {
        background: var(--bg-secondary, #1e293b);
    }

    .loading-indicator .loading-content {
        color: var(--text-primary, #f8fafc);
    }
}
`;

// Inject CSS if not already present
if (!document.querySelector('#loading-manager-styles')) {
    const style = document.createElement('style');
    style.id = 'loading-manager-styles';
    style.textContent = loadingCSS;
    document.head.appendChild(style);
}