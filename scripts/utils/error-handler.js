/**
 * @fileoverview Enhanced error handling utilities for desktop application
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

/**
 * ERROR HANDLING UTILITIES
 * 
 * Provides comprehensive error handling for the desktop application
 * including user-friendly error messages, desktop notifications,
 * and error recovery suggestions.
 */

/**
 * Error types and their corresponding user-friendly messages
 */
const ERROR_TYPES = {
  NETWORK: {
    type: 'network',
    title: 'Network Error',
    icon: 'assets/icons/close.svg',
    color: '#e7000b',
    recoverable: true
  },
  BINARY_MISSING: {
    type: 'binary_missing',
    title: 'Missing Dependencies',
    icon: 'assets/icons/close.svg',
    color: '#e7000b',
    recoverable: false
  },
  PERMISSION: {
    type: 'permission',
    title: 'Permission Error',
    icon: 'assets/icons/close.svg',
    color: '#e7000b',
    recoverable: true
  },
  VIDEO_UNAVAILABLE: {
    type: 'video_unavailable',
    title: 'Video Unavailable',
    icon: 'assets/icons/close.svg',
    color: '#e7000b',
    recoverable: false
  },
  AGE_RESTRICTED: {
    type: 'age_restricted',
    title: 'Age Restricted Content',
    icon: 'assets/icons/close.svg',
    color: '#e7000b',
    recoverable: true
  },
  DISK_SPACE: {
    type: 'disk_space',
    title: 'Insufficient Storage',
    icon: 'assets/icons/close.svg',
    color: '#e7000b',
    recoverable: true
  },
  FORMAT_ERROR: {
    type: 'format_error',
    title: 'Format Error',
    icon: 'assets/icons/close.svg',
    color: '#e7000b',
    recoverable: true
  },
  UNKNOWN: {
    type: 'unknown',
    title: 'Unknown Error',
    icon: 'assets/icons/close.svg',
    color: '#e7000b',
    recoverable: false
  }
};

/**
 * Enhanced Error Handler Class
 * 
 * Provides centralized error handling with desktop notifications,
 * user-friendly messages, and recovery suggestions.
 */
class ErrorHandler {
  constructor() {
    this.errorHistory = [];
    this.maxHistorySize = 50;
    this.notificationQueue = [];
    this.isProcessingNotifications = false;
  }

  /**
   * Handle and display error with appropriate user feedback
   * @param {Error|string} error - Error object or message
   * @param {Object} context - Additional context about the error
   * @param {Object} options - Display options
   */
  async handleError(error, context = {}, options = {}) {
    const errorInfo = this.parseError(error, context);
    
    // Add to error history
    this.addToHistory(errorInfo);
    
    // Show appropriate user feedback
    await this.showErrorFeedback(errorInfo, options);
    
    // Log error for debugging
    this.logError(errorInfo);
    
    return errorInfo;
  }

  /**
   * Parse error and extract meaningful information
   * @param {Error|string} error - Error to parse
   * @param {Object} context - Additional context
   * @returns {Object} Parsed error information
   */
  parseError(error, context = {}) {
    const errorInfo = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      originalError: error,
      context,
      type: ERROR_TYPES.UNKNOWN,
      message: 'An unknown error occurred',
      suggestion: 'Please try again or contact support',
      recoverable: false,
      technical: null
    };

    // Extract error message
    const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error';
    const lowerMessage = errorMessage.toLowerCase();

