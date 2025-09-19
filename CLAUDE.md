# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Universal Course Platform with dual functionality:
1. **AI-Powered Course Creator**: A browser-based tool (`docs/course-creator.html`) that generates complete courses using various AI providers
2. **MkDocs Publishing Platform**: Automatically builds and deploys multi-language course websites from Markdown content

## Key Commands

### Development and Testing
```bash
# Install Python dependencies
pip install -r requirements.txt

# Start local MkDocs development server (for previewing published content)
mkdocs serve
# This serves the site at http://127.0.0.1:8000

# Run the course creator locally (required for Ollama integration)
# On macOS/Linux:
./start_course_creator.sh
# On Windows:
./start_course_creator.bat
# This serves the creator at http://localhost:8000/docs/course-creator.html

# Build the site (regenerates navigation and content)
python build_site.py
mkdocs build
```

### Content Management
```bash
# Generate navigation structure and course index pages
python build_site.py

# Deploy to GitHub Pages (automatic on push to main)
git push origin main
```

## Architecture

### Core Components

- **`build_site.py`**: Dynamic site builder that scans `docs/` for course directories and auto-generates:
  - Navigation structure in `mkdocs.yml`
  - Multi-language course index pages (`courses.{lang}.md`)
  - Metadata extraction from course index files

- **Course Creator System**: Refactored into a launcher-based architecture:
  - **`docs/course-creator.html`**: Launcher page that provides access to specialized creator tools
  - **`docs/cloud_creator.html`**: Cloud AI tool (OpenAI, Anthropic, Google APIs)
  - **`docs/webllm_creator.html`**: In-browser AI tool using WebLLM (no server required)
  - **`docs/ollama_creator.html`**: Local AI tool for Ollama integration
  - All tools support multi-language translation (11+ languages) and downloadable course packages

- **MkDocs Configuration**: Material theme with i18n plugin for 11 languages

### Content Structure

- **Course directories**: Located in `docs/`, each containing:
  - `index.{lang}.md` files with YAML frontmatter (title, description)
  - Chapter files following pattern: `{NN}-{chapter-name}.{lang}.md`
  - Supported languages: en, de, fr, hi, it, ja, pt, ro, ru, es, zh

- **Static assets**: CSS/JS customizations in `docs/assets/`

### Build Process

1. `build_site.py` scans `docs/` for course directories (excludes `assets/`)
2. Extracts metadata from `index.{lang}.md` files (title from H1, description from frontmatter)
3. Generates navigation structure based on numbered chapters (`01-`, `02-`, etc.)
4. Creates language-specific course listing pages
5. Updates `mkdocs.yml` with dynamic navigation
6. GitHub Actions automatically builds and deploys on push to `main`

### Multi-language Support

- File naming convention: `filename.{lang}.md` (e.g., `index.en.md`, `about.de.md`)
- MkDocs i18n plugin handles language switching
- Build script generates localized navigation and course listings
- Chapters must exist in target language to appear in navigation

## Course Creation Workflow

1. **Access the Launcher**: Open `course-creator.html` to choose your AI provider
2. **Select Provider**:
   - **Cloud AI**: Use API-based services (OpenAI, Anthropic, Google) - requires API keys
   - **WebLLM**: In-browser AI processing - no server or API keys needed
   - **Ollama**: Local AI models - requires local Ollama installation
3. **Generate Content**: Input topic → AI generates course structure and content
4. **Download Package**: Get ZIP file with MkDocs-compatible structure
5. **Publish**: Extract to `docs/`, commit, and push to auto-deploy

## Important Notes

- Course directories are auto-discovered; no manual nav configuration needed
- Chapter ordering is based on filename prefixes (`01-`, `02-`, etc.)
- **Creator Tool Access**:
  - **Ollama integration**: Only available when running locally (detects localhost/127.0.0.1)
  - **WebLLM**: Works from any hosted environment (GitHub Pages, local, etc.)
  - **Cloud AI**: Works from any hosted environment but requires API keys
- All content is licensed under CC BY-SA 4.0
- GitHub Pages deployment is automatic via `.github/workflows/deploy.yml`


