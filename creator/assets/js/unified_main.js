import * as UI from './modules/ui.js';
import * as API from './modules/api.js';
import * as Course from './modules/course.js';
import * as State from './modules/state.js';

const appState = {};
const dom = {};
let currentProvider = null;

// Get provider type from window configuration
const PROVIDER_TYPE = window.COURSE_CREATOR_PROVIDER || 'cloud';

async function initializeProvider() {
    let providerModule;

    console.log(`Initializing provider: ${PROVIDER_TYPE}`);

    try {
        switch (PROVIDER_TYPE) {
            case 'cloud':
                providerModule = await import('./providers/cloud.js');
                currentProvider = providerModule.CloudProvider;
                break;
            case 'puter':
                providerModule = await import('./providers/puter.js');
                currentProvider = providerModule.PuterProvider;
                break;
            case 'webllm':
                providerModule = await import('./providers/webllm.js');
                currentProvider = providerModule.WebLLMProvider;
                break;
            case 'ollama':
                providerModule = await import('./providers/ollama.js');
                currentProvider = providerModule.OllamaProvider;
                break;
            default:
                throw new Error(`Unknown provider type: ${PROVIDER_TYPE}`);
        }

        console.log(`Successfully loaded provider: ${currentProvider.name}`);
    } catch (error) {
        console.error(`Failed to load ${PROVIDER_TYPE} provider:`, error);

        // Only fallback to cloud if it's not already the intended provider
        if (PROVIDER_TYPE !== 'cloud') {
            console.log('Falling back to cloud provider');
            const cloudModule = await import('./providers/cloud.js');
            currentProvider = cloudModule.CloudProvider;
        } else {
            // If cloud provider itself failed, throw the error
            throw error;
        }
    }

    return currentProvider;
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize provider first
    await initializeProvider();

    // Update page title
    document.title = `${currentProvider.name} Course Creator`;
    const titleElement = document.querySelector('h1');
    if (titleElement) {
        titleElement.textContent = `${currentProvider.name} Course Creator`;
    }

    // Inject provider-specific template
    const providerSection = document.getElementById('provider-section');
    if (providerSection) {
        providerSection.innerHTML = currentProvider.getTemplate();
    }

    // Common DOM Elements
    dom.courseForm = document.getElementById('course-form');
    dom.chapterTabsContainer = document.getElementById('chapter-tabs-container');
    dom.chapterContentContainer = document.getElementById('chapter-content-container');
    dom.addChapterBtn = document.getElementById('add-chapter');
    dom.downloadSection = document.getElementById('download-section');
    dom.downloadZipLink = document.getElementById('download-zip');
    dom.aiStatus = document.getElementById('ai-status');
    dom.courseNameInput = document.getElementById('course-name');
    dom.courseDescTextarea = document.getElementById('course-desc');
    dom.masterPromptTextarea = document.getElementById('master-prompt');
    dom.enhancePromptBtn = document.getElementById('enhance-prompt-btn');
    dom.numChaptersSelect = document.getElementById('num-chapters');
    dom.generateCourseBtn = document.getElementById('generate-course-btn');
    dom.clearFormBtn = document.getElementById('clear-form-btn');
    dom.generationStatus = document.getElementById('generation-status');
    dom.fileGenerationStatus = document.getElementById('file-generation-status');

    // Initialize provider with DOM elements
    currentProvider.init(dom, appState);

    // Make modules globally available
    window.currentProvider = currentProvider;
    window.stateModule = State;
    window.UI = UI;

    // Init Modules
    UI.initUI(dom);
    API.initApi(dom, appState);
    Course.initCourse(dom, UI, API, State);
    State.initState(dom, appState, UI);

    // Common Event Listeners (with null checks for slides creator pages)
    if (dom.generateCourseBtn) {
        dom.generateCourseBtn.addEventListener('click', Course.generateCourse);
    }
    if (dom.enhancePromptBtn) {
        dom.enhancePromptBtn.addEventListener('click', Course.enhancePrompt);
    }
    // Chapter button management is handled by UIManager
    if (dom.clearFormBtn) {
        dom.clearFormBtn.addEventListener('click', State.clearState);
    }
    if (dom.courseForm) {
        dom.courseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            Course.generateCourseFiles();
        });
    }

    // --- State Persistence ---
    const debouncedSave = debounce(State.saveState, 300);
    if (dom.courseNameInput) {
        dom.courseNameInput.addEventListener('input', debouncedSave);
    }
    if (dom.courseDescTextarea) {
        dom.courseDescTextarea.addEventListener('input', debouncedSave);
    }
    if (dom.masterPromptTextarea) {
        dom.masterPromptTextarea.addEventListener('input', debouncedSave);
    }
    if (dom.numChaptersSelect) {
        dom.numChaptersSelect.addEventListener('change', State.saveState);
    }
    if (dom.chapterContentContainer) {
        dom.chapterContentContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('chapter-title')) {
                debouncedSave();
            }
        });
    }

    // Initial Load (only for course creator)
    if (dom.chapterTabsContainer && dom.chapterContentContainer) {
        State.loadState();
        if (dom.chapterContentContainer.children.length === 0) {
            UI.addChapter();
        }
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

// Handle editor iframe messages (no WebLLM iframe needed anymore)
window.addEventListener('message', (event) => {
    // Handle messages from Editor iframes only
    if (UI.editorInstances && UI.editorInstances[event.data.id]) {
        const { type, id, content } = event.data;
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

// Export for debugging
window.courseCreatorDebug = {
    dom,
    appState,
    currentProvider
};