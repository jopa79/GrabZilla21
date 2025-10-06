const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const notifier = require('node-notifier')
const ffmpegConverter = require('../scripts/utils/ffmpeg-converter')
const DownloadManager = require('./download-manager')

// Keep a global reference of the window object
let mainWindow

// Initialize download manager
const downloadManager = new DownloadManager()

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // macOS style - hides title bar but keeps native traffic lights
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icons/logo.png'), // App icon
    show: false // Don't show until ready
  })

  // Load the app
  mainWindow.loadFile(path.join(__dirname, '../index.html'))

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools()
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// App event handlers
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC handlers for file system operations
ipcMain.handle('select-save-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Download Directory',
      buttonLabel: 'Select Folder',
      message: 'Choose where to save downloaded videos'
    })
    
    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0]
      
      // Verify directory is writable
      try {
        await fs.promises.access(selectedPath, fs.constants.W_OK)
        console.log('Selected save directory:', selectedPath)
        return { success: true, path: selectedPath }
      } catch (error) {
        console.error('Directory not writable:', error)
        return { 
          success: false, 
          error: 'Selected directory is not writable. Please choose a different location.' 
        }
      }
    }
    
    return { success: false, error: 'No directory selected' }
  } catch (error) {
    console.error('Error selecting save directory:', error)
    return { 
      success: false, 
      error: `Failed to open directory selector: ${error.message}` 
    }
  }
})

// Create directory with recursive option
ipcMain.handle('create-directory', async (event, dirPath) => {
  try {
    if (!dirPath || typeof dirPath !== 'string') {
      return { success: false, error: 'Invalid directory path' }
    }

    // Expand ~ to home directory
    const expandedPath = dirPath.startsWith('~')
      ? path.join(require('os').homedir(), dirPath.slice(1))
      : dirPath

    // Create directory recursively
    await fs.promises.mkdir(expandedPath, { recursive: true })

    console.log('Directory created successfully:', expandedPath)
    return { success: true, path: expandedPath }
  } catch (error) {
    console.error('Error creating directory:', error)
    return {
      success: false,
      error: `Failed to create directory: ${error.message}`
    }
  }
})

ipcMain.handle('select-cookie-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Cookie Files', extensions: ['txt'] },
        { name: 'Netscape Cookie Files', extensions: ['cookies'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      title: 'Select Cookie File',
      buttonLabel: 'Select Cookie File',
      message: 'Choose a cookie file for age-restricted content'
    })
    
    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0]
      
      // Verify file exists and is readable
      try {
        await fs.promises.access(selectedPath, fs.constants.R_OK)
        const stats = await fs.promises.stat(selectedPath)
        
        if (stats.size === 0) {
          return { 
            success: false, 
            error: 'Selected cookie file is empty. Please choose a valid cookie file.' 
          }
        }
        
        console.log('Selected cookie file:', selectedPath)
        return { success: true, path: selectedPath }
      } catch (error) {
        console.error('Cookie file not accessible:', error)
        return { 
          success: false, 
          error: 'Selected cookie file is not readable. Please check file permissions.' 
        }
      }
    }
    
    return { success: false, error: 'No cookie file selected' }
  } catch (error) {
    console.error('Error selecting cookie file:', error)
    return { 
      success: false, 
      error: `Failed to open file selector: ${error.message}` 
    }
  }
})

// Desktop notification system
ipcMain.handle('show-notification', async (event, options) => {
  try {
    const notificationOptions = {
      title: options.title || 'GrabZilla',
      message: options.message || '',
      icon: options.icon || path.join(__dirname, '../assets/icons/logo.png'),
      sound: options.sound !== false, // Default to true
      wait: options.wait || false,
      timeout: options.timeout || 5
    }

    // Use native Electron notifications if supported, fallback to node-notifier
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: notificationOptions.title,
        body: notificationOptions.message,
        icon: notificationOptions.icon,
        silent: !notificationOptions.sound
      })

      notification.show()
      
      if (options.onClick && typeof options.onClick === 'function') {
        notification.on('click', options.onClick)
      }

      return { success: true, method: 'electron' }
    } else {
      // Fallback to node-notifier for older systems
      return new Promise((resolve) => {
        notifier.notify(notificationOptions, (err, response) => {
          if (err) {
            console.error('Notification error:', err)
            resolve({ success: false, error: err.message })
          } else {
            resolve({ success: true, method: 'node-notifier', response })
          }
        })
      })
    }
  } catch (error) {
    console.error('Failed to show notification:', error)
    return { success: false, error: error.message }
  }
})

// Error dialog system
ipcMain.handle('show-error-dialog', async (event, options) => {
  try {
    const dialogOptions = {
      type: 'error',
      title: options.title || 'Error',
      message: options.message || 'An error occurred',
      detail: options.detail || '',
      buttons: options.buttons || ['OK'],
      defaultId: options.defaultId || 0,
      cancelId: options.cancelId || 0
    }

    const result = await dialog.showMessageBox(mainWindow, dialogOptions)
    return { success: true, response: result.response, checkboxChecked: result.checkboxChecked }
  } catch (error) {
    console.error('Failed to show error dialog:', error)
    return { success: false, error: error.message }
  }
})

