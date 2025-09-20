/**
 * Theme Manager - Following CLAUDE.md Guidelines
 * Handles dark/light mode switching and persistence
 */

import { logger } from './utils.js';

export class ThemeManager {
    constructor() {
        this.theme = this.getInitialTheme();
        this.init();
    }

    init() {
        this.applyTheme(this.theme);
        this.setupEventListeners();
        logger.info('Theme Manager initialized');
    }

    getInitialTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
            return savedTheme;
        }
        return 'auto';
    }

    applyTheme(theme) {
        const root = document.documentElement;

        if (theme === 'auto') {
            root.removeAttribute('data-theme');
        } else {
            root.setAttribute('data-theme', theme);
        }

        this.theme = theme;
        localStorage.setItem('theme', theme);
        this.notifyThemeChange();
    }

    getEffectiveTheme() {
        if (this.theme === 'auto') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return this.theme;
    }

    setupEventListeners() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', () => {
            if (this.theme === 'auto') {
                this.notifyThemeChange();
            }
        });
    }

    notifyThemeChange() {
        window.dispatchEvent(new CustomEvent('themeChange', {
            detail: {
                theme: this.theme,
                effectiveTheme: this.getEffectiveTheme()
            }
        }));
    }

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
}