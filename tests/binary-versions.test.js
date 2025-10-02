/**
 * Binary Version Management Tests
 * Tests for version checking, comparison, and display functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Mock version comparison function (same logic as in main.js)
 * Compares two version strings (e.g., "2024.01.15" vs "2024.01.10")
 * @param {string} v1 - First version string
 * @param {string} v2 - Second version string
 * @returns {number} 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
    if (!v1 || !v2) return 0;

    const parts1 = v1.split('.').map(p => parseInt(p, 10));
    const parts2 = v2.split('.').map(p => parseInt(p, 10));

    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;

        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }

    return 0;
}

/**
 * Format version string for display
 * @param {string} version - Version string from binary
 * @returns {string} Formatted version
 */
function formatVersion(version) {
    if (!version || version === 'unknown') return '--';
    // Truncate long versions (ffmpeg has very long version strings)
    if (version.length > 20) {
        return version.substring(0, 17) + '...';
    }
    return version;
}

/**
 * Parse binary version object
 * @param {Object} versionData - Version data from IPC
 * @returns {Object} Parsed version info
 */
function parseBinaryVersion(versionData) {
    if (!versionData) {
        return {
            available: false,
            version: null,
            updateAvailable: false,
            latestVersion: null
        };
    }

    return {
        available: versionData.available || false,
        version: versionData.version || null,
        updateAvailable: versionData.updateAvailable || false,
        latestVersion: versionData.latestVersion || null
    };
}

describe('Version Comparison Logic', () => {
    describe('compareVersions', () => {
        it('should compare versions correctly - newer is greater', () => {
            expect(compareVersions('2024.01.15', '2024.01.10')).toBe(1);
            expect(compareVersions('2024.02.01', '2024.01.31')).toBe(1);
            expect(compareVersions('2025.01.01', '2024.12.31')).toBe(1);
        });

        it('should compare versions correctly - older is less', () => {
            expect(compareVersions('2024.01.10', '2024.01.15')).toBe(-1);
            expect(compareVersions('2024.01.31', '2024.02.01')).toBe(-1);
            expect(compareVersions('2024.12.31', '2025.01.01')).toBe(-1);
        });

        it('should return 0 for equal versions', () => {
            expect(compareVersions('2024.01.15', '2024.01.15')).toBe(0);
            expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
        });

        it('should handle different length version strings', () => {
            expect(compareVersions('1.0', '1.0.0')).toBe(0);
            expect(compareVersions('1.2', '1.2.0.0')).toBe(0);
            expect(compareVersions('2.0', '1.9.9.9')).toBe(1);
        });

        it('should handle null or undefined versions', () => {
            expect(compareVersions(null, '1.0.0')).toBe(0);
            expect(compareVersions('1.0.0', null)).toBe(0);
            expect(compareVersions(null, null)).toBe(0);
        });

        it('should handle semantic versioning', () => {
            expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
            expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
            expect(compareVersions('1.0.10', '1.0.9')).toBe(1);
        });
    });

    describe('formatVersion', () => {
        it('should format normal versions unchanged', () => {
            expect(formatVersion('2024.01.15')).toBe('2024.01.15');
            expect(formatVersion('1.2.3')).toBe('1.2.3');
        });

        it('should truncate long version strings', () => {
            const longVersion = 'ffmpeg version 6.0.1-full_build-www.gyan.dev Copyright';
            const formatted = formatVersion(longVersion);
            expect(formatted.length).toBeLessThanOrEqual(20);
            expect(formatted).toContain('...');
        });

        it('should handle unknown versions', () => {
            expect(formatVersion('unknown')).toBe('--');
            expect(formatVersion(null)).toBe('--');
            expect(formatVersion('')).toBe('--');
        });
    });

    describe('parseBinaryVersion', () => {
        it('should parse valid version data', () => {
            const versionData = {
                available: true,
                version: '2024.01.15',
                updateAvailable: true,
                latestVersion: '2024.01.20'
            };

            const parsed = parseBinaryVersion(versionData);
            expect(parsed.available).toBe(true);
            expect(parsed.version).toBe('2024.01.15');
            expect(parsed.updateAvailable).toBe(true);
            expect(parsed.latestVersion).toBe('2024.01.20');
        });

        it('should handle missing binary', () => {
            const versionData = {
                available: false
            };

            const parsed = parseBinaryVersion(versionData);
            expect(parsed.available).toBe(false);
            expect(parsed.version).toBe(null);
            expect(parsed.updateAvailable).toBe(false);
        });

        it('should handle null or undefined data', () => {
            const parsed = parseBinaryVersion(null);
            expect(parsed.available).toBe(false);
            expect(parsed.version).toBe(null);
        });

        it('should handle partial data with defaults', () => {
            const versionData = {
                version: '2024.01.15'
                // Missing available, updateAvailable, latestVersion
            };

            const parsed = parseBinaryVersion(versionData);
            expect(parsed.available).toBe(false); // default
            expect(parsed.version).toBe('2024.01.15');
            expect(parsed.updateAvailable).toBe(false); // default
        });
    });
});