// Info dialog system
ipcMain.handle('show-info-dialog', async (event, options) => {
  try {
    const dialogOptions = {
      type: 'info',
      title: options.title || 'Information',
      message: options.message || '',
      detail: options.detail || '',
      buttons: options.buttons || ['OK'],
      defaultId: options.defaultId || 0
    }

    const result = await dialog.showMessageBox(mainWindow, dialogOptions)
    return { success: true, response: result.response }
  } catch (error) {
    console.error('Failed to show info dialog:', error)
    return { success: false, error: error.message }
  }
})

// Binary dependency management
ipcMain.handle('check-binary-dependencies', async () => {
  const binariesPath = path.join(__dirname, '../binaries')
  const results = {
    binariesPath,
    ytDlp: { available: false, path: null, error: null },
    ffmpeg: { available: false, path: null, error: null },
    allAvailable: false
  }

  try {
    // Ensure binaries directory exists
    if (!fs.existsSync(binariesPath)) {
      const error = `Binaries directory not found: ${binariesPath}`
      console.error(error)
      results.ytDlp.error = error
      results.ffmpeg.error = error
      return results
    }

    // Check yt-dlp
    const ytDlpPath = getBinaryPath('yt-dlp')
    results.ytDlp.path = ytDlpPath
    
    if (fs.existsSync(ytDlpPath)) {
      try {
        // Test if binary is executable
        await fs.promises.access(ytDlpPath, fs.constants.X_OK)
        results.ytDlp.available = true
        console.log('yt-dlp binary found and executable:', ytDlpPath)
      } catch (error) {
        results.ytDlp.error = 'yt-dlp binary exists but is not executable'
        console.error(results.ytDlp.error, error)
      }
    } else {
      results.ytDlp.error = 'yt-dlp binary not found'
      console.error(results.ytDlp.error, ytDlpPath)
    }

    // Check ffmpeg
    const ffmpegPath = getBinaryPath('ffmpeg')
    results.ffmpeg.path = ffmpegPath
    
    if (fs.existsSync(ffmpegPath)) {
      try {
        // Test if binary is executable
        await fs.promises.access(ffmpegPath, fs.constants.X_OK)
        results.ffmpeg.available = true
        console.log('ffmpeg binary found and executable:', ffmpegPath)
      } catch (error) {
        results.ffmpeg.error = 'ffmpeg binary exists but is not executable'
        console.error(results.ffmpeg.error, error)
      }
    } else {
      results.ffmpeg.error = 'ffmpeg binary not found'
      console.error(results.ffmpeg.error, ffmpegPath)
    }

    results.allAvailable = results.ytDlp.available && results.ffmpeg.available

    return results
  } catch (error) {
    console.error('Error checking binary dependencies:', error)
    results.ytDlp.error = error.message
    results.ffmpeg.error = error.message
    return results
  }
})

// Version checking cache (1-hour duration)
let versionCache = {
  ytdlp: { latestVersion: null, timestamp: 0 },
  ffmpeg: { latestVersion: null, timestamp: 0 }
}

const CACHE_DURATION = 1000 * 60 * 60 // 1 hour

/**
 * Compare two version strings
 * @param {string} v1 - First version (e.g., "2024.01.15")
 * @param {string} v2 - Second version
 * @returns {number} 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0

  // Remove non-numeric characters and split
  const parts1 = v1.replace(/[^0-9.]/g, '').split('.').map(Number)
  const parts2 = v2.replace(/[^0-9.]/g, '').split('.').map(Number)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0
    const p2 = parts2[i] || 0
    if (p1 > p2) return 1
    if (p1 < p2) return -1
  }
  return 0
}

/**
 * Get cached version or fetch from API
 * @param {string} key - Cache key ('ytdlp' or 'ffmpeg')
 * @param {Function} fetchFn - Function to fetch latest version
 * @returns {Promise<string|null>} Latest version or null
 */
async function getCachedVersion(key, fetchFn) {
  const cached = versionCache[key]
  const now = Date.now()

  // Return cached if still valid
  if (cached.latestVersion && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.latestVersion
  }

  // Fetch new version
  try {
    const version = await fetchFn()
    versionCache[key] = { latestVersion: version, timestamp: now }
    return version
  } catch (error) {
    console.warn(`Failed to fetch latest ${key} version:`, error.message)
    // Return cached even if expired on error
    return cached.latestVersion
  }
}

/**
 * Check latest yt-dlp version from GitHub API
 * @returns {Promise<string>} Latest version tag
 */
async function checkLatestYtDlpVersion() {
  const https = require('https')

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/yt-dlp/yt-dlp/releases/latest',
      method: 'GET',
      headers: {
        'User-Agent': 'GrabZilla/2.1.0 (Electron)',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      timeout: 10000
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const json = JSON.parse(data)
            // tag_name format: "2024.01.15"
            resolve(json.tag_name || null)
          } else if (res.statusCode === 403) {
            // Rate limited - return null gracefully
            console.warn('GitHub API rate limit exceeded, skipping version check')
            resolve(null)
          } else {
            console.warn(`GitHub API returned ${res.statusCode}, skipping version check`)
            resolve(null)
          }
        } catch (error) {
          console.warn('Error parsing GitHub API response:', error.message)
          resolve(null)
        }
      })
    })

    req.on('error', (error) => {
      console.warn('GitHub API request error:', error.message)
      resolve(null)
    })

    req.on('timeout', () => {
      req.destroy()
      console.warn('GitHub API request timeout')
      resolve(null)
    })

    req.end()
  })
}

