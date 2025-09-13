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
    Course.initCourse(dom, appState, UI, API);
    State.initState(dom, appState, UI);

    // Event Listeners
    dom.aiModelSelect.addEventListener('change', () => {
        API.initializeWebLLM(dom.aiModelSelect.value);
        State.saveState();
    });
    dom.generateCourseBtn.addEventListener('click', Course.generateCourse);
    dom.addChapterBtn.addEventListener('click', UI.addChapter);
    dom.clearFormBtn.addEventListener('click', State.clearState);

    // Initial Load
    API.loadWebLLMModels();
    State.loadState();
    setTimeout(UI.addChapter, 0);
});

window.addEventListener('message', (event) => {
    if (event.source === dom.webllmIframe.contentWindow) {
        const { type, id, result, error } = event.data;

        if (type === 'webllm-iframe-ready') {
            appState.isWebllmIframeReady = true;
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
    }
});
