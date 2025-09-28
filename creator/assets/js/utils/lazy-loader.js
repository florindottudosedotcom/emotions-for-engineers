/**
 * Lazy Asset Loader - Following CLAUDE.md Guidelines
 * Provides utilities for dynamically loading CSS and JavaScript assets
 */

const loadedAssets = new Set();

/**
 * Lazy load a CSS file
 * @param {string} href - CSS file path
 * @param {string} id - Optional ID for the link element
 * @returns {Promise} Promise that resolves when CSS is loaded
 */
export function loadCSS(href, id = null) {
    return new Promise((resolve, reject) => {
        if (loadedAssets.has(href)) {
            resolve();
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        if (id) link.id = id;

        link.onload = () => {
            loadedAssets.add(href);
            resolve();
        };

        link.onerror = () => {
            reject(new Error(`Failed to load CSS: ${href}`));
        };

        document.head.appendChild(link);
    });
}

/**
 * Lazy load a JavaScript file
 * @param {string} src - JavaScript file path
 * @param {string} id - Optional ID for the script element
 * @returns {Promise} Promise that resolves when script is loaded
 */
export function loadJS(src, id = null) {
    return new Promise((resolve, reject) => {
        if (loadedAssets.has(src)) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        if (id) script.id = id;

        script.onload = () => {
            loadedAssets.add(src);
            resolve();
        };

        script.onerror = () => {
            reject(new Error(`Failed to load JS: ${src}`));
        };

        document.head.appendChild(script);
    });
}

/**
 * Load multiple assets in parallel
 * @param {Array} assets - Array of {type: 'css'|'js', src: string, id?: string}
 * @returns {Promise} Promise that resolves when all assets are loaded
 */
export function loadAssets(assets) {
    const promises = assets.map(asset => {
        if (asset.type === 'css') {
            return loadCSS(asset.src, asset.id);
        } else if (asset.type === 'js') {
            return loadJS(asset.src, asset.id);
        } else {
            return Promise.reject(new Error(`Unknown asset type: ${asset.type}`));
        }
    });

    return Promise.all(promises);
}

/**
 * Preload an asset without executing/applying it
 * @param {string} href - Asset path
 * @param {string} as - Resource type (script, style, etc.)
 */
export function preloadAsset(href, as = 'script') {
    if (loadedAssets.has(`preload:${href}`)) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;

    document.head.appendChild(link);
    loadedAssets.add(`preload:${href}`);
}

/**
 * Load editor assets on demand
 * @returns {Promise} Promise that resolves when editor assets are ready
 */
export async function loadEditorAssets() {
    const editorAssets = [
        { type: 'css', src: 'assets/toastui-editor.min.css', id: 'toastui-editor-css' },
        { type: 'js', src: 'assets/js/toastui-editor-all.min.js', id: 'toastui-editor-js' }
    ];

    try {
        await loadAssets(editorAssets);

        // Load dark theme CSS if needed
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            await loadCSS('assets/toastui-editor-dark.css', 'toastui-editor-dark-css');
        }

        return true;
    } catch (error) {
        console.error('Failed to load editor assets:', error);
        throw error;
    }
}