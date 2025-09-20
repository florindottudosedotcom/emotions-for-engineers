/**
 * DOM Manipulation Utilities - Following CLAUDE.md Guidelines
 * Safe DOM manipulation using createElement and textContent
 */

import { sanitizeString, escapeHtml } from './utils.js';

/**
 * DOM utility class for safe element creation and manipulation
 */
export class DOM {
    /**
     * Create element with attributes and content
     * @param {string} tag - HTML tag name
     * @param {Object} attributes - Element attributes
     * @param {string|Node|Array} content - Element content
     * @returns {HTMLElement} Created element
     */
    static create(tag, attributes = {}, content = null) {
        const element = document.createElement(tag);

        // Set attributes safely
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else if (key.startsWith('on') && typeof value === 'function') {
                // Event listeners
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });

        // Set content safely
        if (content !== null) {
            this.setContent(element, content);
        }

        return element;
    }

    /**
     * Set element content safely
     * @param {HTMLElement} element - Target element
     * @param {string|Node|Array} content - Content to set
     */
    static setContent(element, content) {
        // Clear existing content
        element.innerHTML = '';

        if (Array.isArray(content)) {
            content.forEach(item => this.setContent(element, item));
        } else if (content instanceof Node) {
            element.appendChild(content);
        } else if (typeof content === 'string') {
            element.textContent = content;
        }
    }

    /**
     * Query single element with error handling
     * @param {string} selector - CSS selector
     * @param {Element} parent - Parent element (optional)
     * @returns {Element|null} Found element or null
     */
    static query(selector, parent = document) {
        try {
            return parent.querySelector(selector);
        } catch (error) {
            console.warn('Invalid selector:', selector, error);
            return null;
        }
    }

    /**
     * Query multiple elements with error handling
     * @param {string} selector - CSS selector
     * @param {Element} parent - Parent element (optional)
     * @returns {NodeList} Found elements
     */
    static queryAll(selector, parent = document) {
        try {
            return parent.querySelectorAll(selector);
        } catch (error) {
            console.warn('Invalid selector:', selector, error);
            return [];
        }
    }

    /**
     * Add class to element(s)
     * @param {Element|NodeList|string} target - Target element(s) or selector
     * @param {string} className - Class name to add
     */
    static addClass(target, className) {
        const elements = this._getElements(target);
        elements.forEach(el => el?.classList.add(className));
    }

    /**
     * Remove class from element(s)
     * @param {Element|NodeList|string} target - Target element(s) or selector
     * @param {string} className - Class name to remove
     */
    static removeClass(target, className) {
        const elements = this._getElements(target);
        elements.forEach(el => el?.classList.remove(className));
    }

    /**
     * Toggle class on element(s)
     * @param {Element|NodeList|string} target - Target element(s) or selector
     * @param {string} className - Class name to toggle
     */
    static toggleClass(target, className) {
        const elements = this._getElements(target);
        elements.forEach(el => el?.classList.toggle(className));
    }

    /**
     * Check if element has class
     * @param {Element|string} target - Target element or selector
     * @param {string} className - Class name to check
     * @returns {boolean} True if element has class
     */
    static hasClass(target, className) {
        const element = typeof target === 'string' ? this.query(target) : target;
        return element?.classList.contains(className) || false;
    }

    /**
     * Set attribute on element(s)
     * @param {Element|NodeList|string} target - Target element(s) or selector
     * @param {string} attribute - Attribute name
     * @param {string} value - Attribute value
     */
    static setAttribute(target, attribute, value) {
        const elements = this._getElements(target);
        elements.forEach(el => el?.setAttribute(attribute, value));
    }

    /**
     * Get attribute from element
     * @param {Element|string} target - Target element or selector
     * @param {string} attribute - Attribute name
     * @returns {string|null} Attribute value
     */
    static getAttribute(target, attribute) {
        const element = typeof target === 'string' ? this.query(target) : target;
        return element?.getAttribute(attribute) || null;
    }

    /**
     * Remove attribute from element(s)
     * @param {Element|NodeList|string} target - Target element(s) or selector
     * @param {string} attribute - Attribute name
     */
    static removeAttribute(target, attribute) {
        const elements = this._getElements(target);
        elements.forEach(el => el?.removeAttribute(attribute));
    }

    /**
     * Show element(s)
     * @param {Element|NodeList|string} target - Target element(s) or selector
     */
    static show(target) {
        this.removeClass(target, 'hidden');
        this.setAttribute(target, 'aria-hidden', 'false');
    }

    /**
     * Hide element(s)
     * @param {Element|NodeList|string} target - Target element(s) or selector
     */
    static hide(target) {
        this.addClass(target, 'hidden');
        this.setAttribute(target, 'aria-hidden', 'true');
    }

    /**
     * Toggle visibility of element(s)
     * @param {Element|NodeList|string} target - Target element(s) or selector
     */
    static toggle(target) {
        const elements = this._getElements(target);
        elements.forEach(el => {
            if (this.hasClass(el, 'hidden')) {
                this.show(el);
            } else {
                this.hide(el);
            }
        });
    }

    /**
     * Check if element is visible
     * @param {Element|string} target - Target element or selector
     * @returns {boolean} True if visible
     */
    static isVisible(target) {
        const element = typeof target === 'string' ? this.query(target) : target;
        if (!element) return false;
        return !this.hasClass(element, 'hidden') &&
               element.offsetParent !== null &&
               getComputedStyle(element).display !== 'none';
    }

    /**
     * Get element dimensions
     * @param {Element|string} target - Target element or selector
     * @returns {Object} Width and height
     */
    static getDimensions(target) {
        const element = typeof target === 'string' ? this.query(target) : target;
        if (!element) return { width: 0, height: 0 };

        const rect = element.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right
        };
    }

    /**
     * Set element dimensions
     * @param {Element|string} target - Target element or selector
     * @param {Object} dimensions - Width and height
     */
    static setDimensions(target, { width, height }) {
        const element = typeof target === 'string' ? this.query(target) : target;
        if (!element) return;

        if (width !== undefined) element.style.width = typeof width === 'number' ? `${width}px` : width;
        if (height !== undefined) element.style.height = typeof height === 'number' ? `${height}px` : height;
    }

    /**
     * Insert element after another element
     * @param {Element} newElement - Element to insert
     * @param {Element} referenceElement - Reference element
     */
    static insertAfter(newElement, referenceElement) {
        referenceElement.parentNode?.insertBefore(newElement, referenceElement.nextSibling);
    }

    /**
     * Remove element(s) from DOM
     * @param {Element|NodeList|string} target - Target element(s) or selector
     */
    static remove(target) {
        const elements = this._getElements(target);
        elements.forEach(el => el?.remove());
    }

    /**
     * Empty element content
     * @param {Element|string} target - Target element or selector
     */
    static empty(target) {
        const element = typeof target === 'string' ? this.query(target) : target;
        if (element) {
            element.innerHTML = '';
        }
    }

    /**
     * Focus element with error handling
     * @param {Element|string} target - Target element or selector
     * @param {Object} options - Focus options
     */
    static focus(target, options = {}) {
        const element = typeof target === 'string' ? this.query(target) : target;
        if (element && typeof element.focus === 'function') {
            try {
                element.focus(options);
            } catch (error) {
                console.warn('Focus error:', error);
            }
        }
    }

    /**
     * Scroll element into view
     * @param {Element|string} target - Target element or selector
     * @param {Object} options - Scroll options
     */
    static scrollIntoView(target, options = { behavior: 'smooth', block: 'nearest' }) {
        const element = typeof target === 'string' ? this.query(target) : target;
        if (element && typeof element.scrollIntoView === 'function') {
            element.scrollIntoView(options);
        }
    }

    /**
     * Get form data as object
     * @param {HTMLFormElement|string} form - Form element or selector
     * @returns {Object} Form data object
     */
    static getFormData(form) {
        const formElement = typeof form === 'string' ? this.query(form) : form;
        if (!formElement) return {};

        const formData = new FormData(formElement);
        const data = {};

        for (const [key, value] of formData.entries()) {
            if (data[key]) {
                // Handle multiple values (like checkboxes)
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }

        return data;
    }

    /**
     * Set form data from object
     * @param {HTMLFormElement|string} form - Form element or selector
     * @param {Object} data - Data object
     */
    static setFormData(form, data) {
        const formElement = typeof form === 'string' ? this.query(form) : form;
        if (!formElement) return;

        Object.entries(data).forEach(([key, value]) => {
            const element = formElement.querySelector(`[name="${key}"]`);
            if (element) {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    element.checked = Boolean(value);
                } else {
                    element.value = value;
                }
            }
        });
    }

    /**
     * Convert element(s) to array
     * @param {Element|NodeList|string} target - Target element(s) or selector
     * @returns {Array<Element>} Array of elements
     * @private
     */
    static _getElements(target) {
        if (typeof target === 'string') {
            return Array.from(this.queryAll(target));
        } else if (target instanceof NodeList) {
            return Array.from(target);
        } else if (target instanceof Element) {
            return [target];
        }
        return [];
    }
}

