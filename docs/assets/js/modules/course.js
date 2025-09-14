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

async function enhancePrompt() {
    const currentPrompt = dom.masterPromptTextarea.value.trim();

    if (!currentPrompt) {
        alert('Please enter a course idea or prompt first.');
        return;
    }

    ui.updateGenerationStatus('🚀 Enhancing your prompt with AI assistance...');

    const enhancementPrompt = `Transform this course idea into a clear, actionable prompt for AI course generation:

"${currentPrompt}"

Make it concise but specific. Include:
- Target audience and skill level
- Key learning objectives (2-3 main goals)
- Essential topics to cover
- Add 2-3 brief "Consider:" questions

Keep the enhanced prompt under 150 words and direct.`;

    try {
        const enhancedContent = await api.generateAIText(enhancementPrompt);

        if (!enhancedContent || enhancedContent.trim() === '') {
            throw new Error("The AI model returned an empty response.");
        }

        // Update the textarea with enhanced prompt
        dom.masterPromptTextarea.value = enhancedContent.trim();

        ui.updateGenerationStatus('✅ Prompt enhanced successfully! Review and modify as needed.', 'success');

        // Clear status after 4 seconds
        setTimeout(() => { ui.updateGenerationStatus(null); }, 4000);

        // Save state to persist the enhanced prompt
        if (stateModule && stateModule.saveState) {
            stateModule.saveState();
        }

    } catch (err) {
        ui.updateGenerationStatus(`❌ Error enhancing prompt: ${err.message}`, 'error');
        console.error('Prompt enhancement error:', err);
        setTimeout(() => { ui.updateGenerationStatus(null); }, 5000);
    }
}

async function generateCourse() {
    const userPrompt = dom.masterPromptTextarea.value;
    console.log('Generate course clicked, prompt:', userPrompt);

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

    ui.updateGenerationStatus('Generating course details...');
    console.log('Starting AI generation...');

    const systemPrompt = `You are an expert course creator. A user wants a course about the following topic: "${userPrompt}".

Your task is to generate a course title and a short, compelling course description.
Do not include any other text, explanations, or markdown formatting.
You MUST format your response as follows:
Title: [The course title]
Description: [The course description]`;

    try {
        console.log('Calling API.generateAIText with prompt...');
        const content = await api.generateAIText(systemPrompt);
        console.log('AI response received:', content);

        if (!content || content.trim() === '') {
            throw new Error("The AI model returned an empty response.");
        }
        ui.updateGenerationStatus("AI generation complete. Parsing response...");
        parseAndPopulateCourseDetails(content);
    } catch (err) {
        ui.updateGenerationStatus(`Error generating course: ${err.message}`, 'error');
        console.error('Course generation error:', err);
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

        ui.updateGenerationStatus("✅ Course details populated. Generating chapters...");
        generateChaptersInLoop();

    } catch (err) {
        ui.updateGenerationStatus(`Error parsing course details: ${err.message}`, 'error');
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
            ui.updateGenerationStatus(`Generating chapter ${i} of ${numChapters}...`);
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
            ui.updateGenerationStatus(`Error generating chapter ${i}: ${err.message}`, 'error');
            return;
        }
    }
    ui.updateGenerationStatus("✅ All chapters have been successfully generated!");

    // After generating all chapters, activate the first tab for a consistent UX
    const firstTab = dom.chapterTabsContainer.querySelector('.tab-link');
    if (firstTab) {
        firstTab.click();
    }

    stateModule.saveState();

    setTimeout(() => { ui.updateGenerationStatus(null); }, 5000);
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

async function generateCourseFiles() {
    ui.logDebug("Starting course file generation...");
    const courseName = dom.courseNameInput.value;
    if (!courseName) {
        alert("Please enter a course name.");
        return;
    }

    // Get selected languages
    const selectedLanguages = [];
    document.querySelectorAll('input[type="checkbox"][id^="lang-"]:checked').forEach(checkbox => {
        selectedLanguages.push({
            code: checkbox.value,
            name: checkbox.dataset.name
        });
    });

    if (selectedLanguages.length === 0) {
        alert("Please select at least one language.");
        return;
    }

    ui.updateFileGenerationStatus("🌐 Generating course files for multiple languages...");

    const safeCourseName = courseName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const zip = new JSZip();
    const courseFolder = zip.folder(safeCourseName);
    const assetsFolder = courseFolder.folder('assets');
    assetsFolder.folder('images'); // Create empty images folder for convention

    try {
        // Process each language
        for (const [langIndex, language] of selectedLanguages.entries()) {
            ui.updateFileGenerationStatus(`🌐 Processing ${language.name} (${langIndex + 1}/${selectedLanguages.length})...`);

            // Translate course name and description (skip for English)
            let translatedCourseName = courseName;
            let translatedCourseDescription = dom.courseDescTextarea.value;

            if (language.code !== 'en') {
                translatedCourseName = await translate(courseName, language.name);
                translatedCourseDescription = await translate(dom.courseDescTextarea.value, language.name);
            }

            // Create index file for this language
            const indexContent = `---\ntitle: "${translatedCourseName}"\ndescription: "${translatedCourseDescription}"\n---\n\n# ${translatedCourseName}\n\n${translatedCourseDescription}`;
            courseFolder.file(`index.${language.code}.md`, indexContent);

            // Create chapter files for this language
            const chapters = dom.chapterContentContainer.querySelectorAll('.chapter-content');
            for (const [chapterIndex, contentDiv] of chapters.entries()) {
                ui.updateFileGenerationStatus(`🌐 Translating ${language.name} - Chapter ${chapterIndex + 1}/${chapters.length}...`);

                const chapterId = contentDiv.id.replace('chapter-content-', '');
                const title = dom.courseForm.querySelector(`#chapter-title-${chapterId}`).value;
                const content = ui.editorInstances[chapterId] ? ui.editorInstances[chapterId].content : '';

                let translatedTitle = title;
                let translatedContent = content;

                // Translate chapter content (skip for English)
                if (language.code !== 'en') {
                    translatedTitle = await translate(title, language.name);
                    translatedContent = await translate(content, language.name);
                }

                const chapterFilename = `${String(chapterIndex + 1).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}.${language.code}.md`;
                courseFolder.file(chapterFilename, translatedContent);
            }
        }

        ui.updateFileGenerationStatus("📦 Creating download package...");

        // Generate and download zip
        ui.logDebug("Generating zip file...");
        const zipContent = await zip.generateAsync({ type: "blob" });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipContent);
        link.download = `${safeCourseName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        ui.logDebug("Zip file download triggered.");
        dom.downloadSection.style.display = 'block';
        dom.downloadZipLink.href = link.href;
        dom.downloadZipLink.download = `${safeCourseName}.zip`;

        ui.updateFileGenerationStatus("✅ Multi-language course files generated successfully!");
        setTimeout(() => { ui.updateFileGenerationStatus(null); }, 5000);

    } catch (error) {
        ui.updateFileGenerationStatus(`❌ Error generating files: ${error.message}`, 'error');
        console.error('Course file generation error:', error);
    }
}

export {
    enhancePrompt,
    generateCourse,
    generateCourseFiles,
    translate
};
