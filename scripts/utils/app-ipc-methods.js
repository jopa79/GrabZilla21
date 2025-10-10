/**
 * @fileoverview Enhanced IPC methods for GrabZilla app
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

/**
 * Enhanced IPC methods to replace placeholder implementations in app.js
 * These methods provide full Electron IPC integration for desktop functionality
 */

/**
 * Enhanced cookie file selection with IPC integration
 * Replaces the placeholder handleSelectCookieFile method
 */
async function handleSelectCookieFile() {
    if (!window.electronAPI) {
        this.showStatus('File selection not available in browser mode', 'error');
        return;
    }

    try {
        this.showStatus('Opening file dialog...', 'info');
        
        const cookieFilePath = await window.electronAPI.selectCookieFile();
        
        if (cookieFilePath) {
            // Update configuration with selected cookie file
            this.state.updateConfig({ cookieFile: cookieFilePath });
            
            // Update UI to show selected file
            this.updateCookieFileUI(cookieFilePath);
            
            this.showStatus('Cookie file selected successfully', 'success');
            logger.debug('Cookie file selected:', cookieFilePath);
        } else {
            this.showStatus('Cookie file selection cancelled', 'info');
        }
        
    } catch (error) {
        logger.error('Error selecting cookie file:', error.message);
        this.showStatus('Failed to select cookie file', 'error');
    }
}

/**
 * Enhanced save directory selection with IPC integration
 */
async function handleSelectSaveDirectory() {
    if (!window.electronAPI) {
        this.showStatus('Directory selection not available in browser mode', 'error');
        return;
    }

    try {
        this.showStatus('Opening directory dialog...', 'info');
        
        const directoryPath = await window.electronAPI.selectSaveDirectory();
        
        if (directoryPath) {
            // Update configuration with selected directory
            this.state.updateConfig({ savePath: directoryPath });
            
            // Update UI to show selected directory
            this.updateSavePathUI(directoryPath);
            
            this.showStatus('Save directory selected successfully', 'success');
            logger.debug('Save directory selected:', directoryPath);
        } else {
            this.showStatus('Directory selection cancelled', 'info');
        }
        
    } catch (error) {
        logger.error('Error selecting save directory:', error.message);
        this.showStatus('Failed to select save directory', 'error');
    }
}

/**
 * Enhanced video download with full IPC integration
 * Replaces the placeholder handleDownloadVideos method
 */
async function handleDownloadVideos() {
    const readyVideos = this.state.getVideosByStatus('ready');
    
    if (readyVideos.length === 0) {
        this.showStatus('No videos ready for download', 'info');
        return;
    }

    if (!window.electronAPI) {
        this.showStatus('Video download not available in browser mode', 'error');
        return;
    }

    // Check if save path is configured
    if (!this.state.config.savePath) {
        this.showStatus('Please select a save directory first', 'error');
        return;
    }

    try {
        // Set downloading state
        this.state.updateUI({ isDownloading: true });
        this.updateControlPanelState();

        // Set up progress listener for this download session
        const progressListenerId = 'download-session-' + Date.now();
        window.IPCManager.onDownloadProgress(progressListenerId, (progressData) => {
            this.handleDownloadProgress(progressData);
        });

        this.showStatus(`Starting download of ${readyVideos.length} video(s)...`, 'info');

        // Download videos sequentially to avoid overwhelming the system
        for (const video of readyVideos) {
            try {
                // Update video status to downloading
                this.state.updateVideo(video.id, { 
                    status: 'downloading', 
                    progress: 0 
                });
                this.renderVideoList();

                // Prepare download options
                const downloadOptions = {
                    url: video.url,
                    quality: video.quality,
                    format: video.format,
                    savePath: this.state.config.savePath,
                    cookieFile: this.state.config.cookieFile
                };

                // Start download
                const result = await window.electronAPI.downloadVideo(downloadOptions);

                if (result.success) {
                    // Update video status to completed
                    this.state.updateVideo(video.id, { 
                        status: 'completed', 
                        progress: 100,
                        filename: result.filename || 'Downloaded'
                    });
                    
                    logger.debug(`Successfully downloaded: ${video.title}`);
                } else {
                    throw new Error(result.error || 'Download failed');
                }

            } catch (error) {
                logger.error(`Failed to download video ${video.id}:`, error.message);
                
                // Update video status to error
                this.state.updateVideo(video.id, { 
                    status: 'error', 
                    error: error.message,
                    progress: 0
                });
            }

            // Update UI after each video
            this.renderVideoList();
        }

        // Clean up progress listener
        window.IPCManager.removeDownloadProgressListener(progressListenerId);

        // Update final state
        this.state.updateUI({ isDownloading: false });
        this.updateControlPanelState();

        const completedCount = this.state.getVideosByStatus('completed').length;
        const errorCount = this.state.getVideosByStatus('error').length;
        
        if (errorCount === 0) {
            this.showStatus(`Successfully downloaded ${completedCount} video(s)`, 'success');
        } else {
            this.showStatus(`Downloaded ${completedCount} video(s), ${errorCount} failed`, 'warning');
        }

    } catch (error) {
        logger.error('Error in download process:', error.message);
        this.showStatus(`Download process failed: ${error.message}`, 'error');
        
        // Reset state on error
        this.state.updateUI({ isDownloading: false });
        this.updateControlPanelState();
    }
}

