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


# 🏗️ DEVELOPMENT GUIDELINES - OPTIMIZED ARCHITECTURE STANDARDS

These guidelines ensure all future development follows the optimized, modular architecture established in the comprehensive refactoring.

## 📂 File Organization Standards

### JavaScript Structure

```
docs/assets/javascripts/
├── security.js              # Always loaded first - security utilities
├── creator-common.js         # Shared utilities across all creators
├── creator-components.js     # Reusable UI components
├── [feature]-creator.js      # Specific feature implementations
└── [feature]-components.js   # Feature-specific components (if needed)
```

### Component-Based Architecture

- **NEVER** embed JavaScript in HTML files
- **ALWAYS** use modular, reusable components
- **EXTRACT** common functionality into shared utilities
- **SEPARATE** business logic from presentation

## 🔒 Security-First Development

### Mandatory Security Practices

1. **DOM Manipulation:** ALWAYS use `createElement()` and `textContent`, NEVER `innerHTML`
2. **Input Validation:** Validate and sanitize ALL user inputs
3. **API Calls:** Use `SecurityManager.validateUrl()` before external requests
4. **XSS Prevention:** Use security utilities for all dynamic content

### Required Security Imports

```html
<script src="assets/javascripts/security.js"></script>
<script src="assets/javascripts/creator-common.js"></script>
```

## 🎨 UI Component Standards

### Reusable Components Created

- **LanguageSelector** - For all language selection needs
- **ProgressIndicator** - For all progress tracking
- **CourseStructureDisplay** - For content preview
- **SettingsPanel** - For configurable options

### Component Usage Rules

```javascript
// ✅ CORRECT - Use existing components
this.languageSelector = new LanguageSelector('container-id', options);

// ❌ WRONG - Don't recreate functionality
const select = document.createElement('select'); // Use LanguageSelector instead
```

## 📱 CSS & Styling Standards

### Use CSS Custom Properties

```css
:root {
    --primary-color: #667eea;
    --border-radius: 12px;
    --transition: all 0.3s ease;
}
```

### Required Responsive & Accessibility

- Mobile-first responsive design
- Dark mode support via `@media (prefers-color-scheme: dark)`
- High contrast support via `@media (prefers-contrast: high)`
- Focus indicators for keyboard navigation
- Screen reader compatibility

## 🚀 Performance Standards

### Mandatory Optimizations

1. **Lazy Loading:** Import heavy dependencies only when needed
2. **Caching:** Use localStorage for user preferences
3. **Debouncing:** Use `common.debounce()` for input handlers
4. **Error Handling:** Comprehensive try-catch with user feedback

### Code Examples

```javascript
// ✅ Lazy loading
const JSZip = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');

// ✅ Caching
this.common.saveToLocalStorage('feature_settings', data);

// ✅ Error handling with user feedback
try {
    await this.performAction();
    this.common.showSuccess('Action completed!');
} catch (error) {
    this.common.showError(`Action failed: ${error.message}`);
}
```

## 🔧 Development Workflow

### For Every New Feature

1. **Plan:** Identify reusable components vs feature-specific code
2. **Security:** Apply security standards from start
3. **Components:** Use existing components or extend them
4. **Testing:** Verify accessibility, responsive design, error handling
5. **Documentation:** Update this guide if new patterns are established

### File Creation Checklist

- [ ] Security utilities imported
- [ ] Common utilities used (no duplication)
- [ ] Components follow established patterns
- [ ] Responsive CSS implemented
- [ ] Accessibility features included
- [ ] Error handling comprehensive
- [ ] Performance optimizations applied

## 🎯 Code Quality Standards

### JavaScript Best Practices

```javascript
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
```

### HTML Structure Standards

```html
<!-- ✅ Component containers, not hardcoded elements -->
<div id="language-container"></div>
<div id="progress-container"></div>
<div id="settings-container"></div>

<!-- ✅ Proper script loading order -->
<script src="assets/javascripts/security.js"></script>
<script src="assets/javascripts/creator-common.js"></script>
<script src="assets/javascripts/creator-components.js"></script>
<script src="assets/javascripts/[feature]-creator.js"></script>
```

