/**
 * @fileoverview Download Manager for parallel video downloads
 * Handles concurrent download queue with optimal CPU utilization
 * @author GrabZilla Development Team
 * @version 2.1.0
 */

const os = require('os')
const EventEmitter = require('events')

// Priority levels for download queue
const PRIORITY = {
  HIGH: 3,
  NORMAL: 2,
  LOW: 1
}

/**
 * Download Manager
 * Manages concurrent video downloads with worker pool
 */
class DownloadManager extends EventEmitter {
  constructor(options = {}) {
    super()

    // Detect CPU cores and set optimal concurrency
    const cpuCount = os.cpus().length
    const platform = os.platform()
    const arch = os.arch()

    // Apple Silicon optimization
    const isAppleSilicon = platform === 'darwin' && arch === 'arm64'

    // Calculate optimal concurrency
    // For Apple Silicon: Use 50% of cores (M-series have performance+efficiency cores)
    // For other systems: Use 75% of cores
    const optimalConcurrency = isAppleSilicon
      ? Math.max(2, Math.floor(cpuCount * 0.5))
      : Math.max(2, Math.floor(cpuCount * 0.75))

    this.maxConcurrent = options.maxConcurrent || optimalConcurrency
    this.maxRetries = options.maxRetries || 3
    this.activeDownloads = new Map() // videoId -> download info
    this.activeProcesses = new Map() // videoId -> child process
    this.queuedDownloads = [] // Array of pending download requests
    this.downloadHistory = new Map() // Track completed downloads

    console.log(`📦 DownloadManager initialized:`)
    console.log(`   Platform: ${platform} ${arch}`)
    console.log(`   CPU Cores: ${cpuCount}`)
    console.log(`   Max Concurrent: ${this.maxConcurrent}`)
    console.log(`   Max Retries: ${this.maxRetries}`)
    console.log(`   Apple Silicon: ${isAppleSilicon}`)
  }

  /**
   * Get current queue statistics
   */
  getStats() {
    return {
      active: this.activeDownloads.size,
      queued: this.queuedDownloads.length,
      maxConcurrent: this.maxConcurrent,
      completed: this.downloadHistory.size,
      canAcceptMore: this.activeDownloads.size < this.maxConcurrent
    }
  }

  /**
   * Add download to queue
   * @param {Object} downloadRequest - Download request object
   * @param {number} priority - Priority level (PRIORITY.HIGH/NORMAL/LOW)
   * @returns {Promise} Resolves when download completes
   */
  async addDownload(downloadRequest, priority = PRIORITY.NORMAL) {
    const { videoId, url, quality, format, savePath, cookieFile, downloadFn } = downloadRequest

    // Check if already downloading or queued
    if (this.activeDownloads.has(videoId)) {
      throw new Error(`Video ${videoId} is already being downloaded`)
    }

    if (this.queuedDownloads.find(req => req.videoId === videoId)) {
      throw new Error(`Video ${videoId} is already in queue`)
    }

    return new Promise((resolve, reject) => {
      const request = {
        videoId,
        url,
        quality,
        format,
        savePath,
        cookieFile,
        downloadFn,
        resolve,
        reject,
        priority,
        addedAt: Date.now(),
        retryCount: 0
      }

      this.queuedDownloads.push(request)
      this.sortQueue()
      this.emit('queueUpdated', this.getStats())

      // Try to process queue immediately
      this.processQueue()
    })
  }

  /**
   * Sort queue by priority and then by addedAt
   * @private
   */
  sortQueue() {
    this.queuedDownloads.sort((a, b) => {
      // Sort by priority first (higher priority first)
      if (b.priority !== a.priority) {
        return b.priority - a.priority
      }
      // Then by addedAt (older first)
      return a.addedAt - b.addedAt
    })
  }

  /**
   * Set priority for a queued download
   * @param {string} videoId - Video ID
   * @param {number} priority - New priority level
   * @returns {boolean} Success status
   */
  setPriority(videoId, priority) {
    const request = this.queuedDownloads.find(r => r.videoId === videoId)
    if (request) {
      request.priority = priority
      this.sortQueue()
      this.emit('queueUpdated', this.getStats())
      return true
    }
    return false
  }

