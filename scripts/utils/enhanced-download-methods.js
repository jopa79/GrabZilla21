/**
 * @fileoverview Enhanced download methods with real yt-dlp integration
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

/**
 * ENHANCED DOWNLOAD METHODS
 * 
 * Real video download functionality with yt-dlp integration
 * Replaces placeholder methods with actual IPC communication
 * 
 * Features:
 * - Real video downloads with progress tracking
 * - Status transitions (Ready → Downloading → Converting → Completed)
 * - Enhanced metadata extraction with thumbnails
 * - Error handling with user-friendly messages
 * 
 * Dependencies:
 * - Electron IPC (window.electronAPI)
 * - Main process download handlers
 * - URLValidator utility class
 */

/**
 * Enhanced video download with full IPC integration and progress tracking
 * Replaces placeholder handleDownloadVideos method
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
        const progressCleanup = window.electronAPI.onDownloadProgress((event, progressData) => {
            this.handleDownloadProgress(progressData);
        });

        this.showStatus(`Starting download of ${readyVideos.length} video(s)...`, 'info');
        console.log('Starting downloads for videos:', readyVideos.map(v => ({ id: v.id, url: v.url, title: v.title })));

        let completedCount = 0;
        let errorCount = 0;

        // Download videos sequentially to avoid overwhelming the system
        for (const video of readyVideos) {
            try {
                console.log(`Starting download for video ${video.id}: ${video.title}`);
                
                // Update video status to downloading
                this.state.updateVideo(video.id, { 
                    status: 'downloading', 
                    progress: 0,
                    error: null
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

                console.log(`Download options for video ${video.id}:`, downloadOptions);

                // Start download
                const result = await window.electronAPI.downloadVideo(downloadOptions);

                if (result.success) {
                    // Update video status to completed
                    this.state.updateVideo(video.id, { 
                        status: 'completed', 
                        progress: 100,
                        filename: result.filename || 'Downloaded',
                        error: null
                    });
                    
                    completedCount++;
                    console.log(`Successfully downloaded video ${video.id}: ${video.title}`);
                } else {
                    throw new Error(result.error || 'Download failed');
                }

            } catch (error) {
                console.error(`Failed to download video ${video.id}:`, error);
                
                // Update video status to error
                this.state.updateVideo(video.id, { 
                    status: 'error', 
                    error: error.message,
                    progress: 0
                });
                
                errorCount++;
            }

            // Update UI after each video
            this.renderVideoList();
        }

        // Clean up progress listener
        if (progressCleanup) {
            progressCleanup();
        }

        // Update final state
        this.state.updateUI({ isDownloading: false });
        this.updateControlPanelState();

        // Show final status
        if (errorCount === 0) {
            this.showStatus(`Successfully downloaded ${completedCount} video(s)`, 'success');
        } else if (completedCount === 0) {
            this.showStatus(`All ${errorCount} download(s) failed`, 'error');
        } else {
            this.showStatus(`Downloaded ${completedCount} video(s), ${errorCount} failed`, 'warning');
        }

        console.log(`Download session completed: ${completedCount} successful, ${errorCount} failed`);

    } catch (error) {
        console.error('Error in download process:', error);
        this.showStatus(`Download process failed: ${error.message}`, 'error');
        
        // Reset state on error
        this.state.updateUI({ isDownloading: false });
        this.updateControlPanelState();
    }
}

/**
 * Enhanced metadata fetching with real yt-dlp integration
 * Replaces placeholder fetchVideoMetadata method
 */
