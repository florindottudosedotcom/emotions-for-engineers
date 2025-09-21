# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

# MCP servers rules

## Context7 rules

Always use context7 when I need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tools to resolve library id and get library docs without me having to explicitly ask.

---

# 🏗️ UNIVERSAL DEVELOPMENT GUIDELINES

These guidelines provide general best practices for modern web development, applicable to any project.

## 🎯 Core Development Principles

### 1. **Security-First Development**

#### Essential Security Practices
- **DOM Manipulation**: Always use `createElement()` and `textContent`, never `innerHTML`
- **Input Validation**: Validate and sanitize ALL user inputs
- **API Security**: Validate URLs and implement proper CORS policies
- **XSS Prevention**: Use CSP headers and escape user-generated content
- **Dependencies**: Regularly audit and update third-party libraries

#### Security Implementation Pattern
```javascript
// ✅ Safe DOM manipulation
const element = document.createElement('div');
element.textContent = userInput; // Safe from XSS
parent.appendChild(element);

// ✅ Input validation
function validateInput(input) {
    if (!input || typeof input !== 'string') return false;
    return input.length <= MAX_LENGTH && /^[a-zA-Z0-9\s]+$/.test(input);
}
```

### 2. **Component-Based Architecture**

#### Architecture Principles
- **Modularity**: Create reusable, self-contained components
- **Separation of Concerns**: Keep business logic separate from presentation
- **Dependency Injection**: Make components configurable and testable
- **Single Responsibility**: Each component should have one clear purpose

#### Component Structure Pattern
```javascript
class UniversalComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.options = { ...this.defaultOptions, ...options };
        this.state = {};
        this.init();
    }

    get defaultOptions() {
        return {
            // Define sensible defaults
        };
    }

    init() {
        this.render();
        this.bindEvents();
        this.loadData();
    }

    render() {
        // Create DOM structure
    }

    bindEvents() {
        // Attach event listeners
    }

    destroy() {
        // Clean up resources
    }
}
```

### 3. **Performance Optimization Standards**

#### Core Optimizations
- **Lazy Loading**: Load resources only when needed
- **Code Splitting**: Break large bundles into smaller chunks
- **Caching**: Implement intelligent caching strategies
- **Debouncing**: Limit expensive operations
- **Memory Management**: Prevent memory leaks

#### Performance Patterns
```javascript
// ✅ Lazy loading with dynamic imports
async function loadFeature() {
    const { Feature } = await import('./feature.js');
    return new Feature();
}

// ✅ Debounced input handling
function createDebouncedHandler(fn, delay = 300) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ✅ Memory-conscious event handling
class ComponentWithCleanup {
    constructor() {
        this.handleResize = this.handleResize.bind(this);
    }

    init() {
        window.addEventListener('resize', this.handleResize);
    }

    destroy() {
        window.removeEventListener('resize', this.handleResize);
    }
}
```

### 4. **Error Handling & User Feedback**

#### Comprehensive Error Strategy
- **Graceful Degradation**: Provide fallbacks for failed features
- **User Communication**: Clear, actionable error messages
- **Logging**: Structured error reporting for debugging
- **Recovery**: Allow users to retry failed operations

```javascript
// ✅ Comprehensive error handling
async function performOperation() {
    try {
        showLoadingState();
        const result = await riskyOperation();
        showSuccessState(result);
        return result;
    } catch (error) {
        console.error('Operation failed:', error);
        showErrorState(error.message);
        trackError(error);
        throw error;
    } finally {
        hideLoadingState();
    }
}
```

### 5. **Responsive Design & Accessibility**

#### Universal Design Principles
- **Mobile-First**: Start with mobile constraints, enhance for larger screens
- **Touch-Friendly**: Minimum 44px touch targets
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **High Contrast**: Support for accessibility preferences

