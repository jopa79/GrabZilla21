/**
 * Download Manager Tests
 * Tests for parallel download queue, priority system, retry logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import DownloadManager from '../src/download-manager.js'

const { PRIORITY } = DownloadManager

describe('DownloadManager - Parallel Processing', () => {
  let manager
  let mockDownloadFn

  beforeEach(() => {
    manager = new DownloadManager({ maxConcurrent: 2, maxRetries: 2 })

    // Mock download function
    mockDownloadFn = vi.fn(async ({ url }) => {
      // Simulate download delay
      await new Promise(resolve => setTimeout(resolve, 100))
      return { success: true, url }
    })
  })

  afterEach(() => {
    if (manager) {
      manager.cancelAll()
    }
  })

  describe('Queue Management', () => {
    it('should initialize with correct settings', () => {
      expect(manager.maxConcurrent).toBeGreaterThan(0)
      expect(manager.maxRetries).toBe(2)
      expect(manager.activeDownloads.size).toBe(0)
      expect(manager.queuedDownloads.length).toBe(0)
    })

    it('should get stats correctly', () => {
      const stats = manager.getStats()
      expect(stats).toHaveProperty('active')
      expect(stats).toHaveProperty('queued')
      expect(stats).toHaveProperty('maxConcurrent')
      expect(stats).toHaveProperty('completed')
      expect(stats).toHaveProperty('canAcceptMore')
      expect(stats.active).toBe(0)
      expect(stats.queued).toBe(0)
    })

    it('should detect if video is already downloading', async () => {
      const downloadPromise = manager.addDownload({
        videoId: 'test1',
        url: 'https://youtube.com/watch?v=test1',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: mockDownloadFn
      })

      expect(manager.isDownloading('test1')).toBe(true)
      await downloadPromise
      expect(manager.isDownloading('test1')).toBe(false)
    })

    it('should prevent duplicate video downloads', async () => {
      const downloadPromise = manager.addDownload({
        videoId: 'test1',
        url: 'https://youtube.com/watch?v=test1',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: mockDownloadFn
      })

      await expect(async () => {
        await manager.addDownload({
          videoId: 'test1',
          url: 'https://youtube.com/watch?v=test1',
          quality: '720p',
          format: 'mp4',
          savePath: '/tmp',
          downloadFn: mockDownloadFn
        })
      }).rejects.toThrow('already being downloaded')

      await downloadPromise
    })
  })

  describe('Priority System', () => {
    it('should add downloads with default NORMAL priority', async () => {
      // Fill up active downloads first
      const slowDownload = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
        return { success: true }
      })

      manager.addDownload({
        videoId: 'active1',
        url: 'https://youtube.com/watch?v=active1',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: slowDownload
      })

      manager.addDownload({
        videoId: 'active2',
        url: 'https://youtube.com/watch?v=active2',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: slowDownload
      })

      // Now this one goes to queue
      manager.addDownload({
        videoId: 'test1',
        url: 'https://youtube.com/watch?v=test1',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: mockDownloadFn
      })

      expect(manager.queuedDownloads[0].priority).toBe(PRIORITY.NORMAL)
      manager.cancelAll()
    })

    it('should accept custom priority', async () => {
      // Fill up active downloads first
      const slowDownload = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
        return { success: true }
      })

      manager.addDownload({
        videoId: 'active1',
        url: 'https://youtube.com/watch?v=active1',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: slowDownload
      })

      manager.addDownload({
        videoId: 'active2',
        url: 'https://youtube.com/watch?v=active2',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: slowDownload
      })

      // Now this one goes to queue with HIGH priority
      manager.addDownload({
        videoId: 'test1',
        url: 'https://youtube.com/watch?v=test1',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: mockDownloadFn
      }, PRIORITY.HIGH)

      expect(manager.queuedDownloads[0].priority).toBe(PRIORITY.HIGH)
      manager.cancelAll()
    })

    it('should sort queue by priority', async () => {
      // Fill up active downloads first (maxConcurrent = 2)
      const slowDownload = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
        return { success: true }
      })

      manager.addDownload({
        videoId: 'active1',
        url: 'https://youtube.com/watch?v=active1',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: slowDownload
      })

      manager.addDownload({
        videoId: 'active2',
        url: 'https://youtube.com/watch?v=active2',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: slowDownload
      })

      // Now add to queue with different priorities
      manager.addDownload({
        videoId: 'low',
        url: 'https://youtube.com/watch?v=low',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: mockDownloadFn
      }, PRIORITY.LOW)

      manager.addDownload({
        videoId: 'high',
        url: 'https://youtube.com/watch?v=high',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: mockDownloadFn
      }, PRIORITY.HIGH)

      manager.addDownload({
        videoId: 'normal',
        url: 'https://youtube.com/watch?v=normal',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: mockDownloadFn
      }, PRIORITY.NORMAL)

      // Check queue order
      expect(manager.queuedDownloads[0].videoId).toBe('high')
      expect(manager.queuedDownloads[1].videoId).toBe('normal')
      expect(manager.queuedDownloads[2].videoId).toBe('low')

      // Clean up
      manager.cancelAll()
    })

    it('should allow changing priority of queued download', async () => {
      // Fill active downloads
      const slowDownload = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
        return { success: true }
      })

      manager.addDownload({
        videoId: 'active1',
        url: 'https://youtube.com/watch?v=active1',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: slowDownload
      })

      manager.addDownload({
        videoId: 'active2',
        url: 'https://youtube.com/watch?v=active2',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: slowDownload
      })

      // Add low priority download
      manager.addDownload({
        videoId: 'test1',
        url: 'https://youtube.com/watch?v=test1',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: mockDownloadFn
      }, PRIORITY.LOW)

      // Change to high priority
      const changed = manager.setPriority('test1', PRIORITY.HIGH)
      expect(changed).toBe(true)

      const request = manager.queuedDownloads.find(r => r.videoId === 'test1')
      expect(request.priority).toBe(PRIORITY.HIGH)

      // Clean up
      manager.cancelAll()
    })
  })

  describe('Retry Logic', () => {
    it('should have retry configuration', () => {
      expect(manager.maxRetries).toBe(2)
    })

    it('should identify retryable errors', () => {
      const retryableErrors = [
        new Error('network timeout'),
        new Error('ECONNRESET'),
        new Error('ETIMEDOUT'),
        new Error('ENOTFOUND'),
        new Error('503 Service Unavailable')
      ]

      retryableErrors.forEach(error => {
        expect(manager.isRetryableError(error)).toBe(true)
      })
    })

    it('should identify non-retryable errors', () => {
      const nonRetryableErrors = [
        new Error('Video unavailable'),
        new Error('Permission denied'),
        new Error('Invalid URL')
      ]

      nonRetryableErrors.forEach(error => {
        expect(manager.isRetryableError(error)).toBe(false)
      })
    })
  })

  describe('Cancellation', () => {
    it('should cancel queued download', async () => {
      // Fill active slots
      const slowDownload = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
        return { success: true }
      })

      manager.addDownload({
        videoId: 'active1',
        url: 'https://youtube.com/watch?v=active1',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: slowDownload
      })

      manager.addDownload({
        videoId: 'active2',
        url: 'https://youtube.com/watch?v=active2',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: slowDownload
      })

      // Add to queue
      const queuedPromise = manager.addDownload({
        videoId: 'queued1',
        url: 'https://youtube.com/watch?v=queued1',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: mockDownloadFn
      })

      // Cancel it
      const cancelled = manager.cancelDownload('queued1')
      expect(cancelled).toBe(true)
      expect(manager.queuedDownloads.find(r => r.videoId === 'queued1')).toBeUndefined()

      await expect(queuedPromise).rejects.toThrow('cancelled')

      // Clean up
      manager.cancelAll()
    })

    it('should cancel all downloads', () => {
      // Add some downloads (catch rejections to avoid unhandled errors)
      manager.addDownload({
        videoId: 'test1',
        url: 'https://youtube.com/watch?v=test1',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: mockDownloadFn
      }).catch(() => {})

      manager.addDownload({
        videoId: 'test2',
        url: 'https://youtube.com/watch?v=test2',
        quality: '720p',
        format: 'mp4',
        savePath: '/tmp',
        downloadFn: mockDownloadFn
      }).catch(() => {})

      const result = manager.cancelAll()
      expect(result.total).toBeGreaterThanOrEqual(0)
      expect(manager.queuedDownloads.length).toBe(0)
      expect(manager.activeDownloads.size).toBe(0)
    })
  })

  describe('Event Emission', () => {
    it('should emit queueUpdated event', async () => {
      return new Promise((resolve) => {
        manager.on('queueUpdated', (stats) => {
          expect(stats).toHaveProperty('active')
          expect(stats).toHaveProperty('queued')
          resolve()
        })

        manager.addDownload({
          videoId: 'test1',
          url: 'https://youtube.com/watch?v=test1',
          quality: '720p',
          format: 'mp4',
          savePath: '/tmp',
          downloadFn: mockDownloadFn
        }).catch(() => {})
      })
    })
  })
})
