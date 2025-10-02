/**
 * @fileoverview Simple URL Validation Tests
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

import { describe, it, expect } from 'vitest';

// Simple URL validation functions for testing
const URLValidationUtils = {
    isYouTubeUrl(url) {
        if (!url) return false;
        return /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)[\w\-_]{11}/.test(url);
    },
    
    isVimeoUrl(url) {
        if (!url) return false;
        return /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)\d+/.test(url);
    },
    
    isYouTubePlaylist(url) {
        if (!url) return false;
        return /youtube\.com\/playlist\?list=[\w\-_]+/.test(url);
    },
    
    isValidVideoUrl(url) {
        if (!url || typeof url !== 'string') return false;
        const trimmed = url.trim();
        if (!trimmed) return false;
        
        return this.isYouTubeUrl(trimmed) || this.isVimeoUrl(trimmed) || this.isYouTubePlaylist(trimmed);
    },
    
    normalizeUrl(url) {
        if (!url || typeof url !== 'string') return url;
        let normalized = url.trim();
        
        // Add protocol if missing
        if (!/^https?:\/\//.test(normalized)) {
            normalized = 'https://' + normalized;
        }
        
        // Add www. for YouTube if missing
        if (/^https?:\/\/youtube\.com/.test(normalized)) {
            normalized = normalized.replace('://youtube.com', '://www.youtube.com');
        }
        
        return normalized;
    },
    
    validateMultipleUrls(text) {
        if (!text || typeof text !== 'string') {
            return { valid: [], invalid: [] };
        }
        
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        const valid = [];
        const invalid = [];
        
        lines.forEach(line => {
            const normalized = this.normalizeUrl(line);
            if (this.isValidVideoUrl(normalized)) {
                valid.push(normalized);
            } else {
                invalid.push(line);
            }
        });
        
        // Remove duplicates
        return { 
            valid: [...new Set(valid)], 
            invalid: [...new Set(invalid)] 
        };
    },
    
    getValidationError(url) {
        if (url === null || url === undefined) return 'URL is required';
        if (typeof url !== 'string') return 'URL is required';
        if (url === '') return 'URL cannot be empty';
        if (!url.trim()) return 'URL cannot be empty';
        if (!url.includes('.')) return 'Invalid URL format - must include domain';
        if (!this.isValidVideoUrl(url)) return 'Unsupported video platform - currently supports YouTube and Vimeo';
        return null;
    }
};

describe('URL Validation Utils', () => {
    describe('YouTube URL Validation', () => {
        it('should validate standard YouTube URLs', () => {
            const validUrls = [
                'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'https://youtube.com/watch?v=dQw4w9WgXcQ',
                'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'www.youtube.com/watch?v=dQw4w9WgXcQ',
                'youtube.com/watch?v=dQw4w9WgXcQ'
            ];
            
            validUrls.forEach(url => {
                const normalized = URLValidationUtils.normalizeUrl(url);
                expect(URLValidationUtils.isValidVideoUrl(normalized)).toBe(true);
                expect(URLValidationUtils.isYouTubeUrl(normalized)).toBe(true);
            });
        });
        
        it('should validate YouTube short URLs', () => {
            const validUrls = [
                'https://youtu.be/dQw4w9WgXcQ',
                'http://youtu.be/dQw4w9WgXcQ',
                'youtu.be/dQw4w9WgXcQ'
            ];
            
            validUrls.forEach(url => {
                const normalized = URLValidationUtils.normalizeUrl(url);
                expect(URLValidationUtils.isValidVideoUrl(normalized)).toBe(true);
                expect(URLValidationUtils.isYouTubeUrl(normalized)).toBe(true);
            });
        });
        
        it('should validate YouTube playlist URLs', () => {
            const validUrls = [
                'https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8HmPME',
                'https://youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8HmPME',
                'www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8HmPME'
            ];
            
            validUrls.forEach(url => {
                const normalized = URLValidationUtils.normalizeUrl(url);
                expect(URLValidationUtils.isValidVideoUrl(normalized)).toBe(true);
                expect(URLValidationUtils.isYouTubePlaylist(normalized)).toBe(true);
            });
        });
    });
    
    describe('Vimeo URL Validation', () => {
        it('should validate standard Vimeo URLs', () => {
            const validUrls = [
                'https://vimeo.com/123456789',
                'http://vimeo.com/123456789',
                'www.vimeo.com/123456789',
                'vimeo.com/123456789'
            ];
            
            validUrls.forEach(url => {
                const normalized = URLValidationUtils.normalizeUrl(url);
                expect(URLValidationUtils.isValidVideoUrl(normalized)).toBe(true);
                expect(URLValidationUtils.isVimeoUrl(normalized)).toBe(true);
            });
        });
        
        it('should validate Vimeo player URLs', () => {
            const validUrls = [
                'https://player.vimeo.com/video/123456789',
                'http://player.vimeo.com/video/123456789',
                'player.vimeo.com/video/123456789'
            ];
            
            validUrls.forEach(url => {
                const normalized = URLValidationUtils.normalizeUrl(url);
                expect(URLValidationUtils.isValidVideoUrl(normalized)).toBe(true);
                expect(URLValidationUtils.isVimeoUrl(normalized)).toBe(true);
            });
        });
    });
    
    describe('Invalid URL Handling', () => {
        it('should reject invalid URLs', () => {
            const invalidUrls = [
                '',
                null,
                undefined,
                'not a url',
                'https://google.com',
                'https://facebook.com/video',
                'https://tiktok.com/@user/video/123',
                'https://instagram.com/p/abc123'
            ];
            
            invalidUrls.forEach(url => {
                expect(URLValidationUtils.isValidVideoUrl(url)).toBe(false);
            });
        });
        
        it('should provide detailed validation errors', () => {
            const testCases = [
                { url: '', expectedError: 'URL cannot be empty' },
                { url: null, expectedError: 'URL is required' },
                { url: 'not a url', expectedError: 'Invalid URL format - must include domain' },
                { url: 'https://tiktok.com/@user/video/123', expectedError: 'Unsupported video platform - currently supports YouTube and Vimeo' },
                { url: 'https://google.com', expectedError: 'Unsupported video platform - currently supports YouTube and Vimeo' }
            ];
            
            testCases.forEach(({ url, expectedError }) => {
                const error = URLValidationUtils.getValidationError(url);
                expect(error).toBe(expectedError);
            });
        });
    });
    
    describe('Text Processing', () => {
        it('should extract multiple URLs from text', () => {
            const text = `
                Here are some videos:
                https://www.youtube.com/watch?v=dQw4w9WgXcQ
                https://vimeo.com/123456789
                
                And another one:
                youtu.be/dQw4w9WgXcQ
                
                This is not a video URL: https://google.com
            `;
            
            const result = URLValidationUtils.validateMultipleUrls(text);
            expect(result.valid).toHaveLength(3);
            expect(result.valid).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(result.valid).toContain('https://vimeo.com/123456789');
            expect(result.valid).toContain('https://youtu.be/dQw4w9WgXcQ');
        });
        
        it('should handle mixed content and normalize URLs', () => {
            const text = `
                youtube.com/watch?v=dQw4w9WgXcQ
                www.vimeo.com/987654321
                https://youtu.be/dQw4w9WgXcQ
            `;
            
            const result = URLValidationUtils.validateMultipleUrls(text);
            expect(result.valid.length).toBeGreaterThan(0);
            result.valid.forEach(url => {
                expect(url).toMatch(/^https:\/\//);
                expect(URLValidationUtils.isValidVideoUrl(url)).toBe(true);
            });
        });
        
        it('should remove duplicate URLs', () => {
            const text = `
                https://www.youtube.com/watch?v=dQw4w9WgXcQ
                https://www.youtube.com/watch?v=dQw4w9WgXcQ
                youtube.com/watch?v=dQw4w9WgXcQ
            `;
            
            const result = URLValidationUtils.validateMultipleUrls(text);
            // Should normalize and deduplicate
            expect(result.valid).toHaveLength(1);
            expect(result.valid[0]).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        });
    });
    
    describe('URL Normalization', () => {
        it('should add https protocol to URLs without protocol', () => {
            const testCases = [
                { input: 'youtube.com/watch?v=dQw4w9WgXcQ', expected: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
                { input: 'www.vimeo.com/123456', expected: 'https://www.vimeo.com/123456' },
                { input: 'https://youtu.be/dQw4w9WgXcQ', expected: 'https://youtu.be/dQw4w9WgXcQ' }
            ];
            
            testCases.forEach(({ input, expected }) => {
                const normalized = URLValidationUtils.normalizeUrl(input);
                expect(normalized).toMatch(/^https:\/\//);
                // Check that it's a valid video URL after normalization
                expect(URLValidationUtils.isValidVideoUrl(normalized)).toBe(true);
            });
        });
    });
});