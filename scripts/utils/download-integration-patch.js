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
            console.log('Applying enhanced download method patches...');
            applyDownloadPatches(window.app);
        } else {
            console.warn('GrabZilla app not found, retrying...');
            // Retry after a longer delay
            setTimeout(function() {
                if (typeof window.app !== 'undefined' && window.app instanceof GrabZilla) {
                    console.log('Applying enhanced download method patches (retry)...');
                    applyDownloadPatches(window.app);
                } else {
                    console.error('Failed to find GrabZilla app instance for patching');
                    console.log('Available on window:', Object.keys(window).filter(k => k.includes('app') || k.includes('grab')));
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
            console.error('Enhanced download methods not loaded');
            return;
        }

        const methods = window.EnhancedDownloadMethods;

        // Patch core download methods
        console.log('Patching handleDownloadVideos method...');
        app.handleDownloadVideos = methods.handleDownloadVideos.bind(app);

        console.log('Patching fetchVideoMetadata method...');
        app.fetchVideoMetadata = methods.fetchVideoMetadata.bind(app);

        console.log('Patching handleDownloadProgress method...');
        app.handleDownloadProgress = methods.handleDownloadProgress.bind(app);

        console.log('Patching checkBinaries method...');
        app.checkBinaries = methods.checkBinaries.bind(app);

        // Patch UI update methods
        console.log('Patching updateBinaryStatus method...');
        app.updateBinaryStatus = methods.updateBinaryStatus.bind(app);

        console.log('Patching file selection methods...');
        app.handleSelectSaveDirectory = methods.handleSelectSaveDirectory.bind(app);
        app.handleSelectCookieFile = methods.handleSelectCookieFile.bind(app);

        // Patch UI helper methods
        app.updateSavePathUI = methods.updateSavePathUI.bind(app);
        app.updateCookieFileUI = methods.updateCookieFileUI.bind(app);

        // Re-initialize binary checking with enhanced methods
        console.log('Re-initializing binary check with enhanced methods...');
        app.checkBinaries();

        // Update event listeners for file selection if they exist
        patchFileSelectionListeners(app);

        console.log('Enhanced download method patches applied successfully!');

    } catch (error) {
        console.error('Error applying download method patches:', error);
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
            
            console.log('Patched save directory selection listener');
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
            
            console.log('Patched cookie file selection listener');
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
            
            console.log('Patched download button listener');
        }

    } catch (error) {
        console.error('Error patching file selection listeners:', error);
    }
}

// Export for manual application if needed
if (typeof window !== 'undefined') {
    window.applyDownloadPatches = applyDownloadPatches;
}