/**
 * Component Registry System - Following CLAUDE.md Guidelines
 * Centralized registration and management of modular components
 */

import { logger } from './utils.js';

/**
 * Component Registry for managing component lifecycle
 */
export class ComponentRegistry {
    constructor() {
        this.components = new Map();
        this.componentTypes = new Map();
        this.isInitialized = false;
    }

    /**
     * Initialize the component registry
     */
    init() {
        this.registerBuiltInComponents();
        this.isInitialized = true;
        logger.info('ComponentRegistry initialized');
    }

    /**
     * Register built-in component types
     */
    registerBuiltInComponents() {
        // Register component types with their module paths
        this.registerComponentType('LanguageSelector', './components/LanguageSelector.js');
        this.registerComponentType('ProviderSelector', './components/ProviderSelector.js');
        this.registerComponentType('StatusDisplay', './components/StatusDisplay.js');
        this.registerComponentType('ToastUIEditor', './components/ToastUIEditor.js');
        this.registerComponentType('KonvaEditor', './components/KonvaEditor.js');
    }

    /**
     * Register a component type
     * @param {string} name - Component type name
     * @param {string} modulePath - Path to component module
     * @param {Object} metadata - Additional component metadata
     */
    registerComponentType(name, modulePath, metadata = {}) {
        this.componentTypes.set(name, {
            name,
            modulePath,
            metadata: {
                category: 'ui',
                version: '1.0.0',
                dependencies: [],
                ...metadata
            },
            instances: new Set()
        });

        logger.debug(`Component type registered: ${name}`);
    }

    /**
     * Create a component instance
     * @param {string} typeName - Component type name
     * @param {string} instanceId - Unique instance identifier
     * @param {string} containerId - DOM container ID
     * @param {Object} options - Component options
     * @returns {Promise<Object>} Component instance
     */
    async createComponent(typeName, instanceId, containerId, options = {}) {
        const componentType = this.componentTypes.get(typeName);
        if (!componentType) {
            throw new Error(`Unknown component type: ${typeName}`);
        }

        // Check if instance already exists
        if (this.components.has(instanceId)) {
            throw new Error(`Component instance already exists: ${instanceId}`);
        }

        try {
            // Dynamically import the component module
            const module = await import(componentType.modulePath);
            const ComponentClass = module[typeName];

            if (!ComponentClass) {
                throw new Error(`Component class ${typeName} not found in module ${componentType.modulePath}`);
            }

            // Create component instance
            const instance = new ComponentClass(containerId, options);

            // Initialize the component
            await instance.init();

            // Register the instance
            this.components.set(instanceId, {
                id: instanceId,
                type: typeName,
                instance,
                containerId,
                options,
                createdAt: new Date(),
                isInitialized: true
            });

            // Add to type's instance set
            componentType.instances.add(instanceId);

            logger.info(`Component created: ${typeName} (${instanceId})`);
            return instance;

        } catch (error) {
            logger.error(`Failed to create component ${typeName} (${instanceId}):`, error);
            throw error;
        }
    }

    /**
     * Get a component instance
     * @param {string} instanceId - Instance identifier
     * @returns {Object|null} Component instance or null if not found
     */
    getComponent(instanceId) {
        const componentData = this.components.get(instanceId);
        return componentData ? componentData.instance : null;
    }

    /**
     * Get all components of a specific type
     * @param {string} typeName - Component type name
     * @returns {Array} Array of component instances
     */
    getComponentsByType(typeName) {
        const componentType = this.componentTypes.get(typeName);
        if (!componentType) {
            return [];
        }

        return Array.from(componentType.instances).map(instanceId => {
            const componentData = this.components.get(instanceId);
            return componentData ? componentData.instance : null;
        }).filter(Boolean);
    }

    /**
     * Destroy a component instance
     * @param {string} instanceId - Instance identifier
     * @returns {boolean} True if destroyed successfully
     */
    destroyComponent(instanceId) {
        const componentData = this.components.get(instanceId);
        if (!componentData) {
            logger.warn(`Component not found for destruction: ${instanceId}`);
            return false;
        }

        try {
            // Call component's destroy method if available
            if (componentData.instance && typeof componentData.instance.destroy === 'function') {
                componentData.instance.destroy();
            }

            // Remove from type's instance set
            const componentType = this.componentTypes.get(componentData.type);
            if (componentType) {
                componentType.instances.delete(instanceId);
            }

            // Remove from registry
            this.components.delete(instanceId);

            logger.info(`Component destroyed: ${componentData.type} (${instanceId})`);
            return true;

        } catch (error) {
            logger.error(`Failed to destroy component ${instanceId}:`, error);
            return false;
        }
    }

    /**
     * Destroy all components of a specific type
     * @param {string} typeName - Component type name
     * @returns {number} Number of components destroyed
     */
    destroyComponentsByType(typeName) {
        const instances = this.getComponentsByType(typeName);
        let destroyedCount = 0;

        instances.forEach(instance => {
            const instanceId = this.findInstanceId(instance);
            if (instanceId && this.destroyComponent(instanceId)) {
                destroyedCount++;
            }
        });

        return destroyedCount;
    }

    /**
     * Find instance ID by component instance
     * @param {Object} instance - Component instance
     * @returns {string|null} Instance ID or null if not found
     */
    findInstanceId(instance) {
        for (const [instanceId, componentData] of this.components) {
            if (componentData.instance === instance) {
                return instanceId;
            }
        }
        return null;
    }

