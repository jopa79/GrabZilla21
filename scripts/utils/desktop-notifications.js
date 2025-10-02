/**
 * @fileoverview Desktop notification utilities for cross-platform notifications
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

/**
 * DESKTOP NOTIFICATION UTILITIES
 * 
 * Provides cross-platform desktop notifications with fallbacks
 * for different operating systems and notification systems.
 */

/**
 * Notification types with default configurations
 */
const NOTIFICATION_TYPES = {
  SUCCESS: {
    type: 'success',
    icon: 'assets/icons/download.svg',
    sound: true,
    timeout: 5000,
    color: '#00a63e'
  },
  ERROR: {
    type: 'error',
    icon: 'assets/icons/close.svg',
    sound: true,
    timeout: 8000,
    color: '#e7000b'
  },
  WARNING: {
    type: 'warning',
    icon: 'assets/icons/clock.svg',
    sound: false,
    timeout: 6000,
    color: '#ff9500'
  },
  INFO: {
    type: 'info',
    icon: 'assets/icons/logo.svg',
    sound: false,
    timeout: 4000,
    color: '#155dfc'
  },
  PROGRESS: {
    type: 'progress',
    icon: 'assets/icons/download.svg',
    sound: false,
    timeout: 0, // Persistent until updated
    color: '#155dfc'
  }
};

/**
 * Desktop Notification Manager
 * 
 * Handles desktop notifications with cross-platform support
 * and intelligent fallbacks for different environments.
 */
class DesktopNotificationManager {
  constructor() {
    this.activeNotifications = new Map();
    this.notificationQueue = [];
    this.isElectronAvailable = typeof window !== 'undefined' && 
                              window.electronAPI && 
                              typeof window.electronAPI === 'object';
    this.isBrowserNotificationSupported = typeof Notification !== 'undefined';
    this.maxActiveNotifications = 5;
    
    // Initialize notification permissions
    this.initializePermissions();
  }

  /**
   * Initialize notification permissions
   */
  async initializePermissions() {
    if (this.isBrowserNotificationSupported && !this.isElectronAvailable) {
      try {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      } catch (error) {
        console.warn('Failed to request notification permission:', error);
      }
    }
  }

  /**
   * Show desktop notification with automatic fallback
   * @param {Object} options - Notification options
   * @returns {Promise<Object>} Notification result
   */
  async showNotification(options = {}) {
    const config = this.prepareNotificationConfig(options);
    
    try {
      // Try Electron native notifications first
      if (this.isElectronAvailable) {
        return await this.showElectronNotification(config);
      }
      
      // Fallback to browser notifications
      if (this.isBrowserNotificationSupported) {
        return await this.showBrowserNotification(config);
      }
      
      // Final fallback to in-app notification
      return this.showInAppNotification(config);
      
    } catch (error) {
      console.error('Failed to show notification:', error);
      // Always fallback to in-app notification
      return this.showInAppNotification(config);
    }
  }

  /**
   * Show success notification for completed downloads
   * @param {string} filename - Downloaded filename
   * @param {Object} options - Additional options
   */
  async showDownloadSuccess(filename, options = {}) {
    const config = {
      type: NOTIFICATION_TYPES.SUCCESS,
      title: 'Download Complete',
      message: `Successfully downloaded: ${filename}`,
      ...options
    };

    return this.showNotification(config);
  }

  /**
   * Show error notification for failed downloads
   * @param {string} filename - Failed filename or URL
   * @param {string} error - Error message
   * @param {Object} options - Additional options
   */
  async showDownloadError(filename, error, options = {}) {
    const config = {
      type: NOTIFICATION_TYPES.ERROR,
      title: 'Download Failed',
      message: `Failed to download ${filename}: ${error}`,
      ...options
    };

    return this.showNotification(config);
  }

  /**
   * Show progress notification for ongoing downloads
   * @param {string} filename - Downloading filename
   * @param {number} progress - Progress percentage (0-100)
   * @param {Object} options - Additional options
   */
  async showDownloadProgress(filename, progress, options = {}) {
    const config = {
      type: NOTIFICATION_TYPES.PROGRESS,
      title: 'Downloading...',
      message: `${filename} - ${progress}% complete`,
      id: `progress_${filename}`,
      persistent: true,
      ...options
    };

    return this.showNotification(config);
  }

