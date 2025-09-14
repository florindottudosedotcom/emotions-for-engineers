import * as UI from './modules/ui.js';
import * as API from './modules/api.js';
import * as Course from './modules/course.js';
import * as State from './modules/state.js';

const appState = {
    AI_PROVIDER: 'ollama'
};

const dom = {};

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    dom.courseForm = document.getElementById('course-form');
    dom.chapterTabsContainer = document.getElementById('chapter-tabs-container');
    dom.chapterContentContainer = document.getElementById('chapter-content-container');
    dom.addChapterBtn = document.getElementById('add-chapter');
    dom.downloadSection = document.getElementById('download-section');
    dom.downloadZipLink = document.getElementById('download-zip');
    dom.aiStatus = document.getElementById('ai-status');
    dom.courseNameInput = document.getElementById('course-name');
    dom.courseDescTextarea = document.getElementById('course-desc');
    dom.aiModelSelect = document.getElementById('ai-model-select');
    dom.aiModelSelectionGroup = document.getElementById('ai-model-selection-group');
    dom.refreshModelsBtn = document.getElementById('refresh-models-btn');
    dom.ollamaStatus = document.getElementById('ollama-status');
    dom.masterPromptTextarea = document.getElementById('master-prompt');
    dom.numChaptersSelect = document.getElementById('num-chapters');
    dom.generateCourseBtn = document.getElementById('generate-course-btn');
    dom.clearFormBtn = document.getElementById('clear-form-btn');

    // Init Modules
    UI.initUI(dom);
    API.initApi(dom, appState);
    Course.initCourse(dom, UI, API, State);
    State.initState(dom, appState, UI);

    // Event Listeners
    dom.refreshModelsBtn.addEventListener('click', API.loadOllamaModels);
    dom.generateCourseBtn.addEventListener('click', Course.generateCourse);
    dom.addChapterBtn.addEventListener('click', UI.addChapter);
    dom.clearFormBtn.addEventListener('click', State.clearState);
    dom.courseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        Course.generateCourseFiles();
    });
    dom.aiModelSelect.addEventListener('change', State.saveState);

    // --- State Persistence ---
    const debouncedSave = debounce(State.saveState, 300);
    dom.courseNameInput.addEventListener('input', debouncedSave);
    dom.courseDescTextarea.addEventListener('input', debouncedSave);
    dom.masterPromptTextarea.addEventListener('input', debouncedSave);
    dom.numChaptersSelect.addEventListener('change', State.saveState);
    dom.chapterContentContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('chapter-title')) {
            debouncedSave();
        }
    });

    // Initial Load
    API.loadOllamaModels();
    State.loadState();
    if (dom.chapterContentContainer.children.length === 0) {
        UI.addChapter();
    }
});

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

window.addEventListener('message', (event) => {
    // Handle messages from Editor iframes
    if (UI.editorInstances && UI.editorInstances[event.data.id]) {
        const { type, id, content } = event.data;
        if (type === 'editor-ready') {
            UI.editorInstances[id].isReady = true;
            if (UI.editorInstances[id].pendingContent) {
                UI.editorInstances[id].iframe.contentWindow.postMessage({ type: 'set-content', content: UI.editorInstances[id].pendingContent }, '*');
                delete UI.editorInstances[id].pendingContent;
            }
        } else if (type === 'content-changed') {
            UI.editorInstances[id].content = content;
            State.saveState();
        }
    }
});