#### Responsive Implementation
```css
/* Mobile-first responsive design */
.component {
    /* Mobile styles (default) */
    padding: 16px;
    font-size: 16px;
}

@media (min-width: 768px) {
    .component {
        /* Tablet enhancements */
        padding: 24px;
    }
}

@media (min-width: 1024px) {
    .component {
        /* Desktop enhancements */
        padding: 32px;
        max-width: 1200px;
    }
}

/* Accessibility support */
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}

@media (prefers-contrast: high) {
    .component {
        border: 2px solid;
        background: white;
        color: black;
    }
}
```

## 🎨 Modern CSS Architecture

### Design System Foundation
```css
:root {
    /* Spacing system (8px grid) */
    --spacing-1: 4px;
    --spacing-2: 8px;
    --spacing-4: 16px;
    --spacing-6: 24px;
    --spacing-8: 32px;
    --spacing-12: 48px;

    /* Typography scale */
    --font-size-sm: 0.875rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.25rem;
    --font-size-2xl: 1.5rem;
    --font-size-3xl: 2rem;
    --font-size-4xl: 2.5rem;

    /* Color system */
    --color-primary: #2563EB;
    --color-success: #10B981;
    --color-warning: #F59E0B;
    --color-error: #EF4444;

    /* Elevation (shadows) */
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

    /* Transitions */
    --transition-fast: 200ms ease-out;
    --transition-normal: 250ms ease-out;
}
```

### Component Styling Standards
```css
/* Button component system */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: var(--spacing-2) var(--spacing-6);
    border-radius: 6px;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all var(--transition-fast);
    border: 2px solid transparent;
}

.btn-primary {
    background: var(--color-primary);
    color: white;
}

.btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
}

/* Card component system */
.card {
    background: white;
    border-radius: 12px;
    padding: var(--spacing-6);
    box-shadow: var(--shadow-sm);
    border: 1px solid #E2E8F0;
}

.card:hover {
    box-shadow: var(--shadow-md);
    transition: box-shadow var(--transition-normal);
}
```

## 🌙 Dark Mode & Theme System

### Adaptive Theme Architecture

#### CSS Variable System for Themes
```css
:root {
    /* Light theme colors (default) */
    --bg-primary: #FFFFFF;
    --bg-secondary: #F8FAFC;
    --bg-tertiary: #F1F5F9;
    --text-primary: #0F172A;
    --text-secondary: #64748B;
    --text-tertiary: #94A3B8;
    --border-primary: #E2E8F0;
    --border-secondary: #CBD5E1;

    /* Semantic colors that work in both themes */
    --color-primary: #2563EB;
    --color-success: #10B981;
    --color-warning: #F59E0B;
    --color-error: #EF4444;

    /* Adaptive shadows */
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Dark theme overrides */
@media (prefers-color-scheme: dark) {
    :root {
        /* Dark theme backgrounds */
        --bg-primary: #0F172A;
        --bg-secondary: #1E293B;
        --bg-tertiary: #334155;

        /* Dark theme text */
        --text-primary: #F8FAFC;
        --text-secondary: #CBD5E1;
        --text-tertiary: #94A3B8;

        /* Dark theme borders */
        --border-primary: #334155;
        --border-secondary: #475569;

        /* Adapted shadows for dark backgrounds */
        --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
        --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
        --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
    }
}

/* Manual theme override classes */
[data-theme="light"] {
    --bg-primary: #FFFFFF;
    --bg-secondary: #F8FAFC;
    --bg-tertiary: #F1F5F9;
    --text-primary: #0F172A;
    --text-secondary: #64748B;
    --text-tertiary: #94A3B8;
    --border-primary: #E2E8F0;
    --border-secondary: #CBD5E1;
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] {
    --bg-primary: #0F172A;
    --bg-secondary: #1E293B;
    --bg-tertiary: #334155;
    --text-primary: #F8FAFC;
    --text-secondary: #CBD5E1;
    --text-tertiary: #94A3B8;
    --border-primary: #334155;
    --border-secondary: #475569;
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
}
```