---
  🏗️ DEVELOPMENT GUIDELINES - OPTIMIZED ARCHITECTURE STANDARDS

  These guidelines ensure all future development follows the optimized, 
  modular architecture established in the comprehensive refactoring.

  📂 File Organization Standards

  JavaScript Structure:

  docs/assets/javascripts/
  ├── security.js              # Always loaded first - security utilities
  ├── creator-common.js         # Shared utilities across all creators
  ├── creator-components.js     # Reusable UI components
  ├── [feature]-creator.js      # Specific feature implementations
  └── [feature]-components.js   # Feature-specific components (if needed)

  Component-Based Architecture:

  - NEVER embed JavaScript in HTML files
  - ALWAYS use modular, reusable components
  - EXTRACT common functionality into shared utilities
  - SEPARATE business logic from presentation

  🔒 Security-First Development

  Mandatory Security Practices:

  1. DOM Manipulation: ALWAYS use createElement() and textContent, NEVER
  innerHTML
  2. Input Validation: Validate and sanitize ALL user inputs
  3. API Calls: Use SecurityManager.validateUrl() before external requests
  4. XSS Prevention: Use security utilities for all dynamic content

  Required Security Imports:

  <script src="assets/javascripts/security.js"></script>
  <script src="assets/javascripts/creator-common.js"></script>

  🎨 UI Component Standards

  Reusable Components Created:

  - LanguageSelector - For all language selection needs
  - ProgressIndicator - For all progress tracking
  - CourseStructureDisplay - For content preview
  - SettingsPanel - For configurable options

  Component Usage Rules:

  // ✅ CORRECT - Use existing components
  this.languageSelector = new LanguageSelector('container-id', options);

  // ❌ WRONG - Don't recreate functionality
  const select = document.createElement('select'); // Use LanguageSelector 
  instead

  📱 CSS & Styling Standards

  Use CSS Custom Properties:

  :root {
      --primary-color: #667eea;
      --border-radius: 12px;
      --transition: all 0.3s ease;
  }

  Required Responsive & Accessibility:

  - Mobile-first responsive design
  - Dark mode support via @media (prefers-color-scheme: dark)
  - High contrast support via @media (prefers-contrast: high)
  - Focus indicators for keyboard navigation
  - Screen reader compatibility

  🚀 Performance Standards

  Mandatory Optimizations:

  1. Lazy Loading: Import heavy dependencies only when needed
  2. Caching: Use localStorage for user preferences
  3. Debouncing: Use common.debounce() for input handlers
  4. Error Handling: Comprehensive try-catch with user feedback

  Code Examples:

  // ✅ Lazy loading
  const JSZip = await
  import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');

  // ✅ Caching
  this.common.saveToLocalStorage('feature_settings', data);

  // ✅ Error handling with user feedback
  try {
      await this.performAction();
      this.common.showSuccess('Action completed!');
  } catch (error) {
      this.common.showError(`Action failed: ${error.message}`);
  }

  🔧 Development Workflow

  For Every New Feature:

  1. Plan: Identify reusable components vs feature-specific code
  2. Security: Apply security standards from start
  3. Components: Use existing components or extend them
  4. Testing: Verify accessibility, responsive design, error handling
  5. Documentation: Update this guide if new patterns are established

  File Creation Checklist:

  - Security utilities imported
  - Common utilities used (no duplication)
  - Components follow established patterns
  - Responsive CSS implemented
  - Accessibility features included
  - Error handling comprehensive
  - Performance optimizations applied

  🎯 Code Quality Standards

  JavaScript Best Practices:

  // ✅ Class-based architecture
  class FeatureCreator {
      constructor() {
          this.common = new CreatorCommon();
          this.init();
      }

      init() {
          this.setupComponents();
          this.bindEvents();
          this.loadSavedSettings();
      }
  }

  // ✅ Consistent error handling
  async performAction() {
      try {
          this.progressIndicator.update(10, 'Starting...');
          const result = await this.apiCall();
          this.progressIndicator.complete('Success!');
          return result;
      } catch (error) {
          this.progressIndicator.error('Failed');
          this.common.showError(error.message);
          throw error;
      }
  }

  HTML Structure Standards:

  <!-- ✅ Component containers, not hardcoded elements -->
  <div id="language-container"></div>
  <div id="progress-container"></div>
  <div id="settings-container"></div>

  <!-- ✅ Proper script loading order -->
  <script src="assets/javascripts/security.js"></script>
  <script src="assets/javascripts/creator-common.js"></script>
  <script src="assets/javascripts/creator-components.js"></script>
  <script src="assets/javascripts/[feature]-creator.js"></script>

  📝 Maintenance Standards

  Before Adding Any Code:

  1. Check existing utilities - Can CreatorCommon handle this?
  2. Check existing components - Can existing components be extended?
  3. Check security implications - Are inputs validated?
  4. Check performance - Will this impact load times?

  Code Review Questions:

  - Does this follow DRY principles?
  - Is this accessible and responsive?
  - Does this maintain security standards?
  - Can this be reused for other features?

  ---
  🎯 GOAL: Maintain the 81% code reduction and modular architecture achieved
   in the optimization while ensuring all new features are secure, 
  performant, and maintainable.

  ---
