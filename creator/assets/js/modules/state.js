let dom = {};
let state = {};
let ui = {};

const LOCAL_STORAGE_KEY = "courseCreatorState";

function saveState() {
    const chapters = [];

    // Only process chapters if chapter containers exist (course creator)
    if (dom.chapterContentContainer) {
        dom.chapterContentContainer.querySelectorAll('.chapter-content').forEach(contentDiv => {
            const chapterId = contentDiv.id.replace('chapter-content-', '');
            const chapterContainer = contentDiv.querySelector('.chapter');
            if (chapterContainer) {
                const titleElement = chapterContainer.querySelector(`#chapter-title-${chapterId}`);
                const title = titleElement ? titleElement.value : '';
                const content = ui.editorInstances && ui.editorInstances[chapterId] ? ui.editorInstances[chapterId].content : '';
                chapters.push({ title, content });
            }
        });
    }

    // Find active tab (only if tab container exists)
    let activeTabIndex = 0;
    if (dom.chapterTabsContainer) {
        const activeTab = dom.chapterTabsContainer.querySelector('.tab-link.active');
        activeTabIndex = activeTab ? Array.from(dom.chapterTabsContainer.querySelectorAll('.tab-link')).indexOf(activeTab) : 0;
    }

    let appState = {
        courseName: dom.courseNameInput ? dom.courseNameInput.value : '',
        courseDesc: dom.courseDescTextarea ? dom.courseDescTextarea.value : '',
        chapters: chapters,
        masterPrompt: dom.masterPromptTextarea ? dom.masterPromptTextarea.value : '',
        numChapters: dom.numChaptersSelect ? dom.numChaptersSelect.value : '5',
        activeTabIndex: activeTabIndex
    };

    // Add provider-specific state extensions
    if (window.currentProvider && window.currentProvider.saveStateExtensions) {
        appState = window.currentProvider.saveStateExtensions(appState);
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState));
    console.log("State saved.");
}

function loadState() {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!savedState) return;

    console.log("Found saved state, loading...");
    const loadedState = JSON.parse(savedState);

    // Only load course-specific fields if they exist (course creator)
    if (dom.courseNameInput) {
        dom.courseNameInput.value = loadedState.courseName || '';
    }
    if (dom.courseDescTextarea) {
        dom.courseDescTextarea.value = loadedState.courseDesc || '';
    }
    if (dom.masterPromptTextarea) {
        dom.masterPromptTextarea.value = loadedState.masterPrompt || '';
    }
    if (dom.numChaptersSelect) {
        dom.numChaptersSelect.value = loadedState.numChapters || '5';
    }

    // Load provider-specific state extensions
    if (window.currentProvider && window.currentProvider.loadStateExtensions) {
        window.currentProvider.loadStateExtensions(loadedState);
    }

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
                // Update tab tooltip but keep text as "Chapter X"
                const tabButton = dom.chapterTabsContainer.querySelector(`[data-chapter-id="${newChapterId}"]`);
                if (tabButton) {
                    tabButton.textContent = `Chapter ${newChapterId}`;
                    tabButton.title = chapterData.title.trim() ? `Chapter ${newChapterId}: ${chapterData.title.trim()}` : `Chapter ${newChapterId}`;
                }
            }

            const editorInstance = ui.editorInstances[newChapterId];
            if (editorInstance) {
                // Set content directly; iframe readiness will be handled by message queue
                editorInstance.pendingContent = chapterData.content;
                editorInstance.content = chapterData.content;
            }
        });

        // After loading all chapters, activate the previously active tab or first one
        const tabs = dom.chapterTabsContainer.querySelectorAll('.tab-link');
        const activeTabIndex = loadedState.activeTabIndex || 0;
        const tabToActivate = tabs[activeTabIndex] || tabs[0];
        if (tabToActivate) {
            tabToActivate.click();
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
