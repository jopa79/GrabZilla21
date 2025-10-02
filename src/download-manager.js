/**
 * @fileoverview Download Manager for parallel video downloads
 * Handles concurrent download queue with optimal CPU utilization
 * @author GrabZilla Development Team
 * @version 2.1.0
 */

const os = require('os')
const EventEmitter = require('events')

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
    this.activeDownloads = new Map() // videoId -> download info
    this.queuedDownloads = [] // Array of pending download requests
    this.downloadHistory = new Map() // Track completed downloads

    console.log(`📦 DownloadManager initialized:`)
    console.log(`   Platform: ${platform} ${arch}`)
    console.log(`   CPU Cores: ${cpuCount}`)
    console.log(`   Max Concurrent: ${this.maxConcurrent}`)
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
   * @returns {Promise} Resolves when download completes
   */
  async addDownload(downloadRequest) {
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
        addedAt: Date.now()
      }

      this.queuedDownloads.push(request)
      this.emit('queueUpdated', this.getStats())

      // Try to process queue immediately
      this.processQueue()
    })
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
    const { videoId, url, quality, format, savePath, cookieFile, downloadFn, resolve, reject } = request

    // Mark as active
    const downloadInfo = {
      videoId,
      url,
      startedAt: Date.now(),
      progress: 0,
      status: 'downloading'
    }

    this.activeDownloads.set(videoId, downloadInfo)
    this.emit('downloadStarted', { videoId, ...downloadInfo })
    this.emit('queueUpdated', this.getStats())

    try {
      console.log(`🚀 Starting download ${this.activeDownloads.size}/${this.maxConcurrent}: ${videoId}`)

      // Call the actual download function
      const result = await downloadFn({
        url,
        quality,
        format,
        savePath,
        cookieFile
      })

      // Download completed successfully
      this.handleDownloadComplete(videoId, result, resolve)

    } catch (error) {
      // Download failed
      this.handleDownloadError(videoId, error, reject)
    }
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

      // Move to history
      this.downloadHistory.set(videoId, downloadInfo)
      this.activeDownloads.delete(videoId)

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
   */
  cancelDownload(videoId) {
    // Remove from queue if present
    const queueIndex = this.queuedDownloads.findIndex(req => req.videoId === videoId)
    if (queueIndex !== -1) {
      const request = this.queuedDownloads.splice(queueIndex, 1)[0]
      request.reject(new Error('Download cancelled by user'))
      this.emit('queueUpdated', this.getStats())
      return true
    }

    // Can't cancel active downloads without process reference
    // This would require tracking child processes
    if (this.activeDownloads.has(videoId)) {
      console.warn(`Cannot cancel active download: ${videoId} (process management needed)`)
      return false
    }

    return false
  }

  /**
   * Cancel all downloads
   */
  cancelAll() {
    // Cancel all queued downloads
    const cancelled = this.queuedDownloads.length

    this.queuedDownloads.forEach(request => {
      request.reject(new Error('Download cancelled by user'))
    })

    this.queuedDownloads = []
    this.emit('queueUpdated', this.getStats())

    console.log(`🛑 Cancelled ${cancelled} queued downloads`)

    return {
      cancelled,
      active: this.activeDownloads.size // Can't cancel these without process refs
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
