/**
 * @fileoverview Tests for desktop notification system
 * @author GrabZilla Development Team
 * @version 2.1.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'

// Mock Electron API
const mockElectronAPI = {
  showNotification: vi.fn(),
  showErrorDialog: vi.fn(),
  showInfoDialog: vi.fn(),
  selectSaveDirectory: vi.fn(),
  selectCookieFile: vi.fn(),
  checkBinaryDependencies: vi.fn()
}

// Mock Notification API
const mockNotification = vi.fn()
mockNotification.isSupported = vi.fn(() => true)

describe('Desktop Notification System', () => {
  let dom
  let window
  let document
  let DesktopNotificationManager
  let notificationManager
  let NOTIFICATION_TYPES

  beforeEach(() => {
    // Set up DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="app"></div>
        </body>
      </html>
    `, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
    })

    window = dom.window
    document = window.document
    global.window = window
    global.document = document

    // Mock APIs - ensure electronAPI is properly detected as an object
    window.electronAPI = mockElectronAPI
    window.Notification = mockNotification
    
    // Ensure electronAPI is detected as available
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      enumerable: true,
      configurable: true
    })

    // Load the notification manager
    const fs = require('fs')
    const path = require('path')
    const notificationScript = fs.readFileSync(
      path.join(__dirname, '../scripts/utils/desktop-notifications.js'),
      'utf8'
    )
    
    // Execute the script in the window context
    const script = new window.Function(notificationScript)
    script.call(window)

    DesktopNotificationManager = window.DesktopNotificationManager
    notificationManager = window.notificationManager
    NOTIFICATION_TYPES = window.NOTIFICATION_TYPES
  })

  describe('DesktopNotificationManager', () => {
    it('should initialize with correct default values', () => {
      const manager = new DesktopNotificationManager()
      
      expect(manager.activeNotifications).toBeInstanceOf(Map)
      expect(manager.notificationQueue).toEqual([])
      expect(manager.maxActiveNotifications).toBe(5)
    })

    it('should detect Electron availability correctly', () => {
      // Create a new manager to test the detection logic
      const manager = new DesktopNotificationManager()
      expect(manager.isElectronAvailable).toBe(true)
      expect(typeof window.electronAPI).toBe('object')
    })

    it('should show success notification for downloads', async () => {
      mockElectronAPI.showNotification.mockResolvedValue({ success: true })
      
      const result = await notificationManager.showDownloadSuccess('test-video.mp4')
      
      expect(result.success).toBe(true)
      expect(mockElectronAPI.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Download Complete',
          message: 'Successfully downloaded: test-video.mp4'
        })
      )
    })

    it('should show error notification for failed downloads', async () => {
      mockElectronAPI.showNotification.mockResolvedValue({ success: true })
      
      const result = await notificationManager.showDownloadError(
        'test-video.mp4', 
        'Network error'
      )
      
      expect(result.success).toBe(true)
      expect(mockElectronAPI.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Download Failed',
          message: 'Failed to download test-video.mp4: Network error'
        })
      )
    })

    it('should show progress notification', async () => {
      mockElectronAPI.showNotification.mockResolvedValue({ success: true })
      
      const result = await notificationManager.showDownloadProgress('test-video.mp4', 65)
      
      expect(result.success).toBe(true)
      expect(mockElectronAPI.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Downloading...',
          message: 'test-video.mp4 - 65% complete'
        })
      )
    })

    it('should fallback to in-app notifications when Electron fails', async () => {
      // Mock console.error to suppress expected error messages during testing
      const originalConsoleError = console.error
      console.error = vi.fn()
      
      mockElectronAPI.showNotification.mockRejectedValue(new Error('Electron error'))
      
      let eventFired = false
      document.addEventListener('app-notification', () => {
        eventFired = true
      })
      
      const result = await notificationManager.showNotification({
        title: 'Test',
        message: 'Test message'
      })
      
      expect(result.success).toBe(true)
      expect(result.method).toBe('in-app')
      expect(eventFired).toBe(true)
      
      // Restore console.error
      console.error = originalConsoleError
    })

    it('should track active notifications', async () => {
      mockElectronAPI.showNotification.mockResolvedValue({ success: true })
      
      await notificationManager.showNotification({
        id: 'test-notification',
        title: 'Test',
        message: 'Test message'
      })
      
      expect(notificationManager.activeNotifications.has('test-notification')).toBe(true)
    })

    it('should close specific notifications', async () => {
      mockElectronAPI.showNotification.mockResolvedValue({ success: true })
      
      await notificationManager.showNotification({
        id: 'test-notification',
        title: 'Test',
        message: 'Test message'
      })
      
      notificationManager.closeNotification('test-notification')
      
      expect(notificationManager.activeNotifications.has('test-notification')).toBe(false)
    })

    it('should generate unique notification IDs', () => {
      const id1 = notificationManager.generateNotificationId()
      const id2 = notificationManager.generateNotificationId()
      
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^notification_\d+_[a-z0-9]+$/)
    })

    it('should provide notification statistics', () => {
      const stats = notificationManager.getStats()
      
      expect(stats).toHaveProperty('active')
      expect(stats).toHaveProperty('electronAvailable')
      expect(stats).toHaveProperty('browserSupported')
      expect(typeof stats.electronAvailable).toBe('boolean')
      expect(typeof stats.browserSupported).toBe('boolean')
    })
  })

  describe('Error Handling Integration', () => {
    it('should show dependency missing notifications', async () => {
      mockElectronAPI.showNotification.mockResolvedValue({ success: true })
      
      const result = await notificationManager.showDependencyMissing('yt-dlp')
      
      expect(result.success).toBe(true)
      expect(mockElectronAPI.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Missing Dependency',
          message: expect.stringContaining('yt-dlp')
        })
      )
    })

    it('should handle conversion progress notifications', async () => {
      mockElectronAPI.showNotification.mockResolvedValue({ success: true })
      
      const result = await notificationManager.showConversionProgress('test-video.mp4', 42)
      
      expect(result.success).toBe(true)
      expect(mockElectronAPI.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Converting...',
          message: 'test-video.mp4 - 42% converted'
        })
      )
    })
  })

  describe('Notification Types', () => {
    it('should have all required notification types', () => {
      expect(NOTIFICATION_TYPES).toHaveProperty('SUCCESS')
      expect(NOTIFICATION_TYPES).toHaveProperty('ERROR')
      expect(NOTIFICATION_TYPES).toHaveProperty('WARNING')
      expect(NOTIFICATION_TYPES).toHaveProperty('INFO')
      expect(NOTIFICATION_TYPES).toHaveProperty('PROGRESS')
    })

    it('should have correct configuration for each type', () => {
      expect(NOTIFICATION_TYPES.SUCCESS.color).toBe('#00a63e')
      expect(NOTIFICATION_TYPES.ERROR.color).toBe('#e7000b')
      expect(NOTIFICATION_TYPES.SUCCESS.sound).toBe(true)
      expect(NOTIFICATION_TYPES.PROGRESS.timeout).toBe(0)
    })
  })
})