/**
 * Event handling utilities
 */
export class Events {
    /**
     * Add event listener with delegation support
     * @param {Element|string} target - Target element or selector
     * @param {string} event - Event name
     * @param {Function|string} handler - Event handler or selector for delegation
     * @param {Function} delegateHandler - Handler for delegation
     * @param {Object} options - Event options
     */
    static on(target, event, handler, delegateHandler = null, options = {}) {
        const element = typeof target === 'string' ? DOM.query(target) : target;
        if (!element) return;

        if (typeof handler === 'string' && delegateHandler) {
            // Event delegation
            const actualHandler = (e) => {
                const delegateTarget = e.target.closest(handler);
                if (delegateTarget && element.contains(delegateTarget)) {
                    delegateHandler.call(delegateTarget, e);
                }
            };
            element.addEventListener(event, actualHandler, options);
            return actualHandler;
        } else {
            // Direct event
            element.addEventListener(event, handler, options);
            return handler;
        }
    }

    /**
     * Remove event listener
     * @param {Element|string} target - Target element or selector
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     */
    static off(target, event, handler, options = {}) {
        const element = typeof target === 'string' ? DOM.query(target) : target;
        if (element) {
            element.removeEventListener(event, handler, options);
        }
    }

    /**
     * Add one-time event listener
     * @param {Element|string} target - Target element or selector
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     */
    static once(target, event, handler, options = {}) {
        return this.on(target, event, handler, null, { ...options, once: true });
    }