    // Determine error type and provide appropriate messaging
    if (lowerMessage.includes('network') || lowerMessage.includes('connection') || lowerMessage.includes('timeout')) {
      errorInfo.type = ERROR_TYPES.NETWORK;
      errorInfo.message = 'Network connection error';
      errorInfo.suggestion = 'Check your internet connection and try again';
      errorInfo.recoverable = true;
    }
    else if (lowerMessage.includes('binary not found') || lowerMessage.includes('yt-dlp') || lowerMessage.includes('ffmpeg')) {
      errorInfo.type = ERROR_TYPES.BINARY_MISSING;
      errorInfo.message = 'Required application components are missing';
      errorInfo.suggestion = 'Please reinstall the application or check the setup';
      errorInfo.recoverable = false;
    }
    else if (lowerMessage.includes('permission') || lowerMessage.includes('access denied') || lowerMessage.includes('not writable')) {
      errorInfo.type = ERROR_TYPES.PERMISSION;
      errorInfo.message = 'Permission denied';
      errorInfo.suggestion = 'Check folder permissions or choose a different location';
      errorInfo.recoverable = true;
    }
    else if (lowerMessage.includes('unavailable') || lowerMessage.includes('private') || lowerMessage.includes('removed')) {
      errorInfo.type = ERROR_TYPES.VIDEO_UNAVAILABLE;
      errorInfo.message = 'Video is unavailable or has been removed';
      errorInfo.suggestion = 'Check if the video URL is correct and publicly accessible';
      errorInfo.recoverable = false;
    }
    else if (lowerMessage.includes('age') || lowerMessage.includes('restricted') || lowerMessage.includes('sign in')) {
      errorInfo.type = ERROR_TYPES.AGE_RESTRICTED;
      errorInfo.message = 'Age-restricted content requires authentication';
      errorInfo.suggestion = 'Use a cookie file from your browser to access this content';
      errorInfo.recoverable = true;
    }
    else if (lowerMessage.includes('space') || lowerMessage.includes('disk full') || lowerMessage.includes('no space')) {
      errorInfo.type = ERROR_TYPES.DISK_SPACE;
      errorInfo.message = 'Insufficient disk space';
      errorInfo.suggestion = 'Free up disk space or choose a different download location';
      errorInfo.recoverable = true;
    }
    else if (lowerMessage.includes('format') || lowerMessage.includes('quality') || lowerMessage.includes('resolution')) {
      errorInfo.type = ERROR_TYPES.FORMAT_ERROR;
      errorInfo.message = 'Requested video quality or format not available';
      errorInfo.suggestion = 'Try a different quality setting or use "Best Available"';
      errorInfo.recoverable = true;
    }
    else {
      // Use the original error message if it's reasonably short and descriptive
      if (errorMessage.length < 150 && errorMessage.length > 10) {
        errorInfo.message = errorMessage;
      }
    }

    // Store technical details
    errorInfo.technical = {
      message: errorMessage,
      stack: error?.stack,
      code: error?.code,
      context
    };

