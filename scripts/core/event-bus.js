// GrabZilla 2.1 - Application Event Bus
// Centralized event system for loose coupling between modules

class EventBus {
    constructor() {
        this.listeners = new Map();
        this.eventHistory = [];
        this.maxHistorySize = 100;
        this.debugMode = false;
    }

    // Enable/disable debug logging
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    // Subscribe to an event
    on(event, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        const listener = {
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            context: options.context || null,
            id: this.generateListenerId()
        };

        const listeners = this.listeners.get(event);
        listeners.push(listener);

        // Sort by priority (higher priority first)
        listeners.sort((a, b) => b.priority - a.priority);

        if (this.debugMode) {
            logger.debug(`[EventBus] Subscribed to '${event}' (ID: ${listener.id})`);
        }

        return listener.id;
    }

    // Subscribe to an event only once
    once(event, callback, options = {}) {
        return this.on(event, callback, { ...options, once: true });
    }

    // Unsubscribe from an event
    off(event, callbackOrId) {
        if (!this.listeners.has(event)) {
            return false;
        }

        const listeners = this.listeners.get(event);
        let removed = false;

        if (typeof callbackOrId === 'function') {
            // Remove by callback function
            const index = listeners.findIndex(listener => listener.callback === callbackOrId);
            if (index > -1) {
                listeners.splice(index, 1);
                removed = true;
            }
        } else if (typeof callbackOrId === 'string') {
            // Remove by listener ID
            const index = listeners.findIndex(listener => listener.id === callbackOrId);
            if (index > -1) {
                listeners.splice(index, 1);
                removed = true;
            }
        }

        // Clean up empty event arrays
        if (listeners.length === 0) {
            this.listeners.delete(event);
        }

        if (this.debugMode && removed) {
            logger.debug(`[EventBus] Unsubscribed from '${event}'`);
        }

        return removed;
    }

    // Remove all listeners for an event
    removeAllListeners(event) {
        if (event) {
            const removed = this.listeners.has(event);
            this.listeners.delete(event);
            if (this.debugMode && removed) {
                logger.debug(`[EventBus] Removed all listeners for '${event}'`);
            }
            return removed;
        } else {
            // Remove all listeners for all events
            const count = this.listeners.size;
            this.listeners.clear();
            if (this.debugMode && count > 0) {
                logger.debug(`[EventBus] Removed all listeners (${count} events)`);
            }
            return count > 0;
        }
    }

    // Emit an event
    emit(event, data = null) {
        const eventData = {
            event,
            data,
            timestamp: Date.now(),
            id: this.generateEventId()
        };

        // Add to history
        this.addToHistory(eventData);

        if (this.debugMode) {
            logger.debug(`[EventBus] Emitting '${event}'`, data);
        }

        if (!this.listeners.has(event)) {
            if (this.debugMode) {
                logger.debug(`[EventBus] No listeners for '${event}'`);
            }
            return 0;
        }

        const listeners = [...this.listeners.get(event)]; // Copy to avoid modification during iteration
        let callbackCount = 0;
        const removeList = [];

        for (const listener of listeners) {
            try {
                // Call the callback with appropriate context
                if (listener.context) {
                    listener.callback.call(listener.context, data, eventData);
                } else {
                    listener.callback(data, eventData);
                }

                callbackCount++;

                // Mark for removal if it's a one-time listener
                if (listener.once) {
                    removeList.push(listener.id);
                }

            } catch (error) {
                logger.error(`[EventBus] Error in listener for '${event}':`, error.message);

                // Optionally emit an error event
                if (event !== 'error') {
                    setTimeout(() => {
                        this.emit('error', {
                            originalEvent: event,
                            originalData: data,
                            error,
                            listenerId: listener.id
                        });
                    }, 0);
                }
            }
        }

        // Remove one-time listeners
        removeList.forEach(id => this.off(event, id));

        return callbackCount;
    }

