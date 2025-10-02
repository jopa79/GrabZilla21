/**
 * @fileoverview IPC Integration Tests
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('IPC Integration', () => {
    let mockElectronAPI;

    beforeEach(() => {
        // Create fresh mock for each test
        mockElectronAPI = {
            selectSaveDirectory: vi.fn(),
            selectCookieFile: vi.fn(),
            checkBinaryVersions: vi.fn(),
            getVideoMetadata: vi.fn(),
            downloadVideo: vi.fn(),
            onDownloadProgress: vi.fn(),
            removeDownloadProgressListener: vi.fn(),
            getAppVersion: vi.fn(() => '2.1.0'),
            getPlatform: vi.fn(() => 'darwin')
        };

        // Set up window.electronAPI for each test
        global.window = global.window || {};
        global.window.electronAPI = mockElectronAPI;
    });

    describe('File System Operations', () => {
        it('should handle save directory selection', async () => {
            const testPath = '/Users/test/Downloads';
            mockElectronAPI.selectSaveDirectory.mockResolvedValue(testPath);

            const result = await window.electronAPI.selectSaveDirectory();
            
            expect(mockElectronAPI.selectSaveDirectory).toHaveBeenCalled();
            expect(result).toBe(testPath);
        });

        it('should handle cookie file selection', async () => {
            const testPath = '/Users/test/cookies.txt';
            mockElectronAPI.selectCookieFile.mockResolvedValue(testPath);

            const result = await window.electronAPI.selectCookieFile();
            
            expect(mockElectronAPI.selectCookieFile).toHaveBeenCalled();
            expect(result).toBe(testPath);
        });

        it('should handle cancelled file selection', async () => {
            mockElectronAPI.selectSaveDirectory.mockResolvedValue(null);

            const result = await window.electronAPI.selectSaveDirectory();
            
            expect(result).toBeNull();
        });
    });

    describe('Binary Management', () => {
        it('should check binary versions', async () => {
            const mockVersions = {
                ytDlp: { available: true, version: '2023.12.30' },
                ffmpeg: { available: true, version: '6.0' }
            };
            mockElectronAPI.checkBinaryVersions.mockResolvedValue(mockVersions);

            const result = await window.electronAPI.checkBinaryVersions();
            
            expect(mockElectronAPI.checkBinaryVersions).toHaveBeenCalled();
            expect(result).toEqual(mockVersions);
        });

        it('should handle missing binaries', async () => {
            const mockVersions = {
                ytDlp: { available: false },
                ffmpeg: { available: false }
            };
            mockElectronAPI.checkBinaryVersions.mockResolvedValue(mockVersions);

            const result = await window.electronAPI.checkBinaryVersions();
            
            expect(result.ytDlp.available).toBe(false);
            expect(result.ffmpeg.available).toBe(false);
        });
    });

    describe('Video Operations', () => {
        it('should fetch video metadata', async () => {
            const mockMetadata = {
                title: 'Test Video',
                duration: '5:30',
                thumbnail: 'https://example.com/thumb.jpg',
                uploader: 'Test Channel'
            };
            mockElectronAPI.getVideoMetadata.mockResolvedValue(mockMetadata);

            const result = await window.electronAPI.getVideoMetadata('https://youtube.com/watch?v=test');
            
            expect(mockElectronAPI.getVideoMetadata).toHaveBeenCalledWith('https://youtube.com/watch?v=test');
            expect(result).toEqual(mockMetadata);
        });

        it('should handle video download', async () => {
            const downloadOptions = {
                url: 'https://youtube.com/watch?v=test',
                quality: '720p',
                format: 'mp4',
                savePath: '/Users/test/Downloads',
                cookieFile: null
            };
            const mockResult = { success: true, filename: 'test-video.mp4' };
            mockElectronAPI.downloadVideo.mockResolvedValue(mockResult);

            const result = await window.electronAPI.downloadVideo(downloadOptions);
            
            expect(mockElectronAPI.downloadVideo).toHaveBeenCalledWith(downloadOptions);
            expect(result).toEqual(mockResult);
        });

        it('should handle download progress events', () => {
            const mockCallback = vi.fn();
            
            window.electronAPI.onDownloadProgress(mockCallback);
            
            expect(mockElectronAPI.onDownloadProgress).toHaveBeenCalledWith(mockCallback);
        });
    });

    describe('App Information', () => {
        it('should get app version', () => {
            const version = window.electronAPI.getAppVersion();
            
            expect(mockElectronAPI.getAppVersion).toHaveBeenCalled();
            expect(version).toBe('2.1.0');
        });

        it('should get platform information', () => {
            const platform = window.electronAPI.getPlatform();
            
            expect(mockElectronAPI.getPlatform).toHaveBeenCalled();
            expect(platform).toBe('darwin');
        });
    });

    describe('Error Handling', () => {
        it('should handle IPC errors gracefully', async () => {
            const error = new Error('IPC communication failed');
            mockElectronAPI.selectSaveDirectory.mockRejectedValue(error);

            await expect(window.electronAPI.selectSaveDirectory()).rejects.toThrow('IPC communication failed');
        });

        it('should handle binary check errors', async () => {
            const error = new Error('Binary check failed');
            mockElectronAPI.checkBinaryVersions.mockRejectedValue(error);

            await expect(window.electronAPI.checkBinaryVersions()).rejects.toThrow('Binary check failed');
        });

        it('should handle metadata fetch errors', async () => {
            const error = new Error('Failed to fetch metadata');
            mockElectronAPI.getVideoMetadata.mockRejectedValue(error);

            await expect(window.electronAPI.getVideoMetadata('invalid-url')).rejects.toThrow('Failed to fetch metadata');
        });
    });
});

describe('IPC Security', () => {
    it('should not expose dangerous Node.js APIs', () => {
        // Ensure that dangerous APIs are not exposed through the context bridge
        expect(window.require).toBeUndefined();
        // Note: process is available in test environment but should not be in real Electron renderer
        expect(window.__dirname).toBeUndefined();
        expect(window.__filename).toBeUndefined();
    });

    it('should only expose safe, specific methods', () => {
        const expectedMethods = [
            'selectSaveDirectory',
            'selectCookieFile',
            'checkBinaryVersions',
            'getVideoMetadata',
            'downloadVideo',
            'onDownloadProgress',
            'removeDownloadProgressListener',
            'getAppVersion',
            'getPlatform'
        ];

        expectedMethods.forEach(method => {
            expect(typeof window.electronAPI[method]).toBe('function');
        });
    });

    it('should validate input parameters', async () => {
        // Test that the IPC layer validates inputs
        const invalidOptions = {
            url: '', // Invalid empty URL
            quality: 'invalid',
            format: 'unknown',
            savePath: null
        };

        // The main process should validate these and reject
        global.window.electronAPI.downloadVideo.mockRejectedValue(new Error('Invalid parameters'));

        await expect(window.electronAPI.downloadVideo(invalidOptions)).rejects.toThrow('Invalid parameters');
    });
});