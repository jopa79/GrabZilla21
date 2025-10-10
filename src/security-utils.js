/**
 * Security utility functions for GrabZilla 2.1
 * Provides input validation and sanitization
 */

const path = require('path');
const fs = require('fs');
const { app } = require('electron');

/**
 * Sanitize and validate file system paths to prevent traversal attacks
 * @param {string} userPath - User-provided path to sanitize
 * @param {string} allowedBase - Base directory that path must be within (optional)
 * @returns {string} Sanitized absolute path
 * @throws {Error} If path is invalid or outside allowed directory
 */
function sanitizePath(userPath, allowedBase = null) {
  if (!userPath || typeof userPath !== 'string') {
    throw new Error('Invalid path: must be a non-empty string');
  }

  // Trim whitespace
  const trimmed = userPath.trim();
  if (trimmed.length === 0) {
    throw new Error('Invalid path: cannot be empty');
  }

  // Resolve to absolute path (eliminates ../ and ./)
  const resolved = path.resolve(trimmed);

  // Validate against allowed base directory if provided
  if (allowedBase) {
    const resolvedBase = path.resolve(allowedBase);
    if (!resolved.startsWith(resolvedBase)) {
      throw new Error(`Path traversal detected: ${resolved} is outside allowed directory ${resolvedBase}`);
    }
  }

  // Additional security: Ensure path is within user's home directory or app data
  const homeDir = app.getPath('home');
  const appData = app.getPath('userData');
  const downloads = app.getPath('downloads');

  const isInHome = resolved.startsWith(homeDir);
  const isInAppData = resolved.startsWith(appData);
  const isInDownloads = resolved.startsWith(downloads);

  if (!isInHome && !isInAppData && !isInDownloads) {
    throw new Error(`Path ${resolved} is outside allowed directories (home, appData, downloads)`);
  }

  // Remove potentially dangerous characters (for display purposes)
  // Note: File system operations use the resolved path, not this sanitized version
  return resolved;
}

/**
 * Validate and sanitize cookie file path
 * @param {string} cookieFilePath - Path to cookie file
 * @returns {string} Validated cookie file path
 * @throws {Error} If cookie file is invalid
 */
function validateCookieFile(cookieFilePath) {
  if (!cookieFilePath || typeof cookieFilePath !== 'string') {
    throw new Error('Invalid cookie file path');
  }

  // Sanitize the path first
  const sanitized = sanitizePath(cookieFilePath);

  // Check if file exists
  if (!fs.existsSync(sanitized)) {
    throw new Error(`Cookie file does not exist: ${sanitized}`);
  }

  // Check if it's a file (not a directory)
  const stats = fs.statSync(sanitized);
  if (!stats.isFile()) {
    throw new Error('Cookie path must point to a file, not a directory');
  }

  // Validate file extension (must be .txt or .cookies)
  const ext = path.extname(sanitized).toLowerCase();
  if (ext !== '.txt' && ext !== '.cookies') {
    throw new Error(`Invalid cookie file extension: ${ext}. Must be .txt or .cookies`);
  }

  // Validate file size (should not be empty, but also not unreasonably large)
  const MAX_COOKIE_FILE_SIZE = 1024 * 1024; // 1MB max
  if (stats.size === 0) {
    throw new Error('Cookie file is empty');
  }
  if (stats.size > MAX_COOKIE_FILE_SIZE) {
    throw new Error(`Cookie file too large: ${stats.size} bytes (max ${MAX_COOKIE_FILE_SIZE})`);
  }

  // Validate file content format (basic check for Netscape cookie format)
  try {
    const content = fs.readFileSync(sanitized, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));

    if (lines.length === 0) {
      throw new Error('Cookie file contains no valid cookie entries');
    }

    // Check first non-comment line has cookie format (tab-separated)
    const firstLine = lines[0];
    const parts = firstLine.split('\t');
    if (parts.length < 6) {
      throw new Error('Cookie file does not appear to be in Netscape format');
    }

    console.log(`Cookie file validated: ${lines.length} entries, ${stats.size} bytes`);
  } catch (error) {
    if (error.code === 'EACCES') {
      throw new Error('Cannot read cookie file: permission denied');
    }
    throw error;
  }

  return sanitized;
}

/**
 * Sanitize filename for safe file system operations
 * Removes or replaces characters that could cause issues
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'download';
  }

  return filename
    // Remove null bytes
    .replace(/\0/g, '')
    // Replace invalid characters with underscore
    .replace(/[<>:"|?*]/g, '_')
    // Replace path separators
    .replace(/[\/\\]/g, '_')
    // Remove leading/trailing dots and spaces
    .replace(/^[.\s]+|[.\s]+$/g, '')
    // Limit length (255 is typical filesystem limit)
    .slice(0, 255);
}

/**
 * Validate URL to ensure it's a valid video platform URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function isValidVideoUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);

    // Only allow http/https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    // Whitelist allowed domains
    const allowedDomains = [
      'youtube.com',
      'www.youtube.com',
      'youtu.be',
      'm.youtube.com',
      'vimeo.com',
      'www.vimeo.com',
      'player.vimeo.com'
    ];

    const hostname = parsed.hostname.toLowerCase();
    return allowedDomains.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch (error) {
    return false;
  }
}

/**
 * Validate and sanitize FFmpeg format parameter
 * Prevents command injection via format parameter
 * @param {string} format - Format string from user
 * @returns {string} Validated format
 * @throws {Error} If format is invalid
 */
function validateFFmpegFormat(format) {
  if (!format || typeof format !== 'string') {
    throw new Error('Invalid format parameter');
  }

  // Whitelist of allowed formats
  const allowedFormats = [
    'H264',
    'ProRes',
    'DNxHR',
    'Audio only',
    'None'
  ];

  const trimmed = format.trim();

  if (!allowedFormats.includes(trimmed)) {
    throw new Error(`Invalid format: ${trimmed}. Allowed formats: ${allowedFormats.join(', ')}`);
  }

  return trimmed;
}

/**
 * Validate and sanitize FFmpeg quality parameter
 * Prevents command injection via quality parameter
 * @param {string} quality - Quality string from user
 * @returns {string} Validated quality
 * @throws {Error} If quality is invalid
 */
function validateFFmpegQuality(quality) {
  if (!quality || typeof quality !== 'string') {
    throw new Error('Invalid quality parameter');
  }

  // Whitelist of allowed quality settings
  const allowedQualities = [
    '4K',
    '1440p',
    '1080p',
    '720p',
    '480p',
    '360p',
    'best',
    'worst'
  ];

  const trimmed = quality.trim();

  if (!allowedQualities.includes(trimmed)) {
    throw new Error(`Invalid quality: ${trimmed}. Allowed qualities: ${allowedQualities.join(', ')}`);
  }

  return trimmed;
}

/**
 * Validate FFmpeg output file extension
 * @param {string} format - Target format
 * @returns {string} Safe file extension
 */
function validateFFmpegExtension(format) {
  const extensionMap = {
    'H264': 'mp4',
    'ProRes': 'mov',
    'DNxHR': 'mov',
    'Audio only': 'm4a',
    'None': '' // No conversion
  };

  const ext = extensionMap[format];
  if (!ext && format !== 'None') {
    throw new Error(`Unknown format for extension mapping: ${format}`);
  }

  return ext;
}

module.exports = {
  sanitizePath,
  validateCookieFile,
  sanitizeFilename,
  isValidVideoUrl,
  validateFFmpegFormat,
  validateFFmpegQuality,
  validateFFmpegExtension
};