  /**
   * Process download queue
   * Starts downloads up to maxConcurrent limit
   */
  async processQueue() {
    // Check if we can start more downloads
    while (this.activeDownloads.size < this.maxConcurrent && this.queuedDownloads.length > 0) {
      const request = this.queuedDownloads.shift()
      this.startDownload(request)
    }
  }

  /**
   * Start a single download
   */
  async startDownload(request) {
    const { videoId, url, quality, format, savePath, cookieFile, downloadFn, resolve, reject, retryCount } = request

    // Mark as active
    const downloadInfo = {
      videoId,
      url,
      startedAt: Date.now(),
      progress: 0,
      status: 'downloading',
      retryCount: retryCount || 0
    }

    this.activeDownloads.set(videoId, downloadInfo)
    this.emit('downloadStarted', { videoId, ...downloadInfo })
    this.emit('queueUpdated', this.getStats())

    try {
      console.log(`🚀 Starting download ${this.activeDownloads.size}/${this.maxConcurrent}: ${videoId}${retryCount ? ` (retry ${retryCount}/${this.maxRetries})` : ''}`)

      // Call the actual download function with callbacks
      const result = await downloadFn({
        url,
        quality,
        format,
        savePath,
        cookieFile,
        onProcess: (process) => {
          // Store process reference for cancellation
          this.activeProcesses.set(videoId, process)
        },
        onProgress: (progressData) => {
          // Update download info and emit progress
          if (downloadInfo) {
            downloadInfo.progress = progressData.progress || 0
            downloadInfo.speed = progressData.speed
            downloadInfo.eta = progressData.eta
            this.emit('downloadProgress', { videoId, ...progressData })
          }
        }
      })

      // Download completed successfully
      this.handleDownloadComplete(videoId, result, resolve)

    } catch (error) {
      // Check if error is retryable and we haven't exceeded max retries
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        console.log(`🔄 Retrying download (${retryCount + 1}/${this.maxRetries}): ${videoId}`)

        // Remove from active
        this.activeDownloads.delete(videoId)
        this.activeProcesses.delete(videoId)

        // Update retry count and re-queue with exponential backoff
        request.retryCount = retryCount + 1
        request.lastError = error.message

        setTimeout(() => {
          // Add to front of queue with same priority
          this.queuedDownloads.unshift(request)
          this.emit('queueUpdated', this.getStats())
          this.processQueue()
        }, Math.pow(2, retryCount) * 1000) // 1s, 2s, 4s backoff

      } else {
        // Max retries exceeded or non-retryable error
        this.handleDownloadError(videoId, error, reject)
      }
    }
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error object
   * @returns {boolean} True if error is retryable
   * @private
   */
  isRetryableError(error) {
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /ECONNRESET/i,
      /ETIMEDOUT/i,
      /ENOTFOUND/i,
      /ECONNREFUSED/i,
      /socket hang up/i,
      /503/i,
      /502/i,
      /504/i
    ]
    return retryablePatterns.some(pattern => pattern.test(error.message))
  }

  /**
   * Handle download completion
   */
  handleDownloadComplete(videoId, result, resolve) {
    const downloadInfo = this.activeDownloads.get(videoId)

    if (downloadInfo) {
      downloadInfo.status = 'completed'
      downloadInfo.completedAt = Date.now()
      downloadInfo.duration = downloadInfo.completedAt - downloadInfo.startedAt
      downloadInfo.result = result

      // Move to history
      this.downloadHistory.set(videoId, downloadInfo)
      this.activeDownloads.delete(videoId)

      // Clean up process reference
      this.activeProcesses.delete(videoId)

      console.log(`✅ Download completed: ${videoId} (${(downloadInfo.duration / 1000).toFixed(1)}s)`)

      this.emit('downloadCompleted', { videoId, result, duration: downloadInfo.duration })
      this.emit('queueUpdated', this.getStats())

      resolve(result)
    }

    // Process next in queue
    this.processQueue()
  }

  /**
   * Handle download error
   */
  handleDownloadError(videoId, error, reject) {
    const downloadInfo = this.activeDownloads.get(videoId)

    if (downloadInfo) {
      downloadInfo.status = 'error'
      downloadInfo.error = error.message
      downloadInfo.completedAt = Date.now()
      downloadInfo.duration = downloadInfo.completedAt - downloadInfo.startedAt

      // Move to history
      this.downloadHistory.set(videoId, downloadInfo)
      this.activeDownloads.delete(videoId)

      // Clean up process reference
      this.activeProcesses.delete(videoId)

      console.error(`❌ Download failed: ${videoId} - ${error.message}`)

      this.emit('downloadFailed', { videoId, error: error.message })
      this.emit('queueUpdated', this.getStats())

      reject(error)
    }

    // Process next in queue
    this.processQueue()
  }

  /**
   * Cancel a specific download
   * @param {string} videoId - Video ID to cancel
   * @returns {boolean} Success status
   */
  cancelDownload(videoId) {
    // Try to cancel active download first
    if (this.activeDownloads.has(videoId)) {
      const process = this.activeProcesses.get(videoId)

      if (process && !process.killed) {
        try {
          // Try graceful termination first
          process.kill('SIGTERM')

          // Force kill after 5 seconds if still running
          setTimeout(() => {
            if (!process.killed) {
              process.kill('SIGKILL')
            }
          }, 5000)

          console.log(`🛑 Cancelled active download: ${videoId}`)

          // Clean up
          const downloadInfo = this.activeDownloads.get(videoId)
          if (downloadInfo) {
            downloadInfo.status = 'cancelled'
            downloadInfo.error = 'Cancelled by user'
            this.downloadHistory.set(videoId, downloadInfo)
          }

          this.activeDownloads.delete(videoId)
          this.activeProcesses.delete(videoId)

          this.emit('downloadCancelled', { videoId })
          this.emit('queueUpdated', this.getStats())

          // Process next in queue
          this.processQueue()

          return true
        } catch (error) {
          console.error(`Error cancelling download ${videoId}:`, error)
          return false
        }
      }
    }

    // Remove from queue if present
    const queueIndex = this.queuedDownloads.findIndex(req => req.videoId === videoId)
    if (queueIndex !== -1) {
      const request = this.queuedDownloads.splice(queueIndex, 1)[0]
      request.reject(new Error('Download cancelled by user'))
      console.log(`🛑 Removed from queue: ${videoId}`)
      this.emit('queueUpdated', this.getStats())
      return true
    }

    return false
  }

  /**
   * Cancel all downloads (both active and queued)
   * @returns {Object} Cancellation results
   */
  cancelAll() {
    let cancelledActive = 0
    let cancelledQueued = 0

    // Cancel all active downloads
    for (const [videoId, process] of this.activeProcesses.entries()) {
      if (process && !process.killed) {
        try {
          process.kill('SIGTERM')
          setTimeout(() => {
            if (!process.killed) process.kill('SIGKILL')
          }, 5000)

          const downloadInfo = this.activeDownloads.get(videoId)
          if (downloadInfo) {
            downloadInfo.status = 'cancelled'
            downloadInfo.error = 'Cancelled by user'
            this.downloadHistory.set(videoId, downloadInfo)
          }

          cancelledActive++
        } catch (error) {
          console.error(`Error cancelling ${videoId}:`, error)
        }
      }
    }

    // Clear active downloads and processes
    this.activeDownloads.clear()
    this.activeProcesses.clear()

    // Cancel all queued downloads
    cancelledQueued = this.queuedDownloads.length

    this.queuedDownloads.forEach(request => {
      request.reject(new Error('Download cancelled by user'))
    })

    this.queuedDownloads = []
    this.emit('queueUpdated', this.getStats())

    console.log(`🛑 Cancelled ${cancelledActive} active and ${cancelledQueued} queued downloads`)

    return {
      cancelledActive,
      cancelledQueued,
      total: cancelledActive + cancelledQueued
    }
  }

  /**
   * Clear download history
   */
  clearHistory() {
    const count = this.downloadHistory.size
    this.downloadHistory.clear()
    console.log(`🗑️  Cleared ${count} download history entries`)
  }

  /**
   * Get download info
   */
  getDownloadInfo(videoId) {
    return this.activeDownloads.get(videoId) ||
           this.downloadHistory.get(videoId) ||
           this.queuedDownloads.find(req => req.videoId === videoId)
  }

  /**
   * Check if video is downloading or queued
   */
  isDownloading(videoId) {
    return this.activeDownloads.has(videoId) ||
           this.queuedDownloads.some(req => req.videoId === videoId)
  }
}

module.exports = DownloadManager
module.exports.PRIORITY = PRIORITY