// Binary management
ipcMain.handle('check-binary-versions', async () => {
  const binariesPath = path.join(__dirname, '../binaries')
  const results = {}
  let hasMissingBinaries = false

  try {
    // Ensure binaries directory exists
    if (!fs.existsSync(binariesPath)) {
      console.warn('Binaries directory not found:', binariesPath)
      hasMissingBinaries = true
      return { ytDlp: { available: false }, ffmpeg: { available: false } }
    }
    
    // Check yt-dlp version
    const ytDlpPath = getBinaryPath('yt-dlp')
    if (fs.existsSync(ytDlpPath)) {
      const ytDlpVersion = await runCommand(ytDlpPath, ['--version'])
      results.ytDlp = {
        version: ytDlpVersion.trim(),
        available: true,
        updateAvailable: false,
        latestVersion: null
      }

      // Check for updates (non-blocking)
      try {
        const latestVersion = await getCachedVersion('ytdlp', checkLatestYtDlpVersion)
        if (latestVersion) {
          results.ytDlp.latestVersion = latestVersion
          results.ytDlp.updateAvailable = compareVersions(latestVersion, results.ytDlp.version) > 0
        }
      } catch (updateError) {
        console.warn('Could not check for yt-dlp updates:', updateError.message)
        // Continue without update info
      }
    } else {
      results.ytDlp = { available: false }
      hasMissingBinaries = true
    }

    // Check ffmpeg version
    const ffmpegPath = getBinaryPath('ffmpeg')
    if (fs.existsSync(ffmpegPath)) {
      const ffmpegVersion = await runCommand(ffmpegPath, ['-version'])
      const versionMatch = ffmpegVersion.match(/ffmpeg version ([^\s]+)/)
      results.ffmpeg = {
        version: versionMatch ? versionMatch[1] : 'unknown',
        available: true,
        updateAvailable: false,
        latestVersion: null
      }
      // Note: ffmpeg doesn't have easy API for latest version
      // Skip update checking for ffmpeg for now
    } else {
      results.ffmpeg = { available: false }
      hasMissingBinaries = true
    }

    // Show native notification if binaries are missing
    if (hasMissingBinaries && mainWindow) {
      const missingList = [];
      if (!results.ytDlp || !results.ytDlp.available) missingList.push('yt-dlp');
      if (!results.ffmpeg || !results.ffmpeg.available) missingList.push('ffmpeg');

      console.error(`❌ Missing binaries detected: ${missingList.join(', ')}`);

      // Send notification via IPC to show dialog
      mainWindow.webContents.send('binaries-missing', {
        missing: missingList,
        message: `Required binaries missing: ${missingList.join(', ')}`
      });
    }
  } catch (error) {
    console.error('Error checking binary versions:', error)
    // Return safe defaults on error
    results.ytDlp = results.ytDlp || { available: false }
    results.ffmpeg = results.ffmpeg || { available: false }
  }

  return results
})

// Video download handler with format conversion integration (uses DownloadManager for parallel processing)
ipcMain.handle('download-video', async (event, { videoId, url, quality, format, savePath, cookieFile }) => {
  const ytDlpPath = getBinaryPath('yt-dlp')
  const ffmpegPath = getBinaryPath('ffmpeg')

  // Validate binaries exist before attempting download
  if (!fs.existsSync(ytDlpPath)) {
    const error = 'yt-dlp binary not found. Please run "npm run setup" to download required binaries.'
    console.error('❌', error)
    throw new Error(error)
  }

  // Check ffmpeg if format conversion is required
  const requiresConversion = format && format !== 'None'
  if (requiresConversion && !fs.existsSync(ffmpegPath)) {
    const error = 'ffmpeg binary not found. Required for format conversion. Please run "npm run setup".'
    console.error('❌', error)
    throw new Error(error)
  }

  // Validate inputs
  if (!videoId || !url || !quality || !savePath) {
    throw new Error('Missing required parameters: videoId, url, quality, or savePath')
  }

  // Check if format conversion is required (we already validated ffmpeg exists above if needed)
  const requiresConversionCheck = format && format !== 'None' && ffmpegConverter.isAvailable()

  console.log('Adding download to queue:', {
    videoId, url, quality, format, savePath, requiresConversion: requiresConversionCheck
  })

  // Define download function
  const downloadFn = async ({ url, quality, format, savePath, cookieFile }) => {
    try {
      // Step 1: Download video with yt-dlp
      const downloadResult = await downloadWithYtDlp(event, {
        url, quality, savePath, cookieFile, requiresConversion: requiresConversionCheck
      })

      // Step 2: Convert format if required
      if (requiresConversionCheck && downloadResult.success) {
        const conversionResult = await convertVideoFormat(event, {
          url,
          inputPath: downloadResult.filePath,
          format,
          quality,
          savePath
        })

        return {
          success: true,
          filename: conversionResult.filename,
          originalFile: downloadResult.filename,
          convertedFile: conversionResult.filename,
          message: 'Download and conversion completed successfully'
        }
      }

      return downloadResult
    } catch (error) {
      console.error('Download/conversion process failed:', error)
      throw error
    }
  }

  // Add to download manager queue
  return await downloadManager.addDownload({
    videoId,
    url,
    quality,
    format,
    savePath,
    cookieFile,
    downloadFn
  })
})