/**
 * Enhanced metadata fetching with IPC integration
 * Replaces the placeholder fetchVideoMetadata method
 */
async function fetchVideoMetadata(videoId, url) {
    try {
        // Update video status to indicate metadata loading
        this.state.updateVideo(videoId, {
            title: 'Loading metadata...',
            status: 'ready'
        });

        // Extract thumbnail immediately (this is fast)
        const thumbnail = await URLValidator.extractThumbnail(url);

        // Update video with thumbnail first
        if (thumbnail) {
            this.state.updateVideo(videoId, { thumbnail });
            this.renderVideoList();
        }

        // Fetch real metadata using Electron IPC if available
        let metadata;
        if (window.electronAPI) {
            try {
                metadata = await window.electronAPI.getVideoMetadata(url);
            } catch (error) {
                logger.warn('Failed to fetch real metadata, using fallback:', error);
                metadata = await this.simulateMetadataFetch(url);
            }
        } else {
            // Fallback to simulation in browser mode
            metadata = await this.simulateMetadataFetch(url);
        }

        // Update video with fetched metadata
        if (metadata) {
            const updateData = {
                title: metadata.title || 'Unknown Title',
                duration: metadata.duration || '00:00',
                status: 'ready'
            };

            // Use fetched thumbnail if available, otherwise keep the one we extracted
            if (metadata.thumbnail) {
                updateData.thumbnail = metadata.thumbnail;
            }

            this.state.updateVideo(videoId, updateData);
            this.renderVideoList();

            logger.debug(`Metadata fetched for video ${videoId}:`, metadata);
        }

    } catch (error) {
        logger.error(`Failed to fetch metadata for video ${videoId}:`, error.message);
        
        // Update video with error state but keep it downloadable
        this.state.updateVideo(videoId, {
            title: 'Metadata unavailable',
            status: 'ready',
            error: null // Clear any previous errors since this is just metadata
        });
        
        this.renderVideoList();
    }
}

/**
 * Enhanced binary checking with detailed status reporting
 * Replaces the placeholder checkBinaries method
 */
