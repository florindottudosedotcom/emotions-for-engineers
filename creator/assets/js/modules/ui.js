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
    // Only add chapters if we have the required DOM elements (course creator)
    if (!dom.chapterTabsContainer || !dom.chapterContentContainer) {
        console.log('Chapter UI elements not available - skipping addChapter (likely in slides creator)');
        return;
    }

    chapterCount++;
    const chapterId = chapterCount;

    // Create Tab Button
    const tabButton = document.createElement('button');
    tabButton.type = 'button'; // Explicitly set type to prevent form submission
    tabButton.className = 'tab-link';
    tabButton.textContent = `${chapterId}`;
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
                <button type="button" class="btn btn-danger remove-chapter-btn" data-chapter-id="${chapterId}" title="Remove Chapter ${chapterId}">Remove</button>
            </div>
            <input type="text" id="chapter-title-${chapterId}" name="chapter-title-${chapterId}" class="chapter-title" placeholder="Chapter Title - e.g., Getting Started" title="Chapter Title - Enter the title for this chapter" required>
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


// Cost preview and quota management UI
function updateCostPreview(courseData, provider = null) {
    // Find or create cost preview element
    let costPreviewEl = document.getElementById('cost-preview');
    if (!costPreviewEl) {
        costPreviewEl = document.createElement('div');
        costPreviewEl.id = 'cost-preview';
        costPreviewEl.className = 'cost-preview-display';

        // Insert after the course generation section
        const generationSection = document.querySelector('.course-generation-section');
        if (generationSection && generationSection.parentNode) {
            generationSection.parentNode.insertBefore(costPreviewEl, generationSection.nextSibling);
        }
    }

    if (!courseData || !courseData.numChapters) {
        costPreviewEl.style.display = 'none';
        return;
    }

    // Calculate basic cost estimate
    const baseRequests = 2; // Course name + description
    const chapterRequests = courseData.numChapters * 2; // Title + content per chapter
    const totalRequests = baseRequests + chapterRequests;

    // Get depth information
    const depthConfig = {
        outline: { name: 'Outline', color: '#10b981' },
        brief: { name: 'Brief', color: '#3b82f6' },
        standard: { name: 'Standard', color: '#6366f1' },
        detailed: { name: 'Detailed', color: '#f59e0b' },
        comprehensive: { name: 'Comprehensive', color: '#ef4444' }
    };

    const selectedDepth = courseData.courseDepth || 'standard';
    const depth = depthConfig[selectedDepth] || depthConfig.standard;

    // Provider-specific information
    let providerInfo = '';
    if (provider && provider.name && provider.name.includes('Puter')) {
        const sessionRequests = provider.requestCount || 0;
        const statusColor = '#3b82f6'; // blue
        const statusIcon = '💳';

        providerInfo = `
            <div style="color: ${statusColor}; font-weight: 500; margin-top: 8px;">
                ${statusIcon} User Pays Model: Quota managed by your Puter account
            </div>
            <div style="color: #6b7280; font-size: 0.85em; margin-top: 4px;">
                Session: ${sessionRequests} requests made | Actual limits depend on your account
            </div>
        `;

        // Show depth benefits for optimization
        if (selectedDepth === 'outline' || selectedDepth === 'brief') {
            providerInfo += `
                <div style="color: #10b981; font-size: 0.85em; margin-top: 4px;">
                    ✨ Optimized: Using ${selectedDepth} depth saves account quota
                </div>
            `;
        }
    }

    costPreviewEl.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px 16px;
            margin: 8px 0;
            font-size: 0.9em;
            line-height: 1.4;
        ">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="font-weight: 600; color: #1f2937;">📊 Generation Preview</span>
                <span style="
                    background: ${depth.color};
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 0.8em;
                    font-weight: 500;
                ">${depth.name}</span>
            </div>
            <div style="color: #4b5563;">
                <div>📝 <strong>${courseData.numChapters}</strong> chapters × <strong>${selectedDepth}</strong> depth = <strong>~${totalRequests} requests</strong></div>
                <div style="font-size: 0.85em; color: #6b7280; margin-top: 4px;">
                    Breakdown: Course info (2) + Chapter titles (${courseData.numChapters}) + Content (${courseData.numChapters})
                </div>
            </div>
            ${providerInfo}
        </div>
    `;

    costPreviewEl.style.display = 'block';
}

function hideCostPreview() {
    const costPreviewEl = document.getElementById('cost-preview');
    if (costPreviewEl) {
        costPreviewEl.style.display = 'none';
    }
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
    updateCostPreview,
    hideCostPreview,
    logDebug,
    initUI,
    editorInstances,
    resetChapterCount
};