/**
 * Download video using yt-dlp
 */
async function downloadWithYtDlp(event, { url, quality, savePath, cookieFile, requiresConversion, onProcess, onProgress }) {
  const ytDlpPath = getBinaryPath('yt-dlp')

  // Build yt-dlp arguments
  const args = [
    '--newline', // Force progress on new lines for better parsing
    '--no-warnings', // Reduce noise in output
    '-f', getQualityFormat(quality),
    '-o', path.join(savePath, '%(title)s.%(ext)s'),
    url
  ]

  // Add cookie file if provided
  if (cookieFile && fs.existsSync(cookieFile)) {
    args.unshift('--cookies', cookieFile)
  }

  return new Promise((resolve, reject) => {
    console.log('Starting yt-dlp download:', { url, quality, savePath })

    const downloadProcess = spawn(ytDlpPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    })

    // Notify caller about process reference for cancellation
    if (onProcess && typeof onProcess === 'function') {
      onProcess(downloadProcess)
    }
    
    let output = ''
    let errorOutput = ''
    let downloadedFilename = null
    let downloadedFilePath = null
    
    // Enhanced progress parsing from yt-dlp output
    downloadProcess.stdout.on('data', (data) => {
      const chunk = data.toString()
      output += chunk
      
      // Parse different types of progress information
      const lines = chunk.split('\n')
      
      lines.forEach(line => {
        // Download progress: [download] 45.2% of 123.45MiB at 1.23MiB/s ETA 00:30
        const downloadMatch = line.match(/\[download\]\s+(\d+\.?\d*)%/)
        if (downloadMatch) {
          const progress = parseFloat(downloadMatch[1])
          // Adjust progress if conversion is required (download is only 70% of total)
          const adjustedProgress = requiresConversion ? Math.round(progress * 0.7) : progress

          const progressData = {
            url,
            progress: adjustedProgress,
            status: 'downloading',
            stage: 'download'
          }

          // Send to renderer
          event.sender.send('download-progress', progressData)

          // Notify callback if provided
          if (onProgress && typeof onProgress === 'function') {
            onProgress(progressData)
          }
        }
        
        // Post-processing progress: [ffmpeg] Destination: filename.mp4
        const ffmpegMatch = line.match(/\[ffmpeg\]/)
        if (ffmpegMatch && !requiresConversion) {
          event.sender.send('download-progress', {
            url,
            progress: 95, // Assume 95% when post-processing starts
            status: 'converting',
            stage: 'postprocess'
          })
        }
        
        // Extract final filename: [download] Destination: filename.mp4
        const filenameMatch = line.match(/\[download\]\s+Destination:\s+(.+)/)
        if (filenameMatch) {
          downloadedFilename = path.basename(filenameMatch[1])
          downloadedFilePath = filenameMatch[1]
        }
        
        // Alternative filename extraction: [download] filename.mp4 has already been downloaded
        const alreadyDownloadedMatch = line.match(/\[download\]\s+(.+?)\s+has already been downloaded/)
        if (alreadyDownloadedMatch) {
          downloadedFilename = path.basename(alreadyDownloadedMatch[1])
          downloadedFilePath = alreadyDownloadedMatch[1]
        }
      })
    })
    
    downloadProcess.stderr.on('data', (data) => {
      const chunk = data.toString()
      errorOutput += chunk
      
      // Some yt-dlp messages come through stderr but aren't errors
      if (chunk.includes('WARNING') || chunk.includes('ERROR')) {
        console.warn('yt-dlp warning/error:', chunk.trim())
      }
    })
    
    downloadProcess.on('close', (code) => {
      console.log(`yt-dlp process exited with code ${code}`)
      
      if (code === 0) {
        // Send progress update - either final or intermediate if conversion required
        const finalProgress = requiresConversion ? 70 : 100
        const finalStatus = requiresConversion ? 'downloading' : 'completed'
        
        event.sender.send('download-progress', {
          url,
          progress: finalProgress,
          status: finalStatus,
          stage: requiresConversion ? 'download' : 'complete'
        })

        // Send desktop notification for successful download
        if (!requiresConversion) {
          notifyDownloadComplete(downloadedFilename || 'Video', true)
        }
        
        resolve({ 
          success: true, 
          output,
          filename: downloadedFilename,
          filePath: downloadedFilePath,
          message: requiresConversion ? 'Download completed, starting conversion...' : 'Download completed successfully'
        })
      } else {
        // Enhanced error parsing with detailed user-friendly messages
        const errorInfo = parseDownloadError(errorOutput, code)
        
        // Send error notification
        notifyDownloadComplete(url, false, errorInfo.message)
        
        // Send error progress update
        event.sender.send('download-progress', {
          url,
          progress: 0,
          status: 'error',
          stage: 'error',
          error: errorInfo.message,
          errorCode: code,
          errorType: errorInfo.type
        })
        
        reject(new Error(errorInfo.message))
      }
    })
    
    downloadProcess.on('error', (error) => {
      console.error('Failed to start yt-dlp process:', error)
      reject(new Error(`Failed to start download process: ${error.message}`))
    })
  })
}

