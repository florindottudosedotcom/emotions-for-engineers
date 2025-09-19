/**
   * Cloud AI Course Creator Implementation
   * Uses external AI APIs (OpenAI, Anthropic, Google) for course generation
   */

  class CloudCourseCreator {
      constructor() {
          this.common = new CreatorCommon();
          this.progressIndicator = null;
          this.languageSelector = null;
          this.courseDisplay = null;
          this.currentCourse = null;
          this.apiKeys =
  this.common.loadFromLocalStorage('cloudCreator_apiKeys', {});

          this.init();
      }

      init() {
          this.setupComponents();
          this.bindEvents();
          this.loadSavedSettings();
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
                  max: 15,
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
              }
          });
      }

      bindEvents() {
          // API provider selection

  document.querySelectorAll('input[name="aiProvider"]').forEach(radio => {
              radio.addEventListener('change', () =>
  this.onProviderChange());
          });

          // API key inputs
          ['openai-key', 'anthropic-key', 'google-key'].forEach(id => {
              const input = document.getElementById(id);
              if (input) {
                  input.addEventListener('change', (e) =>
  this.saveApiKey(id, e.target.value));
                  input.addEventListener('blur', (e) =>
  this.validateApiKey(id, e.target.value));
              }
          });

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
      }

      loadSavedSettings() {
          // Load saved API keys
          Object.entries(this.apiKeys).forEach(([provider, key]) => {
              const input = document.getElementById(`${provider}-key`);
              if (input && key) {
                  input.value = key;
              }
          });

          // Load last used provider
          const lastProvider =
  this.common.loadFromLocalStorage('cloudCreator_lastProvider', 'openai');
          const providerRadio =
  document.querySelector(`input[value="${lastProvider}"]`);
          if (providerRadio) {
              providerRadio.checked = true;
              this.onProviderChange();
          }
      }

      onProviderChange() {
          const selectedProvider =
  document.querySelector('input[name="aiProvider"]:checked')?.value;
          if (!selectedProvider) return;

          // Hide all API key sections
          document.querySelectorAll('.api-key-section').forEach(section => {
              section.style.display = 'none';
          });

          // Show selected provider's API key section
          const selectedSection =
  document.getElementById(`${selectedProvider}-section`);
          if (selectedSection) {
              selectedSection.style.display = 'block';
          }

          // Save preference
          this.common.saveToLocalStorage('cloudCreator_lastProvider',
  selectedProvider);
      }

      saveApiKey(inputId, key) {
          const provider = inputId.replace('-key', '');
          this.apiKeys[provider] = key;
          this.common.saveToLocalStorage('cloudCreator_apiKeys',
  this.apiKeys);
      }

      validateApiKey(inputId, key) {
          const provider = inputId.replace('-key', '');
          const input = document.getElementById(inputId);

          try {
              this.common.validateApiKey(key, provider);
              input.classList.remove('is-invalid');
              input.classList.add('is-valid');
          } catch (error) {
              input.classList.remove('is-valid');
              input.classList.add('is-invalid');
              this.common.showError(error.message);
          }
      }

      onLanguageChange(language) {
          console.log('Language changed to:', language);
      }

      async generateCourse() {
          try {
              const formData = this.getFormData();
              this.validateFormData(formData);

              this.progressIndicator.reset();
              this.progressIndicator.update(10, 'Preparing request...');

              const course = await this.callAiApi(formData);

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
              provider:
  document.querySelector('input[name="aiProvider"]:checked')?.value,
              settings: this.settingsPanel.getValues()
          };
      }

      validateFormData(data) {
          this.common.validateRequired(data.topic, 'Course topic');
          this.common.validateRequired(data.provider, 'AI provider');

          const apiKey = this.apiKeys[data.provider];
          this.common.validateApiKey(apiKey, data.provider);
      }

      async callAiApi(formData) {
          const apiKey = this.apiKeys[formData.provider];
          const prompt = this.buildPrompt(formData);

          this.progressIndicator.update(30, 'Calling AI API...');

          switch (formData.provider) {
              case 'openai':
                  return await this.callOpenAI(apiKey, prompt);
              case 'anthropic':
                  return await this.callAnthropic(apiKey, prompt);
              case 'google':
                  return await this.callGoogle(apiKey, prompt);
              default:
                  throw new Error('Invalid AI provider selected');
          }
      }

      buildPrompt(formData) {
          const { topic, description, language, settings } = formData;
          const languageName = this.common.getLanguageName(language);

          return `Create a comprehensive course about "${topic}" in 
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
      }

      async callOpenAI(apiKey, prompt) {
          this.progressIndicator.update(50, 'Generating with OpenAI...');

          const response = await
  this.common.makeApiRequest('https://api.openai.com/v1/chat/completions', {
              headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  model: 'gpt-4',
                  messages: [
                      {
                          role: 'system',
                          content: 'You are an expert course creator. Generate high-quality educational content in the requested language.'
                      },
                      {
                          role: 'user',
                          content: prompt
                      }
                  ],
                  temperature: 0.7,
                  max_tokens: 4000
              })
          });

          const content = response.choices[0].message.content;
          return this.parseAiResponse(content);
      }

      async callAnthropic(apiKey, prompt) {
          this.progressIndicator.update(50, 'Generating with Claude...');

          const response = await
  this.common.makeApiRequest('https://api.anthropic.com/v1/messages', {
              headers: {
                  'x-api-key': apiKey,
                  'Content-Type': 'application/json',
                  'anthropic-version': '2023-06-01'
              },
              body: JSON.stringify({
                  model: 'claude-3-sonnet-20240229',
                  max_tokens: 4000,
                  messages: [
                      {
                          role: 'user',
                          content: prompt
                      }
                  ]
              })
          });

          const content = response.content[0].text;
          return this.parseAiResponse(content);
      }

      async callGoogle(apiKey, prompt) {
          this.progressIndicator.update(50, 'Generating with Gemini...');

          const response = await this.common.makeApiRequest(
              `https://generativelanguage.googleapis.com/v1beta/models/gemin
  i-pro:generateContent?key=${apiKey}`,
              {
                  body: JSON.stringify({
                      contents: [{
                          parts: [{
                              text: prompt
                          }]
                      }]
                  })
              }
          );

          const content = response.candidates[0].content.parts[0].text;
          return this.parseAiResponse(content);
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

  *This course was generated using AI technology and is licensed under CC 
  BY-SA 4.0.*
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
      new CloudCourseCreator();
  });
