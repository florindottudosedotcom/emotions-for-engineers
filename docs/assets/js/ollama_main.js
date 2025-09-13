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
    dom.chaptersContainer = document.getElementById('chapters-container');
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
    dom.helpBtn = document.getElementById('help-btn');
    dom.helpModal = document.getElementById('help-modal');
    dom.closeHelpBtn = document.getElementById('close-help-btn');
    dom.clearFormBtn = document.getElementById('clear-form-btn');


    // Init Modules
    UI.initUI(dom);
    API.initApi(dom, appState);
    Course.initCourse(dom, appState, UI, API);
    State.initState(dom, appState, UI);

    // Event Listeners
    dom.helpBtn.addEventListener('click', UI.showHelpModal);
    dom.closeHelpBtn.addEventListener('click', UI.hideHelpModal);
    dom.refreshModelsBtn.addEventListener('click', API.loadOllamaModels);
    dom.aiModelSelect.addEventListener('change', State.saveState);
    dom.generateCourseBtn.addEventListener('click', Course.generateCourse);
    dom.addChapterBtn.addEventListener('click', UI.addChapter);
    dom.clearFormBtn.addEventListener('click', State.clearState);

    // Initial Load
    API.loadOllamaModels();
    State.loadState();
    UI.addChapter();
});
