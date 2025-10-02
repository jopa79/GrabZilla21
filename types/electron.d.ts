// Type definitions for Electron API exposed via preload script
interface ElectronAPI {
  // File system operations
  selectSaveDirectory(): Promise<string | null>
  selectCookieFile(): Promise<string | null>
  
  // Binary management
  checkBinaryVersions(): Promise<{
    ytDlp: { version?: string; available: boolean }
    ffmpeg: { version?: string; available: boolean }
  }>
  
  // Video operations
  downloadVideo(options: {
    url: string
    quality: string
    format: string
    savePath: string
    cookieFile?: string
  }): Promise<{ success: boolean; output: string }>
  
  getVideoMetadata(url: string): Promise<{
    title: string
    duration: string
    thumbnail: string
    uploader: string
  }>
  
  // Event listeners
  onDownloadProgress(callback: (event: any, data: { url: string; progress: number }) => void): void
  removeDownloadProgressListener(callback: Function): void
  
  // App info
  getAppVersion(): string
  getPlatform(): string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}