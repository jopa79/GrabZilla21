/**
 * @fileoverview Integration patch for enhanced download methods
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

/**
 * DOWNLOAD INTEGRATION PATCH
 * 
 * Patches the main GrabZilla app with enhanced download functionality
 * Replaces placeholder methods with real yt-dlp integration
 * 
 * Usage: Include this script after the main app.js to apply patches
 */

// Wait for DOM and app to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit more for the app to initialize
    setTimeout(function() {
        if (typeof window.app !== 'undefined' && window.app instanceof GrabZilla) {
            logger.debug('Applying enhanced download method patches...');
            applyDownloadPatches(window.app);
        } else {
            logger.warn('GrabZilla app not found, retrying...');
            // Retry after a longer delay
            setTimeout(function() {
                if (typeof window.app !== 'undefined' && window.app instanceof GrabZilla) {
                    logger.debug('Applying enhanced download method patches (retry)...');
                    applyDownloadPatches(window.app);
                } else {
                    logger.error('Failed to find GrabZilla app instance for patching');
                    logger.debug('Available on window:', Object.keys(window).filter(k => k.includes('app') || k.includes('grab')));
                }
            }, 2000);
        }
    }, 500);
});

/**
 * Apply enhanced download method patches to the app instance
 * @param {GrabZilla} app - The main application instance
 */
function applyDownloadPatches(app) {
    try {
        // Load enhanced methods
        if (typeof window.EnhancedDownloadMethods === 'undefined') {
            logger.error('Enhanced download methods not loaded');
            return;
        }

        const methods = window.EnhancedDownloadMethods;

        // Patch core download methods
        logger.debug('Patching handleDownloadVideos method...');
        app.handleDownloadVideos = methods.handleDownloadVideos.bind(app);

        logger.debug('Patching fetchVideoMetadata method...');
        app.fetchVideoMetadata = methods.fetchVideoMetadata.bind(app);

        logger.debug('Patching handleDownloadProgress method...');
        app.handleDownloadProgress = methods.handleDownloadProgress.bind(app);

        logger.debug('Patching checkBinaries method...');
        app.checkBinaries = methods.checkBinaries.bind(app);

        // Patch UI update methods
        logger.debug('Patching updateBinaryStatus method...');
        app.updateBinaryStatus = methods.updateBinaryStatus.bind(app);

        logger.debug('Patching file selection methods...');
        app.handleSelectSaveDirectory = methods.handleSelectSaveDirectory.bind(app);
        app.handleSelectCookieFile = methods.handleSelectCookieFile.bind(app);

        // Patch UI helper methods
        app.updateSavePathUI = methods.updateSavePathUI.bind(app);
        app.updateCookieFileUI = methods.updateCookieFileUI.bind(app);

        // Re-initialize binary checking with enhanced methods
        logger.debug('Re-initializing binary check with enhanced methods...');
        app.checkBinaries();

        // Update event listeners for file selection if they exist
        patchFileSelectionListeners(app);

        logger.debug('Enhanced download method patches applied successfully!');

    } catch (error) {
        logger.error('Error applying download method patches:', error.message);
    }
}

/**
 * Patch file selection event listeners
 * @param {GrabZilla} app - The main application instance
 */
function patchFileSelectionListeners(app) {
    try {
        // Patch save directory selection
        const savePathBtn = document.getElementById('savePathBtn');
        if (savePathBtn) {
            // Remove existing listeners by cloning the element
            const newSavePathBtn = savePathBtn.cloneNode(true);
            savePathBtn.parentNode.replaceChild(newSavePathBtn, savePathBtn);
            
            // Add enhanced listener
            newSavePathBtn.addEventListener('click', () => {
                app.handleSelectSaveDirectory();
            });
            
            logger.debug('Patched save directory selection listener');
        }

        // Patch cookie file selection
        const cookieFileBtn = document.getElementById('cookieFileBtn');
        if (cookieFileBtn) {
            // Remove existing listeners by cloning the element
            const newCookieFileBtn = cookieFileBtn.cloneNode(true);
            cookieFileBtn.parentNode.replaceChild(newCookieFileBtn, cookieFileBtn);
            
            // Add enhanced listener
            newCookieFileBtn.addEventListener('click', () => {
                app.handleSelectCookieFile();
            });
            
            logger.debug('Patched cookie file selection listener');
        }

        // Patch download button if it exists
        const downloadBtn = document.getElementById('downloadVideosBtn');
        if (downloadBtn) {
            // Remove existing listeners by cloning the element
            const newDownloadBtn = downloadBtn.cloneNode(true);
            downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
            
            // Add enhanced listener
            newDownloadBtn.addEventListener('click', () => {
                app.handleDownloadVideos();
            });
            
            logger.debug('Patched download button listener');
        }

    } catch (error) {
        logger.error('Error patching file selection listeners:', error.message);
    }
}

// Export for manual application if needed
if (typeof window !== 'undefined') {
    window.applyDownloadPatches = applyDownloadPatches;
}