let dom = {};
let chapterCount = 0;
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

function addChapter() {
    chapterCount++;
    const chapterId = chapterCount;

    // Create Tab Button
    const tabButton = document.createElement('button');
    tabButton.className = 'tab-link';
    tabButton.textContent = `Chapter ${chapterId}`;
    tabButton.dataset.chapterId = chapterId;
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
                <button type="button" class="btn btn-danger remove-chapter-btn" data-chapter-id="${chapterId}">Remove Chapter</button>
            </div>
            <label for="chapter-title-${chapterId}">Chapter Title</label>
            <input type="text" id="chapter-title-${chapterId}" class="chapter-title" placeholder="e.g., Getting Started" required>
            <label for="editor-iframe-${chapterId}">Chapter Content</label>
            <iframe id="editor-iframe-${chapterId}" class="editor-iframe" src="editor_iframe.html?id=${chapterId}"></iframe>
        </div>
    `;
    dom.chapterContentContainer.appendChild(chapterDiv);

    // Event Listener for the new tab
    tabButton.addEventListener('click', () => {
        // Deactivate all tabs and hide all content
        dom.chapterTabsContainer.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
        dom.chapterContentContainer.querySelectorAll('.chapter-content').forEach(content => content.style.display = 'none');

        // Activate the clicked tab and show its content
        tabButton.classList.add('active');
        chapterDiv.style.display = 'block';
    });

    // Deactivate all other tabs and hide content
    dom.chapterTabsContainer.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
    dom.chapterContentContainer.querySelectorAll('.chapter-content').forEach(content => content.style.display = 'none');

    // Activate the new tab and show its content
    tabButton.classList.add('active');
    chapterDiv.style.display = 'block';

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


export function initUI(domElements) {
    dom = domElements;
}

function initResizeObserver() {
    if (!window.ResizeObserver) {
        console.warn("ResizeObserver not supported, iframe resizing will not work.");
        return;
    }

    const observer = new ResizeObserver(entries => {
        const height = document.body.scrollHeight;
        window.parent.postMessage({ type: 'resize-iframe', height: height }, window.location.origin);
    });

    observer.observe(document.body);
}

export {
    showSettingsModal,
    hideSettingsModal,
    showHelpModal,
    hideHelpModal,
    addChapter,
    updateAiStatus,
    updateOllamaStatus,
    editorInstances,
    initResizeObserver
};
