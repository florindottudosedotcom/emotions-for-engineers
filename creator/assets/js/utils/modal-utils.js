/**
 * Modal Utilities - Following CLAUDE.md Guidelines
 * Standalone modal management functions extracted from legacy ui.js
 */

/**
 * Show settings modal
 */
export function showSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        settingsModal.classList.add('visible');
    }
}

/**
 * Hide settings modal
 */
export function hideSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        settingsModal.classList.remove('visible');
    }
}

/**
 * Show help modal
 */
export function showHelpModal() {
    const helpModal = document.getElementById('help-modal');
    if (helpModal) {
        helpModal.classList.add('visible');
    }
}

/**
 * Hide help modal
 */
export function hideHelpModal() {
    const helpModal = document.getElementById('help-modal');
    if (helpModal) {
        helpModal.classList.remove('visible');
    }
}

/**
 * Show overwrite confirmation modal
 * @returns {Promise<boolean>} Promise that resolves to true if user confirms, false if cancelled
 */
export function showOverwriteConfirmModal() {
    return new Promise((resolve) => {
        const modal = document.getElementById('overwrite-modal');
        const yesBtn = document.getElementById('overwrite-yes-btn');
        const cancelBtn = document.getElementById('overwrite-cancel-btn');

        if (!modal || !yesBtn || !cancelBtn) {
            resolve(true); // Failsafe: if modal doesn't exist, act as if user confirmed.
            return;
        }

        const cleanup = () => {
            // Re-clone the buttons to remove the event listeners
            yesBtn.replaceWith(yesBtn.cloneNode(true));
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));
            modal.classList.remove('visible');
        };

        yesBtn.addEventListener('click', () => {
            cleanup();
            resolve(true);
        }, { once: true });

        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(false);
        }, { once: true });

        modal.classList.add('visible');
    });
}

/**
 * Make modal utility functions available globally for backward compatibility
 */
if (typeof window !== 'undefined') {
    window.showSettingsModal = showSettingsModal;
    window.hideSettingsModal = hideSettingsModal;
    window.showHelpModal = showHelpModal;
    window.hideHelpModal = hideHelpModal;
    window.showOverwriteConfirmModal = showOverwriteConfirmModal;
}