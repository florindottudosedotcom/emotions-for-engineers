# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Management

### Before Starting Work
1. **Always read SESSION_HISTORY.md first** to understand recent activities and current project status
2. Check the current git branch and modified files for context
3. Review any blocking issues or next steps from previous sessions
4. Understand the current phase of work and ongoing objectives

### During Development
- Use TodoWrite tool for complex multi-step tasks to track progress
- Update SESSION_HISTORY.md when plans change significantly or when major milestones are reached
- Track important decisions and architectural choices for future reference
- Note any blockers or dependencies that might affect future sessions

### Session Closure Workflow
- Update SESSION_HISTORY.md with completed work and current status
- Note any blocking issues, dependencies, or unresolved questions
- Identify clear next steps and priorities for the following session
- Ensure all important context is preserved for continuity

### Session History File Management
- Keep detailed records of the last 10 sessions
- Archive older entries to prevent file bloat
- Maintain clear session boundaries with dates and summaries
- Include both planned work and actual outcomes

## Project Overview

This is a Universal Course Platform with dual functionality:
1. **AI-Powered Creator Interface**: Modern browser-based tools in `creator/` directory for generating courses and presentations using various AI providers
2. **MkDocs Publishing Platform**: Automatically builds and deploys multi-language course websites from Markdown content

### Current Architecture

- **Creator Interface** (`creator/`): Modern UI for content generation
  - Modular AI provider system (Cloud, WebLLM, Ollama, Puter)
  - Dual-mode creation: Courses + Presentations/Slides
  - Multi-language support (11+ languages)
  - Downloadable packages for easy deployment

- **Publishing Platform** (`docs/`): Static site generation
  - MkDocs with Material theme and i18n plugin
  - Auto-generated navigation from course structure
  - GitHub Pages deployment

## Key Commands

### Development and Testing
```bash
# Install Python dependencies
pip install -r requirements.txt

# Start local MkDocs development server (for previewing published content)
mkdocs serve
# This serves the site at http://127.0.0.1:8000

# Run the creator interface locally (required for Ollama integration)
# On macOS/Linux:
./start_course_creator.sh
# On Windows:
./start_course_creator.bat
# This serves the creator at http://localhost:8000/creator/

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

## Screenshot System & Visual Verification

This project includes a comprehensive Puppeteer-based screenshot automation system for visual testing and verification. **Use screenshots before and after every UI fix** to ensure visual quality and consistency.

### Essential Commands
```bash
# Start development server
./start_course_creator.sh

# Navigate to screenshot tools directory
cd tools/screenshot-automation

# Take screenshot of default page (cloud.html)
node screenshot-simple.js

# Take screenshot of specific page
node screenshot-simple.js --url http://localhost:8000/creator/puter.html --filename puter-ui.png

# Take screenshot with custom viewport
node screenshot-simple.js --width 1440 --height 900 --filename desktop-ui.png

# Screenshot specific UI components
node screenshot-simple.js --element "#chapter-tabs-container" --filename tabs-component.png

# All provider pages
npm run screenshot-all
```

### Critical UI Fix Workflow
1. **Before coding**: `npm run screenshot-all`
2. **During development**: `node screenshot-simple.js --element "[changed-element]" --filename during-fix.png`
3. **After coding**: Verify fix across all providers
4. **Final verification**: `cd creator/tools/screenshot-automation && node take-responsive-screenshots.js`

### Provider Consistency Verification
Always verify all provider pages look identical after layout changes:
```bash
# Test all providers with same settings
node screenshot-simple.js --url http://localhost:8000/creator/openrouter.html --filename openrouter-layout.png --delay 3000
node screenshot-simple.js --url http://localhost:8000/creator/webllm.html --filename webllm-layout.png --delay 3000
node screenshot-simple.js --url http://localhost:8000/creator/ollama.html --filename ollama-layout.png --delay 3000
node screenshot-simple.js --url http://localhost:8000/creator/puter.html --filename puter-layout.png --delay 3000
```

### Responsive Testing
```bash
# Mobile portrait
node screenshot-simple.js --width 375 --height 667 --filename mobile-portrait.png

