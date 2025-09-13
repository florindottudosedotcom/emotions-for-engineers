import * as UI from './modules/ui.js';
import * as API from './modules/api.js';
import * as Course from './modules/course.js';
import * as State from './modules/state.js';

const appState = {
    AI_PROVIDER: 'webllm',
    isWebllmReady: false,
    currentWebllmModel: '',
    isWebllmIframeReady: false,
    pendingWebllmModelId: null,
    WEBLLM_MODELS: [
        { id: "Llama-3-8B-Instruct-q4f16_1-MLC", name: "Llama 3 8B Instruct" },
        { id: "Phi-3-mini-4k-instruct-q4f16_1-MLC", name: "Phi 3 Mini" }
    ],
    webllmPromiseResolvers: {}
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
    dom.aiModelSelect = document.getElementById('ai-model-select');
    dom.aiModelSelectionGroup = document.getElementById('ai-model-selection-group');
    dom.refreshModelsBtn = document.getElementById('refresh-models-btn');
    dom.ollamaStatus = document.getElementById('ollama-status');
    dom.masterPromptTextarea = document.getElementById('master-prompt');
    dom.numChaptersSelect = document.getElementById('num-chapters');
    dom.generateCourseBtn = document.getElementById('generate-course-btn');
    dom.webllmIframe = document.getElementById('webllm-iframe');
    dom.clearFormBtn = document.getElementById('clear-form-btn');


    // Init Modules
    UI.initUI(dom);
    API.initApi(dom, appState);
    Course.initCourse(dom, UI, API, State);
    State.initState(dom, appState, UI);

    // Event Listeners
    dom.aiModelSelect.addEventListener('change', () => {
        API.initializeWebLLM(dom.aiModelSelect.value);
        State.saveState();
    });
    dom.generateCourseBtn.addEventListener('click', Course.generateCourse);
    dom.addChapterBtn.addEventListener('click', UI.addChapter);
    dom.clearFormBtn.addEventListener('click', State.clearState);

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
    State.loadState();

    // Ensure there's at least one chapter to start with
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
    const { type, id, result, error, content } = event.data;

    // Handle messages from WebLLM iframe
    if (event.source === dom.webllmIframe.contentWindow) {
        if (type === 'webllm-iframe-ready') {
            appState.isWebllmIframeReady = true;
            API.loadWebLLMModels();
            if (appState.pendingWebllmModelId) {
                API.initializeWebLLM(appState.pendingWebllmModelId);
                appState.pendingWebllmModelId = null;
            }
        } else if (type === 'webllm-ready') {
            appState.isWebllmReady = true;
            appState.currentWebllmModel = event.data.model;
            const modelName = appState.WEBLLM_MODELS.find(m => m.id === appState.currentWebllmModel)?.name || appState.currentWebllmModel;
            UI.updateOllamaStatus(`✅ WebLLM is ready. Loaded: ${modelName}`, 'ok');
        } else if (type === 'webllm-error') {
            appState.isWebllmReady = false;
            UI.updateOllamaStatus(`❌ Error initializing WebLLM: ${error}`, 'error');
        } else if (id && appState.webllmPromiseResolvers[id]) {
            if (type === 'generation-result') {
                appState.webllmPromiseResolvers[id].resolve(result);
            } else if (type === 'generation-error') {
                appState.webllmPromiseResolvers[id].reject(new Error(error));
            }
            delete appState.webllmPromiseResolvers[id];
        }
        return; // End of WebLLM message handling
    }

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