## 📝 Maintenance Standards

### Before Adding Any Code

1. **Check existing utilities** - Can CreatorCommon handle this?
2. **Check existing components** - Can existing components be extended?
3. **Check security implications** - Are inputs validated?
4. **Check performance** - Will this impact load times?

### Code Review Questions

- Does this follow DRY principles?
- Is this accessible and responsive?
- Does this maintain security standards?
- Can this be reused for other features?

## 🎯 GOAL

Maintain the 81% code reduction and modular architecture achieved in the optimization while ensuring all new features are secure, performant, and maintainable.


# Modern Minimalistic UI Design Guidelines

## Core Principles

### 1. **Less is More**
- Remove unnecessary elements that don't serve a clear purpose
- Every element should have a functional or aesthetic reason for existence
- Prioritize content over decoration
- Use progressive disclosure to reveal complexity gradually

### 2. **Clarity Above All**
- Make the user's path obvious and intuitive
- Use clear, concise language
- Ensure high contrast for readability
- Maintain consistent visual hierarchy

## Visual Design

### Typography
- **Font Choice**: Use 1-2 high-quality typefaces maximum (e.g., Inter, Poppins, or system fonts)
- **Hierarchy**: Establish clear typographic scales (H1: 2.5rem, H2: 2rem, H3: 1.5rem, Body: 1rem)
- **Line Height**: 1.4-1.6 for body text, 1.2-1.3 for headings
- **Font Weights**: Use 2-3 weights maximum (regular 400, medium 500, bold 600/700)

### Color Palette
- **Primary Colors**: 1-2 brand colors maximum
- **Neutrals**: 5-7 shades of gray from white to near-black
- **Accent**: One bright color for CTAs and highlights
- **Example Palette**:
  - Primary: #2563EB (Blue)
  - Success: #10B981 (Green)
  - Warning: #F59E0B (Amber)
  - Error: #EF4444 (Red)
  - Neutrals: #FFFFFF, #F8FAFC, #E2E8F0, #64748B, #334155, #0F172A

### Spacing & Layout
- **Grid System**: Use 8px or 4px base unit for consistent spacing
- **Common Spacing**: 4px, 8px, 16px, 24px, 32px, 48px, 64px, 96px
- **Max Width**: 1200px for content containers, 600px for reading content
- **Margins**: 16px minimum on mobile, 24px+ on desktop
- **Component Padding**: 12px-24px internal padding for buttons/cards