async function checkBinaries() {
    if (!window.electronAPI) {
        logger.warn('Electron API not available - running in browser mode');
        return;
    }

    try {
        logger.debug('Checking yt-dlp and ffmpeg binaries...');
        const binaryVersions = await window.electronAPI.checkBinaryVersions();
        
        // Update UI based on binary availability
        this.updateBinaryStatus(binaryVersions);
        
        if (binaryVersions.ytDlp.available && binaryVersions.ffmpeg.available) {
            logger.debug('All required binaries are available');
            logger.debug('yt-dlp version:', binaryVersions.ytDlp.version);
            logger.debug('ffmpeg version:', binaryVersions.ffmpeg.version);
            this.showStatus('All dependencies ready', 'success');
        } else {
            const missing = [];
            if (!binaryVersions.ytDlp.available) missing.push('yt-dlp');
            if (!binaryVersions.ffmpeg.available) missing.push('ffmpeg');
            
            logger.warn('Missing binaries:', missing);
            this.showStatus(`Missing dependencies: ${missing.join(', ')}`, 'error');
        }
        
    } catch (error) {
        logger.error('Error checking binaries:', error.message);
        this.showStatus('Failed to check dependencies', 'error');
    }
}

/**
 * Update cookie file UI to show selected file
 */
function updateCookieFileUI(cookieFilePath) {
    const cookieFileBtn = document.getElementById('cookieFileBtn');
    if (cookieFileBtn) {
        // Update button text to show file is selected
        const fileName = cookieFilePath.split('/').pop() || cookieFilePath.split('\\').pop();
        cookieFileBtn.textContent = `Cookie File: ${fileName}`;
        cookieFileBtn.title = cookieFilePath;
        cookieFileBtn.classList.add('selected');
    }
}

/**
 * Update save path UI to show selected directory
 */
function updateSavePathUI(directoryPath) {
    const savePath = document.getElementById('savePath');
    if (savePath) {
        savePath.textContent = directoryPath;
        savePath.title = directoryPath;
    }
}

/**
 * Update binary status UI based on version check results
 */
function updateBinaryStatus(binaryVersions) {
    // Update UI elements to show binary status
    logger.debug('Binary status updated:', binaryVersions);
    
    // Store binary status in state for reference
    this.state.binaryStatus = binaryVersions;
    
    // Update dependency status indicators if they exist
    const ytDlpStatus = document.getElementById('ytdlp-status');
    if (ytDlpStatus) {
        ytDlpStatus.textContent = binaryVersions.ytDlp.available 
            ? `yt-dlp ${binaryVersions.ytDlp.version}` 
            : 'yt-dlp missing';
        ytDlpStatus.className = binaryVersions.ytDlp.available ? 'status-ok' : 'status-error';
    }
    
    const ffmpegStatus = document.getElementById('ffmpeg-status');
    if (ffmpegStatus) {
        ffmpegStatus.textContent = binaryVersions.ffmpeg.available 
            ? `ffmpeg ${binaryVersions.ffmpeg.version}` 
            : 'ffmpeg missing';
        ffmpegStatus.className = binaryVersions.ffmpeg.available ? 'status-ok' : 'status-error';
    }
}

/**
 * Handle download progress updates from IPC
 */
function handleDownloadProgress(progressData) {
    const { url, progress } = progressData;
    
    // Find video by URL and update progress
    const video = this.state.videos.find(v => v.url === url);
    if (video) {
        this.state.updateVideo(video.id, { progress });
        this.renderVideoList();
    }
}

// Export methods for integration into main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleSelectCookieFile,
        handleSelectSaveDirectory,
        handleDownloadVideos,
        fetchVideoMetadata,
        checkBinaries,
        updateCookieFileUI,
        updateSavePathUI,
        updateBinaryStatus,
        handleDownloadProgress
    };
} else if (typeof window !== 'undefined') {
    // Make methods available globally for integration
    window.EnhancedIPCMethods = {
        handleSelectCookieFile,
        handleSelectSaveDirectory,
        handleDownloadVideos,
        fetchVideoMetadata,
        checkBinaries,
        updateCookieFileUI,
        updateSavePathUI,
        updateBinaryStatus,
        handleDownloadProgress
    };
}