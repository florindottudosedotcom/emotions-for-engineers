let dom = {};
let chapterCount = 0;
let stateModule = null;
const editorInstances = {};

function showSettingsModal() {
    dom.settingsModal.classList.add('visible');
}

function hideSettingsModal() {
    dom.settingsModal.classList.remove('visible');
}

function showHelpModal() {
    dom.helpModal.classList.add('visible');
}

function hideHelpModal() {
    dom.helpModal.classList.remove('visible');
}

function showOverwriteConfirmModal() {
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

function logDebug(message) {
    const logArea = document.getElementById('debug-log');
    if (logArea) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${timestamp}] ${message}`;
        logArea.appendChild(logEntry);
        logArea.scrollTop = logArea.scrollHeight; // Auto-scroll to bottom
    }
}

function initUI(domElements, stateModuleRef = null) {
    dom = domElements;
    stateModule = stateModuleRef;
    // The new debug buttons might not exist on all pages
    if (dom.toggleDebugBtn) {
        dom.toggleDebugBtn.addEventListener('click', () => {
            const fieldset = document.getElementById('debug-fieldset');
            if (fieldset) {
                fieldset.style.display = fieldset.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
    if (dom.clearLogBtn) {
        dom.clearLogBtn.addEventListener('click', () => {
            const logArea = document.getElementById('debug-log');
            if (logArea) {
                logArea.innerHTML = '';
            }
        });
    }
}

function addChapter() {
    chapterCount++;
    const chapterId = chapterCount;

    // Create Tab Button
    const tabButton = document.createElement('button');
    tabButton.type = 'button'; // Explicitly set type to prevent form submission
    tabButton.className = 'tab-link';
    tabButton.textContent = `Chapter ${chapterId}`;
    tabButton.dataset.chapterId = chapterId;
    tabButton.title = `Switch to Chapter ${chapterId}`; // Add tooltip
    dom.chapterTabsContainer.appendChild(tabButton);

    // Create Content Pane
    const chapterDiv = document.createElement('div');
    chapterDiv.className = 'chapter-content';
    chapterDiv.id = `chapter-content-${chapterId}`;
    chapterDiv.style.display = 'none'; // Initially hidden
    chapterDiv.innerHTML = `
        <div class="chapter">
            <div class="chapter-header">
                <h3>Chapter ${chapterId}</h3>
                <button type="button" class="btn btn-danger remove-chapter-btn" data-chapter-id="${chapterId}">Remove</button>
            </div>
            <label for="chapter-title-${chapterId}">Chapter Title</label>
            <input type="text" id="chapter-title-${chapterId}" name="chapter-title-${chapterId}" class="chapter-title" placeholder="e.g., Getting Started" required>
            <div class="editor-label">Chapter Content</div>
            <iframe id="editor-iframe-${chapterId}" class="editor-iframe" src="slides/editor_iframe.html?id=${chapterId}" title="Chapter ${chapterId} Content Editor"></iframe>
        </div>
    `;
    dom.chapterContentContainer.appendChild(chapterDiv);

    // Event Listener for the new tab
    tabButton.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent any form submission
        e.stopPropagation(); // Stop event bubbling

        // Deactivate all tabs and hide all content
        dom.chapterTabsContainer.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
        dom.chapterContentContainer.querySelectorAll('.chapter-content').forEach(content => content.style.display = 'none');

        // Activate the clicked tab and show its content
        tabButton.classList.add('active');
        chapterDiv.style.display = 'block';

        // Save state to preserve active tab
        if (stateModule && stateModule.saveState) {
            stateModule.saveState();
        }
    });

    // Deactivate all other tabs and hide content
    dom.chapterTabsContainer.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
    dom.chapterContentContainer.querySelectorAll('.chapter-content').forEach(content => content.style.display = 'none');

    // Activate the new tab and show its content
    tabButton.classList.add('active');
    chapterDiv.style.display = 'block';
    console.log(`Chapter ${chapterId} created and activated`, {
        tabButton: tabButton,
        chapterDiv: chapterDiv,
        isActive: tabButton.classList.contains('active'),
        isVisible: chapterDiv.style.display
    });

    // Iframe and editor instance setup
    const iframe = document.getElementById(`editor-iframe-${chapterId}`);
    editorInstances[chapterId] = { content: '', isReady: false, iframe: iframe };

    // Remove logic
    chapterDiv.querySelector('.remove-chapter-btn').addEventListener('click', () => {
        // Complex logic to remove a tab and its content, and switch to another tab.
        // For now, let's just remove them.
        delete editorInstances[chapterId];
        chapterDiv.remove();
        tabButton.remove();
        // Potentially activate the first tab if it exists
        const firstTab = dom.chapterTabsContainer.querySelector('.tab-link');
        if (firstTab) {
            firstTab.click();
        }
    });
}

function updateAiStatus(message, type = 'info') {
    dom.aiStatus.style.display = message ? 'block' : 'none';
    dom.aiStatus.textContent = message;
    // Here you could add classes based on type for different colors (e.g., 'status-error', 'status-success')
}

// New status display functions for the three separate status fields
function updateConnectionStatus(message, type = 'info') {
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
        updateStatusDisplay(statusEl, message, type);
    }
}

function updateGenerationStatus(message, type = 'info') {
    const statusEl = document.getElementById('generation-status');
    if (statusEl) {
        updateStatusDisplay(statusEl, message, type);
    }
}

function updateFileGenerationStatus(message, type = 'info') {
    const statusEl = document.getElementById('file-generation-status');
    if (statusEl) {
        updateStatusDisplay(statusEl, message, type);
    }
}

function updateStatusDisplay(element, message, type = 'info') {
    if (!message) {
        element.classList.remove('show', 'status-info', 'status-success', 'status-warning', 'status-error');
        element.textContent = '';
        return;
    }

    element.textContent = message;
    element.classList.remove('status-info', 'status-success', 'status-warning', 'status-error');
    element.classList.add('show', `status-${type}`);
}

function updateOllamaStatus(message, type = 'info') {
    dom.ollamaStatus.textContent = message;
    const typeToClassMap = {
        info: 'ollama-status-info',
        ok: 'ollama-status-ok',
        error: 'ollama-status-error',
        default: ''
    };
    dom.ollamaStatus.className = `ollama-status-style ${typeToClassMap[type] || ''}`;
}


function resetChapterCount() {
    chapterCount = 0;
}

export {
    showSettingsModal,
    hideSettingsModal,
    showHelpModal,
    hideHelpModal,
    showOverwriteConfirmModal,
    addChapter,
    updateAiStatus,
    updateConnectionStatus,
    updateGenerationStatus,
    updateFileGenerationStatus,
    updateOllamaStatus,
    logDebug,
    initUI,
    editorInstances,
    resetChapterCount
};
