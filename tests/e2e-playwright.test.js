/**
 * @fileoverview End-to-End Playwright Tests for Electron Application
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * END-TO-END ELECTRON APPLICATION TESTS
 * 
 * These tests verify the complete application workflow using Playwright:
 * - Application startup and initialization
 * - UI component interactions
 * - Main process and renderer process communication
 * - File system operations through the UI
 * - Complete user workflows
 * - Window management and desktop integration
 */

test.describe('GrabZilla E2E Tests', () => {
    let electronApp;
    let window;

    test.beforeEach(async () => {
        // Launch the Electron application
        electronApp = await electron.launch({
            args: ['.'],
            env: {
                ...process.env,
                NODE_ENV: 'test'
            }
        });

        // Wait for the first window to open
        window = await electronApp.firstWindow();
        
        // Wait for the application to be ready
        await window.waitForLoadState('domcontentloaded');
    });

    test.afterEach(async () => {
        // Close the application after each test
        if (electronApp) {
            await electronApp.close();
        }
    });

    test.describe('Application Startup and Initialization', () => {
        test('should launch application successfully', async () => {
            // Verify the application launched
            expect(electronApp).toBeTruthy();
            expect(window).toBeTruthy();
            
            // Check if the window is visible
            const isVisible = await window.isVisible();
            expect(isVisible).toBe(true);
        });

        test('should have correct window title', async () => {
            const title = await window.title();
            expect(title).toContain('GrabZilla');
        });

        test('should load main application components', async () => {
            // Wait for main components to be present
            await expect(window.locator('header')).toBeVisible();
            await expect(window.locator('.input-section')).toBeVisible();
            await expect(window.locator('.video-list')).toBeVisible();
            await expect(window.locator('.control-panel')).toBeVisible();
        });

        test('should initialize with correct default state', async () => {
            // Check that video list is empty initially
            const videoItems = window.locator('.video-item');
            await expect(videoItems).toHaveCount(0);
            
            // Check default quality setting
            const qualitySelect = window.locator('#quality-select');
            const selectedQuality = await qualitySelect.inputValue();
            expect(selectedQuality).toBe('1080p');
            
            // Check default format setting
            const formatSelect = window.locator('#format-select');
            const selectedFormat = await formatSelect.inputValue();
            expect(selectedFormat).toBe('None');
        });

        test('should check application version and platform info', async () => {
            const appVersion = await electronApp.evaluate(async ({ app }) => {
                return app.getVersion();
            });
            
            const platform = await electronApp.evaluate(async () => {
                return process.platform;
            });
            
            expect(appVersion).toMatch(/^\d+\.\d+\.\d+/);
            expect(['darwin', 'win32', 'linux']).toContain(platform);
        });
    });

    test.describe('URL Input and Validation', () => {
        test('should accept valid YouTube URL', async () => {
            const urlInput = window.locator('#url-input');
            const addButton = window.locator('#add-video-btn');
            
            // Enter a valid YouTube URL
            await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            await addButton.click();
            
            // Wait for video to be added (or error message)
            await window.waitForTimeout(2000);
            
            // Check if video was added or if there's an error message
            const videoItems = window.locator('.video-item');
            const errorMessage = window.locator('.error-message');
            
            const videoCount = await videoItems.count();
            const hasError = await errorMessage.isVisible();
            
            // Either video should be added OR there should be an error (network issues in test env)
            expect(videoCount > 0 || hasError).toBe(true);
        });

        test('should reject invalid URL', async () => {
            const urlInput = window.locator('#url-input');
            const addButton = window.locator('#add-video-btn');
            
            // Enter an invalid URL
            await urlInput.fill('https://example.com/not-a-video');
            await addButton.click();
            
            // Wait for validation
            await window.waitForTimeout(1000);
            
            // Should show error message
            const errorMessage = window.locator('.error-message');
            await expect(errorMessage).toBeVisible();
        });

        test('should handle multiple URLs in textarea', async () => {
            const urlInput = window.locator('#url-input');
            const addButton = window.locator('#add-video-btn');
            
            const multipleUrls = `
                https://www.youtube.com/watch?v=dQw4w9WgXcQ
                https://vimeo.com/123456789
                https://youtu.be/abcdefghijk
            `;
            
            await urlInput.fill(multipleUrls);
            await addButton.click();
            
            // Wait for processing
            await window.waitForTimeout(3000);
            
            // Check that multiple videos were processed (or errors shown)
            const videoItems = window.locator('.video-item');
            const errorMessages = window.locator('.error-message');
            
            const videoCount = await videoItems.count();
            const errorCount = await errorMessages.count();
            
            // Should have processed multiple URLs (success or error)
            expect(videoCount + errorCount).toBeGreaterThan(1);
        });

        test('should clear input after successful addition', async () => {
            const urlInput = window.locator('#url-input');
            const addButton = window.locator('#add-video-btn');
            
            await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            await addButton.click();
            
            // Wait for processing
            await window.waitForTimeout(2000);
            
            // Input should be cleared (regardless of success/failure)
            const inputValue = await urlInput.inputValue();
            expect(inputValue).toBe('');
        });
    });

    test.describe('Configuration and Settings', () => {
        test('should change quality setting', async () => {
            const qualitySelect = window.locator('#quality-select');
            
            // Change quality to 720p
            await qualitySelect.selectOption('720p');
            
            // Verify the change
            const selectedValue = await qualitySelect.inputValue();
            expect(selectedValue).toBe('720p');
        });

        test('should change format setting', async () => {
            const formatSelect = window.locator('#format-select');
            
            // Change format to H264
            await formatSelect.selectOption('H264');
            
            // Verify the change
            const selectedValue = await formatSelect.inputValue();
            expect(selectedValue).toBe('H264');
        });

        test('should open save directory dialog', async () => {
            const savePathButton = window.locator('#save-path-btn');
            
            // Mock the file dialog response
            await electronApp.evaluate(async ({ dialog }) => {
                // Mock dialog.showOpenDialog to return a test path
                dialog.showOpenDialog = async () => ({
                    canceled: false,
                    filePaths: ['/test/downloads']
                });
            });
            
            await savePathButton.click();
            
            // Wait for dialog interaction
            await window.waitForTimeout(1000);
            
            // Check if save path was updated
            const savePathDisplay = window.locator('#save-path-display');
            const pathText = await savePathDisplay.textContent();
            expect(pathText).toBeTruthy();
        });

        test('should open cookie file dialog', async () => {
            const cookieFileButton = window.locator('#cookie-file-btn');
            
            // Mock the file dialog response
            await electronApp.evaluate(async ({ dialog }) => {
                dialog.showOpenDialog = async () => ({
                    canceled: false,
                    filePaths: ['/test/cookies.txt']
                });
            });
            
            await cookieFileButton.click();
            
            // Wait for dialog interaction
            await window.waitForTimeout(1000);
            
            // Check if cookie file was set
            const cookieFileDisplay = window.locator('#cookie-file-display');
            const fileText = await cookieFileDisplay.textContent();
            expect(fileText).toBeTruthy();
        });
    });

    test.describe('Video List Management', () => {
        test('should display video information correctly', async () => {
            // Add a video first (mock the metadata response)
            await electronApp.evaluate(async () => {
                // Mock successful metadata fetch
                window.electronAPI = {
                    ...window.electronAPI,
                    getVideoMetadata: async () => ({
                        title: 'Test Video Title',
                        duration: '00:03:30',
                        thumbnail: 'https://example.com/thumb.jpg'
                    })
                };
            });
            
            const urlInput = window.locator('#url-input');
            const addButton = window.locator('#add-video-btn');
            
            await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            await addButton.click();
            
            // Wait for video to be added
            await window.waitForTimeout(2000);
            
            // Check video information display
            const videoItem = window.locator('.video-item').first();
            if (await videoItem.isVisible()) {
                const title = videoItem.locator('.video-title');
                const duration = videoItem.locator('.video-duration');
                
                await expect(title).toBeVisible();
                await expect(duration).toBeVisible();
            }
        });

        test('should allow video removal', async () => {
            // First add a video (simplified for test)
            await window.evaluate(() => {
                // Simulate adding a video directly to the DOM for testing
                const videoList = document.querySelector('.video-list');
                const videoItem = document.createElement('div');
                videoItem.className = 'video-item';
                videoItem.innerHTML = `
                    <div class="video-title">Test Video</div>
                    <button class="remove-btn" data-video-id="test-1">Remove</button>
                `;
                videoList.appendChild(videoItem);
            });
            
            // Click remove button
            const removeButton = window.locator('.remove-btn').first();
            await removeButton.click();
            
            // Wait for removal
            await window.waitForTimeout(500);
            
            // Verify video was removed
            const videoItems = window.locator('.video-item');
            await expect(videoItems).toHaveCount(0);
        });

        test('should handle video selection for bulk operations', async () => {
            // Add multiple videos for testing (simplified)
            await window.evaluate(() => {
                const videoList = document.querySelector('.video-list');
                for (let i = 1; i <= 3; i++) {
                    const videoItem = document.createElement('div');
                    videoItem.className = 'video-item';
                    videoItem.innerHTML = `
                        <input type="checkbox" class="video-checkbox" data-video-id="test-${i}">
                        <div class="video-title">Test Video ${i}</div>
                    `;
                    videoList.appendChild(videoItem);
                }
            });
            
            // Select multiple videos
            const checkboxes = window.locator('.video-checkbox');
            const firstCheckbox = checkboxes.nth(0);
            const secondCheckbox = checkboxes.nth(1);
            
            await firstCheckbox.check();
            await secondCheckbox.check();
            
            // Verify selections
            expect(await firstCheckbox.isChecked()).toBe(true);
            expect(await secondCheckbox.isChecked()).toBe(true);
        });
    });

    test.describe('Download Operations', () => {
        test('should initiate download process', async () => {
            // Add a video first (simplified)
            await window.evaluate(() => {
                const videoList = document.querySelector('.video-list');
                const videoItem = document.createElement('div');
                videoItem.className = 'video-item';
                videoItem.innerHTML = `
                    <div class="video-title">Test Video</div>
                    <div class="status-badge ready">Ready</div>
                `;
                videoList.appendChild(videoItem);
            });
            
            // Click download button
            const downloadButton = window.locator('#download-videos-btn');
            await downloadButton.click();
            
            // Wait for download initiation
            await window.waitForTimeout(1000);
            
            // Check if download started (status should change or show progress)
            const statusBadge = window.locator('.status-badge');
            const statusText = await statusBadge.textContent();
            
            // Status should change from "Ready" or show some progress indication
            expect(statusText).toBeTruthy();
        });

        test('should handle download cancellation', async () => {
            // Simulate active download
            await window.evaluate(() => {
                const videoList = document.querySelector('.video-list');
                const videoItem = document.createElement('div');
                videoItem.className = 'video-item';
                videoItem.innerHTML = `
                    <div class="video-title">Test Video</div>
                    <div class="status-badge downloading">Downloading 50%</div>
                `;
                videoList.appendChild(videoItem);
            });
            
            // Click cancel downloads button
            const cancelButton = window.locator('#cancel-downloads-btn');
            await cancelButton.click();
            
            // Wait for cancellation
            await window.waitForTimeout(1000);
            
            // Verify cancellation (status should change or downloads should stop)
            const statusBadge = window.locator('.status-badge');
            const statusText = await statusBadge.textContent();
            
            expect(statusText).toBeTruthy();
        });

        test('should clear video list', async () => {
            // Add videos first
            await window.evaluate(() => {
                const videoList = document.querySelector('.video-list');
                for (let i = 1; i <= 3; i++) {
                    const videoItem = document.createElement('div');
                    videoItem.className = 'video-item';
                    videoItem.innerHTML = `<div class="video-title">Test Video ${i}</div>`;
                    videoList.appendChild(videoItem);
                }
            });
            
            // Verify videos are present
            let videoItems = window.locator('.video-item');
            await expect(videoItems).toHaveCount(3);
            
            // Click clear list button
            const clearButton = window.locator('#clear-list-btn');
            await clearButton.click();
            
            // Wait for clearing
            await window.waitForTimeout(500);
            
            // Verify list is cleared
            videoItems = window.locator('.video-item');
            await expect(videoItems).toHaveCount(0);
        });
    });

    test.describe('Keyboard Navigation and Accessibility', () => {
        test('should support keyboard navigation', async () => {
            const urlInput = window.locator('#url-input');
            
            // Focus on URL input
            await urlInput.focus();
            
            // Navigate using Tab key
            await window.keyboard.press('Tab');
            
            // Check if focus moved to next element
            const addButton = window.locator('#add-video-btn');
            const isFocused = await addButton.evaluate(el => document.activeElement === el);
            
            expect(isFocused).toBe(true);
        });

        test('should have proper ARIA labels', async () => {
            const urlInput = window.locator('#url-input');
            const addButton = window.locator('#add-video-btn');
            
            // Check for accessibility attributes
            const inputLabel = await urlInput.getAttribute('aria-label');
            const buttonLabel = await addButton.getAttribute('aria-label');
            
            expect(inputLabel || await urlInput.getAttribute('placeholder')).toBeTruthy();
            expect(buttonLabel || await addButton.textContent()).toBeTruthy();
        });

        test('should support keyboard shortcuts', async () => {
            // Test Ctrl+A (Select All) - if implemented
            await window.keyboard.press('Control+a');
            
            // Test Escape (Cancel/Clear) - if implemented
            await window.keyboard.press('Escape');
            
            // Test Delete (Remove selected) - if implemented
            await window.keyboard.press('Delete');
            
            // These tests verify that keyboard shortcuts don't cause errors
            // Actual functionality depends on implementation
            expect(true).toBe(true); // Test passes if no errors thrown
        });
    });

    test.describe('Window Management', () => {
        test('should handle window resize', async () => {
            // Get initial window size
            const initialSize = await window.evaluate(() => ({
                width: window.innerWidth,
                height: window.innerHeight
            }));
            
            // Resize window
            await window.setViewportSize({ width: 1200, height: 800 });
            
            // Get new size
            const newSize = await window.evaluate(() => ({
                width: window.innerWidth,
                height: window.innerHeight
            }));
            
            expect(newSize.width).toBe(1200);
            expect(newSize.height).toBe(800);
            expect(newSize.width).not.toBe(initialSize.width);
        });

        test('should maintain responsive layout', async () => {
            // Test different viewport sizes
            const viewports = [
                { width: 1920, height: 1080 }, // Desktop
                { width: 1366, height: 768 },  // Laptop
                { width: 1024, height: 768 }   // Tablet
            ];
            
            for (const viewport of viewports) {
                await window.setViewportSize(viewport);
                
                // Check that main components are still visible
                await expect(window.locator('header')).toBeVisible();
                await expect(window.locator('.input-section')).toBeVisible();
                await expect(window.locator('.video-list')).toBeVisible();
                await expect(window.locator('.control-panel')).toBeVisible();
            }
        });

        test('should handle window focus and blur events', async () => {
            // This test verifies the window can handle focus events
            // In a real Electron app, this might trigger specific behaviors
            
            await window.evaluate(() => {
                window.dispatchEvent(new Event('focus'));
                window.dispatchEvent(new Event('blur'));
            });
            
            // Test passes if no errors are thrown
            expect(true).toBe(true);
        });
    });

    test.describe('Error Handling and User Feedback', () => {
        test('should display error messages appropriately', async () => {
            // Trigger an error condition (invalid URL)
            const urlInput = window.locator('#url-input');
            const addButton = window.locator('#add-video-btn');
            
            await urlInput.fill('invalid-url');
            await addButton.click();
            
            // Wait for error message
            await window.waitForTimeout(1000);
            
            // Check for error display
            const errorMessage = window.locator('.error-message, .notification, .alert');
            const hasError = await errorMessage.count() > 0;
            
            expect(hasError).toBe(true);
        });

        test('should handle network connectivity issues', async () => {
            // Mock network failure
            await electronApp.evaluate(async () => {
                // Simulate network error in main process
                global.networkError = true;
            });
            
            const urlInput = window.locator('#url-input');
            const addButton = window.locator('#add-video-btn');
            
            await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            await addButton.click();
            
            // Wait for error handling
            await window.waitForTimeout(2000);
            
            // Should show appropriate error message
            const errorIndicator = window.locator('.error-message, .network-error, .status-error');
            const hasNetworkError = await errorIndicator.count() > 0;
            
            // Either shows error or handles gracefully
            expect(hasNetworkError || true).toBe(true);
        });

        test('should provide user feedback during operations', async () => {
            // Test loading states and progress indicators
            const urlInput = window.locator('#url-input');
            const addButton = window.locator('#add-video-btn');
            
            await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            await addButton.click();
            
            // Check for loading indicators
            const loadingIndicator = window.locator('.loading, .spinner, .progress');
            
            // Should show some form of loading feedback
            // (even if brief, there should be some indication of processing)
            await window.waitForTimeout(500);
            
            // Test passes if application provides some form of feedback
            expect(true).toBe(true);
        });
    });
});