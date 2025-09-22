/**
 * Course Manager - Following CLAUDE.md Guidelines
 * Manages course generation and content creation workflow
 */

import { DOM, Events } from '../core/dom.js';
import { logger, performance } from '../core/utils.js';
import { appState } from '../core/state.js';

export class CourseManager {
    constructor(dom, ui, provider) {
        this.dom = dom;
        this.ui = ui;
        this.provider = provider;
        this.isInitialized = false;
        this.isGenerating = false;
        this.generationProgress = 0;
        this.generatedContent = null;
    }

    async init() {
        try {
            this.setupEventListeners();
            this.isInitialized = true;
            logger.info('Course Manager initialized');
        } catch (error) {
            logger.error('Failed to initialize Course Manager:', error);
            throw error;
        }
    }

    setupEventListeners() {
        appState.watch('isGenerating', (value) => {
            this.updateGenerationUI(value);
        });

        appState.watch('generationProgress', (value) => {
            this.updateProgressUI(value);
        });
    }

    async enhancePrompt() {
        if (!this.provider || !this.provider.validateConfiguration()) {
            this.ui.showMessage('Please configure your AI provider first', 'warning');
            return;
        }

        const currentPrompt = this.dom.masterPromptTextarea?.value?.trim();
        if (!currentPrompt) {
            this.ui.showMessage('Please enter a prompt to enhance', 'warning');
            return;
        }

        const enhanceBtn = this.dom.enhancePromptBtn;
        this.ui.showLoading(enhanceBtn, 'Enhancing...');

        try {
            const enhancementPrompt = this.createEnhancementPrompt(currentPrompt);
            const enhancedPrompt = await this.provider.generateText(enhancementPrompt);

            if (this.dom.masterPromptTextarea) {
                this.dom.masterPromptTextarea.value = enhancedPrompt.trim();
            }

            this.ui.showMessage('Prompt enhanced successfully!', 'success');
            logger.info('Prompt enhancement completed');
        } catch (error) {
            logger.error('Prompt enhancement failed:', error);
            this.ui.showMessage(`Enhancement failed: ${this.provider.formatError(error)}`, 'error');
        } finally {
            this.ui.hideLoading(enhanceBtn);
        }
    }

    createEnhancementPrompt(originalPrompt) {
        return `As an expert course designer, please enhance and expand the following course prompt to make it more comprehensive, engaging, and educational. Focus on:

1. Clear learning objectives
2. Structured content flow
3. Practical examples and exercises
4. Assessment criteria
5. Engaging presentation style

Original prompt:
"${originalPrompt}"

Please provide an enhanced version that maintains the original intent but adds educational structure and clarity:`;
    }