#### Theme-Aware Component Styling
```css
/* Components automatically adapt to theme */
.card {
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
    box-shadow: var(--shadow-sm);
}

.btn {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 2px solid var(--border-primary);
}

.btn-primary {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
}

/* Input fields with theme support */
.input {
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
}

.input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

/* Navigation and header components */
.navbar {
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);
}

.sidebar {
    background: var(--bg-primary);
    border-right: 1px solid var(--border-primary);
}
```

### JavaScript Theme Management

#### Theme Detection and Persistence
```javascript
class ThemeManager {
    constructor() {
        this.theme = this.getInitialTheme();
        this.init();
    }

    init() {
        this.applyTheme(this.theme);
        this.setupEventListeners();
        this.createThemeToggle();
    }

    getInitialTheme() {
        // Check for saved user preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
            return savedTheme;
        }

        // Default to auto (follow system preference)
        return 'auto';
    }

    applyTheme(theme) {
        const root = document.documentElement;

        if (theme === 'auto') {
            // Remove manual theme, let CSS media queries handle it
            root.removeAttribute('data-theme');
        } else {
            // Apply manual theme override
            root.setAttribute('data-theme', theme);
        }

        this.theme = theme;
        localStorage.setItem('theme', theme);
        this.updateThemeToggle();
    }

    getEffectiveTheme() {
        if (this.theme === 'auto') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return this.theme;
    }

    setupEventListeners() {
        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', () => {
            if (this.theme === 'auto') {
                this.updateThemeToggle();
                this.notifyThemeChange();
            }
        });
    }

    createThemeToggle() {
        const toggle = document.createElement('select');
        toggle.className = 'theme-toggle';
        toggle.innerHTML = `
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        `;

        toggle.value = this.theme;
        toggle.addEventListener('change', (e) => {
            this.applyTheme(e.target.value);
        });

        // Insert toggle into navigation or settings area
        const nav = document.querySelector('.navbar, .header, .settings');
        if (nav) {
            nav.appendChild(toggle);
        }
    }

    updateThemeToggle() {
        const toggle = document.querySelector('.theme-toggle');
        if (toggle) {
            toggle.value = this.theme;
        }
    }

    notifyThemeChange() {
        // Dispatch custom event for other components to react
        window.dispatchEvent(new CustomEvent('themeChange', {
            detail: {
                theme: this.theme,
                effectiveTheme: this.getEffectiveTheme()
            }
        }));
    }

    // Public API methods
    setTheme(theme) {
        if (['light', 'dark', 'auto'].includes(theme)) {
            this.applyTheme(theme);
            this.notifyThemeChange();
        }
    }

    toggleTheme() {
        const themes = ['auto', 'light', 'dark'];
        const currentIndex = themes.indexOf(this.theme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        this.setTheme(nextTheme);
    }
}

// Initialize theme manager
const themeManager = new ThemeManager();

// Export for use in other modules
window.themeManager = themeManager;
```

