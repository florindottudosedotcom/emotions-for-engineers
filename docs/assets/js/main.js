import * as UI from './modules/ui.js';
import * as API from './modules/api.js';
import * as Course from './modules/course.js';
import * as State from './modules/state.js';

// --- Application State ---
const appState = {
    AI_PROVIDER: 'ollama',
    isWebllmReady: false,
    currentWebllmModel: '',
    isWebllmIframeReady: false,
    pendingWebllmModelId: null,
    WEBLLM_MODELS: [
        { id: "Llama-3-8B-Instruct-q4f16_1-MLC", name: "Llama 3 8B Instruct" },
        { id: "Phi-3-mini-4k-instruct-q4f16_1-MLC", name: "Phi 3 Mini" }
    ],
    SESSION_API_KEYS: {
        openai: null,
        anthropic: null,
        google: null
    },
    webllmPromiseResolvers: {}
};

// --- DOM Element Collection ---
const dom = {};

// This is a shared utility, keeping it here for now.
const slugify = (text) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

document.addEventListener('DOMContentLoaded', () => {
    // --- Get all DOM elements ---
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
    dom.aiProviderSelect = document.getElementById('ai-provider-select');
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

    // --- Initialize Modules ---
    UI.initUI(dom);
    API.initApi(dom, appState);
    Course.initCourse(dom, appState, UI, API);
    State.initState(dom, appState, UI);

    // --- Event Listeners ---

    // Modals
    dom.helpBtn.addEventListener('click', UI.showHelpModal);
    dom.closeHelpBtn.addEventListener('click', UI.hideHelpModal);
    dom.helpModal.addEventListener('click', (e) => {
        if (e.target === dom.helpModal) UI.hideHelpModal();
    });

    dom.settingsBtn.addEventListener('click', UI.showSettingsModal);
    dom.closeSettingsBtn.addEventListener('click', UI.hideSettingsModal);
    dom.settingsModal.addEventListener('click', (e) => {
        if (e.target === dom.settingsModal) UI.hideSettingsModal();
    });

    // API and Provider Controls
    dom.apiKeysForm.addEventListener('submit', (e) => {
        API.saveApiKeys(e);
        UI.hideSettingsModal(); // Resolve dependency
    });
    dom.aiProviderSelect.addEventListener('change', API.handleProviderChange);
    dom.refreshModelsBtn.addEventListener('click', API.loadOllamaModels);

    // Course Generation
    dom.generateCourseBtn.addEventListener('click', Course.generateCourse);
    dom.addChapterBtn.addEventListener('click', UI.addChapter);

    // State Management
    dom.clearFormBtn.addEventListener('click', State.clearState);
    dom.courseNameInput.addEventListener('input', State.saveState);
    dom.courseDescTextarea.addEventListener('input', State.saveState);
    dom.masterPromptTextarea.addEventListener('input', State.saveState);
    dom.aiModelSelect.addEventListener('change', () => {
        if (dom.aiProviderSelect.value === 'webllm') {
            API.initializeWebLLM(dom.aiModelSelect.value);
        }
        State.saveState();
    });
    dom.numChaptersSelect.addEventListener('change', State.saveState);

    // Main Form Submission (Zip generation)
    // This logic is complex and remains here for now, but could be a module.
    dom.courseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = dom.courseForm.querySelector('button[type="submit"]');
        try {
            submitBtn.disabled = true;
            UI.updateAiStatus('Gathering course content...');

            const courseName = dom.courseNameInput.value;
            const courseDesc = dom.courseDescTextarea.value;
            const selectedLangs = Array.from(document.querySelectorAll('.lang-grid input[type="checkbox"]:checked')).map(cb => cb.value);

            if (selectedLangs.length === 0) {
                alert('Please select at least one language.');
                return;
            }
            const courseSlug = slugify(courseName); // slugify needs to be defined or imported
            if (!courseSlug) {
                alert('Please enter a valid course name.');
                return;
            }
            const chapters = [];
            document.querySelectorAll('.chapter').forEach((chapterDiv) => {
                const chapterId = chapterDiv.id.split('-')[1];
                const title = document.getElementById(`chapter-title-${chapterId}`).value;
                const content = UI.editorInstances[chapterId] ? UI.editorInstances[chapterId].content : '';
                const chapterSlug = slugify(title);
                const chapterNumber = String(chapters.length + 1).padStart(2, '0');
                chapters.push({ title, content, slug: chapterSlug, number: chapterNumber });
            });
            if (chapters.length === 0) {
                alert('Please add at least one chapter.');
                return;
            }
            const zip = new JSZip();
            const courseFolder = zip.folder(courseSlug);
            courseFolder.folder('assets');
            const langCheckboxes = Object.fromEntries(
                Array.from(document.querySelectorAll('.lang-item input[type="checkbox"]'))
                .map(cb => [cb.value, cb])
            );
            const nonEnglishLangs = selectedLangs.filter(l => l !== 'en');
            const progress = {
                completed: 0,
                total: nonEnglishLangs.length * (1 + 1 + chapters.length * 2)
            };
            if (progress.total > 0) {
                UI.updateAiStatus(`Starting translation of ${progress.total} items...`);
            }
            const processingPromises = selectedLangs.map(async (lang) => {
                const langName = langCheckboxes[lang]?.dataset.name;
                if (!langName) return;
                let translatedCourseName = courseName;
                let translatedCourseDesc = courseDesc;
                let translatedChapters = chapters;
                if (lang !== 'en') {
                    // Translation logic here
                }
                const indexContent = `---\ndescription: ${translatedCourseDesc}\n---\n\n# ${translatedCourseName}`;
                courseFolder.file(`index.${lang}.md`, indexContent);
                for (const chapter of translatedChapters) {
                    const chapterFilename = `${chapter.number}-${chapter.slug}.${lang}.md`;
                    const chapterContent = `# ${chapter.title}\n\n${chapter.content}`;
                    courseFolder.file(chapterFilename, chapterContent);
                }
            });
            await Promise.all(processingPromises);
            UI.updateAiStatus('Packaging course files...');
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            dom.downloadZipLink.href = URL.createObjectURL(zipBlob);
            dom.downloadZipLink.download = `${courseSlug}.zip`;
            dom.downloadSection.style.display = 'block';
            UI.updateAiStatus('✅ Success! Your course is ready for download.');

        } finally {
            submitBtn.disabled = false;
        }
    });

    // --- Initial Load ---
    API.updateAvailableProviders();
    State.loadState();
    UI.addChapter(); // Add one chapter by default
});

// --- Iframe Communication ---
// This needs to be global.
window.addEventListener('message', (event) => {
    // WebLLM Iframe messages
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
        return;
    }

    // Editor Iframes messages
    const { type, id, content } = event.data;
    if (id && UI.editorInstances[id]) {
        if (type === 'editor-ready') {
            UI.editorInstances[id].isReady = true;
            if (UI.editorInstances[id].pendingContent) {
                UI.editorInstances[id].iframe.contentWindow.postMessage({
                    type: 'set-content',
                    content: UI.editorInstances[id].pendingContent
                }, '*');
                delete UI.editorInstances[id].pendingContent;
            }
        } else if (type === 'content-changed') {
            UI.editorInstances[id].content = content;
            State.saveState();
        }
    }
});
