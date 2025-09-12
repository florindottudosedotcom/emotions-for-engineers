// --- AI Provider State ---
let AI_PROVIDER = 'ollama'; // 'ollama' or 'webllm'
let isWebllmReady = false;
const SESSION_API_KEYS = {
    openai: null,
    anthropic: null,
    google: null
};

// --- DOM Element variables ---
let courseForm, chaptersContainer, addChapterBtn, downloadSection, downloadZipLink, aiStatus, courseNameInput, courseDescTextarea, settingsBtn, settingsModal, closeSettingsBtn, apiKeysForm, openAiApiKeyInput, anthropicApiKeyInput, googleApiKeyInput, aiProviderSelect, aiModelSelect, aiModelSelectionGroup, refreshModelsBtn, ollamaStatus, providerConfigFieldset, masterPromptTextarea, numChaptersSelect, generateCourseBtn, webllmIframe;

let chapterCount = 0;
const editorInstances = {};

// --- WebLLM Iframe Communication ---
let webllmPromiseResolvers = {};

window.addEventListener('message', (event) => {
    if (event.source !== webllmIframe.contentWindow) return;

    const { type, id, result, error } = event.data;

    if (type === 'webllm-ready') {
        isWebllmReady = true;
        ollamaStatus.textContent = '✅ WebLLM is ready.';
        ollamaStatus.style.color = 'green';
    } else if (type === 'webllm-error') {
        isWebllmReady = false;
        ollamaStatus.textContent = `❌ Error initializing WebLLM: ${error}`;
        ollamaStatus.style.color = 'red';
    } else if (id && webllmPromiseResolvers[id]) {
        if (type === 'generation-result') {
            webllmPromiseResolvers[id].resolve(result);
        } else if (type === 'generation-error') {
            webllmPromiseResolvers[id].reject(new Error(error));
        }
        delete webllmPromiseResolvers[id]; // Clean up
    }
});


// --- AI Provider Functions ---

async function updateAvailableProviders() {
    ollamaStatus.textContent = 'Detecting available AI providers...';
    const selectedProviderBeforeUpdate = aiProviderSelect.value;
    aiProviderSelect.innerHTML = '';

    // 1. Check for Cloud Providers with session keys
    if (SESSION_API_KEYS.openai) {
        aiProviderSelect.add(new Option("OpenAI (Cloud)", "openai"));
    }
    if (SESSION_API_KEYS.anthropic) {
        aiProviderSelect.add(new Option("Anthropic (Cloud)", "anthropic"));
    }
    if (SESSION_API_KEYS.google) {
        aiProviderSelect.add(new Option("Google Gemini (Cloud)", "google"));
    }

    // 2. Check for Ollama
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
            const data = await response.json();
            if (data.models && data.models.length > 0) {
                aiProviderSelect.add(new Option("Ollama (Local)", "ollama"));
            }
        }
    } catch (err) {
        // Ollama is not available, do nothing.
    }

    // 3. Add WebLLM as the final fallback
    aiProviderSelect.add(new Option("WebLLM (In-Browser)", "webllm"));

    // Set the best available provider as the default
    aiProviderSelect.selectedIndex = 0;
    handleProviderChange();
}

function handleProviderChange() {
    const selectedProvider = aiProviderSelect.value;
    AI_PROVIDER = selectedProvider;

    aiModelSelectionGroup.style.display = 'none';
    refreshModelsBtn.style.display = 'none';
    ollamaStatus.textContent = '';

    if (selectedProvider === 'ollama') {
        aiModelSelectionGroup.style.display = 'flex';
        refreshModelsBtn.style.display = 'block';
        loadOllamaModels();
    } else if (selectedProvider === 'webllm') {
        if (!isWebllmReady) {
            ollamaStatus.textContent = `🔵 Initializing WebLLM...`;
            ollamaStatus.style.color = 'blue';
        } else {
            ollamaStatus.textContent = `✅ WebLLM is ready.`;
        }
    } else { // Cloud providers
         ollamaStatus.textContent = `✅ Ready to use ${selectedProvider}.`;
    }
}

