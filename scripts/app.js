// GrabZilla 2.1 - Application Entry Point
// Modular architecture with clear separation of concerns

class GrabZillaApp {
    constructor() {
        this.state = null;
        this.eventBus = null;
        this.initialized = false;
        this.modules = new Map();
    }

    // Initialize the application
    async init() {
        try {
            console.log('🚀 Initializing GrabZilla 2.1...');

            // Initialize event bus
            this.eventBus = window.eventBus;
            if (!this.eventBus) {
                throw new Error('EventBus not available');
            }

            // Initialize application state
            this.state = new window.AppState();
            if (!this.state) {
                throw new Error('AppState not available');
            }

            // Set up error handling
            this.setupErrorHandling();

            // Initialize UI components
            await this.initializeUI();

            // Set up event listeners
            this.setupEventListeners();

            // Load saved state if available
            await this.loadState();

            // Ensure save directory exists
            await this.ensureSaveDirectoryExists();

            // Check binary status and validate
            await this.checkAndValidateBinaries();

            // Initialize keyboard navigation
            this.initializeKeyboardNavigation();

            this.initialized = true;
            console.log('✅ GrabZilla 2.1 initialized successfully');

            // Notify that the app is ready
            this.eventBus.emit('app:ready', { app: this });

        } catch (error) {
            console.error('❌ Failed to initialize GrabZilla:', error);
            this.handleInitializationError(error);
        }
    }