### Borders & Shadows
- **Border Radius**: 4px-8px for subtle rounding, 12px-16px for cards
- **Borders**: 1px solid with low opacity colors (#E2E8F0)
- **Shadows**: Subtle and layered
  - Small: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
  - Medium: `0 4px 6px -1px rgba(0, 0, 0, 0.1)`
  - Large: `0 10px 15px -3px rgba(0, 0, 0, 0.1)`

## Component Guidelines

### Buttons
- **Primary**: Solid background, high contrast
- **Secondary**: Outlined or subtle background
- **Sizes**: Small (32px), Medium (40px), Large (48px) height
- **Padding**: 12px-24px horizontal, 8px-12px vertical
- **States**: Hover (slightly darker), Active (pressed), Disabled (low opacity)

### Forms
- **Input Height**: 40px-48px minimum for touch targets
- **Labels**: Always visible, positioned above inputs
- **Validation**: Inline feedback with clear error states
- **Focus States**: Prominent outline or border change

### Navigation
- **Header**: 60px-80px height, sticky positioning
- **Logo**: Left-aligned, clear and legible
- **Menu Items**: 44px minimum touch target
- **Mobile**: Hamburger menu with full-screen overlay

### Cards & Containers
- **Background**: White or subtle off-white (#FAFBFC)
- **Padding**: 20px-32px internal spacing
- **Border Radius**: 8px-12px
- **Shadow**: Subtle elevation shadow

## Layout Patterns

### Page Structure
```
Header (Navigation)
├── Hero/Banner Section
├── Main Content Area
│   ├── Primary Content (70%)
│   └── Sidebar (30%) [optional]
└── Footer
```

### Content Sections
- **Section Spacing**: 80px-120px between major sections
- **Content Width**: 600px-800px for optimal reading
- **Alignment**: Left-aligned text, center-aligned headings optional
- **Breathing Room**: Generous whitespace around elements

## Interactive Elements

### Micro-Interactions
- **Hover States**: Subtle color/opacity changes
- **Transitions**: 200ms-300ms ease-out for most interactions
- **Loading States**: Skeleton screens or subtle spinners
- **Feedback**: Toast notifications for actions

### Animation Guidelines
- **Duration**: 200ms for small elements, 300ms for larger changes
- **Easing**: `ease-out` for entrances, `ease-in` for exits
- **Purpose**: Only animate to provide feedback or guide attention
- **Reduce Motion**: Respect `prefers-reduced-motion` settings

## Responsive Design

### Breakpoints
- **Mobile**: 320px-767px
- **Tablet**: 768px-1023px
- **Desktop**: 1024px+

### Mobile-First Approach
- Start with mobile layout
- Progressive enhancement for larger screens
- Touch-friendly targets (44px minimum)
- Simplified navigation patterns

## Accessibility Standards

### Color & Contrast
- **WCAG AA**: 4.5:1 contrast ratio for normal text
- **WCAG AA**: 3:1 contrast ratio for large text (18pt+)
- **Color Independence**: Don't rely solely on color for meaning

### Navigation & Focus
- **Keyboard Navigation**: Tab order follows visual order
- **Focus Indicators**: Visible focus states for all interactive elements
- **Skip Links**: Allow users to skip to main content
- **Screen Reader**: Proper heading hierarchy and ARIA labels

## Content Strategy

### Writing Guidelines
- **Concise**: Use clear, direct language
- **Scannable**: Break up text with headings and bullet points
- **Action-Oriented**: Use active voice and clear CTAs
- **Consistent**: Maintain consistent tone and terminology

### Information Architecture
- **Progressive Disclosure**: Show only what users need when they need it
- **Logical Grouping**: Related items should be visually grouped
- **Clear Hierarchy**: Most important content should be most prominent

## Performance Considerations

### Loading & Speed
- **Critical CSS**: Inline above-the-fold styles
- **Image Optimization**: WebP format, proper sizing
- **Lazy Loading**: Load images and content as needed
- **Minimize**: Reduce HTTP requests and file sizes

### Technical Implementation
- **Semantic HTML**: Use proper HTML5 elements
- **CSS Architecture**: Organized, maintainable stylesheets
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Error Handling**: Graceful degradation for failed requests

## Modern Design Trends to Incorporate

### Visual Elements
- **Glassmorphism**: Subtle blur effects for overlays
- **Neumorphism**: Soft, subtle shadows for depth (use sparingly)
- **Gradient Accents**: Subtle gradients for backgrounds or CTAs
- **Custom Icons**: Consistent icon system (Heroicons, Lucide, or custom)

### Layout Innovations
- **Asymmetrical Grids**: Breaking traditional grid patterns thoughtfully
- **Large Typography**: Bold, oversized headings for impact
- **Immersive Media**: Full-width images and videos
- **Split Screens**: Dividing content into distinct visual areas

## Quality Checklist

### Visual Consistency
- [ ] Typography scale is consistent across all pages
- [ ] Color usage follows established palette
- [ ] Spacing follows 8px grid system
- [ ] Component styles are reusable and documented

### User Experience
- [ ] Navigation is intuitive and consistent
- [ ] Loading states are handled gracefully
- [ ] Error states provide clear guidance
- [ ] Mobile experience is touch-friendly

### Technical Excellence
- [ ] Semantic HTML structure
- [ ] Accessible keyboard navigation
- [ ] Proper heading hierarchy
- [ ] Optimized images and assets
- [ ] Cross-browser compatibility tested

### Content Quality
- [ ] Text is scannable and concise
- [ ] Call-to-actions are clear and prominent
- [ ] Information hierarchy guides user attention
- [ ] Content serves user goals effectively

## 🎯 GOAL

Remember: The best minimalistic design doesn't feel minimal to users—it feels effortless and intuitive. Focus on removing friction, not features.