# Tablet
node screenshot-simple.js --width 768 --height 1024 --filename tablet.png

# Desktop
node screenshot-simple.js --width 1920 --height 1080 --filename desktop.png
```

### Critical Checkpoints
Always screenshot these after UI changes:
1. **Provider Consistency** - All provider pages should look identical
2. **Chapter Tabs** - Tab navigation and styling
3. **Editor Areas** - ToastUI editor height and styling
4. **Language Grid** - Multi-language selector layout
5. **Form Elements** - Input fields, buttons, dropdowns
6. **Modal Dialogs** - Settings and help modals
7. **Status Displays** - Error, loading, and success states

## MCP Servers Rules

### Context7 Rules
Always use context7 when I need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tools to resolve library id and get library docs without me having to explicitly ask.

---

## Development Guidelines

### Core Principles

1. **CSS-First Styling Architecture**
   - **ALWAYS add styling to CSS files**, never inline in HTML or JavaScript
   - Use dedicated CSS files in `assets/css/` directory structure
   - Follow the established CSS architecture: `core/`, `components/`, `themes/`, `layouts/`
   - Apply styles via CSS classes and CSS custom properties (variables)
   - **NEVER use inline `style` attributes** in HTML or JavaScript DOM manipulation
   - **NEVER use CSS-in-JS** - all styles belong in `.css` files

   ```javascript
   // ❌ DON'T: Inline styles in JavaScript
   element.style.height = '400px';
   element.setAttribute('style', 'background: #000;');

   // ✅ DO: Add CSS class and define styles in CSS file
   element.classList.add('editor-container');
   ```

   ```css
   /* ✅ DO: Define styles in appropriate CSS file */
   .editor-container {
       height: 400px;
       background-color: var(--surface);
   }
   ```

2. **Security-First Development**
   - Use `createElement()` and `textContent`, never `innerHTML`
   - Validate and sanitize ALL user inputs
   - Implement proper CORS policies and CSP headers
   - Regularly audit and update third-party libraries

3. **Third-Party Integration Philosophy - "Don't Fight the Framework"**
   - **Start simple**: Use library defaults with minimal configuration
   - **Respect boundaries**: Don't override internal library classes unless absolutely necessary
   - **Test early**: Verify basic functionality before adding customizations
   - **Avoid !important**: Heavy CSS overrides indicate over-engineering

   ```javascript
   // ✅ DO: Start with library defaults
   const editor = new toastui.Editor({
       el: document.querySelector('#editor'),
       height: '100%', // Let the library manage its own sizing
       initialEditType: 'wysiwyg'
   });
   ```

3. **Component-Based Architecture**
   - Create reusable, self-contained components
   - Separate business logic from presentation
   - Make components configurable and testable
   - Each component should have one clear purpose

4. **Performance Standards**
   - Lazy load resources only when needed
   - Implement intelligent caching strategies
   - Debounce expensive operations
   - Prevent memory leaks with proper cleanup

5. **Error Handling & User Feedback**
   - Provide fallbacks for failed features
   - Clear, actionable error messages
   - Structured error reporting for debugging
   - Allow users to retry failed operations

6. **Responsive Design & Accessibility**
   - Mobile-first approach with progressive enhancement
   - Minimum 44px touch targets
   - Full keyboard accessibility
   - Proper ARIA labels and semantic HTML
   - Support accessibility preferences (reduced motion, high contrast)

### Modern CSS Architecture

```css
:root {
    /* Spacing system (8px grid) */
    --spacing-1: 4px;
    --spacing-2: 8px;
    --spacing-4: 16px;
    --spacing-6: 24px;
    --spacing-8: 32px;

    /* Typography scale */
    --font-size-base: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.25rem;
    --font-size-2xl: 1.5rem;

    /* Color system */
    --color-primary: #2563EB;
    --color-success: #10B981;
    --color-warning: #F59E0B;
    --color-error: #EF4444;

    /* Elevation (shadows) */
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
```

### Dark Mode Support

```css
:root {
    /* Light theme (default) */
    --bg-primary: #FFFFFF;
    --bg-secondary: #F8FAFC;
    --text-primary: #0F172A;
    --text-secondary: #64748B;
    --border-primary: #E2E8F0;
}

@media (prefers-color-scheme: dark) {
    :root {
        --bg-primary: #0F172A;
        --bg-secondary: #1E293B;
        --text-primary: #F8FAFC;
        --text-secondary: #CBD5E1;
        --border-primary: #334155;
    }
}

/* Components automatically adapt */
.card {
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
}
```

### Quality Checklist

#### Code Quality
- [ ] Follows established coding standards
- [ ] Implements proper error handling
- [ ] Avoids code duplication (DRY principle)

#### Security
- [ ] Validates and sanitizes all inputs
- [ ] Uses safe DOM manipulation methods
- [ ] Protects against XSS, CSRF vulnerabilities

#### Performance
- [ ] Minimizes bundle size and HTTP requests
- [ ] Implements lazy loading where appropriate
- [ ] Uses efficient algorithms and data structures

#### Accessibility
- [ ] Provides keyboard navigation support
- [ ] Includes proper ARIA labels and roles
- [ ] Maintains sufficient color contrast (4.5:1 minimum)
- [ ] Respects user preferences (reduced motion, high contrast)

#### Responsive Design
- [ ] Works on mobile, tablet, and desktop
- [ ] Uses appropriate touch targets (44px minimum)
- [ ] Implements mobile-first CSS

---

## Project-Specific Implementation

### Current File Structure
```
/
├── creator/                    # Modern creator interface
│   ├── assets/
│   │   ├── minimal-theme.css  # Main theme system
│   │   ├── course-creator.css # Creator-specific styles
│   │   └── js/                # JavaScript modules
│   ├── index.html             # Creator launcher
│   ├── course.html            # Course creator selector
│   ├── slides.html            # Slides creator selector
│   ├── cloud.html             # Cloud AI provider
│   ├── webllm.html            # WebLLM provider
│   ├── ollama.html            # Ollama provider
│   ├── puter.html             # Puter provider
│   └── slides/                # Slides-specific variants
├── docs/                      # Published course content
└── build_site.py             # Site generation script
```

### Creator Interface Components
- **LanguageSelector**: Multi-language selection with flag icons
- **ProgressIndicator**: Step-by-step progress tracking
- **CourseStructureDisplay**: Dynamic course outline preview
- **SettingsPanel**: Configurable options interface
- **AIProviderManager**: Unified AI provider integration

### AI Provider Integration

#### Supported Providers
- **Cloud AI**: OpenAI, Anthropic, Google (API-based)
- **WebLLM**: Browser-based inference (no server required)
- **Ollama**: Local model integration
- **Puter**: Free access to multiple providers

#### Provider Interface Pattern
```javascript
class AIProvider {
    constructor(config) {
        this.config = config;
    }

    async generateContent(prompt, options) {
        // Provider-specific implementation
    }

    validateConfiguration() {
        // Check required settings
    }

    getTemplate() {
        // Return provider-specific UI template
    }
}
```

### Build and Deployment

#### Content Generation Workflow
1. User selects AI provider and configures settings
2. AI generates course structure and content
3. Content is packaged as downloadable ZIP
4. User extracts to `docs/` directory
5. `build_site.py` processes content and updates navigation
6. GitHub Actions builds and deploys to GitHub Pages

#### Multi-language Support
- File naming: `filename.{lang}.md` (e.g., `index.en.md`)
- Supported languages: en, de, fr, hi, it, ja, pt, ro, ru, es, zh
- Auto-generated navigation for each language
- MkDocs i18n plugin handles language switching

### Maintenance Notes

#### When Adding New Features
1. Check if existing components can be extended
2. Follow the established provider pattern for AI integrations
3. Update language files for new UI text
4. Test across all supported AI providers
5. Verify mobile responsiveness and accessibility

#### Performance Considerations
- Creator interface loads modularly based on selected provider
- Large AI libraries are loaded lazily
- User preferences are cached in localStorage
- Generated content is optimized for MkDocs deployment

## Important Instruction Reminders
- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested