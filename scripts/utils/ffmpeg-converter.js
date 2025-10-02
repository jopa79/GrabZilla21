/**
 * @fileoverview FFmpeg video format conversion utilities
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

/**
 * FFMPEG CONVERTER MODULE
 * 
 * Handles video format conversion using local ffmpeg binary
 * 
 * Features:
 * - H.264, ProRes, DNxHR format conversion
 * - Audio-only extraction functionality
 * - Conversion progress tracking and status updates
 * - Format-specific encoding parameters and quality settings
 * 
 * Dependencies:
 * - Local ffmpeg binary in binaries/ directory
 * - Node.js child_process for subprocess management
 * - Path utilities for file handling
 * 
 * Requirements: 3.2, 3.3, 4.1, 4.2
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const gpuDetector = require('./gpu-detector');

/**
 * FFmpeg Converter Class
 *
 * Manages video format conversion operations with progress tracking,
 * GPU hardware acceleration, and comprehensive error handling
 */
class FFmpegConverter {
    constructor() {
        this.activeConversions = new Map();
        this.conversionId = 0;
        this.gpuCapabilities = null;
        this.initGPU();
    }

    /**
     * Initialize GPU detection
     * @private
     */
    async initGPU() {
        try {
            this.gpuCapabilities = await gpuDetector.detect();
            console.log('✅ FFmpegConverter GPU initialized:', this.gpuCapabilities.type || 'Software only');
        } catch (error) {
            console.warn('⚠️  GPU initialization failed:', error.message);
        }
    }

    /**
     * Get path to ffmpeg binary based on platform
     * @returns {string} Path to ffmpeg executable
     * @private
     */
    getBinaryPath() {
        const binariesPath = path.join(__dirname, '../../binaries');
        const extension = process.platform === 'win32' ? '.exe' : '';
        return path.join(binariesPath, `ffmpeg${extension}`);
    }

    /**
     * Check if ffmpeg binary is available
     * @returns {boolean} True if ffmpeg binary exists
     */
    isAvailable() {
        const ffmpegPath = this.getBinaryPath();
        return fs.existsSync(ffmpegPath);
    }

    /**
     * Get FFmpeg encoding arguments for specific format
     * @param {string} format - Target format (H264, ProRes, DNxHR, Audio only)
     * @param {string} quality - Video quality setting
     * @param {boolean} useGPU - Whether to use GPU acceleration (default: true)
     * @returns {Array<string>} FFmpeg arguments array
     * @private
     */
    getEncodingArgs(format, quality, useGPU = true) {
        const args = [];

        switch (format) {
            case 'H264':
                // Try GPU encoding first if available and requested
                if (useGPU && this.gpuCapabilities?.hasGPU) {
                    args.push(...this.getGPUEncodingArgs(quality));
                } else {
                    // Software encoding fallback
                    args.push(
                        '-c:v', 'libx264',
                        '-preset', 'medium',
                        '-crf', this.getH264CRF(quality),
                        '-c:a', 'aac',
                        '-b:a', '128k'
                    );
                }
                break;

            case 'ProRes':
                args.push(
                    '-c:v', 'prores_ks',
                    '-profile:v', this.getProResProfile(quality),
                    '-c:a', 'pcm_s16le'
                );
                break;

            case 'DNxHR':
                args.push(
                    '-c:v', 'dnxhd',
                    '-profile:v', this.getDNxHRProfile(quality),
                    '-c:a', 'pcm_s16le'
                );
                break;

            case 'Audio only':
                args.push(
                    '-vn', // No video
                    '-c:a', 'aac',
                    '-b:a', '192k'
                );
                break;

            default:
                throw new Error(`Unsupported format: ${format}`);
        }

        return args;
    }

    /**
     * Get H.264 CRF value based on quality setting
     * @param {string} quality - Video quality (720p, 1080p, etc.)
     * @returns {string} CRF value for H.264 encoding
     * @private
     */
    getH264CRF(quality) {
        const crfMap = {
            '4K': '18',      // High quality for 4K
            '1440p': '20',   // High quality for 1440p
            '1080p': '23',   // Balanced quality for 1080p
            '720p': '25',    // Good quality for 720p
            '480p': '28'     // Acceptable quality for 480p
        };
        return crfMap[quality] || '23';
    }