async function loadOllamaModels() {
    ollamaStatus.textContent = 'Loading Ollama models...';
    aiModelSelect.innerHTML = '';
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        const data = await response.json();
        if (data.models && data.models.length > 0) {
            data.models.forEach(model => {
                aiModelSelect.add(new Option(model.name, model.name));
            });
            ollamaStatus.textContent = `✅ Ollama connected. ${data.models.length} model(s) found.`;
        } else {
             ollamaStatus.textContent = `⚠️ Ollama is running but no models found.`;
        }
    } catch(err) {
         ollamaStatus.textContent = `❌ Could not connect to Ollama.`;
    }
}

async function generateAIText(systemPrompt) {
    const provider = aiProviderSelect.value;
    let endpoint = '';
    let headers = { 'Content-Type': 'application/json' };
    let body = {};
    let apiKey = '';

    switch (provider) {
        case 'openai':
            apiKey = SESSION_API_KEYS.openai;
            if (!apiKey) throw new Error("OpenAI API key is missing.");
            endpoint = 'https://api.openai.com/v1/chat/completions';
            headers['Authorization'] = `Bearer ${apiKey}`;
            body = {
                model: "gpt-4o",
                messages: [{ role: 'user', content: systemPrompt }],
                stream: false
            };
            break;

        case 'anthropic':
            apiKey = SESSION_API_KEYS.anthropic;
            if (!apiKey) throw new Error("Anthropic API key is missing.");
            endpoint = 'https://api.anthropic.com/v1/messages';
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
            body = {
                model: "claude-3-haiku-20240307",
                max_tokens: 4096,
                messages: [{ role: 'user', content: systemPrompt }]
            };
            break;

        case 'google':
            apiKey = SESSION_API_KEYS.google;
            if (!apiKey) throw new Error("Google Gemini API key is missing.");
            endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            body = {
                contents: [{ parts:[{ text: systemPrompt }] }]
            };
            break;

        case 'ollama':
            const ollamaModel = aiModelSelect.value;
            if (!ollamaModel) throw new Error("No Ollama model selected.");
            endpoint = 'http://localhost:11434/api/chat';
            body = {
                model: ollamaModel,
                messages: [{ role: 'user', content: systemPrompt }],
                stream: false
            };
            break;

        case 'webllm':
            if (!isWebllmReady) throw new Error("WebLLM engine is not ready. Please wait for it to initialize.");
            return new Promise((resolve, reject) => {
                const requestId = Date.now() + Math.random();
                webllmPromiseResolvers[requestId] = { resolve, reject };
                webllmIframe.contentWindow.postMessage({ type: 'generate-text', prompt: systemPrompt, id: requestId }, '*');
            });

        default:
            throw new Error(`Unknown or unsupported AI provider: ${provider}`);
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`${provider} API request failed with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();

    switch (provider) {
        case 'openai':
            return data.choices[0].message.content;
        case 'anthropic':
            return data.content[0].text;
        case 'google':
            return data.candidates[0].content.parts[0].text;
        case 'ollama':
            return data.message.content;
        default:
            throw new Error(`Cannot parse response for unknown provider: ${provider}`);
    }
}


async function generateCourse() {
    const userPrompt = masterPromptTextarea.value;
    const numChapters = numChaptersSelect.value;

    if (!userPrompt) {
        alert('Please enter a prompt for the course.');
        return;
    }

    aiStatus.style.display = 'block';
    aiStatus.textContent = 'Generating course details...';

    const systemPrompt = `You are an expert course creator. A user wants a course about the following topic: "${userPrompt}".

Your task is to generate a course title and a short, compelling course description.
Do not include any other text, explanations, or markdown formatting.
You MUST format your response as follows:
Title: [The course title]
Description: [The course description]`;

    try {
        const content = await generateAIText(systemPrompt);
        if (!content || content.trim() === '') {
            throw new Error("The AI model returned an empty response.");
        }
        aiStatus.textContent = "AI generation complete. Parsing response and populating form...";
        parseAndPopulateCourseDetails(content);
    } catch (err) {
        aiStatus.textContent = `Error generating course: ${err.message}`;
        console.error(err);
    }
}

function parseAndPopulateCourseDetails(textResponse) {
    try {
        const lines = textResponse.split('\n');
        const titleLine = lines.find(line => line.toLowerCase().startsWith('title:'));
        const descriptionLine = lines.find(line => line.toLowerCase().startsWith('description:'));

        if (!titleLine || !descriptionLine) {
            throw new Error("AI response did not follow the expected 'Title: ...' and 'Description: ...' format.");
        }

        const courseTitle = titleLine.substring('title:'.length).trim();
        const courseDescription = descriptionLine.substring('description:'.length).trim();

        if (!courseTitle || !courseDescription) {
             throw new Error("Extracted title or description is empty.");
        }

        courseNameInput.value = courseTitle;
        courseDescTextarea.value = courseDescription;

        chaptersContainer.innerHTML = '';
        Object.keys(editorInstances).forEach(key => delete editorInstances[key]);
        chapterCount = 0;

        aiStatus.textContent = "✅ Course details populated. Now generating chapters one by one...";
        generateChaptersInLoop();

    } catch (err) {
        aiStatus.textContent = `Error parsing course details from AI. Please try again.\n\nError: ${err.message}`;
    }
}

async function generateChapter(courseTitle, chapterIndex, totalChapters) {
    const systemPrompt = `You are an expert course creator generating a chapter for a course titled "${courseTitle}".
This is chapter number ${chapterIndex} of ${totalChapters}.

Your task is to generate a title and the full content for this single chapter.
Do not include any other text or explanations.
You MUST format your response as follows, with the content starting on the line immediately after the "Content:" marker:
Title: [The chapter title]
Content:
[The full chapter content in Markdown]`;

    const textResponse = await generateAIText(systemPrompt);
    if (!textResponse) {
        throw new Error(`AI returned an empty response for chapter ${chapterIndex}.`);
    }

    const lines = textResponse.split('\n');
    const titleLine = lines.find(line => line.toLowerCase().startsWith('title:'));
    const contentStartIndex = lines.findIndex(line => line.toLowerCase().startsWith('content:'));

    if (!titleLine || contentStartIndex === -1) {
        throw new Error(`AI response for chapter ${chapterIndex} did not follow the expected format.`);
    }

    const title = titleLine.substring('title:'.length).trim();
    const content = lines.slice(contentStartIndex + 1).join('\n').trim();

    if (!title || !content) {
        throw new Error(`Extracted title or content for chapter ${chapterIndex} is empty.`);
    }

    return { title, content };
}

async function generateChaptersInLoop() {
    const numChapters = parseInt(numChaptersSelect.value, 10);
    const courseTitle = courseNameInput.value;

    for (let i = 1; i <= numChapters; i++) {
        try {
            aiStatus.textContent = `Generating chapter ${i} of ${numChapters}...`;
            addChapter();

            const chapterData = await generateChapter(courseTitle, i, numChapters);

            if (!chapterData.title || !chapterData.content) {
                 throw new Error("The AI response for the chapter is missing 'title' or 'content'.");
            }

            const newChapterId = chapterCount;
            const titleInput = document.getElementById(`chapter-title-${newChapterId}`);
            const editor = editorInstances[newChapterId];

            if (titleInput) titleInput.value = chapterData.title;
            if (editor) editor.setMarkdown(chapterData.content);

        } catch (err) {
            aiStatus.textContent = `Error generating chapter ${i}. Please try again.\n\nError: ${err.message}`;
            return;
        }
    }
     aiStatus.textContent = "✅ All chapters have been successfully generated!";
     saveState();
     setTimeout(() => { aiStatus.style.display = 'none'; }, 5000);
}

const LOCAL_STORAGE_KEY = "courseCreatorState";

function saveState() {
    const chapters = [];
    document.querySelectorAll('.chapter').forEach(chapterDiv => {
        const chapterId = chapterDiv.id.split('-')[1];
        const title = document.getElementById(`chapter-title-${chapterId}`).value;
        const editor = editorInstances[chapterId];
        const content = editor ? editor.getMarkdown() : '';
        chapters.push({ title, content });
    });

    const state = {
        courseName: courseNameInput.value,
        courseDesc: courseDescTextarea.value,
        chapters: chapters,
        ollamaModel: aiModelSelect.value,
        masterPrompt: masterPromptTextarea.value,
        numChapters: numChaptersSelect.value
    };

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    console.log("State saved.");
}

function loadState() {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!savedState) return;

    console.log("Found saved state, loading...");
    const state = JSON.parse(savedState);

    courseNameInput.value = state.courseName || '';
    courseDescTextarea.value = state.courseDesc || '';
    aiModelSelect.value = state.ollamaModel || 'llama3';
    masterPromptTextarea.value = state.masterPrompt || '';
    numChaptersSelect.value = state.numChapters || '5';

    chaptersContainer.innerHTML = '';
    Object.keys(editorInstances).forEach(key => delete editorInstances[key]);
    chapterCount = 0;

    if (state.chapters && state.chapters.length > 0) {
        state.chapters.forEach(chapterData => {
            addChapter();
            const newChapterId = chapterCount;
            const titleInput = document.getElementById(`chapter-title-${newChapterId}`);
            const editor = editorInstances[newChapterId];
            if (titleInput) titleInput.value = chapterData.title;
            if (editor) editor.setMarkdown(chapterData.content);
        });
    } else {
        addChapter();
    }
}

function clearState() {
    if (confirm("Are you sure you want to clear the form and start a new course? All current content will be lost.")) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        location.reload();
    }
}

function saveApiKeys(e) {
    e.preventDefault();
    SESSION_API_KEYS.openai = openAiApiKeyInput.value || null;
    SESSION_API_KEYS.anthropic = anthropicApiKeyInput.value || null;
    SESSION_API_KEYS.google = googleApiKeyInput.value || null;

    openAiApiKeyInput.value = '';
    anthropicApiKeyInput.value = '';
    googleApiKeyInput.value = '';

    hideSettingsModal();
    updateAvailableProviders();
    alert("API Keys will be used for this session only.");
}

function showSettingsModal() {
    settingsModal.classList.add('visible');
}
function hideSettingsModal() {
    settingsModal.classList.remove('visible');
}

const slugify = (text) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

const addChapter = () => {
    chapterCount++;
    const chapterId = chapterCount;
    const chapterDiv = document.createElement('div');
    chapterDiv.className = 'chapter';
    chapterDiv.id = `chapter-${chapterId}`;
    chapterDiv.innerHTML = `
        <div class="chapter-header">
            <h3>Chapter ${chapterId}</h3>
            <button type="button" class="btn btn-danger remove-chapter-btn" data-chapter-id="${chapterId}">Remove</button>
        </div>
        <label for="chapter-title-${chapterId}">Chapter Title</label>
        <input type="text" id="chapter-title-${chapterId}" class="chapter-title" placeholder="e.g., Getting Started" required>
        <label for="editor-${chapterId}">Chapter Content</label>
        <div id="editor-${chapterId}" class="chapter-editor"></div>
    `;
    chaptersContainer.appendChild(chapterDiv);

    const editor = new toastui.Editor({
        el: document.querySelector(`#editor-${chapterId}`),
        height: '250px',
        initialEditType: 'wysiwyg',
        previewStyle: 'vertical',
        toolbarItems: [
            ['heading', 'bold', 'italic', 'strike'],
            ['hr', 'quote'],
            ['ul', 'ol', 'task', 'indent', 'outdent'],
            ['table', 'image', 'link'],
            ['code', 'codeblock'],
            ['scrollSync'],
        ],
        events: {
            change: () => saveState()
        }
    });
    editorInstances[chapterId] = editor;

    chapterDiv.querySelector('.remove-chapter-btn').addEventListener('click', () => {
        const id = chapterDiv.querySelector('.remove-chapter-btn').dataset.chapterId;
        delete editorInstances[id];
        document.getElementById(`chapter-${id}`).remove();
    });
};

