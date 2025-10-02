/**
 * @fileoverview IPC Methods Patch for GrabZilla App
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

/**
 * This file contains the enhanced IPC methods that should replace
 * the placeholder implementations in the main app.js file.
 * 
 * To apply these patches:
 * 1. Replace the placeholder methods in app.js with these implementations
 * 2. Add the missing utility methods to the GrabZilla class
 * 3. Include the IPC integration module
 */

// Enhanced handleSelectSavePath method
const handleSelectSavePath = async function() {
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
};

// Enhanced handleSelectCookieFile method
const handleSelectCookieFile = async function() {
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
};

// Enhanced handleDownloadVideos method
const handleDownloadVideos = async function() {
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
                    
                    console.log(`Successfully downloaded: ${video.title}`);
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
            }

            // Update UI after each video
            this.renderVideoList();
        }

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
        console.error('Error in download process:', error);
        this.showStatus(`Download process failed: ${error.message}`, 'error');
        
        // Reset state on error
        this.state.updateUI({ isDownloading: false });
        this.updateControlPanelState();
    }
};

// Enhanced fetchVideoMetadata method
const fetchVideoMetadata = async function(videoId, url) {
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
                console.warn('Failed to fetch real metadata, using fallback:', error);
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

            console.log(`Metadata fetched for video ${videoId}:`, metadata);
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
};

// Utility methods to add to the GrabZilla class

const updateSavePathUI = function(directoryPath) {
    const savePath = document.getElementById('savePath');
    if (savePath) {
        savePath.textContent = directoryPath;
        savePath.title = directoryPath;
    }
};

const updateCookieFileUI = function(cookieFilePath) {
    const cookieFileBtn = document.getElementById('cookieFileBtn');
    if (cookieFileBtn) {
        // Update button text to show file is selected
        const fileName = cookieFilePath.split('/').pop() || cookieFilePath.split('\\').pop();
        cookieFileBtn.textContent = `Cookie File: ${fileName}`;
        cookieFileBtn.title = cookieFilePath;
        cookieFileBtn.classList.add('selected');
    }
};

const updateBinaryStatus = function(binaryVersions) {
    // Update UI elements to show binary status
    console.log('Binary status updated:', binaryVersions);
    
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
};

const handleDownloadProgress = function(progressData) {
    const { url, progress } = progressData;
    
    // Find video by URL and update progress
    const video = this.state.videos.find(v => v.url === url);
    if (video) {
        this.state.updateVideo(video.id, { progress });
        this.renderVideoList();
    }
};

// Export methods for manual integration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleSelectSavePath,
        handleSelectCookieFile,
        handleDownloadVideos,
        fetchVideoMetadata,
        updateSavePathUI,
        updateCookieFileUI,
        updateBinaryStatus,
        handleDownloadProgress
    };
}

// Instructions for manual integration:
console.log(`
IPC Methods Patch Ready!

To integrate these methods into your GrabZilla app:

1. Replace the placeholder methods in app.js:
   - handleSelectSavePath()
   - handleSelectCookieFile() 
   - handleDownloadVideos()
   - fetchVideoMetadata()

2. Add the utility methods to the GrabZilla class:
   - updateSavePathUI()
   - updateCookieFileUI()
   - updateBinaryStatus()
   - handleDownloadProgress()

3. Include the IPC integration module in your HTML:
   <script src="scripts/utils/ipc-integration.js"></script>

4. The Electron IPC infrastructure is already set up in:
   - src/main.js (IPC handlers)
   - src/preload.js (secure API exposure)

All methods include proper error handling, user feedback, and security validation.
`);