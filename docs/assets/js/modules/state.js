let dom = {};
let state = {};
let ui = {};

const LOCAL_STORAGE_KEY = "courseCreatorState";

function saveState() {
    const chapters = [];
    // The chapter content divs are now the source of truth for order and ID
    dom.chapterContentContainer.querySelectorAll('.chapter-content').forEach(contentDiv => {
        const chapterId = contentDiv.id.replace('chapter-content-', '');
        const chapterContainer = contentDiv.querySelector('.chapter');
        if (chapterContainer) {
            const title = chapterContainer.querySelector(`#chapter-title-${chapterId}`).value;
            const content = ui.editorInstances[chapterId] ? ui.editorInstances[chapterId].content : '';
            chapters.push({ title, content });
        }
    });

    const appState = {
        courseName: dom.courseNameInput.value,
        courseDesc: dom.courseDescTextarea.value,
        chapters: chapters,
        // Only save model if the select element exists
        ollamaModel: dom.aiModelSelect ? dom.aiModelSelect.value : null,
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
    if (dom.aiModelSelect && loadedState.ollamaModel) {
        dom.aiModelSelect.value = loadedState.ollamaModel;
    }
    dom.masterPromptTextarea.value = loadedState.masterPrompt || '';
    dom.numChaptersSelect.value = loadedState.numChapters || '5';

    // Clear existing chapter UI
    dom.chapterTabsContainer.innerHTML = '';
    dom.chapterContentContainer.innerHTML = '';
    Object.keys(ui.editorInstances).forEach(key => delete ui.editorInstances[key]);
    ui.resetChapterCount(); // Reset the counter in UI module

    if (loadedState.chapters && loadedState.chapters.length > 0) {
        loadedState.chapters.forEach(chapterData => {
            ui.addChapter(); // This creates the tab and content pane with correct event listeners

            // The new chapter is always the last one added, with an ID managed by ui.js
            const newChapterId = Object.keys(ui.editorInstances).pop();

            const titleInput = document.getElementById(`chapter-title-${newChapterId}`);
            if (titleInput) {
                titleInput.value = chapterData.title;
            }

            const editorInstance = ui.editorInstances[newChapterId];
            if (editorInstance) {
                // Set content directly; iframe readiness will be handled by message queue
                editorInstance.pendingContent = chapterData.content;
                editorInstance.content = chapterData.content;
            }
        });

        // After loading all chapters, activate the first one
        const firstTab = dom.chapterTabsContainer.querySelector('.tab-link');
        if (firstTab) {
            firstTab.click();
        }

    } else {
        // If no chapters in state, add one default chapter
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
