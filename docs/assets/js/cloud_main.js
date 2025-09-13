import * as UI from './modules/ui.js';
import * as API from './modules/api.js';
import * as Course from './modules/course.js';
import * as State from './modules/state.js';

const appState = {
    AI_PROVIDER: 'cloud', // Set to cloud by default
    SESSION_API_KEYS: {
        openai: null,
        anthropic: null,
        google: null
    }
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
    dom.settingsBtn = document.getElementById('settings-btn');
    dom.settingsModal = document.getElementById('settings-modal');
    dom.closeSettingsBtn = document.getElementById('close-settings-btn');
    dom.apiKeysForm = document.getElementById('api-keys-form');
    dom.openAiApiKeyInput = document.getElementById('openai-api-key');
    dom.anthropicApiKeyInput = document.getElementById('anthropic-api-key');
    dom.googleApiKeyInput = document.getElementById('google-api-key');
    dom.aiProviderSelect = document.getElementById('ai-provider-select');
    dom.masterPromptTextarea = document.getElementById('master-prompt');
    dom.numChaptersSelect = document.getElementById('num-chapters');
    dom.generateCourseBtn = document.getElementById('generate-course-btn');
    dom.clearFormBtn = document.getElementById('clear-form-btn');
    dom.toggleDebugBtn = document.getElementById('toggle-debug-btn');
    dom.clearLogBtn = document.getElementById('clear-log-btn');

    // Init Modules
    UI.initUI(dom);
    UI.logDebug("Application initialized for Cloud AI.");
    API.initApi(dom, appState);
    Course.initCourse(dom, UI, API, State);
    State.initState(dom, appState, UI);

    // Event Listeners
    dom.settingsBtn.addEventListener('click', UI.showSettingsModal);
    dom.closeSettingsBtn.addEventListener('click', UI.hideSettingsModal);
    dom.apiKeysForm.addEventListener('submit', (e) => {
        e.preventDefault();
        API.saveApiKeys();
        UI.hideSettingsModal();
    });

    dom.generateCourseBtn.addEventListener('click', Course.generateCourse);
    dom.addChapterBtn.addEventListener('click', UI.addChapter);
    dom.clearFormBtn.addEventListener('click', State.clearState);
    if (dom.aiProviderSelect) {
        dom.aiProviderSelect.addEventListener('change', API.handleProviderChange);
    }


    // --- State Persistence Event Listeners ---
    const debouncedSave = debounce(State.saveState, 300);
    dom.courseNameInput.addEventListener('input', State.saveState);
    dom.courseDescTextarea.addEventListener('input', State.saveState);
    dom.masterPromptTextarea.addEventListener('input', debouncedSave);
    dom.numChaptersSelect.addEventListener('change', State.saveState);
    dom.chapterContentContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('chapter-title')) {
            State.saveState();
        }
    });
    dom.chapterContentContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('generate-chapter-btn')) {
            const chapterId = e.target.dataset.chapterId;
            if (chapterId) {
                Course.generateSingleChapter(parseInt(chapterId, 10));
            }
        }
    });
    // --- End State Persistence ---

    // Initial Load
    API.updateAvailableProviders();
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
    const { type, id, content } = event.data;

    // Handle messages from Editor iframes
    if (UI.editorInstances && UI.editorInstances[id]) {
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