async function fetchVideoMetadata(videoId, url) {
    try {
        console.log(`Starting metadata fetch for video ${videoId}:`, url);
        
        // Update video status to indicate metadata loading
        this.state.updateVideo(videoId, {
            title: 'Loading metadata...',
            status: 'ready'
        });
        this.renderVideoList();

        // Extract thumbnail immediately (this is fast for YouTube)
        const thumbnail = await URLValidator.extractThumbnail(url);

        // Update video with thumbnail first if available
        if (thumbnail) {
            this.state.updateVideo(videoId, { thumbnail });
            this.renderVideoList();
        }

        // Fetch real metadata using Electron IPC if available
        let metadata;
        if (window.electronAPI) {
            try {
                console.log(`Fetching real metadata for video ${videoId} via IPC`);
                metadata = await window.electronAPI.getVideoMetadata(url);
                console.log(`Real metadata received for video ${videoId}:`, metadata);
            } catch (error) {
                console.warn(`Failed to fetch real metadata for video ${videoId}, using fallback:`, error);
                metadata = await this.simulateMetadataFetch(url);
            }
        } else {
            // Fallback to simulation in browser mode
            console.warn('Electron API not available, using simulation for metadata');
            metadata = await this.simulateMetadataFetch(url);
        }

        // Update video with fetched metadata
        if (metadata) {
            const updateData = {
                title: metadata.title || 'Unknown Title',
                duration: metadata.duration || '00:00',
                status: 'ready',
                error: null
            };

            // Use fetched thumbnail if available, otherwise keep the one we extracted
            if (metadata.thumbnail && (!thumbnail || metadata.thumbnail !== thumbnail)) {
                updateData.thumbnail = metadata.thumbnail;
            }

            this.state.updateVideo(videoId, updateData);
            this.renderVideoList();

            console.log(`Metadata successfully updated for video ${videoId}:`, updateData);
        }

    } catch (error) {
        console.error(`Failed to fetch metadata for video ${videoId}:`, error);
        
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
 * Handle download progress updates from IPC with enhanced status transitions
 */
function handleDownloadProgress(progressData) {
    const { url, progress, status, stage, conversionSpeed } = progressData;
    
    console.log('Download progress update:', progressData);
    
    // Find video by URL and update progress
    const video = this.state.videos.find(v => v.url === url);
    if (video) {
        const updateData = { progress };
        
        // Update status based on stage with enhanced conversion handling
        if (stage === 'download' && status === 'downloading') {
            updateData.status = 'downloading';
        } else if ((stage === 'postprocess' || stage === 'conversion') && status === 'converting') {
            updateData.status = 'converting';
            // Add conversion speed info if available
            if (conversionSpeed) {
                updateData.conversionSpeed = conversionSpeed;
            }
        } else if (stage === 'complete' && status === 'completed') {
            updateData.status = 'completed';
            updateData.progress = 100;
        }
        
        this.state.updateVideo(video.id, updateData);
        this.renderVideoList();
        
        const speedInfo = conversionSpeed ? ` (${conversionSpeed}x speed)` : '';
        console.log(`Progress updated for video ${video.id}: ${progress}% (${status})${speedInfo}`);
    } else {
        console.warn('Received progress update for unknown video URL:', url);
    }
}

/**
 * Enhanced binary checking with detailed status reporting
 */
async function checkBinaries() {
    if (!window.electronAPI) {
        console.warn('Electron API not available - running in browser mode');
        this.showStatus('Running in browser mode - download functionality limited', 'warning');
        return;
    }

    try {
        console.log('Checking yt-dlp and ffmpeg binaries...');
        this.showStatus('Checking dependencies...', 'info');
        
        const binaryVersions = await window.electronAPI.checkBinaryVersions();
        
        // Update UI based on binary availability
        this.updateBinaryStatus(binaryVersions);
        
        if (binaryVersions.ytDlp.available && binaryVersions.ffmpeg.available) {
            console.log('All required binaries are available');
            console.log('yt-dlp version:', binaryVersions.ytDlp.version);
            console.log('ffmpeg version:', binaryVersions.ffmpeg.version);
            this.showStatus('All dependencies ready', 'success');
        } else {
            const missing = [];
            if (!binaryVersions.ytDlp.available) missing.push('yt-dlp');
            if (!binaryVersions.ffmpeg.available) missing.push('ffmpeg');
            
            console.warn('Missing binaries:', missing);
            this.showStatus(`Missing dependencies: ${missing.join(', ')}`, 'error');
        }
        
        // Store binary status for reference
        this.state.binaryStatus = binaryVersions;
        
    } catch (error) {
        console.error('Error checking binaries:', error);
        this.showStatus('Failed to check dependencies', 'error');
    }
}

/**
 * Update binary status UI based on version check results
 */
function updateBinaryStatus(binaryVersions) {
    console.log('Binary status updated:', binaryVersions);
    
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
    
    // Update update dependencies button if updates are available
    const updateBtn = document.getElementById('updateDependenciesBtn');
    if (updateBtn) {
        // This would be enhanced in future tasks to show actual update availability
        updateBtn.disabled = false;
    }
}

/**
 * Enhanced file selection handlers
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
            console.log('Save directory selected:', directoryPath);
        } else {
            this.showStatus('Directory selection cancelled', 'info');
        }
        
    } catch (error) {
        console.error('Error selecting save directory:', error);
        this.showStatus('Failed to select save directory', 'error');
    }
}

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
            console.log('Cookie file selected:', cookieFilePath);
        } else {
            this.showStatus('Cookie file selection cancelled', 'info');
        }
        
    } catch (error) {
        console.error('Error selecting cookie file:', error);
        this.showStatus('Failed to select cookie file', 'error');
    }
}

/**
 * UI update helpers
 */
function updateSavePathUI(directoryPath) {
    const savePath = document.getElementById('savePath');
    if (savePath) {
        savePath.textContent = directoryPath;
        savePath.title = directoryPath;
    }
    
    const savePathBtn = document.getElementById('savePathBtn');
    if (savePathBtn) {
        savePathBtn.classList.add('selected');
    }
}

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
 * Cancel active conversions for specific video or all videos
 */
async function handleCancelConversions(videoId = null) {
    if (!window.electronAPI) {
        this.showStatus('Conversion cancellation not available in browser mode', 'error');
        return;
    }

    try {
        let result;
        
        if (videoId) {
            // Cancel conversion for specific video (would need conversion ID tracking)
            this.showStatus('Cancelling conversion...', 'info');
            result = await window.electronAPI.cancelAllConversions(); // Simplified for now
        } else {
            // Cancel all active conversions
            this.showStatus('Cancelling all conversions...', 'info');
            result = await window.electronAPI.cancelAllConversions();
        }

        if (result.success) {
            // Update video statuses for cancelled conversions
            const convertingVideos = this.state.getVideosByStatus('converting');
            convertingVideos.forEach(video => {
                this.state.updateVideo(video.id, {
                    status: 'ready',
                    progress: 0,
                    error: 'Conversion cancelled by user'
                });
            });

            this.renderVideoList();
            this.showStatus(result.message || 'Conversions cancelled successfully', 'success');
            console.log('Conversions cancelled:', result);
        } else {
            this.showStatus('Failed to cancel conversions', 'error');
        }

    } catch (error) {
        console.error('Error cancelling conversions:', error);
        this.showStatus(`Failed to cancel conversions: ${error.message}`, 'error');
    }
}

/**
 * Get information about active conversions
 */
async function getActiveConversions() {
    if (!window.electronAPI) {
        return { success: false, conversions: [] };
    }

    try {
        const result = await window.electronAPI.getActiveConversions();
        return result;
    } catch (error) {
        console.error('Error getting active conversions:', error);
        return { success: false, conversions: [], error: error.message };
    }
}

/**
 * Enhanced cancel downloads to include conversion cancellation
 */
async function handleCancelDownloads() {
    if (!window.electronAPI) {
        this.showStatus('Download cancellation not available in browser mode', 'error');
        return;
    }

    try {
        this.showStatus('Cancelling downloads and conversions...', 'info');

        // Cancel any active conversions first
        await this.handleCancelConversions();

        // Update all processing videos to ready state
        const processingVideos = this.state.videos.filter(v => 
            ['downloading', 'converting'].includes(v.status)
        );

        processingVideos.forEach(video => {
            this.state.updateVideo(video.id, {
                status: 'ready',
                progress: 0,
                error: null
            });
        });

        this.state.updateUI({ isDownloading: false });
        this.updateControlPanelState();
        this.renderVideoList();

        this.showStatus(`Cancelled ${processingVideos.length} active operations`, 'success');
        console.log(`Cancelled ${processingVideos.length} downloads/conversions`);

    } catch (error) {
        console.error('Error cancelling downloads:', error);
        this.showStatus(`Failed to cancel operations: ${error.message}`, 'error');
    }
}

// Export methods for integration into main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleDownloadVideos,
        fetchVideoMetadata,
        handleDownloadProgress,
        checkBinaries,
        updateBinaryStatus,
        handleSelectSaveDirectory,
        handleSelectCookieFile,
        updateSavePathUI,
        updateCookieFileUI,
        handleCancelConversions,
        getActiveConversions,
        handleCancelDownloads
    };
} else if (typeof window !== 'undefined') {
    // Make methods available globally for integration
    window.EnhancedDownloadMethods = {
        handleDownloadVideos,
        fetchVideoMetadata,
        handleDownloadProgress,
        checkBinaries,
        updateBinaryStatus,
        handleSelectSaveDirectory,
        handleSelectCookieFile,
        updateSavePathUI,
        updateCookieFileUI,
        handleCancelConversions,
        getActiveConversions,
        handleCancelDownloads
    };
}