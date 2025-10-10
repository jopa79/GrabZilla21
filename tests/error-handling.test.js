/**
 * @fileoverview Tests for error handling system
 * @author GrabZilla Development Team
 * @version 2.1.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'

// Mock Electron API
const mockElectronAPI = {
  showNotification: vi.fn(),
  showErrorDialog: vi.fn(),
  showInfoDialog: vi.fn()
}

describe('Error Handling System', () => {
  let dom
  let window
  let document
  let ErrorHandler
  let errorHandler
  let ERROR_TYPES

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

    // Mock APIs
    window.electronAPI = mockElectronAPI

    // Mock logger for error-handler.js
    window.logger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn()
    }

    // Load the error handler
    const fs = require('fs')
    const path = require('path')
    const errorHandlerScript = fs.readFileSync(
      path.join(__dirname, '../scripts/utils/error-handler.js'),
      'utf8'
    )

    // Execute the script in the window context
    const script = new window.Function(errorHandlerScript)
    script.call(window)

    ErrorHandler = window.ErrorHandler
    errorHandler = window.errorHandler
    ERROR_TYPES = window.ERROR_TYPES
  })

  describe('ErrorHandler', () => {
    it('should initialize with correct default values', () => {
      const handler = new ErrorHandler()
      
      expect(handler.errorHistory).toEqual([])
      expect(handler.maxHistorySize).toBe(50)
      expect(handler.notificationQueue).toEqual([])
    })

    it('should parse network errors correctly', async () => {
      const error = new Error('Network connection failed')
      const errorInfo = await errorHandler.handleError(error)
      
      expect(errorInfo.type).toBe(ERROR_TYPES.NETWORK)
      expect(errorInfo.message).toBe('Network connection error')
      expect(errorInfo.recoverable).toBe(true)
    })

    it('should parse binary missing errors correctly', async () => {
      const error = new Error('yt-dlp binary not found')
      const errorInfo = await errorHandler.handleError(error)
      
      expect(errorInfo.type).toBe(ERROR_TYPES.BINARY_MISSING)
      expect(errorInfo.message).toBe('Required application components are missing')
      expect(errorInfo.recoverable).toBe(false)
    })

    it('should parse permission errors correctly', async () => {
      const error = new Error('Permission denied - not writable')
      const errorInfo = await errorHandler.handleError(error)
      
      expect(errorInfo.type).toBe(ERROR_TYPES.PERMISSION)
      expect(errorInfo.message).toBe('Permission denied')
      expect(errorInfo.recoverable).toBe(true)
    })

    it('should parse video unavailable errors correctly', async () => {
      const error = new Error('Video is unavailable or private')
      const errorInfo = await errorHandler.handleError(error)
      
      expect(errorInfo.type).toBe(ERROR_TYPES.VIDEO_UNAVAILABLE)
      expect(errorInfo.message).toBe('Video is unavailable or has been removed')
      expect(errorInfo.recoverable).toBe(false)
    })

    it('should parse age-restricted errors correctly', async () => {
      const error = new Error('Sign in to confirm your age')
      const errorInfo = await errorHandler.handleError(error)
      
      expect(errorInfo.type).toBe(ERROR_TYPES.AGE_RESTRICTED)
      expect(errorInfo.message).toBe('Age-restricted content requires authentication')
      expect(errorInfo.recoverable).toBe(true)
    })

    it('should parse disk space errors correctly', async () => {
      const error = new Error('No space left on device')
      const errorInfo = await errorHandler.handleError(error)
      
      expect(errorInfo.type).toBe(ERROR_TYPES.DISK_SPACE)
      expect(errorInfo.message).toBe('Insufficient disk space')
      expect(errorInfo.recoverable).toBe(true)
    })

    it('should parse format errors correctly', async () => {
      const error = new Error('Requested format not available')
      const errorInfo = await errorHandler.handleError(error)
      
      expect(errorInfo.type).toBe(ERROR_TYPES.FORMAT_ERROR)
      expect(errorInfo.message).toBe('Requested video quality or format not available')
      expect(errorInfo.recoverable).toBe(true)
    })

    it('should add errors to history', async () => {
      const error = new Error('Test error')
      await errorHandler.handleError(error)
      
      expect(errorHandler.errorHistory).toHaveLength(1)
      expect(errorHandler.errorHistory[0].originalError).toBe(error)
    })

    it('should limit error history size', async () => {
      const handler = new ErrorHandler()
      handler.maxHistorySize = 3
      
      // Add more errors than the limit
      for (let i = 0; i < 5; i++) {
        await handler.handleError(new Error(`Error ${i}`))
      }
      
      expect(handler.errorHistory).toHaveLength(3)
    })

    it('should generate unique error IDs', () => {
      const id1 = errorHandler.generateErrorId()
      const id2 = errorHandler.generateErrorId()
      
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^error_\d+_[a-z0-9]+$/)
    })

    it('should show error notifications', async () => {
      mockElectronAPI.showNotification.mockResolvedValue({ success: true })
      
      const error = new Error('Test error')
      await errorHandler.handleError(error, {}, { showNotification: true })
      
      expect(mockElectronAPI.showNotification).toHaveBeenCalled()
    })

    it('should show error dialogs for critical errors', async () => {
      mockElectronAPI.showErrorDialog.mockResolvedValue({ success: true, response: 0 })
      
      const error = new Error('Critical error')
      await errorHandler.handleError(error, {}, { showDialog: true })
      
      expect(mockElectronAPI.showErrorDialog).toHaveBeenCalled()
    })

    it('should dispatch in-app error events', async () => {
      let eventFired = false
      let eventDetail = null
      
      document.addEventListener('app-error', (event) => {
        eventFired = true
        eventDetail = event.detail
      })
      
      const error = new Error('Test error')
      await errorHandler.handleError(error, {}, { showInUI: true })
      
      expect(eventFired).toBe(true)
      expect(eventDetail).toHaveProperty('message')
      expect(eventDetail).toHaveProperty('type')
    })

    it('should handle binary errors specifically', async () => {
      mockElectronAPI.showNotification.mockResolvedValue({ success: true })
      mockElectronAPI.showErrorDialog.mockResolvedValue({ success: true, response: 0 })
      
      const errorInfo = await errorHandler.handleBinaryError('yt-dlp')
      
      expect(errorInfo.type).toBe(ERROR_TYPES.BINARY_MISSING)
      expect(errorInfo.message).toContain('yt-dlp')
      expect(mockElectronAPI.showNotification).toHaveBeenCalled()
      expect(mockElectronAPI.showErrorDialog).toHaveBeenCalled()
    })

    it('should handle network errors with retry logic', async () => {
      mockElectronAPI.showErrorDialog.mockResolvedValue({ success: true, response: 0 })
      
      const retryCallback = vi.fn().mockResolvedValue('success')
      const error = new Error('Network timeout')
      
      const result = await errorHandler.handleNetworkError(error, retryCallback, 1)
      
      expect(retryCallback).toHaveBeenCalled()
    })

    it('should provide error statistics', () => {
      // Add some test errors
      errorHandler.errorHistory = [
        { type: ERROR_TYPES.NETWORK, recoverable: true, timestamp: new Date() },
        { type: ERROR_TYPES.BINARY_MISSING, recoverable: false, timestamp: new Date() },
        { type: ERROR_TYPES.NETWORK, recoverable: true, timestamp: new Date() }
      ]
      
      const stats = errorHandler.getStats()
      
      expect(stats.total).toBe(3)
      expect(stats.byType.network).toBe(2)
      expect(stats.byType.binary_missing).toBe(1)
      expect(stats.recoverable).toBe(2)
    })

    it('should clear error history', () => {
      errorHandler.errorHistory = [{ test: 'error' }]
      errorHandler.clearHistory()
      
      expect(errorHandler.errorHistory).toEqual([])
    })

    it('should check if errors are recoverable', () => {
      const recoverableError = { recoverable: true }
      const nonRecoverableError = { recoverable: false }
      
      expect(errorHandler.isRecoverable(recoverableError)).toBe(true)
      expect(errorHandler.isRecoverable(nonRecoverableError)).toBe(false)
    })
  })

  describe('Error Types', () => {
    it('should have all required error types', () => {
      expect(ERROR_TYPES).toHaveProperty('NETWORK')
      expect(ERROR_TYPES).toHaveProperty('BINARY_MISSING')
      expect(ERROR_TYPES).toHaveProperty('PERMISSION')
      expect(ERROR_TYPES).toHaveProperty('VIDEO_UNAVAILABLE')
      expect(ERROR_TYPES).toHaveProperty('AGE_RESTRICTED')
      expect(ERROR_TYPES).toHaveProperty('DISK_SPACE')
      expect(ERROR_TYPES).toHaveProperty('FORMAT_ERROR')
      expect(ERROR_TYPES).toHaveProperty('UNKNOWN')
    })

    it('should have correct configuration for each type', () => {
      expect(ERROR_TYPES.NETWORK.recoverable).toBe(true)
      expect(ERROR_TYPES.BINARY_MISSING.recoverable).toBe(false)
      expect(ERROR_TYPES.PERMISSION.recoverable).toBe(true)
      expect(ERROR_TYPES.VIDEO_UNAVAILABLE.recoverable).toBe(false)
    })
  })
})