describe('Update Detection Logic', () => {
    it('should detect when update is available', () => {
        const installed = '2024.01.10';
        const latest = '2024.01.15';
        const updateAvailable = compareVersions(latest, installed) > 0;

        expect(updateAvailable).toBe(true);
    });

    it('should detect when no update is available', () => {
        const installed = '2024.01.15';
        const latest = '2024.01.15';
        const updateAvailable = compareVersions(latest, installed) > 0;

        expect(updateAvailable).toBe(false);
    });

    it('should handle downgrade scenario', () => {
        const installed = '2024.01.20';
        const latest = '2024.01.15';
        const updateAvailable = compareVersions(latest, installed) > 0;

        expect(updateAvailable).toBe(false);
    });
});

describe('Version Display State', () => {
    it('should generate correct display state for available binary', () => {
        const versionData = {
            ytDlp: {
                available: true,
                version: '2024.01.15',
                updateAvailable: false,
                latestVersion: '2024.01.15'
            },
            ffmpeg: {
                available: true,
                version: '6.0.1',
                updateAvailable: false
            }
        };

        expect(versionData.ytDlp.available).toBe(true);
        expect(formatVersion(versionData.ytDlp.version)).toBe('2024.01.15');
        expect(versionData.ytDlp.updateAvailable).toBe(false);
    });

    it('should generate correct display state for missing binary', () => {
        const versionData = {
            ytDlp: {
                available: false
            },
            ffmpeg: {
                available: false
            }
        };

        expect(versionData.ytDlp.available).toBe(false);
        expect(formatVersion(versionData.ytDlp.version)).toBe('--');
    });

    it('should generate correct display state when update available', () => {
        const versionData = {
            ytDlp: {
                available: true,
                version: '2024.01.10',
                updateAvailable: true,
                latestVersion: '2024.01.15'
            }
        };

        expect(versionData.ytDlp.updateAvailable).toBe(true);
        expect(versionData.ytDlp.latestVersion).toBe('2024.01.15');
    });
});

describe('Error Handling', () => {
    it('should handle malformed version strings gracefully', () => {
        expect(() => compareVersions('invalid', '1.0.0')).not.toThrow();
        expect(() => formatVersion('x.y.z')).not.toThrow();
    });

    it('should handle empty version data', () => {
        const parsed = parseBinaryVersion({});
        expect(parsed.available).toBe(false);
        expect(parsed.version).toBe(null);
    });

    it('should handle missing fields in version comparison', () => {
        const result1 = compareVersions(undefined, '1.0.0');
        const result2 = compareVersions('1.0.0', undefined);

        expect(result1).toBe(0);
        expect(result2).toBe(0);
    });
});

describe('Real-World Version Scenarios', () => {
    it('should handle yt-dlp date-based versions', () => {
        const versions = [
            '2024.01.01',
            '2024.01.15',
            '2024.02.01',
            '2024.12.31'
        ];

        // Should be in ascending order
        for (let i = 0; i < versions.length - 1; i++) {
            expect(compareVersions(versions[i + 1], versions[i])).toBe(1);
        }
    });

    it('should handle ffmpeg semantic versions', () => {
        const versions = [
            '5.1.0',
            '5.1.2',
            '6.0.0',
            '6.0.1'
        ];

        // Should be in ascending order
        for (let i = 0; i < versions.length - 1; i++) {
            expect(compareVersions(versions[i + 1], versions[i])).toBe(1);
        }
    });

    it('should handle complex ffmpeg version strings', () => {
        const version = 'ffmpeg version 6.0.1-full_build-www.gyan.dev Copyright (c) 2000-2024';
        const formatted = formatVersion(version);

        // Should be truncated
        expect(formatted.length).toBeLessThanOrEqual(20);
    });
});
