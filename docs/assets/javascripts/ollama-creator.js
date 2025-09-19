  /**
   * Ollama Course Creator Implementation
   * Uses local Ollama installation for course generation
   */

  class OllamaCourseCreator {
      constructor() {
          this.common = new CreatorCommon();
          this.progressIndicator = null;
          this.languageSelector = null;
          this.courseDisplay = null;
          this.currentCourse = null;
          this.availableModels = [];

          this.init();
      }

      async init() {
          this.setupComponents();
          this.bindEvents();
          this.loadSavedSettings();
          await this.checkOllamaConnection();
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

          // Initialize settings panel - will be populated after model check
          this.settingsPanel = null;
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

          // Refresh models button
          const refreshBtn = document.getElementById('refresh-models-btn');
          if (refreshBtn) {
              refreshBtn.addEventListener('click', () =>
  this.checkOllamaConnection());
          }
      }

      loadSavedSettings() {
          // Load last used settings
          const lastSettings =
  this.common.loadFromLocalStorage('ollamaCreator_settings', {});
          if (this.settingsPanel) {
              Object.entries(lastSettings).forEach(([key, value]) => {
                  this.settingsPanel.setValue(key, value);
              });
          }
      }

      async checkOllamaConnection() {
          try {
              this.progressIndicator.update(20, 'Checking Ollama connection...');

              // Check if we're in a local environment
              if (!this.common.isLocalEnvironment()) {
                  throw new Error('Ollama creator is only available when running locally');
              }

              // Test connection to Ollama
              const response = await
  fetch('http://localhost:11434/api/tags');

              if (!response.ok) {
                  throw new Error('Ollama is not running or not accessible');
              }

              const data = await response.json();
              this.availableModels = data.models || [];

              this.progressIndicator.update(70, 'Setting up interface...');

              // Now that we have models, setup the settings panel
              this.setupSettingsPanel();
              this.loadSavedSettings();

              this.progressIndicator.complete('Ollama connected!');
              this.common.showSuccess(`Connected to Ollama! Found 
  ${this.availableModels.length} models.`);

              // Enable generate button
              const generateBtn = document.getElementById('generate-btn');
              if (generateBtn) {
                  generateBtn.disabled = false;
                  generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Generate Course';
              }

              // Hide error message if any
              const errorMsg = document.getElementById('ollama-error');
              if (errorMsg) {
                  errorMsg.style.display = 'none';
              }

          } catch (error) {
              this.progressIndicator.error('Connection failed');
              this.common.showError(`Failed to connect to Ollama: 
  ${error.message}`);
              console.error('Ollama connection error:', error);

              // Show error message and instructions
              const errorMsg = document.getElementById('ollama-error');
              if (errorMsg) {
                  errorMsg.style.display = 'block';
              }

              // Show refresh button
              const refreshBtn =
  document.getElementById('refresh-models-btn');
              if (refreshBtn) {
                  refreshBtn.style.display = 'block';
              }
          }
      }

      setupSettingsPanel() {
          // Create model options from available models
          const modelOptions = this.availableModels.map(model => ({
              value: model.name,
              label: `${model.name} (${this.formatModelSize(model.size)})`
          }));

          // If no models available, provide a default
          if (modelOptions.length === 0) {
              modelOptions.push({
                  value: 'llama2',
                  label: 'llama2 (default)'
              });
          }

          this.settingsPanel = new SettingsPanel('settings-container', {
              model: {
                  type: 'select',
                  label: 'Ollama Model',
                  default: modelOptions[0].value,
                  options: modelOptions,
                  description: 'Choose which Ollama model to use for generation'
              },
              chapterCount: {
                  type: 'number',
                  label: 'Number of Chapters',
                  default: 6,
                  min: 3,
                  max: 12,
                  description: 'How many chapters should the course have?'
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
              maxTokens: {
                  type: 'number',
                  label: 'Max Tokens per Request',
                  default: 2000,
                  min: 500,
                  max: 4000,
                  description: 'Maximum tokens for each generation request'
              }
          });
      }

      formatModelSize(bytes) {
          const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
          if (bytes === 0) return '0 B';
          const i = Math.floor(Math.log(bytes) / Math.log(1024));
          return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' +
  sizes[i];
      }

      onLanguageChange(language) {
          console.log('Language changed to:', language);
          // Save language preference
          this.common.saveToLocalStorage('ollamaCreator_language',
  language);
      }

      async generateCourse() {
          if (this.availableModels.length === 0) {
              this.common.showError('No Ollama models available. Please install a model first.');
              return;
          }

          try {
              const formData = this.getFormData();
              this.validateFormData(formData);

              // Save settings
              this.common.saveToLocalStorage('ollamaCreator_settings',
  formData.settings);

              this.progressIndicator.reset();
              this.progressIndicator.update(10, 'Preparing course generation...');

              const course = await this.generateWithOllama(formData);

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
              settings: this.settingsPanel ? this.settingsPanel.getValues()
  : {}
          };
      }

      validateFormData(data) {
          this.common.validateRequired(data.topic, 'Course topic');

          if (!data.settings.model) {
              throw new Error('No Ollama model selected');
          }
      }

      async generateWithOllama(formData) {
          const { topic, description, language, settings } = formData;
          const languageName = this.common.getLanguageName(language);

          const prompt = `Create a comprehensive course about "${topic}" in 
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
  3. Detailed chapter breakdown with titles and content

  Format the response as JSON with this structure:
  {
    "title": "Course Title",
    "description": "Course description",
    "chapters": [
      {
        "title": "Chapter Title",
        "content": "Detailed chapter content...",
        "exercises": "Practice exercises (if requested)"
      }
    ]
  }`;

          this.progressIndicator.update(30, `Generating with 
  ${settings.model}...`);

          try {
              const response = await
  fetch('http://localhost:11434/api/generate', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                      model: settings.model,
                      prompt: prompt,
                      stream: false,
                      options: {
                          num_predict: settings.maxTokens,
                          temperature: 0.7
                      }
                  })
              });

              if (!response.ok) {
                  const error = await response.text();
                  throw new Error(`Ollama API error: ${error}`);
              }

              this.progressIndicator.update(70, 'Processing response...');

              const data = await response.json();
              const content = data.response;

              return this.parseAiResponse(content);

          } catch (error) {
              console.error('Ollama generation error:', error);
              throw new Error(`Failed to generate course with Ollama: 
  ${error.message}`);
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

  *This course was generated using Ollama technology and is licensed under 
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
  }

  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
      new OllamaCourseCreator();
  });
