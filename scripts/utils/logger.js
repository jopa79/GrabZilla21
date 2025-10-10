/**
 * Production-safe logging utility for GrabZilla renderer process
 *
 * Note: This is the renderer-side logger. It uses window.ENV to detect production mode.
 * Most logs are disabled in production to protect user privacy and reduce console noise.
 */

// Determine if running in production (renderer process)
const isProduction = window?.ENV?.NODE_ENV === 'production' || window?.ENV?.ELECTRON_IS_PACKAGED === 'true'

// Log levels
const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
}

// Current log level (DEBUG disabled in production)
const currentLevel = isProduction ? LogLevel.INFO : LogLevel.DEBUG

/**
 * Sanitize file path to show only filename
 */
function sanitizeFilePath(filePath) {
  if (!filePath || typeof filePath !== 'string') return '[invalid-path]'
  try {
    const parts = filePath.split(/[\/\\]/)
    return parts[parts.length - 1]
  } catch {
    return '[path-error]'
  }
}

/**
 * Sanitize URL to remove query parameters
 */
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '[invalid-url]'
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`
  } catch {
    return '[sanitized]'
  }
}

/**
 * Sanitize object by removing/redacting sensitive fields
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj

  const sanitized = Array.isArray(obj) ? [] : {}

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()

    // Redact sensitive fields
    if (lowerKey.includes('cookie') || lowerKey.includes('auth') || lowerKey.includes('token') || lowerKey.includes('key')) {
      sanitized[key] = '[REDACTED]'
    }
    // Sanitize file paths
    else if (lowerKey.includes('path') && typeof value === 'string') {
      sanitized[key] = sanitizeFilePath(value)
    }
    // Sanitize URLs
    else if (lowerKey.includes('url') && typeof value === 'string') {
      sanitized[key] = sanitizeUrl(value)
    }
    // Recursively sanitize nested objects
    else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value)
    }
    else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Format log message with timestamp and level
 */
function formatMessage(level, ...args) {
  const timestamp = new Date().toISOString()
  const levelStr = ['ERROR', 'WARN', 'INFO', 'DEBUG'][level]
  const prefix = `[${timestamp}] [${levelStr}]`

  // Sanitize arguments
  const sanitizedArgs = args.map(arg => {
    if (typeof arg === 'string') {
      // Check if string looks like a URL
      if (arg.startsWith('http://') || arg.startsWith('https://')) {
        return sanitizeUrl(arg)
      }
      // Check if string looks like a file path
      if (arg.includes('/') || arg.includes('\\')) {
        return sanitizeFilePath(arg)
      }
      return arg
    }
    if (typeof arg === 'object') {
      return sanitizeObject(arg)
    }
    return arg
  })

  return [prefix, ...sanitizedArgs]
}

/**
 * Log error message (always shown)
 */
function error(...args) {
  if (currentLevel >= LogLevel.ERROR) {
    console.error(...formatMessage(LogLevel.ERROR, ...args))
  }
}

/**
 * Log warning message (shown in production and development)
 */
function warn(...args) {
  if (currentLevel >= LogLevel.WARN) {
    console.warn(...formatMessage(LogLevel.WARN, ...args))
  }
}

/**
 * Log info message (shown in production and development)
 */
function info(...args) {
  if (currentLevel >= LogLevel.INFO) {
    console.log(...formatMessage(LogLevel.INFO, ...args))
  }
}

/**
 * Log debug message (development only)
 */
function debug(...args) {
  if (currentLevel >= LogLevel.DEBUG) {
    console.log(...formatMessage(LogLevel.DEBUG, ...args))
  }
}

/**
 * Legacy console.log replacement - maps to debug level
 */
function log(...args) {
  debug('[LEGACY]', ...args)
}

export {
  error,
  warn,
  info,
  debug,
  log,
  sanitizeFilePath,
  sanitizeUrl,
  sanitizeObject,
  isProduction,
  currentLevel,
  LogLevel
}