    /**
     * Trigger custom event
     * @param {Element|string} target - Target element or selector
     * @param {string} event - Event name
     * @param {any} detail - Event detail
     */
    static trigger(target, event, detail = null) {
        const element = typeof target === 'string' ? DOM.query(target) : target;
        if (element) {
            const customEvent = new CustomEvent(event, {
                detail,
                bubbles: true,
                cancelable: true
            });
            element.dispatchEvent(customEvent);
        }
    }

    /**
     * Prevent default and stop propagation
     * @param {Event} event - Event object
     */
    static prevent(event) {
        event.preventDefault();
        event.stopPropagation();
    }
}

/**
 * Animation utilities
 */
export class Animation {
    /**
     * Fade in element
     * @param {Element|string} target - Target element or selector
     * @param {number} duration - Animation duration in ms
     * @returns {Promise} Animation promise
     */
    static fadeIn(target, duration = 300) {
        const element = typeof target === 'string' ? DOM.query(target) : target;
        if (!element) return Promise.resolve();

        return new Promise(resolve => {
            element.style.opacity = '0';
            element.style.display = 'block';
            element.style.transition = `opacity ${duration}ms ease-in-out`;

            requestAnimationFrame(() => {
                element.style.opacity = '1';
                setTimeout(() => {
                    element.style.transition = '';
                    resolve();
                }, duration);
            });
        });
    }

    /**
     * Fade out element
     * @param {Element|string} target - Target element or selector
     * @param {number} duration - Animation duration in ms
     * @returns {Promise} Animation promise
     */
    static fadeOut(target, duration = 300) {
        const element = typeof target === 'string' ? DOM.query(target) : target;
        if (!element) return Promise.resolve();

        return new Promise(resolve => {
            element.style.transition = `opacity ${duration}ms ease-in-out`;
            element.style.opacity = '0';

            setTimeout(() => {
                element.style.display = 'none';
                element.style.transition = '';
                element.style.opacity = '';
                resolve();
            }, duration);
        });
    }

    /**
     * Slide down element
     * @param {Element|string} target - Target element or selector
     * @param {number} duration - Animation duration in ms
     * @returns {Promise} Animation promise
     */
    static slideDown(target, duration = 300) {
        const element = typeof target === 'string' ? DOM.query(target) : target;
        if (!element) return Promise.resolve();

        return new Promise(resolve => {
            element.style.display = 'block';
            element.style.height = '0';
            element.style.overflow = 'hidden';
            element.style.transition = `height ${duration}ms ease-in-out`;

            const height = element.scrollHeight;
            requestAnimationFrame(() => {
                element.style.height = `${height}px`;
                setTimeout(() => {
                    element.style.height = '';
                    element.style.overflow = '';
                    element.style.transition = '';
                    resolve();
                }, duration);
            });
        });
    }

    /**
     * Slide up element
     * @param {Element|string} target - Target element or selector
     * @param {number} duration - Animation duration in ms
     * @returns {Promise} Animation promise
     */
    static slideUp(target, duration = 300) {
        const element = typeof target === 'string' ? DOM.query(target) : target;
        if (!element) return Promise.resolve();

        return new Promise(resolve => {
            const height = element.offsetHeight;
            element.style.height = `${height}px`;
            element.style.overflow = 'hidden';
            element.style.transition = `height ${duration}ms ease-in-out`;

            requestAnimationFrame(() => {
                element.style.height = '0';
                setTimeout(() => {
                    element.style.display = 'none';
                    element.style.height = '';
                    element.style.overflow = '';
                    element.style.transition = '';
                    resolve();
                }, duration);
            });
        });
    }
}

/**
 * DOM utilities for common tasks
 */
export const DOMUtils = {
    DOM,
    Events,
    Animation
};