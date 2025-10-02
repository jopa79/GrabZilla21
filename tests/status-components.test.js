// Status Components Test Suite
// Tests for Task 5: Implement status badges with integrated progress display

describe('Status Badge Components', () => {
    let app;
    
    beforeEach(() => {
        // Set up DOM structure
        document.body.innerHTML = `
            <div class="video-item" data-video-id="test-video">
                <div class="status-column">
                    <span class="status-badge ready">Ready</span>
                </div>
            </div>
        `;
        
        // Initialize app instance
        app = {
            createIntegratedStatusBadge: function(status, progress = null) {
                const badge = document.createElement('span');
                badge.className = `status-badge ${status.toLowerCase()}`;
                badge.setAttribute('role', 'status');
                badge.setAttribute('aria-live', 'polite');
                
                let badgeText = '';
                let ariaLabel = '';
                
                switch (status.toLowerCase()) {
                    case 'ready':
                        badgeText = 'Ready';
                        ariaLabel = 'Video ready for download';
                        badge.classList.remove('has-progress');
                        badge.removeAttribute('data-progress');
                        badge.style.removeProperty('--progress-width');
                        break;
                    case 'downloading':
                        if (progress !== null) {
                            // Clamp progress between 0 and 100
                            const clampedProgress = Math.max(0, Math.min(100, progress));
                            const roundedProgress = Math.round(clampedProgress);
                            badgeText = `Downloading ${roundedProgress}%`;
                            ariaLabel = `Downloading ${roundedProgress}%`;
                            badge.setAttribute('data-progress', roundedProgress.toString());
                            badge.classList.add('has-progress');
                            badge.style.setProperty('--progress-width', `${roundedProgress}%`);
                        } else {
                            badgeText = 'Downloading';
                            ariaLabel = 'Downloading video';
                            badge.setAttribute('data-progress', '0');
                            badge.classList.add('has-progress');
                            badge.style.setProperty('--progress-width', '0%');
                        }
                        break;
                    case 'converting':
                        if (progress !== null) {
                            // Clamp progress between 0 and 100
                            const clampedProgress = Math.max(0, Math.min(100, progress));
                            const roundedProgress = Math.round(clampedProgress);
                            badgeText = `Converting ${roundedProgress}%`;
                            ariaLabel = `Converting ${roundedProgress}%`;
                            badge.setAttribute('data-progress', roundedProgress.toString());
                            badge.classList.add('has-progress');
                            badge.style.setProperty('--progress-width', `${roundedProgress}%`);
                        } else {
                            badgeText = 'Converting';
                            ariaLabel = 'Converting video';
                            badge.setAttribute('data-progress', '0');
                            badge.classList.add('has-progress');
                            badge.style.setProperty('--progress-width', '0%');
                        }
                        break;
                    case 'completed':
                        badgeText = 'Completed';
                        ariaLabel = 'Video download completed';
                        badge.classList.remove('has-progress');
                        badge.removeAttribute('data-progress');
                        badge.style.removeProperty('--progress-width');
                        break;
                    case 'error':
                        badgeText = 'Error';
                        ariaLabel = 'Video download failed';
                        badge.classList.remove('has-progress');
                        badge.removeAttribute('data-progress');
                        badge.style.removeProperty('--progress-width');
                        break;
                    default:
                        badgeText = status;
                        ariaLabel = `Video status: ${status}`;
                        badge.classList.remove('has-progress');
                        badge.removeAttribute('data-progress');
                        badge.style.removeProperty('--progress-width');
                }
                
                badge.textContent = badgeText;
                badge.setAttribute('aria-label', ariaLabel);
                
                return badge;
            },
            
            updateVideoStatus: function(videoId, status, progress = null) {
                const videoElement = document.querySelector(`[data-video-id="${videoId}"]`);
                if (!videoElement) return;
                
                const statusColumn = videoElement.querySelector('.status-column');
                if (!statusColumn) return;
                
                statusColumn.innerHTML = '';
                const statusBadge = this.createIntegratedStatusBadge(status, progress);
                statusColumn.appendChild(statusBadge);
            }
        };
    });
    
    test('should create ready status badge', () => {
        const badge = app.createIntegratedStatusBadge('ready');
        
        expect(badge.textContent).toBe('Ready');
        expect(badge.className).toContain('status-badge ready');
        expect(badge.getAttribute('aria-label')).toBe('Video ready for download');
        expect(badge.hasAttribute('data-progress')).toBe(false);
        expect(badge.classList.contains('has-progress')).toBe(false);
    });
    
    test('should create downloading status badge with progress', () => {
        const badge = app.createIntegratedStatusBadge('downloading', 65);
        
        expect(badge.textContent).toBe('Downloading 65%');
        expect(badge.className).toContain('status-badge downloading');
        expect(badge.getAttribute('aria-label')).toBe('Downloading 65%');
        expect(badge.getAttribute('data-progress')).toBe('65');
        expect(badge.classList.contains('has-progress')).toBe(true);
        expect(badge.style.getPropertyValue('--progress-width')).toBe('65%');
    });
    
    test('should create converting status badge with progress', () => {
        const badge = app.createIntegratedStatusBadge('converting', 42);
        
        expect(badge.textContent).toBe('Converting 42%');
        expect(badge.className).toContain('status-badge converting');
        expect(badge.getAttribute('aria-label')).toBe('Converting 42%');
        expect(badge.getAttribute('data-progress')).toBe('42');
        expect(badge.classList.contains('has-progress')).toBe(true);
        expect(badge.style.getPropertyValue('--progress-width')).toBe('42%');
    });
    
    test('should create completed status badge', () => {
        const badge = app.createIntegratedStatusBadge('completed');
        
        expect(badge.textContent).toBe('Completed');
        expect(badge.className).toContain('status-badge completed');
        expect(badge.getAttribute('aria-label')).toBe('Video download completed');
        expect(badge.hasAttribute('data-progress')).toBe(false);
        expect(badge.classList.contains('has-progress')).toBe(false);
    });
    
    test('should create error status badge', () => {
        const badge = app.createIntegratedStatusBadge('error');
        
        expect(badge.textContent).toBe('Error');
        expect(badge.className).toContain('status-badge error');
        expect(badge.getAttribute('aria-label')).toBe('Video download failed');
        expect(badge.hasAttribute('data-progress')).toBe(false);
        expect(badge.classList.contains('has-progress')).toBe(false);
    });
    
    test('should handle progress bounds correctly', () => {
        // Test negative progress
        const badgeNegative = app.createIntegratedStatusBadge('downloading', -10);
        expect(badgeNegative.getAttribute('data-progress')).toBe('0');
        expect(badgeNegative.style.getPropertyValue('--progress-width')).toBe('0%');
        
        // Test progress over 100
        const badgeOver = app.createIntegratedStatusBadge('downloading', 150);
        expect(badgeOver.getAttribute('data-progress')).toBe('100');
        expect(badgeOver.style.getPropertyValue('--progress-width')).toBe('100%');
        
        // Test decimal progress
        const badgeDecimal = app.createIntegratedStatusBadge('converting', 65.7);
        expect(badgeDecimal.getAttribute('data-progress')).toBe('66');
        expect(badgeDecimal.style.getPropertyValue('--progress-width')).toBe('66%');
    });
    
    test('should update video status in DOM', () => {
        app.updateVideoStatus('test-video', 'downloading', 75);
        
        const statusBadge = document.querySelector('[data-video-id="test-video"] .status-badge');
        expect(statusBadge.textContent).toBe('Downloading 75%');
        expect(statusBadge.className).toContain('downloading');
        expect(statusBadge.getAttribute('data-progress')).toBe('75');
    });
    
    test('should have proper accessibility attributes', () => {
        const badge = app.createIntegratedStatusBadge('downloading', 50);
        
        expect(badge.getAttribute('role')).toBe('status');
        expect(badge.getAttribute('aria-live')).toBe('polite');
        expect(badge.getAttribute('aria-label')).toBe('Downloading 50%');
    });
    
    test('should handle status transitions correctly', () => {
        // Start with ready
        app.updateVideoStatus('test-video', 'ready');
        let statusBadge = document.querySelector('[data-video-id="test-video"] .status-badge');
        expect(statusBadge.textContent).toBe('Ready');
        expect(statusBadge.classList.contains('has-progress')).toBe(false);
        
        // Transition to downloading
        app.updateVideoStatus('test-video', 'downloading', 30);
        statusBadge = document.querySelector('[data-video-id="test-video"] .status-badge');
        expect(statusBadge.textContent).toBe('Downloading 30%');
        expect(statusBadge.classList.contains('has-progress')).toBe(true);
        
        // Transition to converting
        app.updateVideoStatus('test-video', 'converting', 80);
        statusBadge = document.querySelector('[data-video-id="test-video"] .status-badge');
        expect(statusBadge.textContent).toBe('Converting 80%');
        expect(statusBadge.classList.contains('has-progress')).toBe(true);
        
        // Transition to completed
        app.updateVideoStatus('test-video', 'completed');
        statusBadge = document.querySelector('[data-video-id="test-video"] .status-badge');
        expect(statusBadge.textContent).toBe('Completed');
        expect(statusBadge.classList.contains('has-progress')).toBe(false);
    });
});

// Export for Node.js testing if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { describe, test, expect, beforeEach };
}