#### Component Integration Example
```javascript
class DarkModeAwareComponent {
    constructor(container) {
        this.container = container;
        this.currentTheme = themeManager.getEffectiveTheme();
        this.init();
    }

    init() {
        this.render();
        this.setupThemeListener();
    }

    setupThemeListener() {
        window.addEventListener('themeChange', (e) => {
            this.currentTheme = e.detail.effectiveTheme;
            this.onThemeChange();
        });
    }

    onThemeChange() {
        // Update component-specific styling or behavior
        this.updateCharts();
        this.updateImages();
        this.updateVideoOverlays();
    }

    updateCharts() {
        // Example: Update chart colors for dark mode
        if (this.chart) {
            const isDark = this.currentTheme === 'dark';
            this.chart.updateOptions({
                theme: {
                    mode: isDark ? 'dark' : 'light'
                },
                chart: {
                    background: isDark ? '#1E293B' : '#FFFFFF'
                }
            });
        }
    }

    updateImages() {
        // Example: Switch to dark variants of images
        const images = this.container.querySelectorAll('[data-dark-src]');
        images.forEach(img => {
            if (this.currentTheme === 'dark') {
                img.src = img.dataset.darkSrc;
            } else {
                img.src = img.dataset.lightSrc || img.dataset.src;
            }
        });
    }

    updateVideoOverlays() {
        // Example: Adjust video overlay opacity for better visibility
        const overlays = this.container.querySelectorAll('.video-overlay');
        overlays.forEach(overlay => {
            overlay.style.backgroundColor = this.currentTheme === 'dark'
                ? 'rgba(0, 0, 0, 0.7)'
                : 'rgba(255, 255, 255, 0.9)';
        });
    }
}
```

### Advanced Theme Features

#### Theme Transition Animations
```css
/* Smooth theme transitions */
* {
    transition:
        background-color var(--transition-normal),
        color var(--transition-normal),
        border-color var(--transition-normal),
        box-shadow var(--transition-normal);
}

/* Disable transitions during theme switching to prevent flashing */
.theme-transitioning * {
    transition: none !important;
}
```

#### Theme-Specific Content
```html
<!-- Show different content based on theme -->
<div class="theme-content">
    <div class="light-only">
        <img src="light-logo.svg" alt="Logo">
        <p>Welcome to our bright interface!</p>
    </div>
    <div class="dark-only">
        <img src="dark-logo.svg" alt="Logo">
        <p>Welcome to our sleek dark interface!</p>
    </div>
</div>
```

```css
.light-only {
    display: block;
}

.dark-only {
    display: none;
}

@media (prefers-color-scheme: dark) {
    .light-only {
        display: none;
    }

    .dark-only {
        display: block;
    }
}

[data-theme="light"] .light-only {
    display: block;
}

[data-theme="light"] .dark-only {
    display: none;
}

[data-theme="dark"] .light-only {
    display: none;
}

[data-theme="dark"] .dark-only {
    display: block;
}
```

#### Accessibility Considerations
```javascript
// Respect user's preference for reduced motion
class AccessibleThemeManager extends ThemeManager {
    applyTheme(theme) {
        const root = document.documentElement;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            root.classList.add('theme-transitioning');
        }

        super.applyTheme(theme);

        // Remove transition disable after theme is applied
        if (prefersReducedMotion) {
            setTimeout(() => {
                root.classList.remove('theme-transitioning');
            }, 50);
        }
    }
}
```

### Theme Testing Checklist

#### Visual Testing
- [ ] All text remains readable in both themes
- [ ] Interactive elements have proper contrast ratios (4.5:1 minimum)
- [ ] Focus indicators are visible in both themes
- [ ] Borders and dividers provide adequate separation
- [ ] Images and icons work well in both themes
- [ ] Charts and data visualizations adapt appropriately

#### Functional Testing
- [ ] Theme preference persists across page loads
- [ ] System theme changes are detected and applied
- [ ] Manual theme override works correctly
- [ ] Theme toggle is accessible via keyboard
- [ ] No flash of unstyled content (FOUC) during theme switching
- [ ] Print styles work well for both themes

#### Performance Testing
- [ ] Theme switching is smooth and fast
- [ ] No layout shifts during theme changes
- [ ] CSS file size remains reasonable with theme additions
- [ ] JavaScript theme detection doesn't block rendering

## 🔧 Development Workflow

### Universal Development Process

#### 1. **Planning Phase**
- Identify reusable components vs. feature-specific code
- Plan for accessibility and internationalization
- Consider performance implications from the start
- Design error handling and edge cases

#### 2. **Implementation Phase**
- Start with mobile-first responsive design
- Implement security measures from the beginning
- Use semantic HTML and progressive enhancement
- Write comprehensive error handling

