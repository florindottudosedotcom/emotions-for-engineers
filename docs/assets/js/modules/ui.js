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
    const chapterDiv = document.createElement('div');
    chapterDiv.className = 'chapter';
    chapterDiv.id = `chapter-${chapterId}`;
    chapterDiv.innerHTML = `
        <div class="chapter-header">
            <h3>Chapter ${chapterId}</h3>
            <button type="button" class="btn btn-danger remove-chapter-btn" data-chapter-id="${chapterId}">Remove</button>
        </div>
        <label for="chapter-title-${chapterId}">Chapter Title</label>
        <input type="text" id="chapter-title-${chapterId}" class="chapter-title" placeholder="e.g., Getting Started" required>
        <label for="editor-iframe-${chapterId}">Chapter Content</label>
        <iframe id="editor-iframe-${chapterId}" class="editor-iframe" src="editor_iframe.html?id=${chapterId}"></iframe>
    `;
    dom.chaptersContainer.appendChild(chapterDiv);

    const iframe = document.getElementById(`editor-iframe-${chapterId}`);
    editorInstances[chapterId] = { content: '', isReady: false, iframe: iframe };

    chapterDiv.querySelector('.remove-chapter-btn').addEventListener('click', () => {
        const id = chapterDiv.querySelector('.remove-chapter-btn').dataset.chapterId;
        delete editorInstances[id];
        document.getElementById(`chapter-${id}`).remove();
    });
};

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

export {
    showSettingsModal,
    hideSettingsModal,
    showHelpModal,
    hideHelpModal,
    addChapter,
    updateAiStatus,
    updateOllamaStatus,
    editorInstances
};