    // Emit an event asynchronously
    async emitAsync(event, data = null) {
        const eventData = {
            event,
            data,
            timestamp: Date.now(),
            id: this.generateEventId()
        };

        // Add to history
        this.addToHistory(eventData);

        if (this.debugMode) {
            logger.debug(`[EventBus] Emitting async '${event}'`, data);
        }

        if (!this.listeners.has(event)) {
            return 0;
        }

        const listeners = [...this.listeners.get(event)];
        let callbackCount = 0;
        const removeList = [];
        const promises = [];

        for (const listener of listeners) {
            const promise = (async () => {
                try {
                    let result;
                    if (listener.context) {
                        result = listener.callback.call(listener.context, data, eventData);
                    } else {
                        result = listener.callback(data, eventData);
                    }

                    // Handle async callbacks
                    if (result instanceof Promise) {
                        await result;
                    }

                    callbackCount++;

                    if (listener.once) {
                        removeList.push(listener.id);
                    }

                } catch (error) {
                    logger.error(`[EventBus] Error in async listener for '${event}':`, error.message);

                    if (event !== 'error') {
                        setTimeout(() => {
                            this.emit('error', {
                                originalEvent: event,
                                originalData: data,
                                error,
                                listenerId: listener.id
                            });
                        }, 0);
                    }
                }
            })();

            promises.push(promise);
        }

        await Promise.all(promises);

        // Remove one-time listeners
        removeList.forEach(id => this.off(event, id));

        return callbackCount;
    }

    // Check if there are listeners for an event
    hasListeners(event) {
        return this.listeners.has(event) && this.listeners.get(event).length > 0;
    }

    // Get the number of listeners for an event
    getListenerCount(event) {
        return this.listeners.has(event) ? this.listeners.get(event).length : 0;
    }

    // Get all event names that have listeners
    getEventNames() {
        return Array.from(this.listeners.keys());
    }

    // Get event history
    getEventHistory(eventFilter = null, limit = 10) {
        let history = [...this.eventHistory];

        if (eventFilter) {
            history = history.filter(item => item.event === eventFilter);
        }

        return history.slice(-limit);
    }

    // Clear event history
    clearHistory() {
        this.eventHistory = [];
    }

    // Generate unique listener ID
    generateListenerId() {
        return 'listener_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Generate unique event ID
    generateEventId() {
        return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Add event to history
    addToHistory(eventData) {
        this.eventHistory.push(eventData);

        // Limit history size
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }
    }

    // Wait for a specific event (returns a promise)
    waitFor(event, timeout = 5000) {
        return new Promise((resolve, reject) => {
            let timeoutId;
            let listenerId;

            // Set up timeout
            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    this.off(event, listenerId);
                    reject(new Error(`Timeout waiting for event '${event}'`));
                }, timeout);
            }

            // Listen for the event
            listenerId = this.once(event, (data) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                resolve(data);
            });
        });
    }

    // Create a namespace for events (useful for modules)
    namespace(prefix) {
        return {
            on: (event, callback, options) => this.on(`${prefix}:${event}`, callback, options),
            once: (event, callback, options) => this.once(`${prefix}:${event}`, callback, options),
            off: (event, callback) => this.off(`${prefix}:${event}`, callback),
            emit: (event, data) => this.emit(`${prefix}:${event}`, data),
            emitAsync: (event, data) => this.emitAsync(`${prefix}:${event}`, data),
            hasListeners: (event) => this.hasListeners(`${prefix}:${event}`),
            getListenerCount: (event) => this.getListenerCount(`${prefix}:${event}`)
        };
    }

    // Debug information
    getDebugInfo() {
        const events = this.getEventNames().map(event => ({
            event,
            listenerCount: this.getListenerCount(event),
            listeners: this.listeners.get(event).map(l => ({
                id: l.id,
                priority: l.priority,
                once: l.once,
                hasContext: !!l.context
            }))
        }));

        return {
            totalEvents: events.length,
            totalListeners: events.reduce((sum, e) => sum + e.listenerCount, 0),
            events,
            historySize: this.eventHistory.length
        };
    }
}

// Create global event bus instance
const eventBus = new EventBus();

// Enable debug mode in development
if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    eventBus.setDebugMode(true);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = { EventBus, eventBus };
} else {
    // Browser environment - attach to window
    window.EventBus = EventBus;
    window.eventBus = eventBus;
}