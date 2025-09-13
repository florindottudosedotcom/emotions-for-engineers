import * as UI from './modules/ui.js';
import * as API from './modules/api.js';
import * as Course from './modules/course.js';
import * as State from './modules/state.js';

const appState = {
    AI_PROVIDER: 'cloud',
    SESSION_API_KEYS: { openai: null, anthropic: null, google: null }
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
    dom.masterPromptTextarea = document.getElementById('master-prompt');
    dom.numChaptersSelect = document.getElementById('num-chapters');
    dom.generateCourseBtn = document.getElementById('generate-course-btn');
    dom.clearFormBtn = document.getElementById('clear-form-btn');

    // Init Modules
    UI.initUI(dom);
    API.initApi(dom, appState);
    Course.initCourse(dom, appState, UI, API);
    State.initState(dom, appState, UI);

    // Event Listeners
    dom.settingsBtn.addEventListener('click', UI.showSettingsModal);
    dom.closeSettingsBtn.addEventListener('click', UI.hideSettingsModal);
    dom.apiKeysForm.addEventListener('submit', (e) => {
        API.saveApiKeys(e);
        UI.hideSettingsModal();
    });

    dom.generateCourseBtn.addEventListener('click', Course.generateCourse);
    dom.addChapterBtn.addEventListener('click', UI.addChapter);
    dom.clearFormBtn.addEventListener('click', State.clearState);

    // Initial Load
    setTimeout(UI.addChapter, 0);
});