    /**
     * Get GPU-accelerated encoding arguments
     * @param {string} quality - Video quality setting
     * @returns {Array<string>} GPU encoding arguments
     * @private
     */
    getGPUEncodingArgs(quality) {
        const args = [];
        const gpu = this.gpuCapabilities;

        if (!gpu || !gpu.hasGPU) {
            throw new Error('GPU not available');
        }

        switch (gpu.type) {
            case 'videotoolbox':
                // Apple VideoToolbox (macOS)
                args.push(
                    '-c:v', 'h264_videotoolbox',
                    '-b:v', this.getVideotoolboxBitrate(quality),
                    '-profile:v', 'high',
                    '-allow_sw', '1', // Allow software fallback if needed
                    '-c:a', 'aac',
                    '-b:a', '128k'
                );
                break;

            case 'nvenc':
                // NVIDIA NVENC
                args.push(
                    '-c:v', 'h264_nvenc',
                    '-preset', 'p4', // Quality preset (p1=fastest to p7=slowest)
                    '-cq', this.getNvencCQ(quality),
                    '-b:v', '0', // Use CQ mode (constant quality)
                    '-c:a', 'aac',
                    '-b:a', '128k'
                );
                break;

            case 'amf':
                // AMD AMF
                args.push(
                    '-c:v', 'h264_amf',
                    '-quality', this.getAMFQuality(quality),
                    '-rc', 'cqp', // Constant Quality mode
                    '-qp_i', this.getAMFQP(quality),
                    '-qp_p', this.getAMFQP(quality),
                    '-c:a', 'aac',
                    '-b:a', '128k'
                );
                break;

            case 'qsv':
                // Intel Quick Sync
                args.push(
                    '-c:v', 'h264_qsv',
                    '-preset', 'medium',
                    '-global_quality', this.getQSVQuality(quality),
                    '-c:a', 'aac',
                    '-b:a', '128k'
                );
                break;

            case 'vaapi':
                // VA-API (Linux)
                args.push(
                    '-vaapi_device', '/dev/dri/renderD128',
                    '-c:v', 'h264_vaapi',
                    '-qp', this.getVAAPIQP(quality),
                    '-c:a', 'aac',
                    '-b:a', '128k'
                );
                break;

            default:
                throw new Error(`Unsupported GPU type: ${gpu.type}`);
        }

        console.log(`🎮 Using ${gpu.type} GPU acceleration for encoding`);
        return args;
    }

    /**
     * Get VideoToolbox bitrate based on quality
     * @param {string} quality - Video quality
     * @returns {string} Bitrate string (e.g., '10M')
     * @private
     */
    getVideotoolboxBitrate(quality) {
        const bitrateMap = {
            '4320p': '80M',
            '2160p': '40M',
            '1440p': '20M',
            '1080p': '10M',
            '720p': '5M',
            '480p': '2.5M',
            '360p': '1M'
        };
        return bitrateMap[quality] || '5M';
    }

    /**
     * Get NVENC constant quality value
     * @param {string} quality - Video quality
     * @returns {string} CQ value (0-51, lower = better)
     * @private
     */
    getNvencCQ(quality) {
        const cqMap = {
            '4320p': '19',
            '2160p': '21',
            '1440p': '23',
            '1080p': '23',
            '720p': '25',
            '480p': '28',
            '360p': '30'
        };
        return cqMap[quality] || '23';
    }

    /**
     * Get AMF quality preset
     * @param {string} quality - Video quality
     * @returns {string} Quality preset
     * @private
     */
    getAMFQuality(quality) {
        // AMF quality presets: speed, balanced, quality
        return quality.includes('4') || quality.includes('2160') ? 'quality' : 'balanced';
    }

    /**
     * Get AMF quantization parameter
     * @param {string} quality - Video quality
     * @returns {string} QP value
     * @private
     */
    getAMFQP(quality) {
        const qpMap = {
            '4320p': '18',
            '2160p': '20',
            '1440p': '22',
            '1080p': '22',
            '720p': '24',
            '480p': '26',
            '360p': '28'
        };
        return qpMap[quality] || '22';
    }

    /**
     * Get QSV global quality value
     * @param {string} quality - Video quality
     * @returns {string} Quality value
     * @private
     */
    getQSVQuality(quality) {
        const qualityMap = {
            '4320p': '18',
            '2160p': '20',
            '1440p': '22',
            '1080p': '22',
            '720p': '24',
            '480p': '26',
            '360p': '28'
        };
        return qualityMap[quality] || '22';
    }

    /**
     * Get VA-API quantization parameter
     * @param {string} quality - Video quality
     * @returns {string} QP value
     * @private
     */
    getVAAPIQP(quality) {
        const qpMap = {
            '4320p': '18',
            '2160p': '20',
            '1440p': '22',
            '1080p': '22',
            '720p': '24',
            '480p': '26',
            '360p': '28'
        };
        return qpMap[quality] || '22';
    }

    /**
     * Get ProRes profile based on quality setting
     * @param {string} quality - Video quality
     * @returns {string} ProRes profile number
     * @private
     */
    getProResProfile(quality) {
        const profileMap = {
            '4K': '3',       // ProRes HQ for 4K
            '1440p': '2',    // ProRes Standard for 1440p
            '1080p': '2',    // ProRes Standard for 1080p
            '720p': '1',     // ProRes LT for 720p
            '480p': '0'      // ProRes Proxy for 480p
        };
        return profileMap[quality] || '2';
    }