    // Set up global error handling
    setupErrorHandling() {
        // Handle unhandled errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.eventBus.emit('app:error', {
                type: 'global',
                error: event.error,
                filename: event.filename,
                lineno: event.lineno
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.eventBus.emit('app:error', {
                type: 'promise',
                error: event.reason
            });
        });

        // Listen for application errors
        this.eventBus.on('app:error', (errorData) => {
            // Handle errors appropriately
            this.displayError(errorData);
        });
    }

    // Initialize UI components
    async initializeUI() {
        // Update save path display
        this.updateSavePathDisplay();

        // Initialize dropdown values
        this.initializeDropdowns();

        // Set up video list
        this.initializeVideoList();

        // Set up status display
        this.updateStatusMessage('Ready to download videos');
    }

    // Set up main event listeners
    setupEventListeners() {
        // State change listeners
        this.state.on('videoAdded', (data) => this.onVideoAdded(data));
        this.state.on('videoRemoved', (data) => this.onVideoRemoved(data));
        this.state.on('videoUpdated', (data) => this.onVideoUpdated(data));
        this.state.on('videosReordered', (data) => this.onVideosReordered(data));
        this.state.on('videosCleared', (data) => this.onVideosCleared(data));
        this.state.on('configUpdated', (data) => this.onConfigUpdated(data));

        // UI event listeners
        this.setupButtonEventListeners();
        this.setupInputEventListeners();
        this.setupVideoListEventListeners();
    }

    // Set up button event listeners
    setupButtonEventListeners() {
        // Add Video button
        const addVideoBtn = document.getElementById('addVideoBtn');
        if (addVideoBtn) {
            addVideoBtn.addEventListener('click', () => this.handleAddVideo());
        }

        // Import URLs button
        const importUrlsBtn = document.getElementById('importUrlsBtn');
        if (importUrlsBtn) {
            importUrlsBtn.addEventListener('click', () => this.handleImportUrls());
        }

        // Save Path button
        const savePathBtn = document.getElementById('savePathBtn');
        if (savePathBtn) {
            savePathBtn.addEventListener('click', () => this.handleSelectSavePath());
        }

        // Cookie File button
        const cookieFileBtn = document.getElementById('cookieFileBtn');
        if (cookieFileBtn) {
            cookieFileBtn.addEventListener('click', () => this.handleSelectCookieFile());
        }

        // Control panel buttons
        const clearListBtn = document.getElementById('clearListBtn');
        if (clearListBtn) {
            clearListBtn.addEventListener('click', () => this.handleClearList());
        }

        const downloadVideosBtn = document.getElementById('downloadVideosBtn');
        if (downloadVideosBtn) {
            downloadVideosBtn.addEventListener('click', () => this.handleDownloadVideos());
        }

        const cancelDownloadsBtn = document.getElementById('cancelDownloadsBtn');
        if (cancelDownloadsBtn) {
            cancelDownloadsBtn.addEventListener('click', () => this.handleCancelDownloads());
        }

        const updateDepsBtn = document.getElementById('updateDepsBtn');
        if (updateDepsBtn) {
            updateDepsBtn.addEventListener('click', () => this.handleUpdateDependencies());
        }
    }

    // Set up input event listeners
    setupInputEventListeners() {
        // URL input - no paste handler needed, user clicks "Add Video" button
        const urlInput = document.getElementById('urlInput');
        if (urlInput) {
            // Optional: could add real-time validation feedback here
        }

        // Configuration inputs
        const defaultQuality = document.getElementById('defaultQuality');
        if (defaultQuality) {
            defaultQuality.addEventListener('change', (e) => {
                this.state.updateConfig({ defaultQuality: e.target.value });
            });
        }

        const defaultFormat = document.getElementById('defaultFormat');
        if (defaultFormat) {
            defaultFormat.addEventListener('change', (e) => {
                this.state.updateConfig({ defaultFormat: e.target.value });
            });
        }

        const filenamePattern = document.getElementById('filenamePattern');
        if (filenamePattern) {
            filenamePattern.addEventListener('change', (e) => {
                this.state.updateConfig({ filenamePattern: e.target.value });
            });
        }
    }

    // Set up video list event listeners
    setupVideoListEventListeners() {
        const videoList = document.getElementById('videoList');
        if (videoList) {
            videoList.addEventListener('click', (e) => this.handleVideoListClick(e));
            videoList.addEventListener('change', (e) => this.handleVideoListChange(e));
            this.setupDragAndDrop(videoList);
        }
    }

    // Set up drag-and-drop reordering
    setupDragAndDrop(videoList) {
        let draggedElement = null;
        let draggedVideoId = null;

        videoList.addEventListener('dragstart', (e) => {
            const videoItem = e.target.closest('.video-item');
            if (!videoItem) return;

            draggedElement = videoItem;
            draggedVideoId = videoItem.dataset.videoId;

            videoItem.classList.add('opacity-50');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', videoItem.innerHTML);
        });

        videoList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const videoItem = e.target.closest('.video-item');
            if (!videoItem || videoItem === draggedElement) return;

            e.dataTransfer.dropEffect = 'move';

            // Visual feedback - show where it will drop
            const rect = videoItem.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;

            if (e.clientY < midpoint) {
                videoItem.classList.add('border-t-2', 'border-[#155dfc]');
                videoItem.classList.remove('border-b-2');
            } else {
                videoItem.classList.add('border-b-2', 'border-[#155dfc]');
                videoItem.classList.remove('border-t-2');
            }
        });

        videoList.addEventListener('dragleave', (e) => {
            const videoItem = e.target.closest('.video-item');
            if (videoItem) {
                videoItem.classList.remove('border-t-2', 'border-b-2', 'border-[#155dfc]');
            }
        });

        videoList.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetItem = e.target.closest('.video-item');
            if (!targetItem || !draggedVideoId) return;

            const targetVideoId = targetItem.dataset.videoId;

            // Calculate drop position
            const rect = targetItem.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const dropBefore = e.clientY < midpoint;

            // Reorder in state
            this.handleVideoReorder(draggedVideoId, targetVideoId, dropBefore);

            // Clean up visual feedback
            targetItem.classList.remove('border-t-2', 'border-b-2', 'border-[#155dfc]');
        });

        videoList.addEventListener('dragend', (e) => {
            const videoItem = e.target.closest('.video-item');
            if (videoItem) {
                videoItem.classList.remove('opacity-50');
            }

            // Clean up all visual feedback
            document.querySelectorAll('.video-item').forEach(item => {
                item.classList.remove('border-t-2', 'border-b-2', 'border-[#155dfc]');
            });

            draggedElement = null;
            draggedVideoId = null;
        });
    }

    handleVideoReorder(draggedId, targetId, insertBefore) {
        const videos = this.state.getVideos();
        const draggedIndex = videos.findIndex(v => v.id === draggedId);
        const targetIndex = videos.findIndex(v => v.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        let newIndex = targetIndex;
        if (draggedIndex < targetIndex && !insertBefore) {
            newIndex = targetIndex;
        } else if (draggedIndex > targetIndex && insertBefore) {
            newIndex = targetIndex;
        } else if (insertBefore) {
            newIndex = targetIndex;
        } else {
            newIndex = targetIndex + 1;
        }

        this.state.reorderVideos(draggedIndex, newIndex);
    }

    // Handle clicks in video list (checkboxes, delete buttons)
    handleVideoListClick(event) {
        const target = event.target;
        const videoItem = target.closest('.video-item');
        if (!videoItem) return;

        const videoId = videoItem.dataset.videoId;
        if (!videoId) return;

        // Handle checkbox click
        if (target.closest('.video-checkbox')) {
            event.preventDefault();
            this.toggleVideoSelection(videoId);
            return;
        }

        // Handle delete button click (if we add one later)
        if (target.closest('.delete-video-btn')) {
            event.preventDefault();
            this.handleRemoveVideo(videoId);
            return;
        }
    }

    // Handle dropdown changes in video list (quality, format)
    handleVideoListChange(event) {
        const target = event.target;
        const videoItem = target.closest('.video-item');
        if (!videoItem) return;

        const videoId = videoItem.dataset.videoId;
        if (!videoId) return;

        // Handle quality dropdown change
        if (target.classList.contains('quality-select')) {
            const quality = target.value;
            this.state.updateVideo(videoId, { quality });
            console.log(`Updated video ${videoId} quality to ${quality}`);
            return;
        }

        // Handle format dropdown change
        if (target.classList.contains('format-select')) {
            const format = target.value;
            this.state.updateVideo(videoId, { format });
            console.log(`Updated video ${videoId} format to ${format}`);
            return;
        }
    }

    // Toggle video selection
    toggleVideoSelection(videoId) {
        this.state.toggleVideoSelection(videoId);
        this.updateVideoCheckbox(videoId);
    }

    // Update checkbox visual state
    updateVideoCheckbox(videoId) {
        const videoItem = document.querySelector(`[data-video-id="${videoId}"]`);
        if (!videoItem) return;

        const checkbox = videoItem.querySelector('.video-checkbox');
        if (!checkbox) return;

        const isSelected = this.state.ui.selectedVideos.includes(videoId);
        checkbox.setAttribute('aria-checked', isSelected ? 'true' : 'false');

        // Update checkbox SVG
        const svg = checkbox.querySelector('svg');
        if (svg) {
            if (isSelected) {
                svg.innerHTML = `<rect x="3" y="3" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="currentColor" rx="2" />
                                 <path d="M5 8L7 10L11 6" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
            } else {
                svg.innerHTML = `<rect x="3" y="3" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="none" rx="2" />`;
            }
        }
    }

    // Remove video from list
    handleRemoveVideo(videoId) {
        try {
            const video = this.state.getVideo(videoId);
            if (video && confirm(`Remove "${video.getDisplayName()}"?`)) {
                this.state.removeVideo(videoId);
                this.updateStatusMessage('Video removed');
            }
        } catch (error) {
            console.error('Error removing video:', error);
            this.showError(`Failed to remove video: ${error.message}`);
        }
    }

    // Event handlers
    async handleAddVideo() {
        const urlInput = document.getElementById('urlInput');
        const inputText = urlInput?.value.trim();

        if (!inputText) {
            this.showError('Please enter a URL');
            return;
        }

        try {
            this.updateStatusMessage('Adding videos...');

            // Validate URLs
            const validation = window.URLValidator.validateMultipleUrls(inputText);

            if (validation.invalid.length > 0) {
                this.showError(`Invalid URLs found: ${validation.invalid.join(', ')}`);
                return;
            }

            if (validation.valid.length === 0) {
                this.showError('No valid URLs found');
                return;
            }

            // Add videos to state
            const results = await this.state.addVideosFromUrls(validation.valid);

            // Clear input on success
            if (urlInput) {
                urlInput.value = '';
            }

            // Show results
            const successCount = results.successful.length;
            const duplicateCount = results.duplicates.length;
            const failedCount = results.failed.length;

            let message = `Added ${successCount} video(s)`;
            if (duplicateCount > 0) {
                message += `, ${duplicateCount} duplicate(s) skipped`;
            }
            if (failedCount > 0) {
                message += `, ${failedCount} failed`;
            }

            this.updateStatusMessage(message);

        } catch (error) {
            console.error('Error adding videos:', error);
            this.showError(`Failed to add videos: ${error.message}`);
        }
    }

    async handleImportUrls() {
        if (!window.electronAPI) {
            this.showError('File import requires Electron environment');
            return;
        }

        try {
            // Implementation would use Electron file dialog
            this.updateStatusMessage('Import URLs functionality coming soon');
        } catch (error) {
            this.showError(`Failed to import URLs: ${error.message}`);
        }
    }

    async handleSelectSavePath() {
        if (!window.IPCManager || !window.IPCManager.isAvailable()) {
            this.showError('Path selection requires Electron environment');
            return;
        }

        try {
            this.updateStatusMessage('Select download directory...');

            const result = await window.IPCManager.selectSaveDirectory();

            if (result && result.success && result.path) {
                this.state.updateConfig({ savePath: result.path });
                await this.ensureSaveDirectoryExists(); // Auto-create directory
                this.updateSavePathDisplay();
                this.updateStatusMessage(`Save path set to: ${result.path}`);
            } else if (result && result.error) {
                this.showError(result.error);
            } else {
                this.updateStatusMessage('No directory selected');
            }

        } catch (error) {
            console.error('Error selecting save path:', error);
            this.showError(`Failed to select save path: ${error.message}`);
        }
    }

    async handleSelectCookieFile() {
        if (!window.IPCManager || !window.IPCManager.isAvailable()) {
            this.showError('File selection requires Electron environment');
            return;
        }

        try {
            this.updateStatusMessage('Select cookie file...');

            const result = await window.IPCManager.selectCookieFile();

            if (result && result.success && result.path) {
                this.state.updateConfig({ cookieFile: result.path });
                this.updateStatusMessage(`Cookie file set: ${result.path}`);
            } else if (result && result.error) {
                this.showError(result.error);
            } else {
                this.updateStatusMessage('No file selected');
            }

        } catch (error) {
            console.error('Error selecting cookie file:', error);
            this.showError(`Failed to select cookie file: ${error.message}`);
        }
    }

    handleClearList() {
        if (this.state.getVideos().length === 0) {
            this.updateStatusMessage('No videos to clear');
            return;
        }

        const removedVideos = this.state.clearVideos();
        this.updateStatusMessage(`Cleared ${removedVideos.length} video(s)`);
    }

    async handleDownloadVideos() {
        // Check if IPC is available
        if (!window.IPCManager || !window.IPCManager.isAvailable()) {
            this.showError('Download functionality requires Electron environment');
            return;
        }

        // Get downloadable videos (either selected or all ready videos)
        const selectedVideos = this.state.getSelectedVideos().filter(v => v.isDownloadable());
        const videos = selectedVideos.length > 0
            ? selectedVideos
            : this.state.getVideos().filter(v => v.isDownloadable());

        if (videos.length === 0) {
            this.showError('No videos ready for download');
            return;
        }

        // Validate save path
        if (!this.state.config.savePath) {
            this.showError('Please select a save directory first');
            return;
        }

        this.state.updateUI({ isDownloading: true });
        this.updateStatusMessage(`Starting download of ${videos.length} video(s)...`);

        // Set up download progress listener
        window.IPCManager.onDownloadProgress('app', (progressData) => {
            this.handleDownloadProgress(progressData);
        });

        // Download videos sequentially
        let successCount = 0;
        let failedCount = 0;

        for (const video of videos) {
            try {
                // Update video status to downloading
                this.state.updateVideo(video.id, { status: 'downloading', progress: 0 });

                const result = await window.IPCManager.downloadVideo({
                    videoId: video.id,
                    url: video.url,
                    quality: video.quality,
                    format: video.format,
                    savePath: this.state.config.savePath,
                    cookieFile: this.state.config.cookieFile
                });

                if (result.success) {
                    this.state.updateVideo(video.id, {
                        status: 'completed',
                        progress: 100,
                        filename: result.filename
                    });
                    successCount++;

                    // Show notification for successful download
                    this.showDownloadNotification(video, 'success');
                } else {
                    this.state.updateVideo(video.id, {
                        status: 'error',
                        error: result.error || 'Download failed'
                    });
                    failedCount++;

                    // Show notification for failed download
                    this.showDownloadNotification(video, 'error', result.error);
                }

            } catch (error) {
                console.error(`Error downloading video ${video.id}:`, error);
                this.state.updateVideo(video.id, {
                    status: 'error',
                    error: error.message
                });
                failedCount++;
            }
        }

        // Clean up progress listener
        window.IPCManager.removeDownloadProgressListener('app');

        this.state.updateUI({ isDownloading: false });

        // Show final status
        let message = `Download complete: ${successCount} succeeded`;
        if (failedCount > 0) {
            message += `, ${failedCount} failed`;
        }
        this.updateStatusMessage(message);
    }

    // Handle download progress updates from IPC
    handleDownloadProgress(progressData) {
        const { url, progress, status, stage, message } = progressData;

        // Find video by URL
        const video = this.state.getVideos().find(v => v.url === url);
        if (!video) return;

        // Update video progress
        this.state.updateVideo(video.id, {
            progress: Math.round(progress),
            status: status || 'downloading'
        });
    }

    // Show download notification
    async showDownloadNotification(video, type, errorMessage = null) {
        if (!window.electronAPI) return;

        try {
            const notificationOptions = {
                title: type === 'success' ? 'Download Complete' : 'Download Failed',
                message: type === 'success'
                    ? `${video.getDisplayName()}`
                    : `${video.getDisplayName()}: ${errorMessage || 'Unknown error'}`,
                sound: true
            };

            await window.electronAPI.showNotification(notificationOptions);
        } catch (error) {
            console.warn('Failed to show notification:', error);
        }
    }

    async handleCancelDownloads() {
        const activeDownloads = this.state.getVideosByStatus('downloading').length +
                               this.state.getVideosByStatus('converting').length;

        if (activeDownloads === 0) {
            this.updateStatusMessage('No active downloads to cancel');
            return;
        }

        if (!window.IPCManager || !window.IPCManager.isAvailable()) {
            this.showError('Cancel functionality requires Electron environment');
            return;
        }

        try {
            this.updateStatusMessage(`Cancelling ${activeDownloads} active download(s)...`);

            // Cancel all conversions via IPC
            await window.electronAPI.cancelAllConversions();

            // Update video statuses to ready
            const downloadingVideos = this.state.getVideosByStatus('downloading');
            const convertingVideos = this.state.getVideosByStatus('converting');

            [...downloadingVideos, ...convertingVideos].forEach(video => {
                this.state.updateVideo(video.id, {
                    status: 'ready',
                    progress: 0,
                    error: 'Cancelled by user'
                });
            });

            this.state.updateUI({ isDownloading: false });
            this.updateStatusMessage('Downloads cancelled');

        } catch (error) {
            console.error('Error cancelling downloads:', error);
            this.showError(`Failed to cancel downloads: ${error.message}`);
        }
    }

    async handleUpdateDependencies() {
        if (!window.IPCManager || !window.IPCManager.isAvailable()) {
            this.showError('Update functionality requires Electron environment');
            return;
        }

        const btn = document.getElementById('updateDepsBtn');
        const originalBtnHTML = btn ? btn.innerHTML : '';

        try {
            // Show loading state
            this.updateStatusMessage('Checking binary versions...');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<img src="assets/icons/refresh.svg" alt="" width="16" height="16" loading="lazy" class="animate-spin">Checking...';
            }

            const versions = await window.IPCManager.checkBinaryVersions();

            // Handle both ytDlp (from main.js) and ytdlp (legacy) formats
            const ytdlp = versions.ytDlp || versions.ytdlp;
            const ffmpeg = versions.ffmpeg;

            if (versions && (ytdlp || ffmpeg)) {
                // Update both button status and version display
                const ytdlpMissing = !ytdlp || !ytdlp.available;
                const ffmpegMissing = !ffmpeg || !ffmpeg.available;

                if (ytdlpMissing || ffmpegMissing) {
                    this.updateDependenciesButtonStatus('missing');
                    this.updateBinaryVersionDisplay(null);
                } else {
                    this.updateDependenciesButtonStatus('ok');
                    // Normalize the format for display
                    const normalizedVersions = {
                        ytdlp: ytdlp,
                        ffmpeg: ffmpeg
                    };
                    this.updateBinaryVersionDisplay(normalizedVersions);

                    // Show dialog if updates are available
                    if (ytdlp.updateAvailable) {
                        this.showInfo({
                            title: 'Update Available',
                            message: `A newer version of yt-dlp is available:\nInstalled: ${ytdlp.version}\nLatest: ${ytdlp.latestVersion || 'newer version'}\n\nPlease run 'npm run setup' to update.`
                        });
                    }
                }
            } else {
                this.showError('Could not check binary versions');
            }

        } catch (error) {
            console.error('Error checking dependencies:', error);
            this.showError(`Failed to check dependencies: ${error.message}`);
        } finally {
            // Restore button state
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalBtnHTML || '<img src="assets/icons/refresh.svg" alt="" width="16" height="16" loading="lazy">Check for Updates';
            }
        }
    }

    // State change handlers
    onVideoAdded(data) {
        this.renderVideoList();
        this.updateStatsDisplay();
    }

    onVideoRemoved(data) {
        this.renderVideoList();
        this.updateStatsDisplay();
    }

    onVideoUpdated(data) {
        this.updateVideoElement(data.video);
        this.updateStatsDisplay();
    }

    onVideosReordered(data) {
        // Re-render entire list to reflect new order
        this.renderVideoList();
        console.log('Video order updated:', data);
    }

    onVideosCleared(data) {
        this.renderVideoList();
        this.updateStatsDisplay();
    }

    onConfigUpdated(data) {
        this.updateConfigUI(data.config);
    }

    // UI update methods
    updateSavePathDisplay() {
        const savePathElement = document.getElementById('savePath');
        if (savePathElement) {
            savePathElement.textContent = this.state.config.savePath;
        }
    }

    initializeDropdowns() {
        // Set dropdown values from config
        const defaultQuality = document.getElementById('defaultQuality');
        if (defaultQuality) {
            defaultQuality.value = this.state.config.defaultQuality;
        }

        const defaultFormat = document.getElementById('defaultFormat');
        if (defaultFormat) {
            defaultFormat.value = this.state.config.defaultFormat;
        }

        const filenamePattern = document.getElementById('filenamePattern');
        if (filenamePattern) {
            filenamePattern.value = this.state.config.filenamePattern;
        }
    }

    initializeVideoList() {
        this.renderVideoList();
    }

    renderVideoList() {
        const videoList = document.getElementById('videoList');
        if (!videoList) return;

        const videos = this.state.getVideos();

        // Clear all existing videos (including mockups)
        videoList.innerHTML = '';

        // If no videos, show empty state
        if (videos.length === 0) {
            videoList.innerHTML = `
                <div class="text-center py-12 text-[#90a1b9]">
                    <p class="text-lg mb-2">No videos yet</p>
                    <p class="text-sm">Paste YouTube or Vimeo URLs above to get started</p>
                </div>
            `;
            return;
        }

        // Render each video
        videos.forEach(video => {
            const videoElement = this.createVideoElement(video);
            videoList.appendChild(videoElement);
        });
    }

    createVideoElement(video) {
        const div = document.createElement('div');
        div.className = 'video-item grid grid-cols-[40px_40px_1fr_120px_100px_120px_100px_40px] gap-4 items-center p-2 rounded bg-[#314158] hover:bg-[#3a4a68] transition-colors duration-200';
        div.dataset.videoId = video.id;
        div.setAttribute('draggable', 'true'); // Make video item draggable

        div.innerHTML = `
            <!-- Checkbox -->
            <div class="flex items-center justify-center">
                <button class="video-checkbox w-6 h-6 rounded flex items-center justify-center hover:bg-[#45556c] transition-colors"
                    role="checkbox" aria-checked="false" aria-label="Select ${video.getDisplayName()}">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="text-white">
                        <rect x="3" y="3" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="none" rx="2" />
                    </svg>
                </button>
            </div>

            <!-- Drag Handle -->
            <div class="flex items-center justify-center text-[#90a1b9] hover:text-white cursor-grab transition-colors">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="4" cy="4" r="1" />
                    <circle cx="4" cy="8" r="1" />
                    <circle cx="4" cy="12" r="1" />
                    <circle cx="8" cy="4" r="1" />
                    <circle cx="8" cy="8" r="1" />
                    <circle cx="8" cy="12" r="1" />
                    <circle cx="12" cy="4" r="1" />
                    <circle cx="12" cy="8" r="1" />
                    <circle cx="12" cy="12" r="1" />
                </svg>
            </div>

            <!-- Video Info -->
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-16 h-12 bg-[#45556c] rounded overflow-hidden flex-shrink-0">
                    ${video.isFetchingMetadata ?
                        `<div class="w-full h-full bg-gradient-to-br from-[#4a5568] to-[#2d3748] flex items-center justify-center">
                            <svg class="animate-spin h-5 w-5 text-[#155dfc]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>` :
                        video.thumbnail ?
                            `<img src="${video.thumbnail}" alt="${video.getDisplayName()}" class="w-full h-full object-cover">` :
                            `<div class="w-full h-full bg-gradient-to-br from-[#4a5568] to-[#2d3748] flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="text-[#90a1b9]">
                                    <path d="M8 5V19L19 12L8 5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
                                </svg>
                            </div>`
                    }
                </div>
                <div class="min-w-0 flex-1">
                    <div class="text-sm text-white truncate font-medium">${video.getDisplayName()}</div>
                    ${video.isFetchingMetadata ?
                        `<div class="text-xs text-[#155dfc] animate-pulse">Fetching info...</div>` :
                        ''
                    }
                </div>
            </div>

            <!-- Duration -->
            <div class="text-sm text-[#cad5e2] text-center">${video.duration || '--:--'}</div>

            <!-- Quality Dropdown -->
            <div class="flex justify-center">
                <select class="quality-select bg-[#314158] border border-[#45556c] text-[#cad5e2] px-2 py-1 rounded text-xs font-medium min-w-0 w-full text-center"
                    aria-label="Quality for ${video.getDisplayName()}">
                    <option value="4K" ${video.quality === '4K' ? 'selected' : ''}>4K</option>
                    <option value="1440p" ${video.quality === '1440p' ? 'selected' : ''}>1440p</option>
                    <option value="1080p" ${video.quality === '1080p' ? 'selected' : ''}>1080p</option>
                    <option value="720p" ${video.quality === '720p' ? 'selected' : ''}>720p</option>
                </select>
            </div>

            <!-- Format Dropdown -->
            <div class="flex justify-center">
                <select class="format-select bg-[#314158] border border-[#45556c] text-[#cad5e2] px-2 py-1 rounded text-xs font-medium min-w-0 w-full text-center"
                    aria-label="Format for ${video.getDisplayName()}">
                    <option value="None" ${video.format === 'None' ? 'selected' : ''}>None</option>
                    <option value="H264" ${video.format === 'H264' ? 'selected' : ''}>H264</option>
                    <option value="ProRes" ${video.format === 'ProRes' ? 'selected' : ''}>ProRes</option>
                    <option value="DNxHR" ${video.format === 'DNxHR' ? 'selected' : ''}>DNxHR</option>
                    <option value="Audio only" ${video.format === 'Audio only' ? 'selected' : ''}>Audio only</option>
                </select>
            </div>

            <!-- Status Badge -->
            <div class="flex justify-center status-column">
                <span class="status-badge ${video.status}" role="status" aria-live="polite">
                    ${this.getStatusText(video)}
                </span>
            </div>

            <!-- Delete Button -->
            <div class="flex items-center justify-center">
                <button class="delete-video-btn w-6 h-6 rounded flex items-center justify-center hover:bg-red-600 hover:text-white text-[#90a1b9] transition-colors duration-200"
                    aria-label="Delete ${video.getDisplayName()}" title="Remove from queue">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v4M10 7v4M4 4l1 9a1 1 0 001 1h4a1 1 0 001-1l1-9"
                            stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        `;

        return div;
    }

    getStatusText(video) {
        switch (video.status) {
            case 'downloading':
                return `Downloading ${video.progress || 0}%`;
            case 'converting':
                return `Converting ${video.progress || 0}%`;
            case 'completed':
                return 'Completed';
            case 'error':
                return 'Error';
            case 'ready':
            default:
                return 'Ready';
        }
    }

    updateVideoElement(video) {
        const videoElement = document.querySelector(`[data-video-id="${video.id}"]`);
        if (!videoElement) return;

        // Update thumbnail - show loading spinner if fetching metadata
        const thumbnailContainer = videoElement.querySelector('.w-16.h-12');
        if (thumbnailContainer) {
            if (video.isFetchingMetadata) {
                thumbnailContainer.innerHTML = `
                    <div class="w-full h-full bg-gradient-to-br from-[#4a5568] to-[#2d3748] flex items-center justify-center">
                        <svg class="animate-spin h-5 w-5 text-[#155dfc]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>`;
            } else if (video.thumbnail) {
                thumbnailContainer.innerHTML = `<img src="${video.thumbnail}" alt="${video.getDisplayName()}" class="w-full h-full object-cover">`;
            } else {
                thumbnailContainer.innerHTML = `
                    <div class="w-full h-full bg-gradient-to-br from-[#4a5568] to-[#2d3748] flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="text-[#90a1b9]">
                            <path d="M8 5V19L19 12L8 5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
                        </svg>
                    </div>`;
            }
        }

        // Update title and loading message
        const titleContainer = videoElement.querySelector('.min-w-0.flex-1');
        if (titleContainer) {
            const titleElement = titleContainer.querySelector('.text-sm.text-white.truncate');
            if (titleElement) {
                titleElement.textContent = video.getDisplayName();
            }

            // Update or remove "Fetching info..." message
            const existingLoadingMsg = titleContainer.querySelector('.text-xs.text-\\[\\#155dfc\\]');
            if (video.isFetchingMetadata && !existingLoadingMsg) {
                const loadingMsg = document.createElement('div');
                loadingMsg.className = 'text-xs text-[#155dfc] animate-pulse';
                loadingMsg.textContent = 'Fetching info...';
                titleContainer.appendChild(loadingMsg);
            } else if (!video.isFetchingMetadata && existingLoadingMsg) {
                existingLoadingMsg.remove();
            }
        }

        // Update duration
        const durationElement = videoElement.querySelector('.text-sm.text-\\[\\#cad5e2\\].text-center');
        if (durationElement) {
            durationElement.textContent = video.duration || '--:--';
        }

        // Update quality dropdown
        const qualitySelect = videoElement.querySelector('.quality-select');
        if (qualitySelect) {
            qualitySelect.value = video.quality;
        }

        // Update format dropdown
        const formatSelect = videoElement.querySelector('.format-select');
        if (formatSelect) {
            formatSelect.value = video.format;
        }

        // Update status badge with progress
        const statusBadge = videoElement.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.className = `status-badge ${video.status}`;
            statusBadge.textContent = this.getStatusText(video);

            // Add progress bar for downloading/converting states
            if (video.status === 'downloading' || video.status === 'converting') {
                const progress = video.progress || 0;
                statusBadge.style.background = `linear-gradient(to right, #155dfc ${progress}%, #314158 ${progress}%)`;
            } else {
                statusBadge.style.background = '';
            }
        }
    }

    updateStatsDisplay() {
        const stats = this.state.getStats();
        // Update UI with current statistics
    }

    updateConfigUI(config) {
        this.updateSavePathDisplay();
        this.initializeDropdowns();
    }

    updateStatusMessage(message) {
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.textContent = message;
        }

        // Auto-clear success messages
        if (!message.toLowerCase().includes('error') && !message.toLowerCase().includes('failed')) {
            setTimeout(() => {
                if (statusElement && statusElement.textContent === message) {
                    statusElement.textContent = 'Ready to download videos';
                }
            }, 5000);
        }
    }

    showError(message) {
        this.updateStatusMessage(`Error: ${message}`);
        console.error('App Error:', message);
        this.eventBus.emit('app:error', { type: 'user', message });
    }

    displayError(errorData) {
        const message = errorData.error?.message || errorData.message || 'An error occurred';
        this.updateStatusMessage(`Error: ${message}`);
    }

    // Keyboard navigation
    initializeKeyboardNavigation() {
        // Basic keyboard navigation setup
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'a':
                        e.preventDefault();
                        this.state.selectAllVideos();
                        break;
                    case 'd':
                        e.preventDefault();
                        this.handleDownloadVideos();
                        break;
                }
            }
        });
    }

    // Ensure save directory exists
    async ensureSaveDirectoryExists() {
        const savePath = this.state.config.savePath;
        if (!savePath || !window.electronAPI) return;

        try {
            const result = await window.electronAPI.createDirectory(savePath);
            if (!result.success) {
                console.warn('Failed to create save directory:', result.error);
            } else {
                console.log('Save directory ready:', result.path);
            }
        } catch (error) {
            console.error('Error creating directory:', error);
        }
    }

    // Check binary status and validate with blocking dialog if missing
    async checkAndValidateBinaries() {
        if (!window.IPCManager || !window.IPCManager.isAvailable()) return;

        try {
            const versions = await window.IPCManager.checkBinaryVersions();

            // Handle both ytDlp (from main.js) and ytdlp (legacy) formats
            const ytdlp = versions.ytDlp || versions.ytdlp;
            const ffmpeg = versions.ffmpeg;

            if (!versions || !ytdlp || !ytdlp.available || !ffmpeg || !ffmpeg.available) {
                this.updateDependenciesButtonStatus('missing');
                this.updateBinaryVersionDisplay(null);

                // Show blocking dialog to warn user
                await this.showMissingBinariesDialog(ytdlp, ffmpeg);
            } else {
                this.updateDependenciesButtonStatus('ok');
                // Normalize the format for display
                const normalizedVersions = {
                    ytdlp: ytdlp,
                    ffmpeg: ffmpeg
                };
                this.updateBinaryVersionDisplay(normalizedVersions);
            }
        } catch (error) {
            console.error('Error checking binary status:', error);
            // Set missing status on error
            this.updateDependenciesButtonStatus('missing');
            this.updateBinaryVersionDisplay(null);

            // Show dialog on error too
            await this.showMissingBinariesDialog(null, null);
        }
    }

    // Show blocking dialog when binaries are missing
    async showMissingBinariesDialog(ytdlp, ffmpeg) {
        // Determine which binaries are missing
        const missingBinaries = [];
        if (!ytdlp || !ytdlp.available) missingBinaries.push('yt-dlp');
        if (!ffmpeg || !ffmpeg.available) missingBinaries.push('ffmpeg');

        const missingList = missingBinaries.length > 0
            ? missingBinaries.join(', ')
            : 'yt-dlp and ffmpeg';

        if (window.electronAPI && window.electronAPI.showErrorDialog) {
            // Use native Electron dialog
            await window.electronAPI.showErrorDialog({
                title: 'Required Binaries Missing',
                message: `The following required binaries are missing: ${missingList}`,
                detail: 'Please run "npm run setup" in the terminal to download the required binaries.\n\n' +
                       'Without these binaries, GrabZilla cannot download or convert videos.\n\n' +
                       'After running "npm run setup", restart the application.'
            });
        } else {
            // Fallback to browser alert
            alert(
                `⚠️ Required Binaries Missing\n\n` +
                `Missing: ${missingList}\n\n` +
                `Please run "npm run setup" to download the required binaries.\n\n` +
                `Without these binaries, GrabZilla cannot download or convert videos.`
            );
        }
    }

    // Check binary status and update UI (non-blocking version for updates)
    async checkBinaryStatus() {
        if (!window.IPCManager || !window.IPCManager.isAvailable()) return;

        try {
            const versions = await window.IPCManager.checkBinaryVersions();

            // Handle both ytDlp (from main.js) and ytdlp (legacy) formats
            const ytdlp = versions.ytDlp || versions.ytdlp;
            const ffmpeg = versions.ffmpeg;

            if (!versions || !ytdlp || !ytdlp.available || !ffmpeg || !ffmpeg.available) {
                this.updateDependenciesButtonStatus('missing');
                this.updateBinaryVersionDisplay(null);
            } else {
                this.updateDependenciesButtonStatus('ok');
                // Normalize the format for display
                const normalizedVersions = {
                    ytdlp: ytdlp,
                    ffmpeg: ffmpeg
                };
                this.updateBinaryVersionDisplay(normalizedVersions);
            }
        } catch (error) {
            console.error('Error checking binary status:', error);
            // Set missing status on error
            this.updateDependenciesButtonStatus('missing');
            this.updateBinaryVersionDisplay(null);
        }
    }

    updateBinaryVersionDisplay(versions) {
        const statusMessage = document.getElementById('statusMessage');
        const ytdlpVersionNumber = document.getElementById('ytdlpVersionNumber');
        const ytdlpUpdateBadge = document.getElementById('ytdlpUpdateBadge');
        const ffmpegVersionNumber = document.getElementById('ffmpegVersionNumber');
        const lastUpdateCheck = document.getElementById('lastUpdateCheck');

        if (!versions) {
            // Binaries missing
            if (statusMessage) statusMessage.textContent = 'Ready to download videos - Binaries required';
            if (ytdlpVersionNumber) ytdlpVersionNumber.textContent = 'missing';
            if (ffmpegVersionNumber) ffmpegVersionNumber.textContent = 'missing';
            if (ytdlpUpdateBadge) ytdlpUpdateBadge.classList.add('hidden');
            if (lastUpdateCheck) lastUpdateCheck.textContent = '--';
            return;
        }

        // Update yt-dlp version
        if (ytdlpVersionNumber) {
            const ytdlpVersion = versions.ytdlp?.version || 'unknown';
            ytdlpVersionNumber.textContent = ytdlpVersion;
        }

        // Show/hide update badge for yt-dlp
        if (ytdlpUpdateBadge) {
            if (versions.ytdlp?.updateAvailable) {
                ytdlpUpdateBadge.classList.remove('hidden');
                ytdlpUpdateBadge.title = `Update available: ${versions.ytdlp.latestVersion || 'newer version'}`;
            } else {
                ytdlpUpdateBadge.classList.add('hidden');
            }
        }

        // Update ffmpeg version
        if (ffmpegVersionNumber) {
            const ffmpegVersion = versions.ffmpeg?.version || 'unknown';
            ffmpegVersionNumber.textContent = ffmpegVersion;
        }

        // Update last check timestamp
        if (lastUpdateCheck) {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            lastUpdateCheck.textContent = `checked ${timeString}`;
            lastUpdateCheck.title = `Last update check: ${now.toLocaleString()}`;
        }

        // Update status message
        if (statusMessage) {
            const hasUpdates = versions.ytdlp?.updateAvailable;
            statusMessage.textContent = hasUpdates ?
                'Update available for yt-dlp' :
                'Ready to download videos';
        }
    }

    updateDependenciesButtonStatus(status) {
        const btn = document.getElementById('updateDepsBtn');
        if (!btn) return;

        if (status === 'missing') {
            btn.classList.add('bg-red-600', 'animate-pulse');
            btn.classList.remove('bg-[#314158]');
            btn.innerHTML = '<img src="assets/icons/refresh.svg" alt="" width="16" height="16" loading="lazy">⚠️ Required';
        } else {
            btn.classList.remove('bg-red-600', 'animate-pulse');
            btn.classList.add('bg-[#314158]');
            btn.innerHTML = '<img src="assets/icons/refresh.svg" alt="" width="16" height="16" loading="lazy">Check for Updates';
        }
    }

    // State persistence
    async loadState() {
        try {
            const savedState = localStorage.getItem('grabzilla-state');
            if (savedState) {
                const data = JSON.parse(savedState);
                this.state.fromJSON(data);
                console.log('✅ Loaded saved state');

                // Re-render video list to show restored videos
                this.renderVideoList();
                this.updateSavePathDisplay();
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.warn('Failed to load saved state:', error);
        }
    }

    async saveState() {
        try {
            const stateData = this.state.toJSON();
            localStorage.setItem('grabzilla-state', JSON.stringify(stateData));
        } catch (error) {
            console.warn('Failed to save state:', error);
        }
    }

    // Lifecycle methods
    handleInitializationError(error) {
        // Show fallback UI or error message
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.textContent = 'Failed to initialize application';
        }
    }

    destroy() {
        // Clean up resources
        if (this.state) {
            this.saveState();
        }

        // Remove event listeners
        this.eventBus?.removeAllListeners();

        this.initialized = false;
        console.log('🧹 GrabZilla app destroyed');
    }
}

// Initialize function to be called after all scripts are loaded
window.initializeGrabZilla = function() {
    window.app = new GrabZillaApp();
    window.app.init();
};

// Auto-save state on page unload
window.addEventListener('beforeunload', () => {
    if (window.app?.initialized) {
        window.app.saveState();
    }
});

// Export the app class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GrabZillaApp;
} else {
    window.GrabZillaApp = GrabZillaApp;
}