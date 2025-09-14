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

function getApiKeysFromSession() {
    const storedKeys = sessionStorage.getItem('SESSION_API_KEYS');
    if (storedKeys) {
        return JSON.parse(storedKeys);
    }
    return { openai: null, anthropic: null, google: null };
}

function saveApiKeysToSession(keys) {
    sessionStorage.setItem('SESSION_API_KEYS', JSON.stringify(keys));
}

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
    dom.aiProviderSelect = document.getElementById('ai-provider-select');
    dom.apiKeyInput = document.getElementById('api-key-input');
    dom.masterPromptTextarea = document.getElementById('master-prompt');
    dom.numChaptersSelect = document.getElementById('num-chapters');
    dom.generateCourseBtn = document.getElementById('generate-course-btn');
    dom.clearFormBtn = document.getElementById('clear-form-btn');
    dom.toggleDebugBtn = document.getElementById('toggle-debug-btn');
    dom.clearLogBtn = document.getElementById('clear-log-btn');

    // Load API keys from session storage first
    appState.SESSION_API_KEYS = getApiKeysFromSession();

    // Init Modules
    UI.initUI(dom);
    UI.logDebug("Application initialized for Cloud AI.");
    API.initApi(dom, appState);
    Course.initCourse(dom, UI, API, State);
    State.initState(dom, appState, UI);

    // Event Listeners
    dom.aiProviderSelect.addEventListener('change', () => {
        const provider = dom.aiProviderSelect.value;
        appState.AI_PROVIDER = provider;
        dom.apiKeyInput.value = appState.SESSION_API_KEYS[provider] || '';
        if (appState.SESSION_API_KEYS[provider]) {
            UI.updateAiStatus(`✅ ${provider.charAt(0).toUpperCase() + provider.slice(1)} is ready.`);
        } else {
            UI.updateAiStatus(`Provider changed to ${provider}. Please enter an API key.`);
        }
    });

    dom.apiKeyInput.addEventListener('input', () => {
        const provider = dom.aiProviderSelect.value;
        const key = dom.apiKeyInput.value;
        appState.SESSION_API_KEYS[provider] = key;
        saveApiKeysToSession(appState.SESSION_API_KEYS); // Save to session storage
        if (key) {
            UI.updateAiStatus(`✅ ${provider.charAt(0).toUpperCase() + provider.slice(1)} is ready.`);
        } else {
            UI.updateAiStatus(`Provider for ${provider} is not configured.`);
        }
    });

    dom.generateCourseBtn.addEventListener('click', Course.generateCourse);
    dom.addChapterBtn.addEventListener('click', UI.addChapter);
    dom.clearFormBtn.addEventListener('click', State.clearState);

    dom.courseForm.addEventListener('submit', (event) => {
        event.preventDefault();
        UI.logDebug("Course file generation triggered.");
        alert("File generation is not implemented yet. Preventing page reload.");
        // TODO: Call the actual file generation function here.
    });


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
    // --- End State Persistence ---

    // Initial Load
    appState.AI_PROVIDER = dom.aiProviderSelect.value;
    const currentProvider = appState.AI_PROVIDER;
    const apiKey = appState.SESSION_API_KEYS[currentProvider];

    if (apiKey) {
        dom.apiKeyInput.value = apiKey;
        UI.updateAiStatus(`✅ ${currentProvider.charAt(0).toUpperCase() + currentProvider.slice(1)} is ready.`);
    } else {
        UI.updateAiStatus(`Provider set to ${currentProvider}. Please enter an API key.`);
    }

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