    /**
     * Get DNxHR profile based on quality setting
     * @param {string} quality - Video quality
     * @returns {string} DNxHR profile
     * @private
     */
    getDNxHRProfile(quality) {
        const profileMap = {
            '4K': 'dnxhr_hqx',    // DNxHR HQX for 4K
            '1440p': 'dnxhr_hq',  // DNxHR HQ for 1440p
            '1080p': 'dnxhr_sq',  // DNxHR SQ for 1080p
            '720p': 'dnxhr_lb',   // DNxHR LB for 720p
            '480p': 'dnxhr_lb'    // DNxHR LB for 480p
        };
        return profileMap[quality] || 'dnxhr_sq';
    }

    /**
     * Get output file extension for format
     * @param {string} format - Target format
     * @returns {string} File extension
     * @private
     */
    getOutputExtension(format) {
        const extensionMap = {
            'H264': 'mp4',
            'ProRes': 'mov',
            'DNxHR': 'mov',
            'Audio only': 'm4a'
        };
        return extensionMap[format] || 'mp4';
    }

    /**
     * Parse FFmpeg progress output
     * @param {string} line - Progress line from FFmpeg stderr
     * @returns {Object|null} Parsed progress data or null
     * @private
     */
    parseProgress(line) {
        // FFmpeg progress format: frame=  123 fps= 25 q=28.0 size=    1024kB time=00:00:05.00 bitrate=1677.7kbits/s speed=1.02x
        const progressMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        const sizeMatch = line.match(/size=\s*(\d+)kB/);
        const speedMatch = line.match(/speed=\s*(\d+\.?\d*)x/);

        if (progressMatch) {
            const hours = parseInt(progressMatch[1]);
            const minutes = parseInt(progressMatch[2]);
            const seconds = parseFloat(progressMatch[3]);
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;

            return {
                timeProcessed: totalSeconds,
                size: sizeMatch ? parseInt(sizeMatch[1]) : null,
                speed: speedMatch ? parseFloat(speedMatch[1]) : null
            };
        }

        return null;
    }

    /**
     * Calculate conversion progress percentage
     * @param {number} processedTime - Time processed in seconds
     * @param {number} totalDuration - Total video duration in seconds
     * @returns {number} Progress percentage (0-100)
     * @private
     */
    calculateProgress(processedTime, totalDuration) {
        if (!totalDuration || totalDuration <= 0) {
            return 0;
        }
        return Math.min(100, Math.round((processedTime / totalDuration) * 100));
    }

