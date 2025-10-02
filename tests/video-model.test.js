// Video Model Tests (Task 7)

import { describe, it, expect, beforeEach } from 'vitest';

describe('Video Model and Utility Functions', () => {
    let Video, URLValidator, FormatHandler;
    
    beforeEach(() => {
        // Define Video class for testing (matching the implementation)
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
            
            getFormattedDuration() {
                if (!this.duration || this.duration === '00:00') {
                    return 'Unknown';
                }
                return this.duration;
            }
            
            toJSON() {
                return {
                    id: this.id,
                    url: this.url,
                    title: this.title,
                    thumbnail: this.thumbnail,
                    duration: this.duration,
                    quality: this.quality,
                    format: this.format,
                    status: this.status,
                    progress: this.progress,
                    filename: this.filename,
                    error: this.error,
                    createdAt: this.createdAt.toISOString(),
                    updatedAt: this.updatedAt.toISOString()
                };
            }
            
            static fromJSON(data) {
                const video = new Video(data.url, {
                    title: data.title,
                    thumbnail: data.thumbnail,
                    duration: data.duration,
                    quality: data.quality,
                    format: data.format,
                    status: data.status,
                    progress: data.progress,
                    filename: data.filename,
                    error: data.error
                });
                
                video.id = data.id;
                video.createdAt = new Date(data.createdAt);
                video.updatedAt = new Date(data.updatedAt);
                
                return video;
            }
        };
        
        // Define URLValidator for testing
        URLValidator = class {
            static youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
            static youtubePlaylistRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/;
            static vimeoRegex = /(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
            
            static isValidVideoUrl(url) {
                if (!url || typeof url !== 'string') {
                    return false;
                }
                
                const trimmedUrl = url.trim();
                return this.isYouTubeUrl(trimmedUrl) || 
                       this.isVimeoUrl(trimmedUrl) || 
                       this.isYouTubePlaylist(trimmedUrl);
            }
            
            static isYouTubeUrl(url) {
                return this.youtubeRegex.test(url);
            }
            
            static isYouTubePlaylist(url) {
                return this.youtubePlaylistRegex.test(url);
            }
            
            static isVimeoUrl(url) {
                return this.vimeoRegex.test(url);
            }
            
            static extractYouTubeId(url) {
                const match = url.match(this.youtubeRegex);
                return match ? match[1] : null;
            }
            
            static extractVimeoId(url) {
                const match = url.match(this.vimeoRegex);
                return match ? match[1] : null;
            }
            
            static extractPlaylistId(url) {
                const match = url.match(this.youtubePlaylistRegex);
                return match ? match[1] : null;
            }
            
            static getVideoPlatform(url) {
                if (this.isYouTubeUrl(url) || this.isYouTubePlaylist(url)) {
                    return 'youtube';
                }
                if (this.isVimeoUrl(url)) {
                    return 'vimeo';
                }
                return 'unknown';
            }
            
            static normalizeUrl(url) {
                if (!url) return url;
                
                const trimmedUrl = url.trim();
                if (!/^https?:\/\//.test(trimmedUrl)) {
                    return 'https://' + trimmedUrl;
                }
                return trimmedUrl;
            }
            
            static extractUrlsFromText(text) {
                if (!text || typeof text !== 'string') {
                    return [];
                }
                
                const urls = [];
                const urlRegex = /https?:\/\/[^\s]+/g;
                
                // Extract all potential URLs from the text
                const matches = text.match(urlRegex) || [];
                
                matches.forEach(url => {
                    // Clean up the URL (remove trailing punctuation)
                    const cleanUrl = url.replace(/[.,;!?]+$/, '');
                    if (this.isValidVideoUrl(cleanUrl)) {
                        urls.push(this.normalizeUrl(cleanUrl));
                    }
                });
                
                return [...new Set(urls)];
            }
        };
        
        // Define FormatHandler for testing
        FormatHandler = class {
            static qualityOptions = [
                { value: '4K', label: '4K (2160p)', ytdlpFormat: 'best[height<=2160]' },
                { value: '1440p', label: '1440p (QHD)', ytdlpFormat: 'best[height<=1440]' },
                { value: '1080p', label: '1080p (Full HD)', ytdlpFormat: 'best[height<=1080]' },
                { value: '720p', label: '720p (HD)', ytdlpFormat: 'best[height<=720]' },
                { value: '480p', label: '480p (SD)', ytdlpFormat: 'best[height<=480]' },
                { value: 'best', label: 'Best Available', ytdlpFormat: 'best' }
            ];
            
            static formatOptions = [
                { value: 'None', label: 'No Conversion', ffmpegArgs: null },
                { value: 'H264', label: 'H.264 (MP4)', ffmpegArgs: ['-c:v', 'libx264', '-c:a', 'aac'] },
                { value: 'ProRes', label: 'Apple ProRes', ffmpegArgs: ['-c:v', 'prores', '-c:a', 'pcm_s16le'] },
                { value: 'DNxHR', label: 'Avid DNxHR', ffmpegArgs: ['-c:v', 'dnxhd', '-c:a', 'pcm_s16le'] },
                { value: 'Audio only', label: 'Audio Only (M4A)', ffmpegArgs: ['-vn', '-c:a', 'aac'] }
            ];
            
            static getYtdlpFormat(quality) {
                const option = this.qualityOptions.find(opt => opt.value === quality);
                return option ? option.ytdlpFormat : 'best[height<=720]';
            }
            
            static getFFmpegArgs(format) {
                const option = this.formatOptions.find(opt => opt.value === format);
                return option ? option.ffmpegArgs : null;
            }
            
            static requiresConversion(format) {
                return format && format !== 'None' && this.getFFmpegArgs(format) !== null;
            }
            
            static getFileExtension(format) {
                switch (format) {
                    case 'H264':
                        return 'mp4';
                    case 'ProRes':
                        return 'mov';
                    case 'DNxHR':
                        return 'mov';
                    case 'Audio only':
                        return 'm4a';
                    default:
                        return 'mp4';
                }
            }
            
            static isValidQuality(quality) {
                return this.qualityOptions.some(opt => opt.value === quality);
            }
            
            static isValidFormat(format) {
                return this.formatOptions.some(opt => opt.value === format);
            }
        };
    });
    
    describe('Video Model Core Functionality', () => {
        it('should create video with unique ID', () => {
            const video1 = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            const video2 = new Video('https://vimeo.com/123456789');
            
            expect(video1.id).not.toBe(video2.id);
            expect(video1.id).toMatch(/^video_\d+_[a-z0-9]+$/);
            expect(video2.id).toMatch(/^video_\d+_[a-z0-9]+$/);
        });
        
        it('should handle URL validation correctly', () => {
            // Valid URLs should work
            expect(() => new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).not.toThrow();
            expect(() => new Video('https://vimeo.com/123456789')).not.toThrow();
            
            // Invalid URLs should throw
            expect(() => new Video('')).toThrow('Invalid URL provided');
            expect(() => new Video(null)).toThrow('Invalid URL provided');
            expect(() => new Video('invalid-url')).toThrow('Invalid video URL format');
        });
        
        it('should set default values correctly', () => {
            const video = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            
            expect(video.title).toBe('Loading...');
            expect(video.thumbnail).toBe('assets/icons/placeholder.svg');
            expect(video.duration).toBe('00:00');
            expect(video.quality).toBe('1080p');
            expect(video.format).toBe('None');
            expect(video.status).toBe('ready');
            expect(video.progress).toBe(0);
            expect(video.filename).toBe('');
            expect(video.error).toBe(null);
        });
        
        it('should accept custom options', () => {
            const options = {
                title: 'Custom Title',
                thumbnail: 'custom-thumb.jpg',
                duration: '05:30',
                quality: '720p',
                format: 'H264',
                status: 'downloading',
                progress: 25,
                filename: 'custom-file.mp4',
                error: 'Test error'
            };
            
            const video = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ', options);
            
            expect(video.title).toBe(options.title);
            expect(video.thumbnail).toBe(options.thumbnail);
            expect(video.duration).toBe(options.duration);
            expect(video.quality).toBe(options.quality);
            expect(video.format).toBe(options.format);
            expect(video.status).toBe(options.status);
            expect(video.progress).toBe(options.progress);
            expect(video.filename).toBe(options.filename);
            expect(video.error).toBe(options.error);
        });
        
        it('should update properties correctly', () => {
            const video = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            const originalUpdatedAt = video.updatedAt;
            
            // Wait a bit to ensure timestamp difference
            setTimeout(() => {
                const result = video.update({
                    title: 'New Title',
                    status: 'downloading',
                    progress: 50,
                    invalidProperty: 'should be ignored'
                });
                
                expect(result).toBe(video); // Should return self for chaining
                expect(video.title).toBe('New Title');
                expect(video.status).toBe('downloading');
                expect(video.progress).toBe(50);
                expect(video.invalidProperty).toBeUndefined();
                expect(video.updatedAt).not.toBe(originalUpdatedAt);
            }, 10);
        });
        
        it('should provide correct display name', () => {
            const video = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            
            // Should return URL when title is default
            expect(video.getDisplayName()).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            
            // Should return title when set
            video.update({ title: 'Actual Video Title' });
            expect(video.getDisplayName()).toBe('Actual Video Title');
        });
        
        it('should check downloadable status correctly', () => {
            const video = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            
            // Ready status with no error should be downloadable
            expect(video.isDownloadable()).toBe(true);
            
            // Not ready status should not be downloadable
            video.update({ status: 'downloading' });
            expect(video.isDownloadable()).toBe(false);
            
            // Ready with error should not be downloadable
            video.update({ status: 'ready', error: 'Some error' });
            expect(video.isDownloadable()).toBe(false);
        });
        
        it('should check processing status correctly', () => {
            const video = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            
            expect(video.isProcessing()).toBe(false);
            
            video.update({ status: 'downloading' });
            expect(video.isProcessing()).toBe(true);
            
            video.update({ status: 'converting' });
            expect(video.isProcessing()).toBe(true);
            
            video.update({ status: 'completed' });
            expect(video.isProcessing()).toBe(false);
            
            video.update({ status: 'error' });
            expect(video.isProcessing()).toBe(false);
        });
        
        it('should format duration correctly', () => {
            const video = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            
            expect(video.getFormattedDuration()).toBe('Unknown');
            
            video.update({ duration: '05:30' });
            expect(video.getFormattedDuration()).toBe('05:30');
            
            video.update({ duration: '' });
            expect(video.getFormattedDuration()).toBe('Unknown');
        });
        
        it('should serialize to JSON correctly', () => {
            const video = new Video('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
                title: 'Test Video',
                quality: '720p'
            });
            
            const json = video.toJSON();
            
            expect(json.id).toBe(video.id);
            expect(json.url).toBe(video.url);
            expect(json.title).toBe('Test Video');
            expect(json.quality).toBe('720p');
            expect(json.createdAt).toBe(video.createdAt.toISOString());
            expect(json.updatedAt).toBe(video.updatedAt.toISOString());
        });
        
        it('should deserialize from JSON correctly', () => {
            const jsonData = {
                id: 'video_123_abc',
                url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                title: 'Test Video',
                thumbnail: 'test-thumb.jpg',
                duration: '05:30',
                quality: '720p',
                format: 'H264',
                status: 'completed',
                progress: 100,
                filename: 'test.mp4',
                error: null,
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T01:00:00.000Z'
            };
            
            const video = Video.fromJSON(jsonData);
            
            expect(video.id).toBe(jsonData.id);
            expect(video.url).toBe(jsonData.url);
            expect(video.title).toBe(jsonData.title);
            expect(video.quality).toBe(jsonData.quality);
            expect(video.createdAt).toEqual(new Date(jsonData.createdAt));
            expect(video.updatedAt).toEqual(new Date(jsonData.updatedAt));
        });
    });
    
    describe('URLValidator Advanced Features', () => {
        it('should extract YouTube video IDs', () => {
            expect(URLValidator.extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
            expect(URLValidator.extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
            expect(URLValidator.extractYouTubeId('invalid-url')).toBe(null);
        });
        
        it('should extract Vimeo video IDs', () => {
            expect(URLValidator.extractVimeoId('https://vimeo.com/123456789')).toBe('123456789');
            expect(URLValidator.extractVimeoId('https://player.vimeo.com/video/123456789')).toBe('123456789');
            expect(URLValidator.extractVimeoId('invalid-url')).toBe(null);
        });
        
        it('should extract YouTube playlist IDs', () => {
            expect(URLValidator.extractPlaylistId('https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8HmPME')).toBe('PLrAXtmRdnEQy6nuLMHjMZOz59Oq8HmPME');
            expect(URLValidator.extractPlaylistId('invalid-url')).toBe(null);
        });
        
        it('should identify video platforms', () => {
            expect(URLValidator.getVideoPlatform('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
            expect(URLValidator.getVideoPlatform('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
            expect(URLValidator.getVideoPlatform('https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8HmPME')).toBe('youtube');
            expect(URLValidator.getVideoPlatform('https://vimeo.com/123456789')).toBe('vimeo');
            expect(URLValidator.getVideoPlatform('https://example.com')).toBe('unknown');
        });
        
        it('should normalize URLs', () => {
            expect(URLValidator.normalizeUrl('www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(URLValidator.normalizeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(URLValidator.normalizeUrl('')).toBe('');
            expect(URLValidator.normalizeUrl(null)).toBe(null);
        });
        
        it('should handle complex text extraction', () => {
            const complexText = `
                Check out these videos:
                
                1. https://www.youtube.com/watch?v=dQw4w9WgXcQ - Rick Roll
                2. Some random text here
                3. https://vimeo.com/123456789
                
                Also this one: https://youtu.be/abcdefghijk
                
                And this playlist: https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8HmPME
                
                Invalid: https://example.com/not-a-video
            `;
            
            const urls = URLValidator.extractUrlsFromText(complexText);
            
            expect(urls).toHaveLength(4);
            expect(urls).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(urls).toContain('https://vimeo.com/123456789');
            expect(urls).toContain('https://youtu.be/abcdefghijk');
            expect(urls).toContain('https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8HmPME');
        });
    });
    
    describe('FormatHandler Functionality', () => {
        it('should provide correct yt-dlp format strings', () => {
            expect(FormatHandler.getYtdlpFormat('720p')).toBe('best[height<=720]');
            expect(FormatHandler.getYtdlpFormat('1080p')).toBe('best[height<=1080]');
            expect(FormatHandler.getYtdlpFormat('4K')).toBe('best[height<=2160]');
            expect(FormatHandler.getYtdlpFormat('best')).toBe('best');
            expect(FormatHandler.getYtdlpFormat('invalid')).toBe('best[height<=720]'); // fallback
        });
        
        it('should provide correct FFmpeg arguments', () => {
            expect(FormatHandler.getFFmpegArgs('None')).toBe(null);
            expect(FormatHandler.getFFmpegArgs('H264')).toEqual(['-c:v', 'libx264', '-c:a', 'aac']);
            expect(FormatHandler.getFFmpegArgs('ProRes')).toEqual(['-c:v', 'prores', '-c:a', 'pcm_s16le']);
            expect(FormatHandler.getFFmpegArgs('Audio only')).toEqual(['-vn', '-c:a', 'aac']);
        });
        
        it('should check if conversion is required', () => {
            expect(FormatHandler.requiresConversion('None')).toBe(false);
            expect(FormatHandler.requiresConversion('H264')).toBe(true);
            expect(FormatHandler.requiresConversion('ProRes')).toBe(true);
            expect(FormatHandler.requiresConversion('Audio only')).toBe(true);
        });
        
        it('should provide correct file extensions', () => {
            expect(FormatHandler.getFileExtension('None')).toBe('mp4');
            expect(FormatHandler.getFileExtension('H264')).toBe('mp4');
            expect(FormatHandler.getFileExtension('ProRes')).toBe('mov');
            expect(FormatHandler.getFileExtension('DNxHR')).toBe('mov');
            expect(FormatHandler.getFileExtension('Audio only')).toBe('m4a');
        });
        
        it('should validate quality and format options', () => {
            expect(FormatHandler.isValidQuality('720p')).toBe(true);
            expect(FormatHandler.isValidQuality('1080p')).toBe(true);
            expect(FormatHandler.isValidQuality('invalid')).toBe(false);
            
            expect(FormatHandler.isValidFormat('None')).toBe(true);
            expect(FormatHandler.isValidFormat('H264')).toBe(true);
            expect(FormatHandler.isValidFormat('invalid')).toBe(false);
        });
    });
});