  /**
   * Show conversion progress notification
   * @param {string} filename - Converting filename
   * @param {number} progress - Progress percentage (0-100)
   * @param {Object} options - Additional options
   */
  async showConversionProgress(filename, progress, options = {}) {
    const config = {
      type: NOTIFICATION_TYPES.PROGRESS,
      title: 'Converting...',
      message: `${filename} - ${progress}% converted`,
      id: `conversion_${filename}`,
      persistent: true,
      ...options
    };

    return this.showNotification(config);
  }

  /**
   * Show dependency missing notification
   * @param {string} dependency - Missing dependency name
   * @param {Object} options - Additional options
   */
  async showDependencyMissing(dependency, options = {}) {
    const config = {
      type: NOTIFICATION_TYPES.ERROR,
      title: 'Missing Dependency',
      message: `${dependency} is required but not found. Please check the application setup.`,
      timeout: 10000, // Show longer for critical errors
      ...options
    };

    return this.showNotification(config);
  }

  /**
   * Prepare notification configuration with defaults
   * @param {Object} options - User options
   * @returns {Object} Complete configuration
   */
  prepareNotificationConfig(options) {
    const typeConfig = options.type || NOTIFICATION_TYPES.INFO;
    
    return {
      id: options.id || this.generateNotificationId(),
      title: options.title || 'GrabZilla',
      message: options.message || '',
      icon: options.icon || typeConfig.icon,
      sound: options.sound !== undefined ? options.sound : typeConfig.sound,
      timeout: options.timeout !== undefined ? options.timeout : typeConfig.timeout,
      persistent: options.persistent || false,
      onClick: options.onClick || null,
      onClose: options.onClose || null,
      type: typeConfig,
      timestamp: new Date()
    };
  }

  /**
   * Show notification using Electron's native system
   * @param {Object} config - Notification configuration
   * @returns {Promise<Object>} Result
   */
  async showElectronNotification(config) {
    try {
      const result = await window.electronAPI.showNotification({
        title: config.title,
        message: config.message,
        icon: config.icon,
        sound: config.sound,
        timeout: config.timeout / 1000, // Convert to seconds
        wait: config.persistent
      });

      if (result.success) {
        this.trackNotification(config);
      }

      return {
        success: result.success,
        method: 'electron',
        id: config.id,
        error: result.error
      };
    } catch (error) {
      console.error('Electron notification failed:', error);
      throw error;
    }
  }

  /**
   * Show notification using browser's Notification API
   * @param {Object} config - Notification configuration
   * @returns {Promise<Object>} Result
   */
  async showBrowserNotification(config) {
    try {
      if (Notification.permission !== 'granted') {
        throw new Error('Notification permission not granted');
      }

      const notification = new Notification(config.title, {
        body: config.message,
        icon: config.icon,
        silent: !config.sound,
        tag: config.id // Prevents duplicate notifications
      });

      // Handle events
      if (config.onClick) {
        notification.onclick = config.onClick;
      }

      if (config.onClose) {
        notification.onclose = config.onClose;
      }

      // Auto-close if not persistent
      if (!config.persistent && config.timeout > 0) {
        setTimeout(() => {
          notification.close();
        }, config.timeout);
      }

      this.trackNotification(config, notification);

      return {
        success: true,
        method: 'browser',
        id: config.id,
        notification
      };
    } catch (error) {
      console.error('Browser notification failed:', error);
      throw error;
    }
  }

  /**
   * Show in-app notification as final fallback
   * @param {Object} config - Notification configuration
   * @returns {Object} Result
   */
  showInAppNotification(config) {
    try {
      // Dispatch custom event for UI components to handle
      const notificationEvent = new CustomEvent('app-notification', {
        detail: {
          id: config.id,
          title: config.title,
          message: config.message,
          type: config.type.type,
          icon: config.icon,
          timeout: config.timeout,
          persistent: config.persistent,
          timestamp: config.timestamp
        }
      });

      document.dispatchEvent(notificationEvent);

      this.trackNotification(config);

      return {
        success: true,
        method: 'in-app',
        id: config.id
      };
    } catch (error) {
      console.error('In-app notification failed:', error);
      return {
        success: false,
        method: 'in-app',
        id: config.id,
        error: error.message
      };
    }
  }