// Helper function to get yt-dlp format string for quality
function getQualityFormat(quality) {
  const qualityMap = {
    '4K': 'best[height<=2160]',
    '1440p': 'best[height<=1440]', 
    '1080p': 'best[height<=1080]',
    '720p': 'best[height<=720]',
    '480p': 'best[height<=480]',
    'best': 'best'
  }
  
  return qualityMap[quality] || 'best[height<=720]'
}

// Format conversion handlers
ipcMain.handle('cancel-conversion', async (event, conversionId) => {
  try {
    const cancelled = ffmpegConverter.cancelConversion(conversionId)
    return { success: cancelled, message: cancelled ? 'Conversion cancelled' : 'Conversion not found' }
  } catch (error) {
    console.error('Error cancelling conversion:', error)
    throw new Error(`Failed to cancel conversion: ${error.message}`)
  }
})

ipcMain.handle('cancel-all-conversions', async (event) => {
  try {
    const cancelledCount = ffmpegConverter.cancelAllConversions()
    return { 
      success: true, 
      cancelledCount, 
      message: `Cancelled ${cancelledCount} active conversions` 
    }
  } catch (error) {
    console.error('Error cancelling all conversions:', error)
    throw new Error(`Failed to cancel conversions: ${error.message}`)
  }
})

ipcMain.handle('get-active-conversions', async (event) => {
  try {
    const activeConversions = ffmpegConverter.getActiveConversions()
    return { success: true, conversions: activeConversions }
  } catch (error) {
    console.error('Error getting active conversions:', error)
    throw new Error(`Failed to get active conversions: ${error.message}`)
  }
})

// Download Manager IPC Handlers
ipcMain.handle('get-download-stats', async (event) => {
  try {
    const stats = downloadManager.getStats()
    return { success: true, stats }
  } catch (error) {
    console.error('Error getting download stats:', error)
    throw new Error(`Failed to get download stats: ${error.message}`)
  }
})

ipcMain.handle('cancel-download', async (event, videoId) => {
  try {
    const cancelled = downloadManager.cancelDownload(videoId)
    return {
      success: cancelled,
      message: cancelled ? 'Download cancelled' : 'Download not found in queue'
    }
  } catch (error) {
    console.error('Error cancelling download:', error)
    throw new Error(`Failed to cancel download: ${error.message}`)
  }
})

ipcMain.handle('cancel-all-downloads', async (event) => {
  try {
    const result = downloadManager.cancelAll()
    return {
      success: true,
      cancelled: result.cancelled,
      active: result.active,
      message: `Cancelled ${result.cancelled} queued downloads. ${result.active} downloads still active.`
    }
  } catch (error) {
    console.error('Error cancelling all downloads:', error)
    throw new Error(`Failed to cancel downloads: ${error.message}`)
  }
})

// Get video metadata with optimized extraction (only essential fields)
ipcMain.handle('get-video-metadata', async (event, url) => {
  const ytDlpPath = getBinaryPath('yt-dlp')

  if (!fs.existsSync(ytDlpPath)) {
    const errorInfo = handleBinaryMissing('yt-dlp')
    throw new Error(errorInfo.message)
  }

  if (!url || typeof url !== 'string') {
    throw new Error('Valid URL is required')
  }

  try {
    console.log('Fetching metadata for:', url)
    const startTime = Date.now()

    // OPTIMIZED: Extract only the 3 fields we actually display (5-10x faster)
    // Format: title|||duration|||thumbnail (pipe-delimited for easy parsing)
    const args = [
      '--print', '%(title)s|||%(duration)s|||%(thumbnail)s',
      '--no-warnings',
      '--skip-download',
      '--playlist-items', '1', // Only first video if playlist
      '--no-playlist',         // Skip playlist extraction entirely
      url
    ]

    const output = await runCommand(ytDlpPath, args)

    if (!output.trim()) {
      throw new Error('No metadata returned from yt-dlp')
    }

    // Parse pipe-delimited output
    const parts = output.trim().split('|||')

    if (parts.length < 3) {
      throw new Error('Invalid metadata format received')
    }

    const result = {
      title: parts[0] || 'Unknown Title',
      duration: parseInt(parts[1]) || 0,  // Raw seconds as number
      thumbnail: parts[2] || null
    }

    const duration = Date.now() - startTime
    console.log(`Metadata extracted in ${duration}ms:`, result.title)
    return result

  } catch (error) {
    console.error('Error extracting metadata:', error)

    // Provide more specific error messages
    if (error.message.includes('Video unavailable')) {
      throw new Error('Video is unavailable or has been removed')
    } else if (error.message.includes('Private video')) {
      throw new Error('Video is private and cannot be accessed')
    } else if (error.message.includes('Sign in')) {
      throw new Error('Age-restricted video - authentication required')
    } else if (error.message.includes('network')) {
      throw new Error('Network error - check your internet connection')
    } else {
      throw new Error(`Failed to get metadata: ${error.message}`)
    }
  }
})

