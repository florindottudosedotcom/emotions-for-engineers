let dom = {};
let ui = {};
let api = {};
let stateModule = {};

function isCourseEmpty() {
    // Check if any chapter titles have content
    const titleInputs = document.querySelectorAll('.chapter-title');
    for (const input of titleInputs) {
        if (input.value.trim() !== '') return false;
    }

    // Check if any editor instances have content
    for (const key in ui.editorInstances) {
        if (ui.editorInstances[key].content && ui.editorInstances[key].content.trim() !== '') {
            return false;
        }
    }

    return true;
}

async function generateCourse() {
    const userPrompt = dom.masterPromptTextarea.value;
    if (!userPrompt) {
        alert('Please enter a prompt for the course.');
        return;
    }

    if (!isCourseEmpty()) {
        const shouldOverwrite = await ui.showOverwriteConfirmModal();
        if (!shouldOverwrite) {
            // User cancelled
            return;
        }
    }

    ui.updateAiStatus('Generating course details...');

    const systemPrompt = `You are an expert course creator. A user wants a course about the following topic: "${userPrompt}".

Your task is to generate a course title and a short, compelling course description.
Do not include any other text, explanations, or markdown formatting.
You MUST format your response as follows:
Title: [The course title]
Description: [The course description]`;

    try {
        const content = await api.generateAIText(systemPrompt);
        if (!content || content.trim() === '') {
            throw new Error("The AI model returned an empty response.");
        }
        ui.updateAiStatus("AI generation complete. Parsing response...");
        parseAndPopulateCourseDetails(content);
    } catch (err) {
        ui.updateAiStatus(`Error generating course: ${err.message}`, 'error');
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

        dom.courseNameInput.value = courseTitle;
        dom.courseDescTextarea.value = courseDescription;

        // Clear existing chapter tabs and content
        if (dom.chapterTabsContainer) dom.chapterTabsContainer.innerHTML = '';
        if (dom.chapterContentContainer) dom.chapterContentContainer.innerHTML = '';

        Object.keys(ui.editorInstances).forEach(key => delete ui.editorInstances[key]);
        ui.resetChapterCount();

        ui.updateAiStatus("✅ Course details populated. Generating chapters...");
        generateChaptersInLoop();

    } catch (err) {
        ui.updateAiStatus(`Error parsing course details: ${err.message}`, 'error');
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

    const textResponse = await api.generateAIText(systemPrompt);
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
    const numChapters = parseInt(dom.numChaptersSelect.value, 10);
    const courseTitle = dom.courseNameInput.value;

    for (let i = 1; i <= numChapters; i++) {
        try {
            ui.updateAiStatus(`Generating chapter ${i} of ${numChapters}...`);
            ui.addChapter();

            const chapterData = await generateChapter(courseTitle, i, numChapters);
            if (!chapterData.title || !chapterData.content) {
                 throw new Error("The AI response for the chapter is missing 'title' or 'content'.");
            }

            const newChapterId = i; // This is a simplification and might need adjustment
            const titleInput = document.getElementById(`chapter-title-${newChapterId}`);
            if (titleInput) titleInput.value = chapterData.title;

            const editorInstance = ui.editorInstances[newChapterId];
            if (editorInstance) {
                if (editorInstance.isReady) {
                    editorInstance.iframe.contentWindow.postMessage({ type: 'set-content', content: chapterData.content }, '*');
                } else {
                    editorInstance.pendingContent = chapterData.content;
                }
                editorInstance.content = chapterData.content;
            }
        } catch (err) {
            ui.updateAiStatus(`Error generating chapter ${i}: ${err.message}`, 'error');
            return;
        }
    }
    ui.updateAiStatus("✅ All chapters have been successfully generated!");
    stateModule.saveState();

    // Activate the first chapter's tab
    const firstTab = dom.chapterTabsContainer.querySelector('.tab-link');
    if (firstTab) {
        firstTab.click();
    }

    setTimeout(() => { ui.updateAiStatus(null); }, 5000);
}

async function translate(textToTranslate, targetLangName) {
    const prompt = `Translate the following text to ${targetLangName}. Only provide the raw, translated text. Do not include any explanations, introductory phrases, or quotation marks. The text to translate is:\n\n"${textToTranslate}"`;
    try {
        const translatedText = await api.generateAIText(prompt);
        return translatedText.trim() || textToTranslate;
    } catch (err) {
        console.error(`Translation to ${targetLangName} failed:`, err);
        return textToTranslate;
    }
}

export function initCourse(domElements, uiModule, apiModule, stateMod) {
    dom = domElements;
    ui = uiModule;
    api = apiModule;
    stateModule = stateMod;
}

function generateCourseFiles() {
    ui.logDebug("Starting course file generation...");
    const courseName = dom.courseNameInput.value;
    if (!courseName) {
        alert("Please enter a course name.");
        return;
    }

    const safeCourseName = courseName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const zip = new JSZip();
    const courseFolder = zip.folder(safeCourseName);
    // No longer creating a nested 'docs' folder, the content goes straight into the course folder.
    const assetsFolder = courseFolder.folder('assets');
    assetsFolder.folder('images'); // Create empty images folder for convention

    // --- Create Chapter Files ---
    dom.chapterContentContainer.querySelectorAll('.chapter-content').forEach((contentDiv, index) => {
        const chapterId = contentDiv.id.replace('chapter-content-', '');
        const title = dom.courseForm.querySelector(`#chapter-title-${chapterId}`).value;
        const content = ui.editorInstances[chapterId] ? ui.editorInstances[chapterId].content : '';
        const chapterFilename = `${String(index + 1).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}.md`;

        courseFolder.file(chapterFilename, content);
    });

    // --- Create index.md ---
    const courseDescription = dom.courseDescTextarea.value;
    const indexContent = `# ${courseName}\n\n${courseDescription}`;
    courseFolder.file('index.md', indexContent);

    // --- Generate and download zip ---
    ui.logDebug("Generating zip file...");
    zip.generateAsync({ type: "blob" })
        .then(function(content) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${safeCourseName}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            ui.logDebug("Zip file download triggered.");
            dom.downloadSection.style.display = 'block';
            dom.downloadZipLink.href = link.href;
            dom.downloadZipLink.download = `${safeCourseName}.zip`;
        });
}

export {
    generateCourse,
    generateCourseFiles,
    translate
};
