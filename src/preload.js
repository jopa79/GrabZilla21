const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  selectSaveDirectory: () => ipcRenderer.invoke('select-save-directory'),
  selectCookieFile: () => ipcRenderer.invoke('select-cookie-file'),
  createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),
  
  // Desktop notifications and dialogs
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  showErrorDialog: (options) => ipcRenderer.invoke('show-error-dialog', options),
  showInfoDialog: (options) => ipcRenderer.invoke('show-info-dialog', options),
  
  // Binary management
  checkBinaryVersions: () => ipcRenderer.invoke('check-binary-versions'),
  checkBinaryDependencies: () => ipcRenderer.invoke('check-binary-dependencies'),
  
  // Video operations
  downloadVideo: (options) => ipcRenderer.invoke('download-video', options),
  getVideoMetadata: (url) => ipcRenderer.invoke('get-video-metadata', url),
  
  // Format conversion operations
  cancelConversion: (conversionId) => ipcRenderer.invoke('cancel-conversion', conversionId),
  cancelAllConversions: () => ipcRenderer.invoke('cancel-all-conversions'),
  getActiveConversions: () => ipcRenderer.invoke('get-active-conversions'),

  // Download manager operations
  getDownloadStats: () => ipcRenderer.invoke('get-download-stats'),
  cancelDownload: (videoId) => ipcRenderer.invoke('cancel-download', videoId),
  cancelAllDownloads: () => ipcRenderer.invoke('cancel-all-downloads'),
  
  // Event listeners for download progress with enhanced data
  onDownloadProgress: (callback) => {
    const wrappedCallback = (event, progressData) => {
      // Ensure callback receives consistent progress data structure
      const enhancedData = {
        url: progressData.url,
        progress: progressData.progress || 0,
        status: progressData.status || 'downloading',
        stage: progressData.stage || 'download',
        message: progressData.message || null
      }
      callback(event, enhancedData)
    }
    
    ipcRenderer.on('download-progress', wrappedCallback)
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('download-progress', wrappedCallback)
    }
  },
  
  removeDownloadProgressListener: (callback) => {
    ipcRenderer.removeListener('download-progress', callback)
  },
  
  // App info
  getAppVersion: () => process.env.npm_package_version || '2.1.0',
  getPlatform: () => process.platform
})