async function translate(textToTranslate, targetLangName) {
    const prompt = `Translate the following text to ${targetLangName}. Only provide the raw, translated text. Do not include any explanations, introductory phrases, or quotation marks. The text to translate is:\n\n"${textToTranslate}"`;

    try {
        const translatedText = await generateAIText(prompt);
        return translatedText.trim() || textToTranslate;
    } catch (err) {
        console.error(`Translation to ${targetLangName} failed:`, err);
        return textToTranslate;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    courseForm = document.getElementById('course-form');
    chaptersContainer = document.getElementById('chapters-container');
    addChapterBtn = document.getElementById('add-chapter');
    downloadSection = document.getElementById('download-section');
    downloadZipLink = document.getElementById('download-zip');
    aiStatus = document.getElementById('ai-status');
    courseNameInput = document.getElementById('course-name');
    courseDescTextarea = document.getElementById('course-desc');
    settingsBtn = document.getElementById('settings-btn');
    settingsModal = document.getElementById('settings-modal');
    closeSettingsBtn = document.getElementById('close-settings-btn');
    apiKeysForm = document.getElementById('api-keys-form');
    openAiApiKeyInput = document.getElementById('openai-api-key');
    anthropicApiKeyInput = document.getElementById('anthropic-api-key');
    googleApiKeyInput = document.getElementById('google-api-key');
    aiProviderSelect = document.getElementById('ai-provider-select');
    aiModelSelect = document.getElementById('ai-model-select');
    aiModelSelectionGroup = document.getElementById('ai-model-selection-group');
    refreshModelsBtn = document.getElementById('refresh-models-btn');
    ollamaStatus = document.getElementById('ollama-status');
    providerConfigFieldset = document.querySelector('fieldset');
    masterPromptTextarea = document.getElementById('master-prompt');
    numChaptersSelect = document.getElementById('num-chapters');
    generateCourseBtn = document.getElementById('generate-course-btn');
    webllmIframe = document.getElementById('webllm-iframe');

    refreshModelsBtn.addEventListener('click', loadOllamaModels);
    generateCourseBtn.addEventListener('click', generateCourse);
    settingsBtn.addEventListener('click', showSettingsModal);
    closeSettingsBtn.addEventListener('click', hideSettingsModal);
    apiKeysForm.addEventListener('submit', saveApiKeys);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            hideSettingsModal();
        }
    });
    aiProviderSelect.addEventListener('change', handleProviderChange);
    document.getElementById('clear-form-btn').addEventListener('click', clearState);
    courseNameInput.addEventListener('input', saveState);
    courseDescTextarea.addEventListener('input', saveState);
    masterPromptTextarea.addEventListener('input', saveState);
    aiModelSelect.addEventListener('change', saveState);
    numChaptersSelect.addEventListener('change', saveState);
    chaptersContainer.addEventListener('input', (e) => {
        if (e.target && e.target.classList.contains('chapter-title')) {
            saveState();
        }
    });
    addChapterBtn.addEventListener('click', addChapter);

    courseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = courseForm.querySelector('button[type="submit"]');

        try {
            submitBtn.disabled = true;
            aiStatus.style.display = 'block';
            aiStatus.textContent = 'Gathering course content...';

            const courseName = courseNameInput.value;
            const courseDesc = courseDescTextarea.value;
            const selectedLangs = Array.from(document.querySelectorAll('.lang-grid input[type="checkbox"]:checked')).map(cb => cb.value);

            if (selectedLangs.length === 0) {
                alert('Please select at least one language.');
                return;
            }
            const courseSlug = slugify(courseName);
            if (!courseSlug) {
                alert('Please enter a valid course name.');
                return;
            }

            const chapters = [];
            document.querySelectorAll('.chapter').forEach((chapterDiv) => {
                const chapterId = chapterDiv.id.split('-')[1];
                const title = document.getElementById(`chapter-title-${chapterId}`).value;
                const editor = editorInstances[chapterId];
                const content = editor ? editor.getMarkdown() : '';
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
                aiStatus.textContent = `Starting translation of ${progress.total} items across ${nonEnglishLangs.length} language(s)...`;
            }

            const processingPromises = selectedLangs.map(async (lang) => {
                const langName = langCheckboxes[lang]?.dataset.name;
                if (!langName) return;

                let translatedCourseName = courseName;
                let translatedCourseDesc = courseDesc;
                let translatedChapters = chapters;
                const isPrimaryLang = lang === 'en';

                if (!isPrimaryLang) {
                    const updateProgress = () => {
                        progress.completed++;
                        aiStatus.textContent = `Translating... ${progress.completed} of ${progress.total} items completed.`;
                    };

                    translatedCourseName = await translate(courseName, langName);
                    updateProgress();
                    translatedCourseDesc = await translate(courseDesc, langName);
                    updateProgress();

                    const newChapters = [];
                    for (const chapter of chapters) {
                        const translatedTitle = await translate(chapter.title, langName);
                        updateProgress();
                        const translatedContent = await translate(chapter.content, langName);
                        updateProgress();
                        newChapters.push({ ...chapter, title: translatedTitle, content: translatedContent });
                    }
                    translatedChapters = newChapters;
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

            aiStatus.textContent = 'All translations complete. Now packaging your course files into a .zip file...';
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            downloadZipLink.href = URL.createObjectURL(zipBlob);
            downloadZipLink.download = `${courseSlug}.zip`;
            downloadSection.style.display = 'block';
            aiStatus.textContent = '✅ Success! Your course files have been packaged. Click the download link that has appeared.';

        } finally {
            submitBtn.disabled = false;
        }
    });

    updateAvailableProviders();
    loadState();
    addChapter();
});
