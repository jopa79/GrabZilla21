/**
 * @fileoverview Enhanced event emitter with type safety and error handling
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

import { EVENTS } from '../constants/config.js';

/**
 * Enhanced Event Emitter with Observer Pattern
 * 
 * Provides type-safe event handling with proper error boundaries
 * and performance optimizations for the application state system
 */
class EventEmitter {
    /**
     * Creates new EventEmitter instance
     */
    constructor() {
        this.listeners = new Map();
        this.maxListeners = 50; // Prevent memory leaks
    }
    
    /**
     * Register event listener with validation
     * @param {string} event - Event name (must be from EVENTS constants)
     * @param {Function} callback - Event callback function
     * @param {Object} options - Listener options
     * @param {boolean} options.once - Remove listener after first call
     * @param {number} options.priority - Execution priority (higher = earlier)
     * @throws {Error} When event name is invalid or max listeners exceeded
     */
    on(event, callback, options = {}) {
        // Validate event name
        if (!Object.values(EVENTS).includes(event)) {
            console.warn(`Unknown event type: ${event}. Consider adding to EVENTS constants.`);
        }
        
        // Validate callback
        if (typeof callback !== 'function') {
            throw new Error('Event callback must be a function');
        }
        
        // Initialize listeners array for event
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        
        const eventListeners = this.listeners.get(event);
        
        // Check max listeners limit
        if (eventListeners.length >= this.maxListeners) {
            throw new Error(`Maximum listeners (${this.maxListeners}) exceeded for event: ${event}`);
        }
        
        // Create listener object with metadata
        const listener = {
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            id: this.generateListenerId()
        };
        
        // Insert listener based on priority (higher priority first)
        const insertIndex = eventListeners.findIndex(l => l.priority < listener.priority);
        if (insertIndex === -1) {
            eventListeners.push(listener);
        } else {
            eventListeners.splice(insertIndex, 0, listener);
        }
        
        return listener.id; // Return ID for removal
    }
    
    /**
     * Register one-time event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback function
     * @returns {string} Listener ID for removal
     */
    once(event, callback) {
        return this.on(event, callback, { once: true });
    }
    
    /**
     * Remove event listener by callback or ID
     * @param {string} event - Event name
     * @param {Function|string} callbackOrId - Callback function or listener ID
     * @returns {boolean} True if listener was removed
     */
    off(event, callbackOrId) {
        if (!this.listeners.has(event)) {
            return false;
        }
        
        const eventListeners = this.listeners.get(event);
        let index = -1;
        
        if (typeof callbackOrId === 'string') {
            // Remove by ID
            index = eventListeners.findIndex(l => l.id === callbackOrId);
        } else {
            // Remove by callback function
            index = eventListeners.findIndex(l => l.callback === callbackOrId);
        }
        
        if (index > -1) {
            eventListeners.splice(index, 1);
            return true;
        }
        
        return false;
    }
    
    /**
     * Remove all listeners for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners removed
     */
    removeAllListeners(event) {
        if (!this.listeners.has(event)) {
            return 0;
        }
        
        const count = this.listeners.get(event).length;
        this.listeners.delete(event);
        return count;
    }
    
    /**
     * Emit event to all registered listeners with error handling
     * @param {string} event - Event name
     * @param {Object} data - Event data
     * @returns {Promise<Object>} Emission results with success/error counts
     */
    async emit(event, data = {}) {
        if (!this.listeners.has(event)) {
            return { success: 0, errors: 0, listeners: 0 };
        }
        
        const eventListeners = [...this.listeners.get(event)]; // Copy to avoid mutation during iteration
        const results = { success: 0, errors: 0, listeners: eventListeners.length };
        const toRemove = []; // Track one-time listeners to remove
        
        // Execute listeners with error boundaries
        for (const listener of eventListeners) {
            try {
                // Execute callback (handle both sync and async)
                const result = listener.callback(data);
                if (result instanceof Promise) {
                    await result;
                }
                
                results.success++;
                
                // Mark one-time listeners for removal
                if (listener.once) {
                    toRemove.push(listener.id);
                }
                
            } catch (error) {
                results.errors++;
                console.error(`Error in event listener for ${event}:`, {
                    error: error.message,
                    stack: error.stack,
                    listenerId: listener.id,
                    eventData: data
                });
            }
        }
        
        // Remove one-time listeners
        toRemove.forEach(id => this.off(event, id));
        
        return results;
    }
    
    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
        return this.listeners.has(event) ? this.listeners.get(event).length : 0;
    }
    
    /**
     * Get all event names with listeners
     * @returns {string[]} Array of event names
     */
    eventNames() {
        return Array.from(this.listeners.keys());
    }
    
    /**
     * Set maximum number of listeners per event
     * @param {number} max - Maximum listeners (0 = unlimited)
     */
    setMaxListeners(max) {
        this.maxListeners = Math.max(0, max);
    }
    
    /**
     * Generate unique listener ID
     * @returns {string} Unique listener identifier
     * @private
     */
    generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Clear all listeners (useful for cleanup)
     */
    clear() {
        this.listeners.clear();
    }
}