    async generateCourse() {
        if (!this.validateRequiredInputs()) {
            return;
        }

        // Check if there are existing chapters and show overwrite modal
        if (!this.isCourseEmpty()) {
            const shouldOverwrite = await this.showOverwriteModal();
            if (!shouldOverwrite) {
                return;
            }
            // Clear existing chapters if user confirmed
            this.ui.clearAllChapters();
        }

        if (this.isGenerating) {
            this.ui.showMessage('Course generation already in progress', 'warning');
            return;
        }

        this.startGeneration();

        try {
            const courseData = this.collectCourseData();
            const generatedCourse = await this.generateCourseContent(courseData);

            this.ui.setChapterData(generatedCourse.chapters);
            this.generatedContent = generatedCourse;

            this.ui.showMessage('Course generated successfully!', 'success');
            logger.info('Course generation completed successfully');
        } catch (error) {
            logger.error('Course generation failed:', error);

            // Enhanced error handling with fallback
            let errorMessage = 'Course generation failed';
            try {
                // Try to format the error using provider's formatError method
                if (this.provider && typeof this.provider.formatError === 'function') {
                    errorMessage = this.provider.formatError(error);
                } else {
                    // Fallback error formatting
                    errorMessage = error.message || error.toString() || 'Unknown error occurred';
                }
            } catch (formatError) {
                logger.warn('Error formatting failed, using fallback:', formatError);
                errorMessage = error.message || error.toString() || 'Course generation failed with an unknown error';
            }

            // Always show user-friendly error message with longer duration for errors
            this.ui.showMessage(`❌ ${errorMessage}`, 'error', 8000);

            // Ensure button loading state is cleared
            if (this.dom.generateCourseBtn) {
                this.ui.hideLoading(this.dom.generateCourseBtn);
            }

            // For Puter quota errors, provide additional guidance
            if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('limit')) {
                setTimeout(() => {
                    this.ui.showMessage('💡 Tip: Try Cloud AI, WebLLM, or Ollama providers if quota issues persist.', 'info', 6000);
                }, 2000);
            }

            // Log detailed error for debugging
            logger.error('Detailed error information:', {
                error: error,
                message: errorMessage,
                stack: error.stack,
                provider: this.provider?.name || 'unknown'
            });
        } finally {
            // Ensure generation state is ALWAYS reset, even if there are errors above
            try {
                this.endGeneration();
            } catch (endError) {
                logger.error('Error ending generation (forcing state reset):', endError);
                // Force reset generation state if endGeneration fails
                this.isGenerating = false;
                appState.set('isGenerating', false);
                appState.set('generationProgress', 100);

                // Force UI update
                if (this.dom.generateCourseBtn) {
                    this.dom.generateCourseBtn.disabled = false;
                    this.dom.generateCourseBtn.textContent = '⚡ Generate Entire Course';
                    // Also clear any loading state from the UI manager
                    this.ui.hideLoading(this.dom.generateCourseBtn);
                }
            }

            // Double-check button state - ensure it's never stuck in generating state
            if (this.dom.generateCourseBtn) {
                const currentText = this.dom.generateCourseBtn.textContent;
                if (currentText.includes('Generating') || this.dom.generateCourseBtn.disabled) {
                    logger.warn('Button was stuck in generating state, forcing reset');
                    this.dom.generateCourseBtn.disabled = false;
                    this.dom.generateCourseBtn.textContent = '⚡ Generate Entire Course';
                    this.ui.hideLoading(this.dom.generateCourseBtn);
                }
            }
        }
    }

    validateRequiredInputs() {
        if (!this.provider || !this.provider.validateConfiguration()) {
            this.ui.showMessage('Please configure your AI provider first', 'warning');
            return false;
        }

        const masterPrompt = this.dom.masterPromptTextarea?.value?.trim();

        if (!masterPrompt) {
            this.ui.showMessage('Please enter a master prompt', 'warning');
            DOM.focus(this.dom.masterPromptTextarea);
            return false;
        }

        return true;
    }

    collectCourseData() {
        return {
            name: this.dom.courseNameInput?.value?.trim() || '',
            description: this.dom.courseDescTextarea?.value?.trim() || '',
            masterPrompt: this.dom.masterPromptTextarea?.value?.trim() || '',
            numChapters: parseInt(this.dom.numChaptersSelect?.value) || 5,
            languages: appState.get('selectedLanguages', ['en']),
            chapters: this.ui.getChapterData()
        };
    }

    async generateCourseContent(courseData) {
        const startTime = performance.now();
        this.updateProgress(0, 'Initializing course generation...');

        // Generate course name and description if not provided
        if (!courseData.name || !courseData.description) {
            this.updateProgress(5, 'Generating course name and description...');

            if (!courseData.name) {
                courseData.name = await this.generateCourseName(courseData.masterPrompt);
                // Update the input field
                if (this.dom.courseNameInput) {
                    this.dom.courseNameInput.value = courseData.name;
                }
            }

            if (!courseData.description) {
                courseData.description = await this.generateCourseDescription(courseData.masterPrompt, courseData.name);
                // Update the textarea
                if (this.dom.courseDescTextarea) {
                    this.dom.courseDescTextarea.value = courseData.description;
                }
            }
        }

        const chapters = [];
        const totalSteps = courseData.numChapters * 2 + 1; // Name/Desc + Title + Content for each chapter
        let currentStep = 1; // Start at 1 since we've done the name/description step

        for (let i = 0; i < courseData.numChapters; i++) {
            this.updateProgress(
                (currentStep / totalSteps) * 100,
                `Generating Chapter ${i + 1} outline...`
            );

            const chapterTitle = await this.generateChapterTitle(courseData, i);
            currentStep++;

            this.updateProgress(
                (currentStep / totalSteps) * 100,
                `Generating Chapter ${i + 1} content...`
            );

            const chapterContent = await this.generateChapterContent(courseData, chapterTitle, i);
            currentStep++;

            chapters.push({
                title: chapterTitle,
                content: chapterContent
            });

            await this.delay(100);
        }

        this.updateProgress(100, 'Course generation complete!');

        const endTime = performance.now();
        logger.info(`Course generation took ${(endTime - startTime).toFixed(2)}ms`);

        return {
            ...courseData,
            chapters,
            generatedAt: new Date().toISOString(),
            generationTime: endTime - startTime
        };
    }

    async generateChapterTitle(courseData, chapterIndex) {
        const prompt = `Create a compelling title for chapter ${chapterIndex + 1} of ${courseData.numChapters} for a course about:

Course Name: ${courseData.name}
Course Description: ${courseData.description || 'No description provided'}
Master Prompt: ${courseData.masterPrompt}

This should be chapter ${chapterIndex + 1} of ${courseData.numChapters}. Provide only the title, no additional text:`;

        const title = await this.provider.generateText(prompt, { maxTokens: 100 });
        return title.trim().replace(/^["']|["']$/g, '');
    }

    async generateChapterContent(courseData, chapterTitle, chapterIndex) {
        const prompt = `Generate comprehensive content for this chapter of an educational course:

Course Name: ${courseData.name}
Course Description: ${courseData.description || 'No description provided'}
Master Prompt: ${courseData.masterPrompt}
Chapter Title: ${chapterTitle}
Chapter Number: ${chapterIndex + 1} of ${courseData.numChapters}

Create detailed, educational content in Markdown format. Include:
- Learning objectives
- Key concepts and explanations
- Practical examples
- Exercises or activities
- Summary and key takeaways

The content should be comprehensive but focused, suitable for a chapter in a professional course:`;

        return await this.provider.generateText(prompt, { maxTokens: 2000 });
    }

    async generateCourseFiles() {
        if (!this.generatedContent) {
            this.ui.showMessage('Please generate course content first', 'warning');
            return;
        }

        const generateBtn = this.dom.generateCourseBtn;
        this.ui.showLoading(generateBtn, 'Creating files...');

        try {
            const files = await this.createCourseFiles(this.generatedContent);
            const zipBlob = await this.createZipFile(files);
            const downloadUrl = URL.createObjectURL(zipBlob);

            this.ui.enableDownload(downloadUrl, `${this.generatedContent.name.replace(/[^a-z0-9]/gi, '_')}_course.zip`);
            this.ui.showMessage('Course files generated! Ready for download.', 'success');

            appState.set('lastDownload', {
                filename: `${this.generatedContent.name}_course.zip`,
                timestamp: Date.now(),
                size: zipBlob.size
            });

            logger.info('Course files generated successfully');
        } catch (error) {
            logger.error('Course file generation failed:', error);
            this.ui.showMessage(`File generation failed: ${error.message}`, 'error');
        } finally {
            this.ui.hideLoading(generateBtn);
        }
    }

    async createCourseFiles(courseData) {
        const files = {};

        files['mkdocs.yml'] = this.generateMkDocsConfig(courseData);
        files['README.md'] = this.generateReadme(courseData);

        courseData.languages.forEach(lang => {
            const langSuffix = lang === 'en' ? '' : `.${lang}`;

            files[`docs/index${langSuffix}.md`] = this.generateIndexPage(courseData, lang);

            courseData.chapters.forEach((chapter, index) => {
                const filename = this.sanitizeFilename(chapter.title);
                files[`docs/chapters/${filename}${langSuffix}.md`] = chapter.content;
            });
        });

        return files;
    }

    generateMkDocsConfig(courseData) {
        const config = {
            site_name: courseData.name,
            site_description: courseData.description || `Course: ${courseData.name}`,
            theme: {
                name: 'material',
                features: [
                    'navigation.tabs',
                    'navigation.sections',
                    'navigation.expand',
                    'navigation.top',
                    'search.highlight',
                    'search.share'
                ],
                palette: [
                    {
                        scheme: 'default',
                        primary: 'blue',
                        accent: 'blue',
                        toggle: {
                            icon: 'material/brightness-7',
                            name: 'Switch to dark mode'
                        }
                    },
                    {
                        scheme: 'slate',
                        primary: 'blue',
                        accent: 'blue',
                        toggle: {
                            icon: 'material/brightness-4',
                            name: 'Switch to light mode'
                        }
                    }
                ]
            },
            plugins: [
                'search',
                {
                    i18n: {
                        default_language: 'en',
                        languages: Object.fromEntries(
                            courseData.languages.map(lang => [lang, this.getLanguageName(lang)])
                        )
                    }
                }
            ],
            markdown_extensions: [
                'pymdownx.highlight',
                'pymdownx.superfences',
                'pymdownx.tabbed',
                'admonition',
                'codehilite'
            ]
        };

        return `# Generated by Emotions for Engineers Course Creator\n# ${new Date().toISOString()}\n\n${this.yamlStringify(config)}`;
    }

    generateIndexPage(courseData, language) {
        const langName = this.getLanguageName(language);

        return `# ${courseData.name}

## Course Overview
${courseData.description || 'Welcome to this comprehensive course.'}

## Learning Objectives
By the end of this course, you will be able to:
- Understand the core concepts covered in this curriculum
- Apply practical knowledge to real-world scenarios
- Demonstrate proficiency in the subject matter

## Course Structure
This course is organized into ${courseData.chapters.length} chapters:

${courseData.chapters.map((chapter, index) =>
    `${index + 1}. [${chapter.title}](chapters/${this.sanitizeFilename(chapter.title)}${language === 'en' ? '' : `.${language}`}.md)`
).join('\n')}

---
*Generated with [Emotions for Engineers Course Creator](https://github.com/user/emotions-for-engineers)*
*Language: ${langName}*
`;
    }

    generateReadme(courseData) {
        return `# ${courseData.name}

${courseData.description || 'Course generated with Emotions for Engineers Course Creator'}

## Quick Start

1. Install MkDocs and dependencies:
   \`\`\`bash
   pip install mkdocs-material mkdocs-i18n
   \`\`\`

2. Preview the course:
   \`\`\`bash
   mkdocs serve
   \`\`\`

3. Build for deployment:
   \`\`\`bash
   mkdocs build
   \`\`\`

## Course Information

- **Chapters**: ${courseData.chapters.length}
- **Languages**: ${courseData.languages.join(', ')}
- **Generated**: ${new Date().toLocaleString()}

## Deployment

This course is ready to deploy to:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting service

---
Generated with [Emotions for Engineers Course Creator](https://github.com/user/emotions-for-engineers)
`;
    }

    async createZipFile(files) {
        const JSZip = await import('https://cdn.skypack.dev/jszip');
        const zip = new JSZip.default();

        Object.entries(files).forEach(([path, content]) => {
            zip.file(path, content);
        });

        return await zip.generateAsync({ type: 'blob' });
    }

    sanitizeFilename(filename) {
        return filename
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    getLanguageName(code) {
        const languages = {
            en: 'English',
            de: 'Deutsch',
            fr: 'Français',
            hi: 'हिन्दी',
            it: 'Italiano',
            ja: '日本語',
            pt: 'Português',
            ro: 'Română',
            ru: 'Русский',
            es: 'Español',
            zh: '中文'
        };
        return languages[code] || code;
    }

    yamlStringify(obj, indent = 0) {
        const spaces = '  '.repeat(indent);
        let result = '';

        for (const [key, value] of Object.entries(obj)) {
            if (Array.isArray(value)) {
                result += `${spaces}${key}:\n`;
                value.forEach(item => {
                    if (typeof item === 'object') {
                        result += `${spaces}  - `;
                        result += this.yamlStringify(item, indent + 2).trim() + '\n';
                    } else {
                        result += `${spaces}  - ${item}\n`;
                    }
                });
            } else if (typeof value === 'object' && value !== null) {
                result += `${spaces}${key}:\n`;
                result += this.yamlStringify(value, indent + 1);
            } else {
                const quotedValue = typeof value === 'string' && (value.includes(':') || value.includes('#'))
                    ? `"${value}"` : value;
                result += `${spaces}${key}: ${quotedValue}\n`;
            }
        }

        return result;
    }

    startGeneration() {
        this.isGenerating = true;
        this.generationProgress = 0;
        appState.set('isGenerating', true);
        appState.set('generationProgress', 0);
    }

    endGeneration() {
        this.isGenerating = false;
        this.generationProgress = 100;
        appState.set('isGenerating', false);
        appState.set('generationProgress', 100);
    }

    updateProgress(percentage, message) {
        this.generationProgress = percentage;
        appState.set('generationProgress', percentage);
        this.ui.updateStatus('generation', message, 'info');
    }

    updateGenerationUI(isGenerating) {
        if (this.dom.generateCourseBtn) {
            this.dom.generateCourseBtn.disabled = isGenerating;
            this.dom.generateCourseBtn.textContent = isGenerating ?
                '🔄 Generating...' : '⚡ Generate Entire Course';
        }
    }

    updateProgressUI(progress) {
        logger.debug(`Generation progress: ${progress}%`);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async generateCourseName(masterPrompt) {
        const prompt = `Based on this course prompt, generate a clear, concise course title (maximum 10 words):

Course Prompt: ${masterPrompt}

Generate only the course title, no additional text:`;

        const name = await this.provider.generateText(prompt, { maxTokens: 50 });
        return name.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
    }

    async generateCourseDescription(masterPrompt, courseName) {
        const prompt = `Create a brief, engaging course description (2-3 sentences) for this course:

Course Title: ${courseName}
Course Prompt: ${masterPrompt}

Write a description that explains what students will learn and the main topics covered. Generate only the description, no additional text:`;

        const description = await this.provider.generateText(prompt, { maxTokens: 200 });
        return description.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
    }

    isCourseEmpty() {
        // Check if any chapter titles have content
        const titleInputs = DOM.queryAll('.chapter-title');
        for (const input of titleInputs) {
            if (input.value.trim() !== '') return false;
        }

        // Check if any editor instances have content
        for (const key in this.ui.editorInstances) {
            if (this.ui.editorInstances[key].content && this.ui.editorInstances[key].content.trim() !== '') {
                return false;
            }
        }

        return true;
    }

    async showOverwriteModal() {
        return new Promise((resolve) => {
            const modal = DOM.query('#overwrite-modal');
            const yesBtn = DOM.query('#overwrite-yes-btn');
            const cancelBtn = DOM.query('#overwrite-cancel-btn');

            if (!modal || !yesBtn || !cancelBtn) {
                resolve(true); // Failsafe: if modal doesn't exist, act as if user confirmed.
                return;
            }

            const cleanup = () => {
                // Remove event listeners and hide modal
                yesBtn.replaceWith(yesBtn.cloneNode(true));
                cancelBtn.replaceWith(cancelBtn.cloneNode(true));
                DOM.removeClass(modal, 'visible');
            };

            // Show modal
            DOM.addClass(modal, 'visible');

            // Add event listeners to the fresh buttons
            const newYesBtn = DOM.query('#overwrite-yes-btn');
            const newCancelBtn = DOM.query('#overwrite-cancel-btn');

            Events.on(newYesBtn, 'click', () => {
                cleanup();
                resolve(true);
            });

            Events.on(newCancelBtn, 'click', () => {
                cleanup();
                resolve(false);
            });

            // Close modal on escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    document.removeEventListener('keydown', handleEscape);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    }

    destroy() {
        this.isInitialized = false;
        this.isGenerating = false;
        this.generatedContent = null;
        logger.info('Course Manager destroyed');
    }
}