  /**
   * Update existing notification (for progress updates)
   * @param {string} id - Notification ID
   * @param {Object} updates - Updates to apply
   */
  async updateNotification(id, updates) {
    const existing = this.activeNotifications.get(id);
    if (!existing) {
      // Create new notification if doesn't exist
      return this.showNotification({ id, ...updates });
    }

    const updatedConfig = { ...existing.config, ...updates };
    
    // Close existing and show updated
    this.closeNotification(id);
    return this.showNotification(updatedConfig);
  }

  /**
   * Close specific notification
   * @param {string} id - Notification ID
   */
  closeNotification(id) {
    const notification = this.activeNotifications.get(id);
    if (notification) {
      if (notification.instance && notification.instance.close) {
        notification.instance.close();
      }
      this.activeNotifications.delete(id);
    }
  }

  /**
   * Close all active notifications
   */
  closeAllNotifications() {
    for (const [id] of this.activeNotifications) {
      this.closeNotification(id);
    }
  }

  /**
   * Track active notification
   * @param {Object} config - Notification configuration
   * @param {Object} instance - Notification instance (if available)
   */
  trackNotification(config, instance = null) {
    this.activeNotifications.set(config.id, {
      config,
      instance,
      timestamp: config.timestamp
    });

    // Clean up old notifications
    this.cleanupOldNotifications();
  }

  /**
   * Clean up old notifications to prevent memory leaks
   */
  cleanupOldNotifications() {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const now = new Date();

    for (const [id, notification] of this.activeNotifications) {
      if (now - notification.timestamp > maxAge) {
        this.closeNotification(id);
      }
    }

    // Limit total active notifications
    if (this.activeNotifications.size > this.maxActiveNotifications) {
      const oldest = Array.from(this.activeNotifications.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, this.activeNotifications.size - this.maxActiveNotifications);

      oldest.forEach(([id]) => this.closeNotification(id));
    }
  }

  /**
   * Generate unique notification ID
   * @returns {string} Unique ID
   */
  generateNotificationId() {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get notification statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      active: this.activeNotifications.size,
      electronAvailable: this.isElectronAvailable,
      browserSupported: this.isBrowserNotificationSupported,
      permission: this.isBrowserNotificationSupported ? Notification.permission : 'unknown'
    };
  }

  /**
   * Test notification system
   * @returns {Promise<Object>} Test results
   */
  async testNotifications() {
    const results = {
      electron: false,
      browser: false,
      inApp: false,
      errors: []
    };

    // Test Electron notifications
    if (this.isElectronAvailable) {
      try {
        const result = await this.showElectronNotification({
          id: 'test_electron',
          title: 'Test Notification',
          message: 'Electron notifications are working',
          timeout: 2000
        });
        results.electron = result.success;
      } catch (error) {
        results.errors.push(`Electron: ${error.message}`);
      }
    }

    // Test browser notifications
    if (this.isBrowserNotificationSupported) {
      try {
        const result = await this.showBrowserNotification({
          id: 'test_browser',
          title: 'Test Notification',
          message: 'Browser notifications are working',
          timeout: 2000
        });
        results.browser = result.success;
      } catch (error) {
        results.errors.push(`Browser: ${error.message}`);
      }
    }

    // Test in-app notifications
    try {
      const result = this.showInAppNotification({
        id: 'test_inapp',
        title: 'Test Notification',
        message: 'In-app notifications are working',
        timeout: 2000
      });
      results.inApp = result.success;
    } catch (error) {
      results.errors.push(`In-app: ${error.message}`);
    }

    return results;
  }
}

// Create global notification manager instance
const notificationManager = new DesktopNotificationManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    DesktopNotificationManager, 
    notificationManager, 
    NOTIFICATION_TYPES 
  };
} else {
  // Browser environment - attach to window
  window.DesktopNotificationManager = DesktopNotificationManager;
  window.notificationManager = notificationManager;
  window.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
}