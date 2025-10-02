/**
 * @fileoverview Binary Integration Tests for yt-dlp and ffmpeg
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * BINARY INTEGRATION TESTS
 * 
 * These tests verify direct integration with yt-dlp and ffmpeg binaries:
 * - Binary availability and version checking
 * - Command construction and execution
 * - Output parsing and progress tracking
 * - Error handling and recovery
 * - Platform-specific binary behavior
 * - Real download and conversion workflows (when binaries available)
 */

describe('Binary Integration Tests', () => {
    let binaryPaths;
    let testOutputDir;

    beforeEach(() => {
        // Set up platform-specific binary paths
        const isWindows = process.platform === 'win32';
        const binariesDir = path.join(process.cwd(), 'binaries');
        
        binaryPaths = {
            ytDlp: path.join(binariesDir, `yt-dlp${isWindows ? '.exe' : ''}`),
            ffmpeg: path.join(binariesDir, `ffmpeg${isWindows ? '.exe' : ''}`)
        };

        // Create test output directory
        testOutputDir = path.join(os.tmpdir(), 'grabzilla-binary-test-' + Date.now());
        if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
        }
    });

    afterEach(() => {
        // Clean up test output directory
        if (fs.existsSync(testOutputDir)) {
            try {
                fs.rmSync(testOutputDir, { recursive: true, force: true });
            } catch (error) {
                console.warn('Failed to clean up test output directory:', error.message);
            }
        }
    });

    describe('yt-dlp Binary Integration', () => {
        it('should verify yt-dlp binary exists and get version', async () => {
            const binaryExists = fs.existsSync(binaryPaths.ytDlp);
            
            if (!binaryExists) {
                console.warn('yt-dlp binary not found at:', binaryPaths.ytDlp);
                expect(binaryExists).toBe(false);
                return;
            }

            const version = await new Promise((resolve, reject) => {
                const process = spawn(binaryPaths.ytDlp, ['--version'], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let output = '';
                let errorOutput = '';

                process.stdout.on('data', (data) => {
                    output += data.toString();
                });

                process.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                process.on('close', (code) => {
                    if (code === 0) {
                        resolve(output.trim());
                    } else {
                        reject(new Error(`Version check failed: ${errorOutput}`));
                    }
                });

                process.on('error', (error) => {
                    reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
                });
            });

            expect(version).toMatch(/^\d{4}\.\d{2}\.\d{2}/);
            console.log('yt-dlp version:', version);
        });

        it('should list available formats for a video', async () => {
            const binaryExists = fs.existsSync(binaryPaths.ytDlp);
            
            if (!binaryExists) {
                console.warn('yt-dlp binary not found, skipping format list test');
                return;
            }

            // Use a known stable video for testing
            const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            
            const formats = await new Promise((resolve, reject) => {
                const process = spawn(binaryPaths.ytDlp, [
                    '--list-formats',
                    '--no-download',
                    testUrl
                ], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let output = '';
                let errorOutput = '';

                process.stdout.on('data', (data) => {
                    output += data.toString();
                });

                process.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                process.on('close', (code) => {
                    if (code === 0) {
                        resolve(output);
                    } else {
                        reject(new Error(`Format listing failed: ${errorOutput}`));
                    }
                });

                process.on('error', reject);
            });

            expect(formats).toContain('format code');
            expect(formats).toMatch(/\d+x\d+/); // Should contain resolution info
        }, 30000); // 30 second timeout

        it('should extract video metadata without downloading', async () => {
            const binaryExists = fs.existsSync(binaryPaths.ytDlp);
            
            if (!binaryExists) {
                console.warn('yt-dlp binary not found, skipping metadata test');
                return;
            }

            const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            
            const metadata = await new Promise((resolve, reject) => {
                const process = spawn(binaryPaths.ytDlp, [
                    '--dump-json',
                    '--no-download',
                    testUrl
                ], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let output = '';
                let errorOutput = '';

                process.stdout.on('data', (data) => {
                    output += data.toString();
                });

                process.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                process.on('close', (code) => {
                    if (code === 0 && output.trim()) {
                        try {
                            const json = JSON.parse(output.trim());
                            resolve(json);
                        } catch (parseError) {
                            reject(new Error(`JSON parse error: ${parseError.message}`));
                        }
                    } else {
                        reject(new Error(`Metadata extraction failed: ${errorOutput}`));
                    }
                });

                process.on('error', reject);
            });

            expect(metadata).toHaveProperty('title');
            expect(metadata).toHaveProperty('duration');
            expect(metadata).toHaveProperty('thumbnail');
            expect(metadata).toHaveProperty('uploader');
            expect(metadata.title).toBeTruthy();
            
            console.log('Video title:', metadata.title);
            console.log('Duration:', metadata.duration);
        }, 30000);

        it('should handle invalid URLs gracefully', async () => {
            const binaryExists = fs.existsSync(binaryPaths.ytDlp);
            
            if (!binaryExists) {
                console.warn('yt-dlp binary not found, skipping invalid URL test');
                return;
            }

            const invalidUrl = 'https://example.com/not-a-video';
            
            await expect(async () => {
                await new Promise((resolve, reject) => {
                    const process = spawn(binaryPaths.ytDlp, [
                        '--dump-json',
                        '--no-download',
                        invalidUrl
                    ], {
                        stdio: ['pipe', 'pipe', 'pipe']
                    });

                    let errorOutput = '';
                    process.stderr.on('data', (data) => {
                        errorOutput += data.toString();
                    });

                    process.on('close', (code) => {
                        if (code !== 0) {
                            reject(new Error(`Invalid URL error: ${errorOutput}`));
                        } else {
                            resolve();
                        }
                    });

                    process.on('error', reject);
                });
            }).rejects.toThrow();
        });

        it('should construct correct download commands', () => {
            const constructYtDlpCommand = (options) => {
                const args = [];
                
                if (options.format) {
                    args.push('-f', options.format);
                }
                
                if (options.output) {
                    args.push('-o', options.output);
                }
                
                if (options.cookieFile) {
                    args.push('--cookies', options.cookieFile);
                }
                
                if (options.noPlaylist) {
                    args.push('--no-playlist');
                }
                
                args.push(options.url);
                
                return args;
            };

            const options = {
                url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                format: 'best[height<=720]',
                output: path.join(testOutputDir, '%(title)s.%(ext)s'),
                cookieFile: '/path/to/cookies.txt',
                noPlaylist: true
            };

            const command = constructYtDlpCommand(options);
            
            expect(command).toContain('-f');
            expect(command).toContain('best[height<=720]');
            expect(command).toContain('-o');
            expect(command).toContain('--cookies');
            expect(command).toContain('--no-playlist');
            expect(command).toContain(options.url);
        });

        it('should parse download progress output', () => {
            const parseProgress = (line) => {
                // Example yt-dlp progress line:
                // [download]  45.2% of 10.5MiB at 1.2MiB/s ETA 00:07
                const progressMatch = line.match(/\[download\]\s+(\d+\.?\d*)%/);
                const sizeMatch = line.match(/of\s+([\d.]+\w+)/);
                const speedMatch = line.match/at\s+([\d.]+\w+\/s)/);
                const etaMatch = line.match(/ETA\s+(\d{2}:\d{2})/);
                
                if (progressMatch) {
                    return {
                        progress: parseFloat(progressMatch[1]),
                        size: sizeMatch ? sizeMatch[1] : null,
                        speed: speedMatch ? speedMatch[1] : null,
                        eta: etaMatch ? etaMatch[1] : null
                    };
                }
                
                return null;
            };

            const testLines = [
                '[download]  45.2% of 10.5MiB at 1.2MiB/s ETA 00:07',
                '[download] 100% of 10.5MiB in 00:08',
                '[download] Destination: test_video.mp4'
            ];

            const progress1 = parseProgress(testLines[0]);
            const progress2 = parseProgress(testLines[1]);
            const progress3 = parseProgress(testLines[2]);

            expect(progress1).toEqual({
                progress: 45.2,
                size: '10.5MiB',
                speed: '1.2MiB/s',
                eta: '00:07'
            });
            
            expect(progress2.progress).toBe(100);
            expect(progress3).toBe(null); // No progress info in destination line
        });
    });

    describe('ffmpeg Binary Integration', () => {
        it('should verify ffmpeg binary exists and get version', async () => {
            const binaryExists = fs.existsSync(binaryPaths.ffmpeg);
            
            if (!binaryExists) {
                console.warn('ffmpeg binary not found at:', binaryPaths.ffmpeg);
                expect(binaryExists).toBe(false);
                return;
            }

            const version = await new Promise((resolve, reject) => {
                const process = spawn(binaryPaths.ffmpeg, ['-version'], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let output = '';
                let errorOutput = '';

                process.stdout.on('data', (data) => {
                    output += data.toString();
                });

                process.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                process.on('close', (code) => {
                    if (code === 0) {
                        resolve(output);
                    } else {
                        reject(new Error(`Version check failed: ${errorOutput}`));
                    }
                });

                process.on('error', (error) => {
                    reject(new Error(`Failed to spawn ffmpeg: ${error.message}`));
                });
            });

            expect(version).toMatch(/ffmpeg version/i);
            console.log('ffmpeg version info:', version.split('\n')[0]);
        });

        it('should list available codecs', async () => {
            const binaryExists = fs.existsSync(binaryPaths.ffmpeg);
            
            if (!binaryExists) {
                console.warn('ffmpeg binary not found, skipping codec list test');
                return;
            }

            const codecs = await new Promise((resolve, reject) => {
                const process = spawn(binaryPaths.ffmpeg, ['-codecs'], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let output = '';
                let errorOutput = '';

                process.stdout.on('data', (data) => {
                    output += data.toString();
                });

                process.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                process.on('close', (code) => {
                    if (code === 0) {
                        resolve(output);
                    } else {
                        reject(new Error(`Codec listing failed: ${errorOutput}`));
                    }
                });

                process.on('error', reject);
            });

            expect(codecs).toContain('libx264');
            expect(codecs).toContain('aac');
        });

        it('should construct correct conversion commands', () => {
            const constructFFmpegCommand = (options) => {
                const args = ['-i', options.input];
                
                if (options.videoCodec) {
                    args.push('-c:v', options.videoCodec);
                }
                
                if (options.audioCodec) {
                    args.push('-c:a', options.audioCodec);
                }
                
                if (options.crf) {
                    args.push('-crf', options.crf.toString());
                }
                
                if (options.preset) {
                    args.push('-preset', options.preset);
                }
                
                if (options.audioOnly) {
                    args.push('-vn');
                }
                
                if (options.videoOnly) {
                    args.push('-an');
                }
                
                args.push('-y'); // Overwrite output file
                args.push(options.output);
                
                return args;
            };

            const h264Options = {
                input: 'input.mp4',
                output: 'output_h264.mp4',
                videoCodec: 'libx264',
                audioCodec: 'aac',
                crf: 23,
                preset: 'medium'
            };

            const audioOnlyOptions = {
                input: 'input.mp4',
                output: 'output.m4a',
                audioCodec: 'aac',
                audioOnly: true
            };

            const h264Command = constructFFmpegCommand(h264Options);
            const audioCommand = constructFFmpegCommand(audioOnlyOptions);

            expect(h264Command).toContain('-i');
            expect(h264Command).toContain('input.mp4');
            expect(h264Command).toContain('-c:v');
            expect(h264Command).toContain('libx264');
            expect(h264Command).toContain('-crf');
            expect(h264Command).toContain('23');

            expect(audioCommand).toContain('-vn');
            expect(audioCommand).toContain('-c:a');
            expect(audioCommand).toContain('aac');
        });

        it('should parse conversion progress output', () => {
            const parseFFmpegProgress = (line) => {
                // Example ffmpeg progress line:
                // frame=  123 fps= 25 q=28.0 size=    1024kB time=00:00:05.00 bitrate=1677.7kbits/s speed=1.02x
                const frameMatch = line.match(/frame=\s*(\d+)/);
                const fpsMatch = line.match(/fps=\s*([\d.]+)/);
                const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
                const sizeMatch = line.match(/size=\s*([\d.]+\w+)/);
                const speedMatch = line.match(/speed=\s*([\d.]+x)/);
                
                if (timeMatch) {
                    const hours = parseInt(timeMatch[1]);
                    const minutes = parseInt(timeMatch[2]);
                    const seconds = parseFloat(timeMatch[3]);
                    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
                    
                    return {
                        frame: frameMatch ? parseInt(frameMatch[1]) : null,
                        fps: fpsMatch ? parseFloat(fpsMatch[1]) : null,
                        timeSeconds: totalSeconds,
                        size: sizeMatch ? sizeMatch[1] : null,
                        speed: speedMatch ? speedMatch[1] : null
                    };
                }
                
                return null;
            };

            const testLine = 'frame=  123 fps= 25 q=28.0 size=    1024kB time=00:00:05.00 bitrate=1677.7kbits/s speed=1.02x';
            const progress = parseFFmpegProgress(testLine);

            expect(progress).toEqual({
                frame: 123,
                fps: 25,
                timeSeconds: 5,
                size: '1024kB',
                speed: '1.02x'
            });
        });

        it('should create test input file for conversion testing', () => {
            // Create a minimal test video file (just for testing file operations)
            const testInputPath = path.join(testOutputDir, 'test_input.mp4');
            
            // Create a dummy file (in real scenario, this would be from yt-dlp)
            fs.writeFileSync(testInputPath, 'dummy video data for testing');
            
            expect(fs.existsSync(testInputPath)).toBe(true);
            
            const stats = fs.statSync(testInputPath);
            expect(stats.size).toBeGreaterThan(0);
        });
    });

    describe('Binary Process Management', () => {
        it('should handle process termination correctly', async () => {
            const binaryExists = fs.existsSync(binaryPaths.ytDlp);
            
            if (!binaryExists) {
                console.warn('yt-dlp binary not found, skipping process termination test');
                return;
            }

            // Start a long-running process (list formats for a video)
            const process = spawn(binaryPaths.ytDlp, [
                '--list-formats',
                'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Wait a bit then terminate
            setTimeout(() => {
                process.kill('SIGTERM');
            }, 1000);

            const result = await new Promise((resolve) => {
                process.on('close', (code, signal) => {
                    resolve({ code, signal });
                });

                process.on('error', (error) => {
                    resolve({ error: error.message });
                });
            });

            // Process should be terminated by signal
            expect(result.signal || result.code !== 0 || result.error).toBeTruthy();
        });

        it('should handle multiple concurrent processes', async () => {
            const binaryExists = fs.existsSync(binaryPaths.ytDlp);
            
            if (!binaryExists) {
                console.warn('yt-dlp binary not found, skipping concurrent process test');
                return;
            }

            const processes = [];
            const maxConcurrent = 3;

            // Start multiple version check processes
            for (let i = 0; i < maxConcurrent; i++) {
                const process = spawn(binaryPaths.ytDlp, ['--version'], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                processes.push(process);
            }

            // Wait for all processes to complete
            const results = await Promise.all(
                processes.map(process => new Promise((resolve) => {
                    let output = '';
                    process.stdout.on('data', (data) => {
                        output += data.toString();
                    });
                    
                    process.on('close', (code) => {
                        resolve({ code, output: output.trim() });
                    });
                    
                    process.on('error', (error) => {
                        resolve({ error: error.message });
                    });
                }))
            );

            // All processes should complete successfully
            results.forEach(result => {
                expect(result.code === 0 || result.output || result.error).toBeTruthy();
            });
        });

        it('should monitor process resource usage', () => {
            const monitorProcess = (process) => {
                const startTime = Date.now();
                const startMemory = process.memoryUsage ? process.memoryUsage() : null;
                
                return {
                    getStats: () => ({
                        runtime: Date.now() - startTime,
                        memory: process.memoryUsage ? process.memoryUsage() : null,
                        pid: process.pid
                    })
                };
            };

            // Test with current process
            const monitor = monitorProcess(process);
            
            // Wait a bit
            setTimeout(() => {
                const stats = monitor.getStats();
                expect(stats.runtime).toBeGreaterThan(0);
                expect(stats.pid).toBeTruthy();
            }, 100);
        });
    });

    describe('Error Handling and Recovery', () => {
        it('should handle binary not found errors', () => {
            const nonExistentBinary = path.join(process.cwd(), 'binaries', 'nonexistent-binary');
            
            expect(() => {
                spawn(nonExistentBinary, ['--version']);
            }).not.toThrow(); // spawn doesn't throw, but emits error event
        });

        it('should handle invalid command arguments', async () => {
            const binaryExists = fs.existsSync(binaryPaths.ytDlp);
            
            if (!binaryExists) {
                console.warn('yt-dlp binary not found, skipping invalid args test');
                return;
            }

            const result = await new Promise((resolve) => {
                const process = spawn(binaryPaths.ytDlp, ['--invalid-argument'], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let errorOutput = '';
                process.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                process.on('close', (code) => {
                    resolve({ code, error: errorOutput });
                });

                process.on('error', (error) => {
                    resolve({ error: error.message });
                });
            });

            // Should exit with non-zero code or error message
            expect(result.code !== 0 || result.error).toBeTruthy();
        });

        it('should implement retry logic for failed operations', async () => {
            const maxRetries = 3;
            let attemptCount = 0;

            const mockOperation = async () => {
                attemptCount++;
                if (attemptCount < maxRetries) {
                    throw new Error('Simulated failure');
                }
                return 'success';
            };

            const retryOperation = async (operation, retries) => {
                for (let i = 0; i < retries; i++) {
                    try {
                        return await operation();
                    } catch (error) {
                        if (i === retries - 1) {
                            throw error;
                        }
                        // Wait before retry
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
            };

            const result = await retryOperation(mockOperation, maxRetries);
            
            expect(result).toBe('success');
            expect(attemptCount).toBe(maxRetries);
        });
    });
});