  /**
   * Reusable UI Components for Course Creator Tools
   */

  class LanguageSelector {
      constructor(containerId, options = {}) {
          this.container = document.getElementById(containerId);
          this.options = {
              defaultLanguage: 'en',
              onChange: null,
              label: 'Select Language:',
              ...options
          };
          this.common = new CreatorCommon();
          this.render();
      }

      render() {
          if (!this.container) return;

          const wrapper = this.common.createElement('div', { className:
  'language-selector' });

          if (this.options.label) {
              const label = this.common.createElement('label', {
                  className: 'language-label',
                  for: 'language-select'
              }, this.options.label);
              wrapper.appendChild(label);
          }

          const select = this.common.createElement('select', {
              id: 'language-select',
              className: 'form-control'
          });

          this.common.supportedLanguages.forEach(lang => {
              const option = this.common.createElement('option', { value:
  lang.code });
              option.textContent = `${lang.flag} ${lang.name}`;
              if (lang.code === this.options.defaultLanguage) {
                  option.selected = true;
              }
              select.appendChild(option);
          });

          if (this.options.onChange) {
              select.addEventListener('change', (e) => {
                  this.options.onChange(e.target.value);
              });
          }

          wrapper.appendChild(select);
          this.container.appendChild(wrapper);
          this.selectElement = select;
      }

      getValue() {
          return this.selectElement ? this.selectElement.value :
  this.options.defaultLanguage;
      }

      setValue(value) {
          if (this.selectElement) {
              this.selectElement.value = value;
          }
      }
  }

  class ProgressIndicator {
      constructor(containerId, options = {}) {
          this.container = document.getElementById(containerId);
          this.options = {
              showPercentage: true,
              showStatus: true,
              animated: true,
              ...options
          };
          this.common = new CreatorCommon();
          this.render();
      }

      render() {
          if (!this.container) return;

          const wrapper = this.common.createElement('div', { className:
  'progress-indicator' });

          // Progress bar container
          const progressContainer = this.common.createElement('div', {
              className: 'progress',
              style: `width: 100%; height: 20px; background-color: #e9ecef; 
  border-radius: 10px; overflow: hidden; position: relative;`
          });

          // Progress bar
          this.progressBar = this.common.createElement('div', {
              className: 'progress-bar',
              role: 'progressbar',
              'aria-valuenow': '0',
              'aria-valuemin': '0',
              'aria-valuemax': '100',
              style: `width: 0%; height: 100%; background: 
  linear-gradient(90deg, #007bff, #0056b3); transition: width 0.6s ease; 
  display: flex; align-items: center; justify-content: center; color: white;
   font-weight: bold; font-size: 12px;`
          });

          if (this.options.animated) {
              this.progressBar.style.animation = 'progress-bar-stripes 1s linear infinite';
          }

          progressContainer.appendChild(this.progressBar);
          wrapper.appendChild(progressContainer);

          // Status text
          if (this.options.showStatus) {
              this.statusElement = this.common.createElement('div', {
                  className: 'progress-status',
                  style: `margin-top: 10px; text-align: center; font-size: 
  14px; color: #6c757d;`
              }, 'Ready');
              wrapper.appendChild(this.statusElement);
          }

          this.container.appendChild(wrapper);
      }

      update(percentage, status = '') {
          if (this.progressBar) {
              this.progressBar.style.width = `${Math.max(0, Math.min(100, 
  percentage))}%`;
              this.progressBar.setAttribute('aria-valuenow', percentage);

              if (this.options.showPercentage) {
                  this.progressBar.textContent =
  `${Math.round(percentage)}%`;
              }
          }

          if (this.statusElement && status) {
              this.statusElement.textContent = status;
          }
      }

      reset() {
          this.update(0, 'Ready');
      }

      complete(message = 'Complete!') {
          this.update(100, message);
          if (this.progressBar) {
              this.progressBar.style.background = 'linear-gradient(90deg, #28a745, #1e7e34)';
          }
      }

      error(message = 'Error occurred') {
          if (this.progressBar) {
              this.progressBar.style.background = 'linear-gradient(90deg, #dc3545, #c82333)';
          }
          if (this.statusElement) {
              this.statusElement.textContent = message;
              this.statusElement.style.color = '#dc3545';
          }
      }
  }

  class CourseStructureDisplay {
      constructor(containerId, options = {}) {
          this.container = document.getElementById(containerId);
          this.options = {
              editable: false,
              showChapterCount: true,
              ...options
          };
          this.common = new CreatorCommon();
          this.courseData = null;
      }

      render(courseData) {
          if (!this.container || !courseData) return;

          this.courseData = courseData;
          this.container.innerHTML = '';

          const wrapper = this.common.createElement('div', { className:
  'course-structure' });

          // Course title
          const title = this.common.createElement('h3', {
              className: 'course-title'
          }, courseData.title || 'Untitled Course');
          wrapper.appendChild(title);

          // Course description
          if (courseData.description) {
              const description = this.common.createElement('p', {
                  className: 'course-description'
              }, courseData.description);
              wrapper.appendChild(description);
          }

          // Chapter count
          if (this.options.showChapterCount && courseData.chapters) {
              const chapterCount = this.common.createElement('p', {
                  className: 'chapter-count',
                  style: 'color: #6c757d; font-size: 14px;'
              }, `${courseData.chapters.length} chapters`);
              wrapper.appendChild(chapterCount);
          }

          // Chapters list
          if (courseData.chapters && courseData.chapters.length > 0) {
              const chaptersList = this.common.createElement('ol', {
  className: 'chapters-list' });

              courseData.chapters.forEach((chapter, index) => {
                  const listItem = this.common.createElement('li', {
                      className: 'chapter-item',
                      style: 'margin-bottom: 8px;'
                  });

                  const chapterTitle = this.common.createElement('strong',
  {}, chapter.title || `Chapter ${index + 1}`);
                  listItem.appendChild(chapterTitle);

                  if (chapter.description) {
                      const chapterDesc = this.common.createElement('div', {
                          style: 'font-size: 14px; color: #6c757d; margin-top: 4px;'
                      }, chapter.description);
                      listItem.appendChild(chapterDesc);
                  }

                  chaptersList.appendChild(listItem);
              });

              wrapper.appendChild(chaptersList);
          }

          this.container.appendChild(wrapper);
      }

      update(courseData) {
          this.render(courseData);
      }

      clear() {
          if (this.container) {
              this.container.innerHTML = '';
          }
          this.courseData = null;
      }
  }

  class SettingsPanel {
      constructor(containerId, settingsConfig = {}) {
          this.container = document.getElementById(containerId);
          this.settingsConfig = settingsConfig;
          this.common = new CreatorCommon();
          this.values = {};
          this.render();
      }

      render() {
          if (!this.container) return;

          const wrapper = this.common.createElement('div', { className:
  'settings-panel' });

          Object.entries(this.settingsConfig).forEach(([key, config]) => {
              const settingGroup = this.common.createElement('div', {
                  className: 'setting-group',
                  style: 'margin-bottom: 20px;'
              });

              // Label
              const label = this.common.createElement('label', {
                  for: `setting-${key}`,
                  style: 'display: block; margin-bottom: 5px; font-weight: bold;'
              }, config.label || key);
              settingGroup.appendChild(label);

              // Input element
              let input;
              switch (config.type) {
                  case 'select':
                      input = this.common.createElement('select', {
                          id: `setting-${key}`,
                          className: 'form-control'
                      });
                      if (config.options) {
                          config.options.forEach(option => {
                              const optionElement =
  this.common.createElement('option', {
                                  value: option.value
                              }, option.label);
                              if (option.value === config.default) {
                                  optionElement.selected = true;
                              }
                              input.appendChild(optionElement);
                          });
                      }
                      break;

                  case 'checkbox':
                      input = this.common.createElement('input', {
                          type: 'checkbox',
                          id: `setting-${key}`,
                          className: 'form-check-input'
                      });
                      if (config.default) {
                          input.checked = true;
                      }
                      break;

                  case 'number':
                      input = this.common.createElement('input', {
                          type: 'number',
                          id: `setting-${key}`,
                          className: 'form-control',
                          min: config.min || '0',
                          max: config.max || '100',
                          value: config.default || '0'
                      });
                      break;

                  default: // text
                      input = this.common.createElement('input', {
                          type: config.type || 'text',
                          id: `setting-${key}`,
                          className: 'form-control',
                          placeholder: config.placeholder || '',
                          value: config.default || ''
                      });
              }

              settingGroup.appendChild(input);

              // Description
              if (config.description) {
                  const description = this.common.createElement('small', {
                      style: 'color: #6c757d; display: block; margin-top: 5px;'
                  }, config.description);
                  settingGroup.appendChild(description);
              }

              wrapper.appendChild(settingGroup);

              // Store initial value
              this.values[key] = config.default || '';

              // Add change listener
              input.addEventListener('change', (e) => {
                  this.values[key] = config.type === 'checkbox' ?
  e.target.checked : e.target.value;
                  if (config.onChange) {
                      config.onChange(this.values[key], key);
                  }
              });
          });

          this.container.appendChild(wrapper);
      }

      getValues() {
          return { ...this.values };
      }

      setValue(key, value) {
          this.values[key] = value;
          const input = document.getElementById(`setting-${key}`);
          if (input) {
              if (input.type === 'checkbox') {
                  input.checked = value;
              } else {
                  input.value = value;
              }
          }
      }

      reset() {
          Object.entries(this.settingsConfig).forEach(([key, config]) => {
              this.setValue(key, config.default || '');
          });
      }
  }

  // Export components
  window.LanguageSelector = LanguageSelector;
  window.ProgressIndicator = ProgressIndicator;
  window.CourseStructureDisplay = CourseStructureDisplay;
  window.SettingsPanel = SettingsPanel;
