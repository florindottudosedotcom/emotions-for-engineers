let dom = {};
let state = {};
let ui = {};

const LOCAL_STORAGE_KEY = "courseCreatorState";

function saveState() {
    const chapters = [];
    document.querySelectorAll('.chapter').forEach(chapterDiv => {
        const chapterId = chapterDiv.id.split('-')[1];
        const title = document.getElementById(`chapter-title-${chapterId}`).value;
        const content = ui.editorInstances[chapterId] ? ui.editorInstances[chapterId].content : '';
        chapters.push({ title, content });
    });

    const appState = {
        courseName: dom.courseNameInput.value,
        courseDesc: dom.courseDescTextarea.value,
        chapters: chapters,
        ollamaModel: dom.aiModelSelect.value,
        masterPrompt: dom.masterPromptTextarea.value,
        numChapters: dom.numChaptersSelect.value
    };

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState));
    console.log("State saved.");
}

function loadState() {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!savedState) return;

    console.log("Found saved state, loading...");
    const loadedState = JSON.parse(savedState);

    dom.courseNameInput.value = loadedState.courseName || '';
    dom.courseDescTextarea.value = loadedState.courseDesc || '';
    dom.aiModelSelect.value = loadedState.ollamaModel || 'llama3';
    dom.masterPromptTextarea.value = loadedState.masterPrompt || '';
    dom.numChaptersSelect.value = loadedState.numChapters || '5';

    dom.chaptersContainer.innerHTML = '';
    Object.keys(ui.editorInstances).forEach(key => delete ui.editorInstances[key]);
    // chapterCount needs to be managed by the UI module

    if (loadedState.chapters && loadedState.chapters.length > 0) {
        loadedState.chapters.forEach(chapterData => {
            ui.addChapter();
            const newChapterId = Object.keys(ui.editorInstances).length;
            const titleInput = document.getElementById(`chapter-title-${newChapterId}`);
            if (titleInput) titleInput.value = chapterData.title;

            const editorInstance = ui.editorInstances[newChapterId];
            if (editorInstance) {
                if (editorInstance.isReady) {
                    editorInstance.iframe.contentWindow.postMessage({ type: 'set-content', content: chapterData.content }, '*');
                } else {
                    editorInstance.pendingContent = chapterData.content;
                }
                editorInstance.content = chapterData.content;
            }
        });
    } else {
        ui.addChapter();
    }
}

function clearState() {
    if (confirm("Are you sure you want to clear the form and start a new course? All current content will be lost.")) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        location.reload();
    }
}

export function initState(domElements, appState, uiModule) {
    dom = domElements;
    state = appState;
    ui = uiModule;
}

export {
    saveState,
    loadState,
    clearState
};