    /**
     * Convert video file to specified format
     * @param {Object} options - Conversion options
     * @param {string} options.inputPath - Path to input video file
     * @param {string} options.outputPath - Path for output file
     * @param {string} options.format - Target format (H264, ProRes, DNxHR, Audio only)
     * @param {string} options.quality - Video quality setting
     * @param {number} [options.duration] - Video duration in seconds for progress calculation
     * @param {Function} [options.onProgress] - Progress callback function
     * @returns {Promise<Object>} Conversion result
     */
    async convertVideo(options) {
        const {
            inputPath,
            outputPath,
            format,
            quality,
            duration,
            onProgress
        } = options;

        // Validate inputs
        if (!inputPath || !outputPath || !format || !quality) {
            throw new Error('Missing required conversion parameters');
        }

        if (!fs.existsSync(inputPath)) {
            throw new Error(`Input file not found: ${inputPath}`);
        }

        if (!this.isAvailable()) {
            throw new Error('FFmpeg binary not found');
        }

        const conversionId = ++this.conversionId;
        const ffmpegPath = this.getBinaryPath();

        // Build FFmpeg command arguments
        const args = [
            '-i', inputPath,
            '-y', // Overwrite output file
            ...this.getEncodingArgs(format, quality),
            outputPath
        ];

        console.log(`Starting FFmpeg conversion ${conversionId}:`, {
            input: inputPath,
            output: outputPath,
            format,
            quality,
            args: args.join(' ')
        });

        return new Promise((resolve, reject) => {
            const ffmpegProcess = spawn(ffmpegPath, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: process.cwd()
            });

            // Store active conversion for potential cancellation
            this.activeConversions.set(conversionId, ffmpegProcess);

            let output = '';
            let errorOutput = '';
            let lastProgress = 0;

            // Handle stdout (usually minimal for FFmpeg)
            ffmpegProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            // Handle stderr (where FFmpeg sends progress and status)
            ffmpegProcess.stderr.on('data', (data) => {
                const chunk = data.toString();
                errorOutput += chunk;

                // Parse progress information
                const lines = chunk.split('\n');
                lines.forEach(line => {
                    const progress = this.parseProgress(line);
                    if (progress && duration && onProgress) {
                        const percentage = this.calculateProgress(progress.timeProcessed, duration);
                        
                        // Only emit progress updates when percentage changes
                        if (percentage !== lastProgress) {
                            lastProgress = percentage;
                            onProgress({
                                conversionId,
                                progress: percentage,
                                timeProcessed: progress.timeProcessed,
                                speed: progress.speed,
                                size: progress.size
                            });
                        }
                    }
                });
            });

            // Handle process completion
            ffmpegProcess.on('close', (code) => {
                this.activeConversions.delete(conversionId);

                console.log(`FFmpeg conversion ${conversionId} completed with code ${code}`);

                if (code === 0) {
                    // Verify output file was created
                    if (fs.existsSync(outputPath)) {
                        const stats = fs.statSync(outputPath);
                        resolve({
                            success: true,
                            outputPath,
                            fileSize: stats.size,
                            conversionId,
                            message: 'Conversion completed successfully'
                        });
                    } else {
                        reject(new Error('Conversion completed but output file not found'));
                    }
                } else {
                    // Parse error message for user-friendly feedback
                    let errorMessage = 'Conversion failed';

                    if (errorOutput.includes('Invalid data found')) {
                        errorMessage = 'Invalid or corrupted input file';
                    } else if (errorOutput.includes('No space left')) {
                        errorMessage = 'Insufficient disk space for conversion';
                    } else if (errorOutput.includes('Permission denied')) {
                        errorMessage = 'Permission denied - check file access rights';
                    } else if (errorOutput.includes('codec')) {
                        errorMessage = 'Unsupported codec or format combination';
                    } else if (errorOutput.trim()) {
                        // Extract the most relevant error line
                        const errorLines = errorOutput.trim().split('\n');
                        const relevantError = errorLines.find(line => 
                            line.includes('Error') || line.includes('failed')
                        );
                        if (relevantError && relevantError.length < 200) {
                            errorMessage = relevantError;
                        }
                    }

                    reject(new Error(errorMessage));
                }
            });

            // Handle process errors
            ffmpegProcess.on('error', (error) => {
                this.activeConversions.delete(conversionId);
                console.error(`FFmpeg process ${conversionId} error:`, error);
                reject(new Error(`Failed to start conversion process: ${error.message}`));
            });
        });
    }

    /**
     * Cancel active conversion
     * @param {number} conversionId - ID of conversion to cancel
     * @returns {boolean} True if conversion was cancelled
     */
    cancelConversion(conversionId) {
        const process = this.activeConversions.get(conversionId);
        if (process) {
            process.kill('SIGTERM');
            this.activeConversions.delete(conversionId);
            console.log(`Cancelled FFmpeg conversion ${conversionId}`);
            return true;
        }
        return false;
    }

    /**
     * Cancel all active conversions
     * @returns {number} Number of conversions cancelled
     */
    cancelAllConversions() {
        let cancelledCount = 0;
        for (const [conversionId, process] of this.activeConversions) {
            process.kill('SIGTERM');
            cancelledCount++;
        }
        this.activeConversions.clear();
        console.log(`Cancelled ${cancelledCount} active conversions`);
        return cancelledCount;
    }

    /**
     * Get information about active conversions
     * @returns {Array<Object>} Array of active conversion info
     */
    getActiveConversions() {
        return Array.from(this.activeConversions.keys()).map(id => ({
            conversionId: id,
            pid: this.activeConversions.get(id).pid
        }));
    }

    /**
     * Get video duration from file using FFprobe
     * @param {string} filePath - Path to video file
     * @returns {Promise<number>} Duration in seconds
     */
    async getVideoDuration(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const ffprobePath = this.getBinaryPath().replace('ffmpeg', 'ffprobe');
        if (!fs.existsSync(ffprobePath)) {
            console.warn('FFprobe not available, duration detection disabled');
            return null;
        }

        const args = [
            '-v', 'quiet',
            '-show_entries', 'format=duration',
            '-of', 'csv=p=0',
            filePath
        ];

        return new Promise((resolve, reject) => {
            const ffprobeProcess = spawn(ffprobePath, args, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            ffprobeProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            ffprobeProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            ffprobeProcess.on('close', (code) => {
                if (code === 0) {
                    const duration = parseFloat(output.trim());
                    resolve(isNaN(duration) ? null : duration);
                } else {
                    console.warn('Failed to get video duration:', errorOutput);
                    resolve(null); // Don't reject, just return null
                }
            });

            ffprobeProcess.on('error', (error) => {
                console.warn('FFprobe process error:', error);
                resolve(null); // Don't reject, just return null
            });
        });
    }
}

// Export singleton instance
const ffmpegConverter = new FFmpegConverter();

module.exports = ffmpegConverter;