// Batch metadata extraction for multiple URLs - OPTIMIZED for speed
ipcMain.handle('get-batch-video-metadata', async (event, urls) => {
  const ytDlpPath = getBinaryPath('yt-dlp')

  if (!fs.existsSync(ytDlpPath)) {
    const errorInfo = handleBinaryMissing('yt-dlp')
    throw new Error(errorInfo.message)
  }

  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error('Valid URL array is required')
  }

  try {
    console.log(`Fetching metadata for ${urls.length} videos in batch...`)
    const startTime = Date.now()

    // PARALLEL OPTIMIZATION: Split URLs into chunks and process in parallel
    // Optimal: 3 URLs per chunk, max 4 concurrent processes
    const CHUNK_SIZE = 3
    const MAX_PARALLEL = 4

    const chunks = []
    for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
      chunks.push(urls.slice(i, i + CHUNK_SIZE))
    }

    console.log(`Processing ${urls.length} URLs in ${chunks.length} chunks (${CHUNK_SIZE} URLs/chunk, max ${MAX_PARALLEL} parallel)`)

    // Process chunks in parallel batches
    const allResults = []
    for (let batchStart = 0; batchStart < chunks.length; batchStart += MAX_PARALLEL) {
      const batchChunks = chunks.slice(batchStart, batchStart + MAX_PARALLEL)

      // Run chunk extractions in parallel
      const chunkPromises = batchChunks.map(async (chunkUrls) => {
        const args = [
          '--print', '%(webpage_url)s|||%(title)s|||%(duration)s|||%(thumbnail)s',
          '--no-warnings',
          '--skip-download',
          '--ignore-errors',
          '--playlist-items', '1',
          '--no-playlist',
          ...chunkUrls
        ]

        try {
          return await runCommand(ytDlpPath, args)
        } catch (error) {
          console.error(`Chunk extraction failed for ${chunkUrls.length} URLs:`, error.message)
          return '' // Return empty on error, don't fail entire batch
        }
      })

      const outputs = await Promise.all(chunkPromises)

      // Combine outputs from this batch
      for (const output of outputs) {
        if (output && output.trim()) {
          allResults.push(output.trim())
        }
      }
    }

    const combinedOutput = allResults.join('\n')

    if (!combinedOutput.trim()) {
      console.warn('No metadata returned from parallel batch extraction')
      return []
    }

    // Parse pipe-delimited lines
    const lines = combinedOutput.trim().split('\n')
    const results = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      try {
        const parts = line.split('|||')

        if (parts.length >= 4) {
          results.push({
            url: parts[0] || '',
            title: parts[1] || 'Unknown Title',
            duration: parseInt(parts[2]) || 0,
            thumbnail: parts[3] || null
          })
        } else {
          console.warn(`Skipping malformed line ${i + 1}:`, line)
        }
      } catch (parseError) {
        console.error(`Error parsing metadata line ${i + 1}:`, parseError)
        // Continue processing other lines
      }
    }

    const duration = Date.now() - startTime
    const avgTime = duration / urls.length
    console.log(`Batch metadata extracted: ${results.length}/${urls.length} successful in ${duration}ms (${avgTime.toFixed(1)}ms avg/video) [PARALLEL]`)

    return results

  } catch (error) {
    console.error('Error in batch metadata extraction:', error)
    throw new Error(`Failed to get batch metadata: ${error.message}`)
  }
})

// Extract all videos from a YouTube playlist
ipcMain.handle('extract-playlist-videos', async (event, playlistUrl) => {
  const ytDlpPath = getBinaryPath('yt-dlp')

  if (!fs.existsSync(ytDlpPath)) {
    const errorInfo = handleBinaryMissing('yt-dlp')
    throw new Error(errorInfo.message)
  }

  if (!playlistUrl || typeof playlistUrl !== 'string') {
    throw new Error('Valid playlist URL is required')
  }

  // Verify it's a playlist URL
  const playlistPattern = /[?&]list=([\w\-]+)/
  const match = playlistUrl.match(playlistPattern)

  if (!match) {
    throw new Error('Invalid playlist URL format')
  }

  const playlistId = match[1]

  try {
    console.log('Extracting playlist videos:', playlistId)

    // Use yt-dlp to extract playlist information
    const args = [
      '--flat-playlist',
      '--dump-json',
      '--no-warnings',
      playlistUrl
    ]

    const output = await runCommand(ytDlpPath, args)

    if (!output.trim()) {
      throw new Error('No playlist data returned from yt-dlp')
    }

    // Parse JSON lines (one per video)
    const lines = output.trim().split('\n')
    const videos = []

    for (const line of lines) {
      try {
        const videoData = JSON.parse(line)

        // Extract essential video information
        videos.push({
          id: videoData.id,
          title: videoData.title || 'Unknown Title',
          url: videoData.url || `https://www.youtube.com/watch?v=${videoData.id}`,
          duration: videoData.duration || null,
          thumbnail: videoData.thumbnail || null,
          uploader: videoData.uploader || videoData.channel || null
        })
      } catch (parseError) {
        console.warn('Failed to parse playlist video:', parseError)
        // Continue processing other videos
      }
    }

    console.log(`Extracted ${videos.length} videos from playlist`)

    return {
      success: true,
      playlistId: playlistId,
      videoCount: videos.length,
      videos: videos
    }

  } catch (error) {
    console.error('Error extracting playlist:', error)

    if (error.message.includes('Playlist does not exist')) {
      throw new Error('Playlist not found or has been deleted')
    } else if (error.message.includes('Private')) {
      throw new Error('Playlist is private and cannot be accessed')
    } else {
      throw new Error(`Failed to extract playlist: ${error.message}`)
    }
  }
})