#### 3. **Testing Phase**
- Test keyboard navigation and screen readers
- Verify responsive design across devices
- Test error states and recovery flows
- Validate performance metrics

#### 4. **Documentation Phase**
- Document component APIs and usage
- Update style guides and design systems
- Record accessibility considerations
- Maintain change logs

### Quality Checklist

#### Code Quality
- [ ] Follows established coding standards
- [ ] Uses consistent naming conventions
- [ ] Implements proper error handling
- [ ] Includes appropriate comments and documentation
- [ ] Avoids code duplication (DRY principle)

#### Security
- [ ] Validates and sanitizes all inputs
- [ ] Uses safe DOM manipulation methods
- [ ] Implements proper authentication/authorization
- [ ] Protects against common vulnerabilities (XSS, CSRF)
- [ ] Uses HTTPS and secure headers

#### Performance
- [ ] Minimizes bundle size and HTTP requests
- [ ] Implements lazy loading where appropriate
- [ ] Uses efficient algorithms and data structures
- [ ] Optimizes images and media assets
- [ ] Implements caching strategies

#### Accessibility
- [ ] Provides keyboard navigation support
- [ ] Includes proper ARIA labels and roles
- [ ] Maintains sufficient color contrast
- [ ] Supports screen readers and assistive technologies
- [ ] Respects user preferences (reduced motion, high contrast)

#### Responsive Design
- [ ] Works on mobile, tablet, and desktop
- [ ] Uses appropriate touch targets (44px minimum)
- [ ] Implements mobile-first CSS
- [ ] Handles various screen orientations
- [ ] Provides optimal user experience across devices

---

# 📋 PROJECT-SPECIFIC IMPLEMENTATION

This section contains implementation details specific to this Emotions for Engineers project.

## Current File Structure

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

## Creator Interface Components

### Available Components
- **LanguageSelector**: Multi-language selection with flag icons
- **ProgressIndicator**: Step-by-step progress tracking
- **CourseStructureDisplay**: Dynamic course outline preview
- **SettingsPanel**: Configurable options interface
- **AIProviderManager**: Unified AI provider integration

### Component Usage Pattern
```javascript
// Initialize creator with provider-specific configuration
class CourseCreator {
    constructor(provider) {
        this.provider = provider;
        this.common = new CreatorCommon();
        this.languageSelector = new LanguageSelector('lang-container');
        this.progressIndicator = new ProgressIndicator('progress-container');
        this.init();
    }
}
```

## AI Provider Integration

### Supported Providers
- **Cloud AI**: OpenAI, Anthropic, Google (API-based)
- **WebLLM**: Browser-based inference (no server required)
- **Ollama**: Local model integration
- **Puter**: Free access to multiple providers

### Provider Interface
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

## Build and Deployment

### Content Generation Workflow
1. User selects AI provider and configures settings
2. AI generates course structure and content
3. Content is packaged as downloadable ZIP
4. User extracts to `docs/` directory
5. `build_site.py` processes content and updates navigation
6. GitHub Actions builds and deploys to GitHub Pages

### Multi-language Support
- File naming: `filename.{lang}.md` (e.g., `index.en.md`)
- Supported languages: en, de, fr, hi, it, ja, pt, ro, ru, es, zh
- Auto-generated navigation for each language
- MkDocs i18n plugin handles language switching

## Maintenance Notes

### When Adding New Features
1. Check if existing components can be extended
2. Follow the established provider pattern for AI integrations
3. Update language files for new UI text
4. Test across all supported AI providers
5. Verify mobile responsiveness and accessibility

### Performance Considerations
- Creator interface loads modularly based on selected provider
- Large AI libraries are loaded lazily
- User preferences are cached in localStorage
- Generated content is optimized for MkDocs deployment

---

# 🎨 Modern Minimalistic UI Design Guidelines

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

## Visual Design Standards

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
