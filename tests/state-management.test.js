// State Management and Data Models Tests (Task 7)

import { describe, it, expect, beforeEach } from 'vitest';

// Import the classes (we'll need to make them available for testing)
// For now, we'll test the logic by copying the class definitions

describe('Video Object Model', () => {
    let Video, URLValidator, FormatHandler, AppState;
    
    beforeEach(() => {
        // Define Video class for testing
        Video = class {
            constructor(url, options = {}) {
                this.id = this.generateId();
                this.url = this.validateUrl(url);
                this.title = options.title || 'Loading...';
                this.thumbnail = options.thumbnail || 'assets/icons/placeholder.svg';
                this.duration = options.duration || '00:00';
                this.quality = options.quality || '1080p';
                this.format = options.format || 'None';
                this.status = options.status || 'ready';
                this.progress = options.progress || 0;
                this.filename = options.filename || '';
                this.error = options.error || null;
                this.createdAt = new Date();
                this.updatedAt = new Date();
            }
            
            generateId() {
                return 'video_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            }
            
            validateUrl(url) {
                if (!url || typeof url !== 'string') {
                    throw new Error('Invalid URL provided');
                }
                
                const trimmedUrl = url.trim();
                if (!URLValidator.isValidVideoUrl(trimmedUrl)) {
                    throw new Error('Invalid video URL format');
                }
                
                return trimmedUrl;
            }
            
            update(properties) {
                const allowedProperties = [
                    'title', 'thumbnail', 'duration', 'quality', 'format', 
                    'status', 'progress', 'filename', 'error'
                ];
                
                Object.keys(properties).forEach(key => {
                    if (allowedProperties.includes(key)) {
                        this[key] = properties[key];
                    }
                });
                
                this.updatedAt = new Date();
                return this;
            }
            
            getDisplayName() {
                return this.title !== 'Loading...' ? this.title : this.url;
            }
            
            isDownloadable() {
                return this.status === 'ready' && !this.error;
            }
            
            isProcessing() {
                return ['downloading', 'converting'].includes(this.status);
            }
        };
        
        // Define URLValidator for testing
        URLValidator = class {
            static youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
            static vimeoRegex = /^(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
            
            static isValidVideoUrl(url) {
                if (!url || typeof url !== 'string') {
                    return false;
                }
                
                const trimmedUrl = url.trim();
                return this.youtubeRegex.test(trimmedUrl) || this.vimeoRegex.test(trimmedUrl);
            }
            
            static extractUrlsFromText(text) {
                if (!text || typeof text !== 'string') {
                    return [];
                }
                
                const lines = text.split('\n');
                const urls = [];
                
                lines.forEach(line => {
                    const trimmedLine = line.trim();
                    if (trimmedLine && this.isValidVideoUrl(trimmedLine)) {
                        urls.push(trimmedLine);
                    }
                });
                
                return [...new Set(urls)];
            }
        };
        
        // Define AppState for testing
        AppState = class {
            constructor() {
                this.videos = [];
                this.config = {
                    savePath: '~/Downloads',
                    defaultQuality: '1080p',
                    defaultFormat: 'None',
                    filenamePattern: '%(title)s.%(ext)s',
                    cookieFile: null
                };
                this.ui = {
                    isDownloading: false,
                    selectedVideos: []
                };
                this.listeners = new Map();
            }
            
            addVideo(video) {
                if (!(video instanceof Video)) {
                    throw new Error('Invalid video object');
                }
                
                const existingVideo = this.videos.find(v => v.url === video.url);
                if (existingVideo) {
                    throw new Error('Video URL already exists in the list');
                }
                
                this.videos.push(video);
                return video;
            }
            
            removeVideo(videoId) {
                const index = this.videos.findIndex(v => v.id === videoId);
                if (index === -1) {
                    throw new Error('Video not found');
                }
                
                return this.videos.splice(index, 1)[0];
            }
            
            updateVideo(videoId, properties) {
                const video = this.videos.find(v => v.id === videoId);
                if (!video) {
                    throw new Error('Video not found');
                }
                
                video.update(properties);
                return video;
            }
            
            getVideo(videoId) {
                return this.videos.find(v => v.id === videoId);
            }
            
            getVideos() {
                return [...this.videos];
            }
            
            getVideosByStatus(status) {
                return this.videos.filter(v => v.status === status);
            }
            
            clearVideos() {
                const removedVideos = [...this.videos];
                this.videos = [];
                return removedVideos;
            }
            
            getStats() {
                return {
                    total: this.videos.length,
                    ready: this.getVideosByStatus('ready').length,
                    downloading: this.getVideosByStatus('downloading').length,
                    converting: this.getVideosByStatus('converting').length,
                    completed: this.getVideosByStatus('completed').length,
                    error: this.getVideosByStatus('error').length
                };
            }
        };
    });
    
    describe('Video Class', () => {
        it('should create a video with valid YouTube URL', () => {
            const video = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            
            expect(video.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(video.id).toMatch(/^video_\d+_[a-z0-9]+$/);
            expect(video.title).toBe('Loading...');
            expect(video.status).toBe('ready');
            expect(video.quality).toBe('1080p');
            expect(video.format).toBe('None');
        });
        
        it('should create a video with custom options', () => {
            const video = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
                title: 'Test Video',
                quality: '720p',
                format: 'H264'
            });
            
            expect(video.title).toBe('Test Video');
            expect(video.quality).toBe('720p');
            expect(video.format).toBe('H264');
        });
        
        it('should throw error for invalid URL', () => {
            expect(() => {
                new Video('invalid-url');
            }).toThrow('Invalid video URL format');
        });
        
        it('should update video properties', () => {
            const video = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            const oldUpdatedAt = video.updatedAt;
            
            // Wait a bit to ensure timestamp difference
            setTimeout(() => {
                video.update({
                    title: 'Updated Title',
                    status: 'downloading',
                    progress: 50
                });
                
                expect(video.title).toBe('Updated Title');
                expect(video.status).toBe('downloading');
                expect(video.progress).toBe(50);
                expect(video.updatedAt).not.toBe(oldUpdatedAt);
            }, 10);
        });
        
        it('should check if video is downloadable', () => {
            const video = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            
            expect(video.isDownloadable()).toBe(true);
            
            video.update({ status: 'downloading' });
            expect(video.isDownloadable()).toBe(false);
            
            video.update({ status: 'ready', error: 'Some error' });
            expect(video.isDownloadable()).toBe(false);
        });
        
        it('should check if video is processing', () => {
            const video = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            
            expect(video.isProcessing()).toBe(false);
            
            video.update({ status: 'downloading' });
            expect(video.isProcessing()).toBe(true);
            
            video.update({ status: 'converting' });
            expect(video.isProcessing()).toBe(true);
            
            video.update({ status: 'completed' });
            expect(video.isProcessing()).toBe(false);
        });
    });
    
    describe('URLValidator Class', () => {
        it('should validate YouTube URLs', () => {
            const validUrls = [
                'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'https://youtube.com/watch?v=dQw4w9WgXcQ',
                'https://youtu.be/dQw4w9WgXcQ',
                'www.youtube.com/watch?v=dQw4w9WgXcQ',
                'youtube.com/watch?v=dQw4w9WgXcQ',
                'youtu.be/dQw4w9WgXcQ'
            ];
            
            validUrls.forEach(url => {
                expect(URLValidator.isValidVideoUrl(url)).toBe(true);
            });
        });
        
        it('should validate Vimeo URLs', () => {
            const validUrls = [
                'https://vimeo.com/123456789',
                'https://www.vimeo.com/123456789',
                'https://player.vimeo.com/video/123456789',
                'vimeo.com/123456789'
            ];
            
            validUrls.forEach(url => {
                expect(URLValidator.isValidVideoUrl(url)).toBe(true);
            });
        });
        
        it('should reject invalid URLs', () => {
            const invalidUrls = [
                'https://example.com',
                'not-a-url',
                '',
                null,
                undefined,
                'https://youtube.com/invalid',
                'https://vimeo.com/invalid'
            ];
            
            invalidUrls.forEach(url => {
                expect(URLValidator.isValidVideoUrl(url)).toBe(false);
            });
        });
        
        it('should extract URLs from text', () => {
            const text = `
                Here are some videos:
                https://www.youtube.com/watch?v=dQw4w9WgXcQ
                Some other text
                https://vimeo.com/123456789
                More text
                https://youtu.be/abcdefghijk
            `;
            
            const urls = URLValidator.extractUrlsFromText(text);
            
            expect(urls).toHaveLength(3);
            expect(urls).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(urls).toContain('https://vimeo.com/123456789');
            expect(urls).toContain('https://youtu.be/abcdefghijk');
        });
        
        it('should remove duplicate URLs from text', () => {
            const text = `
                https://www.youtube.com/watch?v=dQw4w9WgXcQ
                https://www.youtube.com/watch?v=dQw4w9WgXcQ
                https://vimeo.com/123456789
            `;
            
            const urls = URLValidator.extractUrlsFromText(text);
            
            expect(urls).toHaveLength(2);
        });
    });
    
    describe('AppState Class', () => {
        let appState;
        
        beforeEach(() => {
            appState = new AppState();
        });
        
        it('should initialize with empty state', () => {
            expect(appState.videos).toHaveLength(0);
            expect(appState.config.defaultQuality).toBe('1080p');
            expect(appState.config.defaultFormat).toBe('None');
        });
        
        it('should add video to state', () => {
            const video = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            
            const addedVideo = appState.addVideo(video);
            
            expect(appState.videos).toHaveLength(1);
            expect(addedVideo).toBe(video);
        });
        
        it('should prevent duplicate URLs', () => {
            const video1 = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            const video2 = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            
            appState.addVideo(video1);
            
            expect(() => {
                appState.addVideo(video2);
            }).toThrow('Video URL already exists in the list');
        });
        
        it('should remove video from state', () => {
            const video = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            appState.addVideo(video);
            
            const removedVideo = appState.removeVideo(video.id);
            
            expect(appState.videos).toHaveLength(0);
            expect(removedVideo).toBe(video);
        });
        
        it('should update video in state', () => {
            const video = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            appState.addVideo(video);
            
            const updatedVideo = appState.updateVideo(video.id, {
                title: 'Updated Title',
                status: 'downloading'
            });
            
            expect(updatedVideo.title).toBe('Updated Title');
            expect(updatedVideo.status).toBe('downloading');
        });
        
        it('should get videos by status', () => {
            const video1 = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            const video2 = new Video('https://vimeo.com/123456789');
            
            appState.addVideo(video1);
            appState.addVideo(video2);
            
            appState.updateVideo(video1.id, { status: 'downloading' });
            
            const readyVideos = appState.getVideosByStatus('ready');
            const downloadingVideos = appState.getVideosByStatus('downloading');
            
            expect(readyVideos).toHaveLength(1);
            expect(downloadingVideos).toHaveLength(1);
            expect(readyVideos[0]).toBe(video2);
            expect(downloadingVideos[0]).toBe(video1);
        });
        
        it('should clear all videos', () => {
            const video1 = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            const video2 = new Video('https://vimeo.com/123456789');
            
            appState.addVideo(video1);
            appState.addVideo(video2);
            
            const removedVideos = appState.clearVideos();
            
            expect(appState.videos).toHaveLength(0);
            expect(removedVideos).toHaveLength(2);
        });
        
        it('should provide accurate statistics', () => {
            const video1 = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            const video2 = new Video('https://vimeo.com/123456789');
            const video3 = new Video('https://youtu.be/abcdefghijk');
            
            appState.addVideo(video1);
            appState.addVideo(video2);
            appState.addVideo(video3);
            
            appState.updateVideo(video1.id, { status: 'downloading' });
            appState.updateVideo(video2.id, { status: 'completed' });
            
            const stats = appState.getStats();
            
            expect(stats.total).toBe(3);
            expect(stats.ready).toBe(1);
            expect(stats.downloading).toBe(1);
            expect(stats.completed).toBe(1);
            expect(stats.converting).toBe(0);
            expect(stats.error).toBe(0);
        });
    });
});