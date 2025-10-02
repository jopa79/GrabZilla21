/**
 * @fileoverview Performance utilities for debouncing, throttling, and optimization
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

// UI_CONFIG constants
const UI_CONFIG = {
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 300
};

/**
 * Performance Utilities
 * 
 * Collection of utilities for optimizing application performance
 * including debouncing, throttling, and memory management
 */

/**
 * Debounce function calls to prevent excessive execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {Object} options - Debounce options
 * @param {boolean} options.leading - Execute on leading edge
 * @param {boolean} options.trailing - Execute on trailing edge
 * @returns {Function} Debounced function
 */
function debounce(func, wait = 300, options = {}) {
    let timeout;
    let lastArgs;
    let lastThis;
    let result;
    
    const { leading = false, trailing = true } = options;
    
    function invokeFunc() {
        result = func.apply(lastThis, lastArgs);
        timeout = lastThis = lastArgs = null;
        return result;
    }
    
    function leadingEdge() {
        timeout = setTimeout(timerExpired, wait);
        return leading ? invokeFunc() : result;
    }
    
    function timerExpired() {
        const timeSinceLastCall = Date.now() - lastCallTime;
        
        if (timeSinceLastCall < wait && timeSinceLastCall >= 0) {
            timeout = setTimeout(timerExpired, wait - timeSinceLastCall);
        } else {
            timeout = null;
            if (trailing && lastArgs) {
                return invokeFunc();
            }
        }
    }
    
    let lastCallTime = 0;
    
    function debounced(...args) {
        lastArgs = args;
        lastThis = this;
        lastCallTime = Date.now();
        
        const isInvoking = !timeout;
        
        if (isInvoking) {
            return leadingEdge();
        }
        
        if (!timeout) {
            timeout = setTimeout(timerExpired, wait);
        }
        
        return result;
    }
    
    debounced.cancel = function() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = lastThis = lastArgs = null;
        }
    };
    
    debounced.flush = function() {
        return timeout ? invokeFunc() : result;
    };
    
    return debounced;
}

/**
 * Throttle function calls to limit execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} wait - Wait time in milliseconds
 * @param {Object} options - Throttle options
 * @param {boolean} options.leading - Execute on leading edge
 * @param {boolean} options.trailing - Execute on trailing edge
 * @returns {Function} Throttled function
 */
function throttle(func, wait = 300, options = {}) {
    let timeout;
    let previous = 0;
    let result;
    
    const { leading = true, trailing = true } = options;
    
    function later() {
        previous = leading === false ? 0 : Date.now();
        timeout = null;
        result = func.apply(this, arguments);
    }
    
    function throttled(...args) {
        const now = Date.now();
        
        if (!previous && leading === false) {
            previous = now;
        }
        
        const remaining = wait - (now - previous);
        
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            result = func.apply(this, args);
        } else if (!timeout && trailing !== false) {
            timeout = setTimeout(() => later.apply(this, args), remaining);
        }
        
        return result;
    }
    
    throttled.cancel = function() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
        previous = 0;
    };
    
    return throttled;
}

/**
 * Memoize function results for performance optimization
 * @param {Function} func - Function to memoize
 * @param {Function} resolver - Custom key resolver function
 * @returns {Function} Memoized function
 */
function memoize(func, resolver) {
    const cache = new Map();
    
    function memoized(...args) {
        const key = resolver ? resolver(...args) : JSON.stringify(args);
        
        if (cache.has(key)) {
            return cache.get(key);
        }
        
        const result = func.apply(this, args);
        cache.set(key, result);
        
        return result;
    }
    
    memoized.cache = cache;
    memoized.clear = () => cache.clear();
    
    return memoized;
}

/**
 * Create a function that only executes once
 * @param {Function} func - Function to execute once
 * @returns {Function} Function that executes only once
 */
function once(func) {
    let called = false;
    let result;
    
    return function(...args) {
        if (!called) {
            called = true;
            result = func.apply(this, args);
        }
        return result;
    };
}

/**
 * Batch DOM updates for better performance
 * @param {Function} callback - Function containing DOM updates
 * @returns {Promise} Promise that resolves after updates
 */
function batchDOMUpdates(callback) {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            callback();
            resolve();
        });
    });
}

/**
 * Lazy load function execution until needed
 * @param {Function} factory - Function that creates the actual function
 * @returns {Function} Lazy-loaded function
 */
function lazy(factory) {
    let func;
    let initialized = false;
    
    return function(...args) {
        if (!initialized) {
            func = factory();
            initialized = true;
        }
        return func.apply(this, args);
    };
}

/**
 * Create a timeout-based cache for expensive operations
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Object} Cache object with get/set/clear methods
 */
function createTimeoutCache(ttl = 300000) { // 5 minutes default
    const cache = new Map();
    const timers = new Map();
    
    return {
        get(key) {
            return cache.get(key);
        },
        
        set(key, value) {
            // Clear existing timer
            if (timers.has(key)) {
                clearTimeout(timers.get(key));
            }
            
            // Set value and timer
            cache.set(key, value);
            const timer = setTimeout(() => {
                cache.delete(key);
                timers.delete(key);
            }, ttl);
            
            timers.set(key, timer);
        },
        
        has(key) {
            return cache.has(key);
        },
        
        delete(key) {
            if (timers.has(key)) {
                clearTimeout(timers.get(key));
                timers.delete(key);
            }
            return cache.delete(key);
        },
        
        clear() {
            timers.forEach(timer => clearTimeout(timer));
            cache.clear();
            timers.clear();
        },
        
        size() {
            return cache.size;
        }
    };
}

/**
 * Sanitize user input to prevent XSS and injection attacks
 * @param {string} input - User input to sanitize
 * @param {Object} options - Sanitization options
 * @param {boolean} options.allowHTML - Allow safe HTML tags
 * @returns {string} Sanitized input
 */
function sanitizeInput(input, options = {}) {
    if (typeof input !== 'string') {
        return '';
    }
    
    let sanitized = input.trim();
    
    if (!options.allowHTML) {
        // Remove all HTML tags and dangerous characters
        sanitized = sanitized
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '');
    }
    
    return sanitized;
}

/**
 * Validate filename patterns for yt-dlp compatibility
 * @param {string} pattern - Filename pattern to validate
 * @returns {boolean} True if pattern is valid
 */
function validateFilenamePattern(pattern) {
    if (typeof pattern !== 'string') {
        return false;
    }
    
    // Check for dangerous characters
    const dangerousChars = /[<>:"|?*]/;
    if (dangerousChars.test(pattern)) {
        return false;
    }
    
    // Check for valid yt-dlp placeholders
    const validPlaceholders = /%(title|uploader|duration|ext|id|upload_date)s/g;
    const placeholders = pattern.match(validPlaceholders);
    
    // Must contain at least title and ext
    return placeholders && 
           placeholders.includes('%(title)s') && 
           placeholders.includes('%(ext)s');
}