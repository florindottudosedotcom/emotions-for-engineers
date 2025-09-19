  /**
   * WebLLM Course Creator Implementation
   * Uses in-browser AI models via WebLLM for local course generation
   */

  class WebLLMCourseCreator {
      constructor() {
          this.common = new CreatorCommon();
          this.progressIndicator = null;
          this.languageSelector = null;
          this.courseDisplay = null;
          this.currentCourse = null;
          this.engine = null;
          this.isModelLoaded = false;

          this.init();
      }

      async init() {
          this.setupComponents();
          this.bindEvents();
          this.loadSavedSettings();
          await this.initializeWebLLM();
      }

      setupComponents() {
          // Initialize progress indicator
          this.progressIndicator = new
  ProgressIndicator('progress-container');

          // Initialize language selector
          this.languageSelector = new LanguageSelector('language-container',
   {
              onChange: (language) => this.onLanguageChange(language)
          });

          // Initialize course display
          this.courseDisplay = new CourseStructureDisplay('course-preview');

          // Initialize settings panel
          this.settingsPanel = new SettingsPanel('settings-container', {
              chapterCount: {
                  type: 'number',
                  label: 'Number of Chapters',
                  default: 5,
                  min: 3,
                  max: 10,
                  description: 'How many chapters should the course have? (Limited for browser performance)'
              },
              includeExercises: {
                  type: 'checkbox',
                  label: 'Include Exercises',
                  default: true,
                  description: 'Add practical exercises to each chapter'
              },
              difficulty: {
                  type: 'select',
                  label: 'Difficulty Level',
                  default: 'intermediate',
                  options: [
                      { value: 'beginner', label: 'Beginner' },
                      { value: 'intermediate', label: 'Intermediate' },
                      { value: 'advanced', label: 'Advanced' }
                  ],
                  description: 'Target audience skill level'
              },
              modelSize: {
                  type: 'select',
                  label: 'Model Size',
                  default: 'small',
                  options: [
                      { value: 'small', label: 'Small (Faster, Lower Quality)' },
                      { value: 'medium', label: 'Medium (Balanced)' },
                      { value: 'large', label: 'Large (Slower, Higher Quality)' }
                  ],
                  description: 'Trade-off between speed and quality'
              }
          });
      }

      bindEvents() {
          // Course generation
          const generateBtn = document.getElementById('generate-btn');
          if (generateBtn) {
              generateBtn.addEventListener('click', () =>
  this.generateCourse());
          }

          // Download course
          const downloadBtn = document.getElementById('download-btn');
          if (downloadBtn) {
              downloadBtn.addEventListener('click', () =>
  this.downloadCourse());
          }

          // Form submission
          const courseForm = document.getElementById('course-form');
          if (courseForm) {
              courseForm.addEventListener('submit', (e) => {
                  e.preventDefault();
                  this.generateCourse();
              });
          }

          // Model reload button
          const reloadBtn = document.getElementById('reload-model-btn');
          if (reloadBtn) {
              reloadBtn.addEventListener('click', () => this.reloadModel());
          }
      }

      loadSavedSettings() {
          // Load last used settings
          const lastSettings =
  this.common.loadFromLocalStorage('webllmCreator_settings', {});
          Object.entries(lastSettings).forEach(([key, value]) => {
              this.settingsPanel.setValue(key, value);
          });
      }

      async initializeWebLLM() {
          try {
              this.progressIndicator.update(10, 'Initializing WebLLM...');

              // Dynamic import of WebLLM
              const { CreateWebWorkerMLCEngine } = await
  import('https://esm.run/@mlc-ai/web-llm');

              this.progressIndicator.update(30, 'Loading AI model...');

              // Get model size preference
              const settings = this.settingsPanel.getValues();
              const modelConfig = this.getModelConfig(settings.modelSize);

              // Initialize the engine
              this.engine = await CreateWebWorkerMLCEngine(
                  new Worker(new
  URL('https://esm.run/@mlc-ai/web-llm/lib/webworker.js', import.meta.url),
  {
                      type: 'module'
                  }),
                  modelConfig.model,
                  {
                      initProgressCallback: (progress) => {
                          const percentage = 30 + (progress.progress * 50);
                          this.progressIndicator.update(percentage, `Loading
   model: ${Math.round(progress.progress * 100)}%`);
                      }
                  }
              );

              this.isModelLoaded = true;
              this.progressIndicator.complete('WebLLM ready!');
              this.common.showSuccess('AI model loaded successfully! You can now generate courses.');

              // Enable generate button
              const generateBtn = document.getElementById('generate-btn');
              if (generateBtn) {
                  generateBtn.disabled = false;
                  generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Generate Course';
              }

          } catch (error) {
              this.progressIndicator.error('Failed to load model');
              this.common.showError(`Failed to initialize WebLLM: 
  ${error.message}`);
              console.error('WebLLM initialization error:', error);

              // Show reload option
              const reloadBtn = document.getElementById('reload-model-btn');
              if (reloadBtn) {
                  reloadBtn.style.display = 'block';
              }
          }
      }

      getModelConfig(size) {
          const configs = {
              small: {
                  model: 'Llama-2-7b-chat-hf-q4f16_1',
                  maxTokens: 1000
              },
              medium: {
                  model: 'Llama-2-13b-chat-hf-q4f16_1',
                  maxTokens: 1500
              },
              large: {
                  model: 'CodeLlama-7b-Instruct-hf-q4f16_1',
                  maxTokens: 2000
              }
          };

          return configs[size] || configs.small;
      }

      onLanguageChange(language) {
          console.log('Language changed to:', language);
          // Save language preference
          this.common.saveToLocalStorage('webllmCreator_language',
  language);
      }

      async generateCourse() {
          if (!this.isModelLoaded) {
              this.common.showError('AI model is not loaded yet. Please wait for initialization to complete.');
              return;
          }

          try {
              const formData = this.getFormData();
              this.validateFormData(formData);

              // Save settings
              this.common.saveToLocalStorage('webllmCreator_settings',
  formData.settings);

              this.progressIndicator.reset();
              this.progressIndicator.update(10, 'Preparing course generation...');

              const course = await this.generateWithWebLLM(formData);

              this.progressIndicator.update(90, 'Processing course content...');

              this.currentCourse = this.processCourseData(course, formData);
              this.courseDisplay.render(this.currentCourse);

              this.progressIndicator.complete('Course generated successfully!');
              this.common.showSuccess('Course generated successfully!');

              // Show download section
              this.common.showElement('download-section');

          } catch (error) {
              this.progressIndicator.error('Generation failed');
              this.common.showError(`Course generation failed: 
  ${error.message}`);
              console.error('Course generation error:', error);
          }
      }

      getFormData() {
          return {
              topic: document.getElementById('course-topic')?.value?.trim(),
              description:
  document.getElementById('course-description')?.value?.trim(),
              language: this.languageSelector.getValue(),
              settings: this.settingsPanel.getValues()
          };
      }

      validateFormData(data) {
          this.common.validateRequired(data.topic, 'Course topic');
      }

      async generateWithWebLLM(formData) {
          const { topic, description, language, settings } = formData;
          const languageName = this.common.getLanguageName(language);
          const modelConfig = this.getModelConfig(settings.modelSize);

          const prompt = `Create a course about "${topic}" in 
  ${languageName}.

  Course Description: ${description || 'No specific description provided.'}

  Requirements:
  - Number of chapters: ${settings.chapterCount}
  - Difficulty level: ${settings.difficulty}
  - Include exercises: ${settings.includeExercises ? 'Yes' : 'No'}
  - Target language: ${languageName}

  Please provide a structured response with:
  1. Course title
  2. Course description (2-3 sentences)
  3. Chapter breakdown with titles and brief content

  Keep the response concise due to browser limitations. Format as JSON:
  {
    "title": "Course Title",
    "description": "Course description",
    "chapters": [
      {
        "title": "Chapter Title",
        "content": "Brief chapter content"
      }
    ]
  }`;

          this.progressIndicator.update(30, 'Generating course content...');

          try {
              const response = await this.engine.chat.completions.create({
                  messages: [
                      {
                          role: 'system',
                          content: 'You are an expert course creator. Generate educational content in the requested language. Keep responses concise and well-structured.'
                      },
                      {
                          role: 'user',
                          content: prompt
                      }
                  ],
                  max_tokens: modelConfig.maxTokens,
                  temperature: 0.7
              });

              this.progressIndicator.update(70, 'Processing AI response...');

              const content = response.choices[0].message.content;
              return this.parseAiResponse(content);

          } catch (error) {
              console.error('WebLLM generation error:', error);
              throw new Error('Failed to generate course with WebLLM');
          }
      }

      parseAiResponse(content) {
          try {
              // Try to parse as JSON first
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                  return JSON.parse(jsonMatch[0]);
              }

              // Fallback: parse manually
              return this.parseTextResponse(content);
          } catch (error) {
              console.warn('Failed to parse JSON response, using text parsing');
              return this.parseTextResponse(content);
          }
      }

      parseTextResponse(content) {
          // Basic text parsing fallback
          const lines = content.split('\n').filter(line => line.trim());

          const course = {
              title: 'Generated Course',
              description: 'AI-generated course content',
              chapters: []
          };

          let currentChapter = null;

          lines.forEach(line => {
              const trimmed = line.trim();

              if (trimmed.startsWith('#') || trimmed.match(/^Chapter \d+/i))
   {
                  if (currentChapter) {
                      course.chapters.push(currentChapter);
                  }
                  currentChapter = {
                      title: trimmed.replace(/^#+\s*/, '').replace(/^Chapter \d+:\s*/i, ''),
                      content: '',
                      exercises: ''
                  };
              } else if (currentChapter && trimmed) {
                  currentChapter.content += trimmed + '\n';
              }
          });

          if (currentChapter) {
              course.chapters.push(currentChapter);
          }

          return course;
      }

      processCourseData(course, formData) {
          const processedCourse = {
              title: course.title || `Course: ${formData.topic}`,
              description: course.description || formData.description,
              language: formData.language,
              chapters: course.chapters || [],
              files: {}
          };

          // Generate course files
          processedCourse.files[`index.${formData.language}.md`] =
  this.generateIndexFile(processedCourse);

          processedCourse.chapters.forEach((chapter, index) => {
              const chapterNum = String(index + 1).padStart(2, '0');
              const filename = `${chapterNum}-${this.common.sanitizeFilename
  (chapter.title)}.${formData.language}.md`;
              processedCourse.files[filename] =
  this.generateChapterFile(chapter, index + 1);
          });

          return processedCourse;
      }

      generateIndexFile(course) {
          return `---
  title: ${course.title}
  description: ${course.description}
  ---

  # ${course.title}

  ${course.description}

  ## Course Overview

  This course consists of ${course.chapters.length} chapters covering 
  various aspects of the topic.

  ## Table of Contents

  ${course.chapters.map((chapter, index) => {
      const chapterNum = String(index + 1).padStart(2, '0');
      const filename = this.common.sanitizeFilename(chapter.title);
      return `${index + 1}. 
  [${chapter.title}](${chapterNum}-${filename}.${course.language}.md)`;
  }).join('\n')}

  ---

  *This course was generated using WebLLM technology and is licensed under 
  CC BY-SA 4.0.*
  `;
      }

      generateChapterFile(chapter, chapterNumber) {
          let content = `# Chapter ${chapterNumber}: ${chapter.title}\n\n`;
          content += chapter.content + '\n\n';

          if (chapter.exercises) {
              content += '## Exercises\n\n';
              content += chapter.exercises + '\n\n';
          }

          content += '---\n\n';
          content += '*Previous: [Previous Chapter] | Next: [Next Chapter]*\n';

          return content;
      }

      async downloadCourse() {
          if (!this.currentCourse) {
              this.common.showError('No course available for download');
              return;
          }

          try {
              this.progressIndicator.update(50, 'Creating download package...');

              const { blob, filename } = await this.common.createCourseZip(
                  this.currentCourse,
                  this.currentCourse.title
              );

              this.progressIndicator.complete('Download ready!');
              this.common.downloadFile(blob, filename);
              this.common.showSuccess('Course downloaded successfully!');

          } catch (error) {
              this.progressIndicator.error('Download failed');
              this.common.showError(`Download failed: ${error.message}`);
              console.error('Download error:', error);
          }
      }

      async reloadModel() {
          this.isModelLoaded = false;
          this.engine = null;

          // Reset UI
          const generateBtn = document.getElementById('generate-btn');
          if (generateBtn) {
              generateBtn.disabled = true;
              generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Loading Model...';
          }

          const reloadBtn = document.getElementById('reload-model-btn');
          if (reloadBtn) {
              reloadBtn.style.display = 'none';
          }

          await this.initializeWebLLM();
      }
  }

  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
      new WebLLMCourseCreator();
  });