    return errorInfo;
  }

  /**
   * Show appropriate error feedback to user
   * @param {Object} errorInfo - Parsed error information
   * @param {Object} options - Display options
   */
  async showErrorFeedback(errorInfo, options = {}) {
    const {
      showNotification = true,
      showDialog = false,
      showInUI = true,
      priority = 'normal'
    } = options;

    // Show desktop notification
    if (showNotification && window.electronAPI) {
      await this.showErrorNotification(errorInfo, priority);
    }

    // Show error dialog for critical errors
    if (showDialog && window.electronAPI) {
      await this.showErrorDialog(errorInfo);
    }

    // Show in-app error message
    if (showInUI) {
      this.showInAppError(errorInfo);
    }
  }

  /**
   * Show desktop notification for error
   * @param {Object} errorInfo - Error information
   * @param {string} priority - Notification priority
   */
  async showErrorNotification(errorInfo, priority = 'normal') {
    try {
      const notificationOptions = {
        title: errorInfo.type.title,
        message: errorInfo.message,
        icon: errorInfo.type.icon,
        sound: priority === 'high',
        timeout: priority === 'high' ? 10 : 5
      };

      await window.electronAPI.showNotification(notificationOptions);
    } catch (error) {
      logger.error('Failed to show error notification:', error.message);
    }
  }

  /**
   * Show error dialog for critical errors
   * @param {Object} errorInfo - Error information
   */
  async showErrorDialog(errorInfo) {
    try {
      const dialogOptions = {
        title: errorInfo.type.title,
        message: errorInfo.message,
        detail: errorInfo.suggestion,
        buttons: errorInfo.recoverable ? ['Retry', 'Cancel'] : ['OK'],
        defaultId: 0
      };

      const result = await window.electronAPI.showErrorDialog(dialogOptions);
      return result.response === 0; // Return true if user clicked retry/ok
    } catch (error) {
      logger.error('Failed to show error dialog:', error.message);
      return false;
    }
  }

  /**
   * Show in-app error message
   * @param {Object} errorInfo - Error information
   */
  showInAppError(errorInfo) {
    // Dispatch custom event for UI components to handle
    const errorEvent = new CustomEvent('app-error', {
      detail: {
        id: errorInfo.id,
        type: errorInfo.type.type,
        message: errorInfo.message,
        suggestion: errorInfo.suggestion,
        recoverable: errorInfo.recoverable,
        timestamp: errorInfo.timestamp
      }
    });

    document.dispatchEvent(errorEvent);
  }

  /**
   * Handle binary dependency errors specifically
   * @param {string} binaryName - Name of missing binary
   * @param {Object} context - Additional context
   */
  async handleBinaryError(binaryName, context = {}) {
    const errorInfo = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      type: ERROR_TYPES.BINARY_MISSING,
      message: `${binaryName} is required but not found`,
      suggestion: `Please ensure ${binaryName} is properly installed in the binaries directory`,
      recoverable: false,
      context: { binaryName, ...context }
    };

    await this.showErrorFeedback(errorInfo, {
      showNotification: true,
      showDialog: true,
      priority: 'high'
    });

    return errorInfo;
  }

  /**
   * Handle network-related errors with retry logic
   * @param {Error} error - Network error
   * @param {Function} retryCallback - Function to retry the operation
   * @param {number} maxRetries - Maximum retry attempts
   */
  async handleNetworkError(error, retryCallback = null, maxRetries = 3) {
    const errorInfo = this.parseError(error, { type: 'network', maxRetries });
    
    if (retryCallback && maxRetries > 0) {
      const shouldRetry = await this.showErrorDialog(errorInfo);
      
      if (shouldRetry) {
        try {
          return await retryCallback();
        } catch (retryError) {
          return this.handleNetworkError(retryError, retryCallback, maxRetries - 1);
        }
      }
    } else {
      await this.showErrorFeedback(errorInfo, { showNotification: true });
    }

    return errorInfo;
  }

  /**
   * Add error to history for debugging and analytics
   * @param {Object} errorInfo - Error information
   */
  addToHistory(errorInfo) {
    this.errorHistory.unshift(errorInfo);
    
    // Limit history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Get error history for debugging
   * @returns {Array} Error history
   */
  getErrorHistory() {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearHistory() {
    this.errorHistory = [];
  }

  /**
   * Log error for debugging
   * @param {Object} errorInfo - Error information
   */
  logError(errorInfo) {
    // Use logger if available (runtime), fallback to console for tests
    const log = typeof logger !== 'undefined' ? logger : console;

    console.group(`🚨 Error [${errorInfo.type.type}] - ${errorInfo.id}`);
    log.error('Message:', errorInfo.message);
    log.error('Suggestion:', errorInfo.suggestion);
    log.error('Recoverable:', errorInfo.recoverable);
    log.error('Context:', errorInfo.context);
    if (errorInfo.technical) {
      log.error('Technical Details:', errorInfo.technical);
    }
    console.groupEnd();
  }

  /**
   * Generate unique error ID
   * @returns {string} Unique error ID
   */
  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if error is recoverable
   * @param {Object} errorInfo - Error information
   * @returns {boolean} Whether error is recoverable
   */
  isRecoverable(errorInfo) {
    return errorInfo.recoverable === true;
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getStats() {
    const stats = {
      total: this.errorHistory.length,
      byType: {},
      recoverable: 0,
      recent: 0 // Last hour
    };

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    this.errorHistory.forEach(error => {
      // Count by type
      const type = error.type.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count recoverable
      if (error.recoverable) {
        stats.recoverable++;
      }

      // Count recent
      if (error.timestamp > oneHourAgo) {
        stats.recent++;
      }
    });

    return stats;
  }
}

// Create global error handler instance
const errorHandler = new ErrorHandler();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ErrorHandler, errorHandler, ERROR_TYPES };
} else {
  // Browser environment - attach to window
  window.ErrorHandler = ErrorHandler;
  window.errorHandler = errorHandler;
  window.ERROR_TYPES = ERROR_TYPES;
}