// Helper function to select the best thumbnail from available options
// NOTE: Removed unused helper functions that extracted metadata we don't display:
// - selectBestThumbnail() - yt-dlp now provides single thumbnail URL directly
// - extractAvailableQualities() - quality dropdown is manual, not auto-populated
// - formatUploadDate() - upload date not displayed in UI
// - formatViewCount() - view count not displayed in UI
// - formatFilesize() - filesize not displayed in UI

// Utility functions
function getBinaryPath(binaryName) {
  const binariesPath = path.join(__dirname, '../binaries')
  const extension = process.platform === 'win32' ? '.exe' : ''
  return path.join(binariesPath, `${binaryName}${extension}`)
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args)
    let output = ''
    let error = ''
    
    process.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    process.stderr.on('data', (data) => {
      error += data.toString()
    })
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve(output)
      } else {
        reject(new Error(error))
      }
    })
  })
}

function formatDuration(seconds) {
  if (!seconds) return '--:--'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
}

/**
 * Convert video format using FFmpeg
 */
async function convertVideoFormat(event, { url, inputPath, format, quality, savePath }) {
  if (!ffmpegConverter.isAvailable()) {
    throw new Error('FFmpeg binary not found - conversion not available')
  }

  // Generate output filename with appropriate extension and format suffix
  const inputFilename = path.basename(inputPath, path.extname(inputPath))
  const outputExtension = getOutputExtension(format)

  // Map format names to proper filename suffixes
  const formatSuffixes = {
    'H264': 'h264',
    'ProRes': 'prores',
    'DNxHR': 'dnxhd',
    'Audio only': 'audio'
  }
  const suffix = formatSuffixes[format] || format.toLowerCase()

  const outputFilename = `${inputFilename}_${suffix}.${outputExtension}`
  const outputPath = path.join(savePath, outputFilename)

  console.log('Starting format conversion:', { 
    inputPath, outputPath, format, quality 
  })

  // Get video duration for progress calculation
  const duration = await ffmpegConverter.getVideoDuration(inputPath)

  // Set up progress callback
  const onProgress = (progressData) => {
    // Map conversion progress to 70-100% range (download was 0-70%)
    const adjustedProgress = 70 + Math.round(progressData.progress * 0.3)
    
    event.sender.send('download-progress', {
      url,
      progress: adjustedProgress,
      status: 'converting',
      stage: 'conversion',
      conversionSpeed: progressData.speed
    })
  }

  try {
    // Start conversion
    event.sender.send('download-progress', {
      url,
      progress: 70,
      status: 'converting',
      stage: 'conversion'
    })

    const result = await ffmpegConverter.convertVideo({
      inputPath,
      outputPath,
      format,
      quality,
      duration,
      onProgress
    })

    // Send final completion progress
    event.sender.send('download-progress', {
      url,
      progress: 100,
      status: 'completed',
      stage: 'complete'
    })

    // Send desktop notification for successful conversion
    notifyDownloadComplete(outputFilename, true)

    // Clean up original file if conversion successful
    try {
      fs.unlinkSync(inputPath)
      console.log('Cleaned up original file:', inputPath)
    } catch (cleanupError) {
      console.warn('Failed to clean up original file:', cleanupError.message)
    }

    return {
      success: true,
      filename: outputFilename,
      filePath: outputPath,
      fileSize: result.fileSize,
      message: 'Conversion completed successfully'
    }

  } catch (error) {
    console.error('Format conversion failed:', error)
    throw new Error(`Format conversion failed: ${error.message}`)
  }
}

/**
 * Get output file extension for format
 */
function getOutputExtension(format) {
  const extensionMap = {
    'H264': 'mp4',
    'ProRes': 'mov',
    'DNxHR': 'mov',
    'Audio only': 'm4a'
  }
  return extensionMap[format] || 'mp4'
}

/**
 * Parse download errors and provide user-friendly messages
 */