    /**
     * Get component information
     * @param {string} instanceId - Instance identifier
     * @returns {Object|null} Component information
     */
    getComponentInfo(instanceId) {
        const componentData = this.components.get(instanceId);
        if (!componentData) {
            return null;
        }

        return {
            id: componentData.id,
            type: componentData.type,
            containerId: componentData.containerId,
            options: componentData.options,
            createdAt: componentData.createdAt,
            isInitialized: componentData.isInitialized,
            status: componentData.instance && typeof componentData.instance.getStatus === 'function' ?
                    componentData.instance.getStatus() : null
        };
    }

    /**
     * List all registered component types
     * @returns {Array} Array of component type information
     */
    listComponentTypes() {
        return Array.from(this.componentTypes.values()).map(type => ({
            name: type.name,
            modulePath: type.modulePath,
            metadata: type.metadata,
            instanceCount: type.instances.size
        }));
    }

    /**
     * List all component instances
     * @returns {Array} Array of component instance information
     */
    listComponents() {
        return Array.from(this.components.values()).map(componentData => ({
            id: componentData.id,
            type: componentData.type,
            containerId: componentData.containerId,
            createdAt: componentData.createdAt,
            isInitialized: componentData.isInitialized
        }));
    }

    /**
     * Check if a component type is registered
     * @param {string} typeName - Component type name
     * @returns {boolean} True if registered
     */
    hasComponentType(typeName) {
        return this.componentTypes.has(typeName);
    }

    /**
     * Check if a component instance exists
     * @param {string} instanceId - Instance identifier
     * @returns {boolean} True if exists
     */
    hasComponent(instanceId) {
        return this.components.has(instanceId);
    }

    /**
     * Refresh a component (destroy and recreate)
     * @param {string} instanceId - Instance identifier
     * @returns {Promise<Object>} New component instance
     */
    async refreshComponent(instanceId) {
        const componentData = this.components.get(instanceId);
        if (!componentData) {
            throw new Error(`Component not found: ${instanceId}`);
        }

        const { type, containerId, options } = componentData;

        // Destroy existing component
        this.destroyComponent(instanceId);

        // Create new component with same parameters
        return await this.createComponent(type, instanceId, containerId, options);
    }

    /**
     * Update component options
     * @param {string} instanceId - Instance identifier
     * @param {Object} newOptions - New options to merge
     * @returns {boolean} True if updated successfully
     */
    updateComponentOptions(instanceId, newOptions) {
        const componentData = this.components.get(instanceId);
        if (!componentData) {
            return false;
        }

        // Merge new options
        componentData.options = { ...componentData.options, ...newOptions };

        // Update component if it supports option updates
        if (componentData.instance && typeof componentData.instance.updateOptions === 'function') {
            componentData.instance.updateOptions(componentData.options);
        }

        return true;
    }

    /**
     * Batch create components
     * @param {Array} componentConfigs - Array of component configurations
     * @returns {Promise<Array>} Array of created component instances
     */
    async batchCreateComponents(componentConfigs) {
        const results = [];

        for (const config of componentConfigs) {
            try {
                const instance = await this.createComponent(
                    config.type,
                    config.id,
                    config.containerId,
                    config.options
                );
                results.push({ success: true, id: config.id, instance });
            } catch (error) {
                results.push({ success: false, id: config.id, error: error.message });
                logger.error(`Failed to create component in batch: ${config.id}`, error);
            }
        }

        return results;
    }

    /**
     * Get registry statistics
     * @returns {Object} Registry statistics
     */
    getStatistics() {
        const typeStats = {};
        for (const [typeName, typeData] of this.componentTypes) {
            typeStats[typeName] = typeData.instances.size;
        }

        return {
            totalTypes: this.componentTypes.size,
            totalInstances: this.components.size,
            instancesByType: typeStats,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Validate component configuration
     * @param {Object} config - Component configuration
     * @returns {Object} Validation result
     */
    validateComponentConfig(config) {
        const errors = [];

        if (!config.type) {
            errors.push('Component type is required');
        } else if (!this.hasComponentType(config.type)) {
            errors.push(`Unknown component type: ${config.type}`);
        }

        if (!config.id) {
            errors.push('Component ID is required');
        } else if (this.hasComponent(config.id)) {
            errors.push(`Component ID already exists: ${config.id}`);
        }

        if (!config.containerId) {
            errors.push('Container ID is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Clean up all components and reset registry
     */
    destroy() {
        // Destroy all component instances
        for (const instanceId of this.components.keys()) {
            this.destroyComponent(instanceId);
        }

        // Clear registrations
        this.components.clear();
        this.componentTypes.clear();
        this.isInitialized = false;

        logger.info('ComponentRegistry destroyed');
    }

    /**
     * Export registry state for debugging
     * @returns {Object} Registry state
     */
    exportState() {
        return {
            componentTypes: Array.from(this.componentTypes.entries()),
            components: Array.from(this.components.entries()).map(([id, data]) => ({
                id,
                type: data.type,
                containerId: data.containerId,
                options: data.options,
                createdAt: data.createdAt,
                isInitialized: data.isInitialized
            })),
            statistics: this.getStatistics()
        };
    }
}

// Create global registry instance
export const componentRegistry = new ComponentRegistry();

// Auto-initialize when module loads
componentRegistry.init();

// Make available globally for debugging
if (typeof window !== 'undefined') {
    window.componentRegistry = componentRegistry;
}