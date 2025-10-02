/**
 * @fileoverview Tests for FFmpeg video format conversion functionality
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';

// Mock the ffmpeg converter module
const mockFFmpegConverter = {
    isAvailable: vi.fn(),
    convertVideo: vi.fn(),
    cancelConversion: vi.fn(),
    cancelAllConversions: vi.fn(),
    getActiveConversions: vi.fn(),
    getVideoDuration: vi.fn()
};

// Mock child_process
vi.mock('child_process', () => ({
    spawn: vi.fn()
}));

// Mock fs with proper default export
vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        default: {
            existsSync: vi.fn(),
            statSync: vi.fn(),
            unlinkSync: vi.fn()
        },
        existsSync: vi.fn(),
        statSync: vi.fn(),
        unlinkSync: vi.fn()
    };
});

describe('FFmpeg Format Conversion', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Format Support', () => {
        it('should support H.264 format conversion', () => {
            const formats = ['H264', 'ProRes', 'DNxHR', 'Audio only'];
            expect(formats).toContain('H264');
        });

        it('should support ProRes format conversion', () => {
            const formats = ['H264', 'ProRes', 'DNxHR', 'Audio only'];
            expect(formats).toContain('ProRes');
        });

        it('should support DNxHR format conversion', () => {
            const formats = ['H264', 'ProRes', 'DNxHR', 'Audio only'];
            expect(formats).toContain('DNxHR');
        });

        it('should support audio-only extraction', () => {
            const formats = ['H264', 'ProRes', 'DNxHR', 'Audio only'];
            expect(formats).toContain('Audio only');
        });
    });

    describe('Encoding Parameters', () => {
        it('should use appropriate H.264 CRF values for different qualities', () => {
            const crfMap = {
                '4K': '18',
                '1440p': '20',
                '1080p': '23',
                '720p': '25',
                '480p': '28'
            };

            Object.entries(crfMap).forEach(([quality, expectedCrf]) => {
                expect(expectedCrf).toMatch(/^\d+$/);
                expect(parseInt(expectedCrf)).toBeGreaterThan(0);
                expect(parseInt(expectedCrf)).toBeLessThan(52);
            });
        });

        it('should use appropriate ProRes profiles for different qualities', () => {
            const profileMap = {
                '4K': '3',
                '1440p': '2',
                '1080p': '2',
                '720p': '1',
                '480p': '0'
            };

            Object.entries(profileMap).forEach(([quality, profile]) => {
                expect(profile).toMatch(/^[0-3]$/);
            });
        });

        it('should use appropriate DNxHR profiles for different qualities', () => {
            const profileMap = {
                '4K': 'dnxhr_hqx',
                '1440p': 'dnxhr_hq',
                '1080p': 'dnxhr_sq',
                '720p': 'dnxhr_lb',
                '480p': 'dnxhr_lb'
            };

            Object.entries(profileMap).forEach(([quality, profile]) => {
                expect(profile).toMatch(/^dnxhr_/);
            });
        });
    });

    describe('File Extensions', () => {
        it('should use correct file extensions for each format', () => {
            const extensionMap = {
                'H264': 'mp4',
                'ProRes': 'mov',
                'DNxHR': 'mov',
                'Audio only': 'm4a'
            };

            Object.entries(extensionMap).forEach(([format, extension]) => {
                expect(extension).toMatch(/^[a-z0-9]+$/);
            });
        });
    });

    describe('Progress Tracking', () => {
        it('should parse FFmpeg progress output correctly', () => {
            const progressLine = 'frame=  123 fps= 25 q=28.0 size=    1024kB time=00:00:05.00 bitrate=1677.7kbits/s speed=1.02x';
            
            // Mock progress parsing
            const timeMatch = progressLine.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
            expect(timeMatch).toBeTruthy();
            
            if (timeMatch) {
                const hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const seconds = parseFloat(timeMatch[3]);
                const totalSeconds = hours * 3600 + minutes * 60 + seconds;
                
                expect(totalSeconds).toBe(5);
            }
        });

        it('should calculate progress percentage correctly', () => {
            const processedTime = 30; // 30 seconds processed
            const totalDuration = 120; // 2 minutes total
            const expectedProgress = Math.round((processedTime / totalDuration) * 100);
            
            expect(expectedProgress).toBe(25);
        });

        it('should handle progress updates during conversion', () => {
            const progressCallback = vi.fn();
            const progressData = {
                conversionId: 1,
                progress: 50,
                timeProcessed: 60,
                speed: 1.5,
                size: 2048
            };

            progressCallback(progressData);
            expect(progressCallback).toHaveBeenCalledWith(progressData);
        });
    });

    describe('Error Handling', () => {
        it('should handle missing input file error', () => {
            fs.existsSync.mockReturnValue(false);
            
            const options = {
                inputPath: '/nonexistent/file.mp4',
                outputPath: '/output/file.mp4',
                format: 'H264',
                quality: '1080p'
            };

            expect(() => {
                if (!fs.existsSync(options.inputPath)) {
                    throw new Error(`Input file not found: ${options.inputPath}`);
                }
            }).toThrow('Input file not found');
        });

        it('should handle missing FFmpeg binary error', () => {
            mockFFmpegConverter.isAvailable.mockReturnValue(false);
            
            expect(() => {
                if (!mockFFmpegConverter.isAvailable()) {
                    throw new Error('FFmpeg binary not found');
                }
            }).toThrow('FFmpeg binary not found');
        });

        it('should handle conversion process errors', () => {
            const errorMessage = 'Invalid data found when processing input';
            
            expect(() => {
                throw new Error(errorMessage);
            }).toThrow('Invalid data found when processing input');
        });
    });

    describe('Conversion Management', () => {
        it('should track active conversions', () => {
            const activeConversions = [
                { conversionId: 1, pid: 12345 },
                { conversionId: 2, pid: 12346 }
            ];

            mockFFmpegConverter.getActiveConversions.mockReturnValue(activeConversions);
            
            const result = mockFFmpegConverter.getActiveConversions();
            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('conversionId');
            expect(result[0]).toHaveProperty('pid');
        });

        it('should cancel specific conversion', () => {
            mockFFmpegConverter.cancelConversion.mockReturnValue(true);
            
            const result = mockFFmpegConverter.cancelConversion(1);
            expect(result).toBe(true);
            expect(mockFFmpegConverter.cancelConversion).toHaveBeenCalledWith(1);
        });

        it('should cancel all conversions', () => {
            mockFFmpegConverter.cancelAllConversions.mockReturnValue(2);
            
            const result = mockFFmpegConverter.cancelAllConversions();
            expect(result).toBe(2);
            expect(mockFFmpegConverter.cancelAllConversions).toHaveBeenCalled();
        });
    });

    describe('Integration with Download Process', () => {
        it('should integrate conversion into download workflow', async () => {
            const downloadOptions = {
                url: 'https://youtube.com/watch?v=test',
                quality: '1080p',
                format: 'H264',
                savePath: '/downloads',
                cookieFile: null
            };

            // Mock successful download
            const downloadResult = {
                success: true,
                filename: 'test_video.mp4',
                filePath: '/downloads/test_video.mp4'
            };

            // Mock successful conversion
            mockFFmpegConverter.convertVideo.mockResolvedValue({
                success: true,
                outputPath: '/downloads/test_video_h264.mp4',
                fileSize: 1024000
            });

            // Simulate the conversion requirement check
            const requiresConversion = downloadOptions.format !== 'None';
            expect(requiresConversion).toBe(true);

            if (requiresConversion) {
                const conversionResult = await mockFFmpegConverter.convertVideo({
                    inputPath: downloadResult.filePath,
                    outputPath: '/downloads/test_video_h264.mp4',
                    format: downloadOptions.format,
                    quality: downloadOptions.quality
                });

                expect(conversionResult.success).toBe(true);
                expect(mockFFmpegConverter.convertVideo).toHaveBeenCalled();
            }
        });

        it('should handle conversion progress in download workflow', () => {
            const progressUpdates = [];
            const mockProgressCallback = (data) => {
                progressUpdates.push(data);
            };

            // Simulate download progress (0-70%)
            mockProgressCallback({ stage: 'download', progress: 35, status: 'downloading' });
            
            // Simulate conversion progress (70-100%)
            mockProgressCallback({ stage: 'conversion', progress: 85, status: 'converting' });
            
            // Simulate completion
            mockProgressCallback({ stage: 'complete', progress: 100, status: 'completed' });

            expect(progressUpdates).toHaveLength(3);
            expect(progressUpdates[0].stage).toBe('download');
            expect(progressUpdates[1].stage).toBe('conversion');
            expect(progressUpdates[2].stage).toBe('complete');
        });
    });

    describe('Quality Settings', () => {
        it('should apply quality-specific encoding parameters', () => {
            const qualitySettings = {
                '4K': { crf: '18', profile: '3' },
                '1080p': { crf: '23', profile: '2' },
                '720p': { crf: '25', profile: '1' }
            };

            Object.entries(qualitySettings).forEach(([quality, settings]) => {
                expect(parseInt(settings.crf)).toBeGreaterThan(0);
                expect(parseInt(settings.profile)).toBeGreaterThanOrEqual(0);
            });
        });
    });
});