function parseDownloadError(errorOutput, exitCode) {
  const errorInfo = {
    type: 'unknown',
    message: 'Download failed with unknown error',
    suggestion: 'Please try again or check the video URL'
  }

  if (!errorOutput) {
    errorInfo.type = 'process'
    errorInfo.message = `Download process failed (exit code: ${exitCode})`
    return errorInfo
  }

  const lowerError = errorOutput.toLowerCase()

  // Network-related errors
  if (lowerError.includes('network') || lowerError.includes('connection') || lowerError.includes('timeout')) {
    errorInfo.type = 'network'
    errorInfo.message = 'Network connection error - check your internet connection'
    errorInfo.suggestion = 'Verify your internet connection and try again'
  }
  // Video availability errors
  else if (lowerError.includes('video unavailable') || lowerError.includes('private video') || lowerError.includes('removed')) {
    errorInfo.type = 'availability'
    errorInfo.message = 'Video is unavailable, private, or has been removed'
    errorInfo.suggestion = 'Check if the video URL is correct and publicly accessible'
  }
  // Age restriction errors
  else if (lowerError.includes('sign in') || lowerError.includes('age') || lowerError.includes('restricted')) {
    errorInfo.type = 'age_restricted'
    errorInfo.message = 'Age-restricted video - authentication required'
    errorInfo.suggestion = 'Use a cookie file from your browser to access age-restricted content'
  }
  // Format/quality errors
  else if (lowerError.includes('format') || lowerError.includes('quality') || lowerError.includes('resolution')) {
    errorInfo.type = 'format'
    errorInfo.message = 'Requested video quality/format not available'
    errorInfo.suggestion = 'Try a different quality setting or use "Best Available"'
  }
  // Permission/disk space errors
  else if (lowerError.includes('permission') || lowerError.includes('access') || lowerError.includes('denied')) {
    errorInfo.type = 'permission'
    errorInfo.message = 'Permission denied - cannot write to download directory'
    errorInfo.suggestion = 'Check folder permissions or choose a different download location'
  }
  else if (lowerError.includes('space') || lowerError.includes('disk full') || lowerError.includes('no space')) {
    errorInfo.type = 'disk_space'
    errorInfo.message = 'Insufficient disk space for download'
    errorInfo.suggestion = 'Free up disk space or choose a different download location'
  }
  // Geo-blocking errors
  else if (lowerError.includes('geo') || lowerError.includes('region') || lowerError.includes('country')) {
    errorInfo.type = 'geo_blocked'
    errorInfo.message = 'Video not available in your region'
    errorInfo.suggestion = 'This video is geo-blocked in your location'
  }
  // Rate limiting
  else if (lowerError.includes('rate') || lowerError.includes('limit') || lowerError.includes('too many')) {
    errorInfo.type = 'rate_limit'
    errorInfo.message = 'Rate limited - too many requests'
    errorInfo.suggestion = 'Wait a few minutes before trying again'
  }
  // Extract specific error message if available
  else if (errorOutput.trim()) {
    const lines = errorOutput.trim().split('\n')
    const errorLines = lines.filter(line => 
      line.includes('ERROR') || 
      line.includes('error') || 
      line.includes('failed') ||
      line.includes('unable')
    )
    
    if (errorLines.length > 0) {
      const lastErrorLine = errorLines[errorLines.length - 1]
      // Clean up the error message
      let cleanMessage = lastErrorLine
        .replace(/^.*ERROR[:\s]*/i, '')
        .replace(/^.*error[:\s]*/i, '')
        .replace(/^\[.*?\]\s*/, '')
        .trim()
      
      if (cleanMessage && cleanMessage.length < 200) {
        errorInfo.message = cleanMessage
        errorInfo.type = 'specific'
      }
    }
  }

  return errorInfo
}

/**
 * Send desktop notification for download completion
 */
function notifyDownloadComplete(filename, success, errorMessage = null) {
  try {
    const notificationOptions = {
      title: success ? 'Download Complete' : 'Download Failed',
      message: success 
        ? `Successfully downloaded: ${filename}`
        : `Failed to download: ${errorMessage || 'Unknown error'}`,
      icon: path.join(__dirname, '../assets/icons/logo.png'),
      sound: true,
      timeout: success ? 5 : 10 // Show error notifications longer
    }

    // Use native Electron notifications if supported
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: notificationOptions.title,
        body: notificationOptions.message,
        icon: notificationOptions.icon,
        silent: false
      })

      notification.show()

      // Auto-close success notifications after 5 seconds
      if (success) {
        setTimeout(() => {
          notification.close()
        }, 5000)
      }
    } else {
      // Fallback to node-notifier
      notifier.notify(notificationOptions, (err) => {
        if (err) {
          console.error('Notification error:', err)
        }
      })
    }
  } catch (error) {
    console.error('Failed to send notification:', error)
  }
}

/**
 * Enhanced binary missing error handler
 */
function handleBinaryMissing(binaryName) {
  const errorInfo = {
    title: 'Missing Dependency',
    message: `${binaryName} binary not found`,
    detail: `The ${binaryName} binary is required for video downloads but was not found in the binaries directory. Please ensure all dependencies are properly installed.`,
    suggestion: binaryName === 'yt-dlp' 
      ? 'yt-dlp is required for downloading videos from YouTube and other platforms'
      : 'ffmpeg is required for video format conversion and processing'
  }

  // Send notification about missing binary
  notifier.notify({
    title: errorInfo.title,
    message: `${errorInfo.message}. Please check the application setup.`,
    icon: path.join(__dirname, '../assets/icons/logo.png'),
    sound: true,
    timeout: 10
  })

  return errorInfo
}