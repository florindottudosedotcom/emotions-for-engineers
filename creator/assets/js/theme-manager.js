/**
 * Universal Theme Manager - Following Design Guidelines
 * Provides automatic dark mode detection and manual theme switching
 */
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
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Disable transitions during theme switch if user prefers reduced motion
        if (prefersReducedMotion) {
            root.classList.add('theme-transitioning');
        }

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

        // Remove transition disable after theme is applied
        if (prefersReducedMotion) {
            setTimeout(() => {
                root.classList.remove('theme-transitioning');
            }, 50);
        }

        // Notify other components of theme change
        this.notifyThemeChange();
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
        // Skip creating theme toggle - use system preference only
        this.toggleElement = null;
    }

    updateToggleContent(toggle) {
        const effectiveTheme = this.getEffectiveTheme();
        const icons = {
            light: '☀️',
            dark: '🌙',
            auto: '🔄'
        };

        const labels = {
            light: 'Light',
            dark: 'Dark',
            auto: 'Auto'
        };

        if (this.theme === 'auto') {
            toggle.innerHTML = `${icons.auto} Auto (${effectiveTheme === 'dark' ? '🌙' : '☀️'})`;
            toggle.setAttribute('title', `Auto theme (currently ${effectiveTheme})`);
        } else {
            toggle.innerHTML = `${icons[this.theme]} ${labels[this.theme]}`;
            toggle.setAttribute('title', `${labels[this.theme]} theme`);
        }
    }

    updateThemeToggle() {
        if (this.toggleElement) {
            this.updateToggleContent(this.toggleElement);
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
        }
    }

    toggleTheme() {
        const themes = ['auto', 'light', 'dark'];
        const currentIndex = themes.indexOf(this.theme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        this.setTheme(nextTheme);
    }

    getCurrentTheme() {
        return this.theme;
    }

    getEffectiveTheme() {
        if (this.theme === 'auto') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return this.theme;
    }
}

/**
 * Enhanced Theme-Aware Component Base Class
 * Components can extend this to automatically respond to theme changes
 */
class ThemeAwareComponent {
    constructor(container) {
        this.container = container;
        this.currentTheme = window.themeManager?.getEffectiveTheme() || 'light';
        this.setupThemeListener();
    }

    setupThemeListener() {
        window.addEventListener('themeChange', (e) => {
            this.currentTheme = e.detail.effectiveTheme;
            this.onThemeChange();
        });
    }

    onThemeChange() {
        // Override this method in subclasses
        this.updateForTheme();
    }

    updateForTheme() {
        // Default implementation - can be overridden
        if (this.container) {
            this.container.setAttribute('data-current-theme', this.currentTheme);
        }
    }
}

// Initialize theme manager when DOM is ready
function initThemeManager() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.themeManager = new ThemeManager();
        });
    } else {
        window.themeManager = new ThemeManager();
    }
}

// Auto-initialize
initThemeManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ThemeManager, ThemeAwareComponent };
}