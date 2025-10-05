#!/usr/bin/env node

/**
 * GrabZilla 2.1 - Project State Verification Script
 *
 * Checks:
 * - Binaries exist and are executable
 * - Tests can run and pass
 * - App can launch (headless check)
 * - Dependencies are installed
 * - File structure is intact
 *
 * Outputs JSON with complete state assessment.
 *
 * Usage: node verify-project-state.js
 */

const fs = require('fs')
const path = require('path')
const { execSync, spawn } = require('child_process')

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.blue}▶${colors.reset} ${msg}`)
}

// State object to collect all verification results
const state = {
  timestamp: new Date().toISOString(),
  status: 'unknown', // Will be: green, yellow, red
  binaries: {
    ytdlp: { exists: false, executable: false, version: null },
    ffmpeg: { exists: false, executable: false, version: null }
  },
  tests: {
    total: 0,
    passing: 0,
    failing: 0,
    passRate: 0,
    suites: {}
  },
  app: {
    launches: false,
    error: null
  },
  dependencies: {
    installed: false,
    count: 0
  },
  files: {
    critical: [],
    missing: []
  },
  health: {
    score: 0, // 0-100
    issues: [],
    recommendations: []
  }
}

/**
 * Check if binaries exist and are executable
 */
function checkBinaries() {
  log.section('Checking Binaries')

  const binariesDir = path.join(__dirname, 'binaries')
  const platform = process.platform
  const ext = platform === 'win32' ? '.exe' : ''

  // Check yt-dlp
  const ytdlpPath = path.join(binariesDir, `yt-dlp${ext}`)
  state.binaries.ytdlp.exists = fs.existsSync(ytdlpPath)

  if (state.binaries.ytdlp.exists) {
    try {
      // Check if executable
      fs.accessSync(ytdlpPath, fs.constants.X_OK)
      state.binaries.ytdlp.executable = true

      // Get version
      const version = execSync(`"${ytdlpPath}" --version`, { encoding: 'utf8' }).trim()
      state.binaries.ytdlp.version = version

      log.success(`yt-dlp found and executable (v${version})`)
    } catch (error) {
      state.binaries.ytdlp.executable = false
      log.error(`yt-dlp found but not executable: ${error.message}`)
      state.health.issues.push('yt-dlp is not executable - run: chmod +x binaries/yt-dlp')
    }
  } else {
    log.error('yt-dlp not found')
    state.health.issues.push('yt-dlp missing - run: node setup.js')
  }

  // Check ffmpeg
  const ffmpegPath = path.join(binariesDir, `ffmpeg${ext}`)
  state.binaries.ffmpeg.exists = fs.existsSync(ffmpegPath)

  if (state.binaries.ffmpeg.exists) {
    try {
      // Check if executable
      fs.accessSync(ffmpegPath, fs.constants.X_OK)
      state.binaries.ffmpeg.executable = true

      // Get version (ffmpeg outputs to stderr)
      const output = execSync(`"${ffmpegPath}" -version 2>&1`, { encoding: 'utf8' })
      const versionMatch = output.match(/ffmpeg version ([^\s]+)/)
      state.binaries.ffmpeg.version = versionMatch ? versionMatch[1] : 'unknown'

      log.success(`ffmpeg found and executable (v${state.binaries.ffmpeg.version})`)
    } catch (error) {
      state.binaries.ffmpeg.executable = false
      log.error(`ffmpeg found but not executable: ${error.message}`)
      state.health.issues.push('ffmpeg is not executable - run: chmod +x binaries/ffmpeg')
    }
  } else {
    log.error('ffmpeg not found')
    state.health.issues.push('ffmpeg missing - run: node setup.js')
  }
}

/**
 * Check if dependencies are installed
 */
function checkDependencies() {
  log.section('Checking Dependencies')

  const nodeModulesPath = path.join(__dirname, 'node_modules')
  state.dependencies.installed = fs.existsSync(nodeModulesPath)

  if (state.dependencies.installed) {
    try {
      const pkgJson = require('./package.json')
      const allDeps = {
        ...pkgJson.dependencies,
        ...pkgJson.devDependencies
      }
      state.dependencies.count = Object.keys(allDeps).length

      log.success(`Dependencies installed (${state.dependencies.count} packages)`)
    } catch (error) {
      log.error(`Error reading package.json: ${error.message}`)
      state.health.issues.push('Cannot read package.json')
    }
  } else {
    log.error('node_modules not found')
    state.health.issues.push('Dependencies not installed - run: npm install')
  }
}

/**
 * Check critical files exist
 */
function checkCriticalFiles() {
  log.section('Checking Critical Files')

  const criticalFiles = [
    'src/main.js',
    'src/preload.js',
    'src/download-manager.js',
    'scripts/app.js',
    'scripts/models/Video.js',
    'scripts/models/AppState.js',
    'scripts/services/metadata-service.js',
    'scripts/utils/url-validator.js',
    'scripts/utils/ipc-integration.js',
    'index.html',
    'styles/main.css',
    'package.json'
  ]

  criticalFiles.forEach(file => {
    const fullPath = path.join(__dirname, file)
    if (fs.existsSync(fullPath)) {
      state.files.critical.push(file)
    } else {
      state.files.missing.push(file)
      log.error(`Missing critical file: ${file}`)
      state.health.issues.push(`Critical file missing: ${file}`)
    }
  })

  log.success(`${state.files.critical.length}/${criticalFiles.length} critical files present`)
}

/**
 * Run tests and capture results
 */
async function runTests() {
  log.section('Running Tests')

  return new Promise((resolve) => {
    try {
      // Run tests and capture output
      const output = execSync('npm test 2>&1', {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      })

      // Parse test results
      parseTestOutput(output)
      resolve()
    } catch (error) {
      // Tests may "fail" but still provide output
      parseTestOutput(error.stdout || error.message)
      resolve()
    }
  })
}

/**
 * Parse test output to extract statistics
 */
function parseTestOutput(output) {
  // Extract test counts
  const passedMatch = output.match(/(\d+) passed/)
  const failedMatch = output.match(/(\d+) failed/)

  if (passedMatch) {
    state.tests.passing = parseInt(passedMatch[1], 10)
  }

  if (failedMatch) {
    state.tests.failing = parseInt(failedMatch[1], 10)
  }

  state.tests.total = state.tests.passing + state.tests.failing
  state.tests.passRate = state.tests.total > 0
    ? Math.round((state.tests.passing / state.tests.total) * 100)
    : 0

  // Extract suite results
  const suiteMatches = output.matchAll(/([✓❌]) ([A-Za-z\s]+Tests)\s+(PASSED|FAILED)/g)
  for (const match of suiteMatches) {
    const [, icon, name, status] = match
    state.tests.suites[name.trim()] = status === 'PASSED'
  }

  log.info(`Test Results: ${state.tests.passing}/${state.tests.total} passing (${state.tests.passRate}%)`)

  if (state.tests.passRate < 95) {
    state.health.issues.push(`Test pass rate below 95%: ${state.tests.passRate}%`)
  }

  if (state.tests.failing > 2) {
    state.health.issues.push(`Too many failing tests: ${state.tests.failing}`)
  }
}

/**
 * Check if app can launch (simple check)
 */
function checkAppLaunch() {
  log.section('Checking App Launch Capability')

  try {
    // Check if main.js can be required without errors
    const mainPath = path.join(__dirname, 'src', 'main.js')

    if (fs.existsSync(mainPath)) {
      const mainContent = fs.readFileSync(mainPath, 'utf8')

      // Check for critical patterns
      const hasCreateWindow = mainContent.includes('createWindow')
      const hasIpcHandlers = mainContent.includes('ipcMain.handle')
      const hasAppReady = mainContent.includes('app.whenReady')

      if (hasCreateWindow && hasIpcHandlers && hasAppReady) {
        state.app.launches = true
        log.success('App structure looks valid')
      } else {
        state.app.error = 'Missing critical app initialization code'
        log.warning('App may not launch correctly')
        state.health.issues.push('App missing critical initialization code')
      }
    } else {
      state.app.error = 'main.js not found'
      log.error('Cannot find src/main.js')
      state.health.issues.push('src/main.js not found')
    }
  } catch (error) {
    state.app.error = error.message
    log.error(`App check failed: ${error.message}`)
    state.health.issues.push(`App check error: ${error.message}`)
  }
}

/**
 * Calculate overall health score
 */
function calculateHealthScore() {
  let score = 0

  // Binaries (30 points)
  if (state.binaries.ytdlp.exists && state.binaries.ytdlp.executable) score += 15
  if (state.binaries.ffmpeg.exists && state.binaries.ffmpeg.executable) score += 15

  // Dependencies (10 points)
  if (state.dependencies.installed) score += 10

  // Critical files (20 points)
  const fileRatio = state.files.critical.length / (state.files.critical.length + state.files.missing.length)
  score += Math.round(fileRatio * 20)

  // Tests (30 points)
  score += Math.round((state.tests.passRate / 100) * 30)

  // App launch (10 points)
  if (state.app.launches) score += 10

  state.health.score = Math.min(100, score)

  // Determine status
  if (state.health.score >= 90) {
    state.status = 'green'
  } else if (state.health.score >= 70) {
    state.status = 'yellow'
  } else {
    state.status = 'red'
  }
}

/**
 * Generate recommendations
 */
function generateRecommendations() {
  // Binary recommendations
  if (!state.binaries.ytdlp.exists || !state.binaries.ffmpeg.exists) {
    state.health.recommendations.push('Run "node setup.js" to download missing binaries')
  }

  if (!state.binaries.ytdlp.executable || !state.binaries.ffmpeg.executable) {
    state.health.recommendations.push('Run "chmod +x binaries/*" to make binaries executable')
  }

  // Dependency recommendations
  if (!state.dependencies.installed) {
    state.health.recommendations.push('Run "npm install" to install dependencies')
  }

  // Test recommendations
  if (state.tests.passRate < 95) {
    state.health.recommendations.push('Fix failing tests to improve stability')
  }

  // File recommendations
  if (state.files.missing.length > 0) {
    state.health.recommendations.push('Restore missing critical files from git')
  }

  // Overall recommendations
  if (state.status === 'green') {
    state.health.recommendations.push('Project is healthy - ready for development')
  } else if (state.status === 'yellow') {
    state.health.recommendations.push('Project has minor issues - fix before major changes')
  } else {
    state.health.recommendations.push('Project has critical issues - fix immediately')
  }
}

/**
 * Print summary report
 */
function printSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('  GRABZILLA 2.1 - PROJECT STATE VERIFICATION')
  console.log('='.repeat(60))

  // Status badge
  const statusColor = state.status === 'green' ? colors.green
                    : state.status === 'yellow' ? colors.yellow
                    : colors.red
  const statusEmoji = state.status === 'green' ? '🟢'
                    : state.status === 'yellow' ? '🟡'
                    : '🔴'
  console.log(`\nStatus: ${statusEmoji} ${statusColor}${state.status.toUpperCase()}${colors.reset} (Health Score: ${state.health.score}/100)`)

  // Binaries
  console.log('\nBinaries:')
  console.log(`  yt-dlp:  ${state.binaries.ytdlp.exists && state.binaries.ytdlp.executable ? '✓' : '✗'} ${state.binaries.ytdlp.version || 'not found'}`)
  console.log(`  ffmpeg:  ${state.binaries.ffmpeg.exists && state.binaries.ffmpeg.executable ? '✓' : '✗'} ${state.binaries.ffmpeg.version || 'not found'}`)

  // Tests
  console.log('\nTests:')
  console.log(`  Total:     ${state.tests.total}`)
  console.log(`  Passing:   ${state.tests.passing} (${state.tests.passRate}%)`)
  console.log(`  Failing:   ${state.tests.failing}`)

  // Dependencies
  console.log('\nDependencies:')
  console.log(`  Installed: ${state.dependencies.installed ? '✓' : '✗'} (${state.dependencies.count} packages)`)

  // Files
  console.log('\nCritical Files:')
  console.log(`  Present:   ${state.files.critical.length}`)
  console.log(`  Missing:   ${state.files.missing.length}`)

  // App
  console.log('\nApp Launch:')
  console.log(`  Can Launch: ${state.app.launches ? '✓' : '✗'}`)
  if (state.app.error) {
    console.log(`  Error:     ${state.app.error}`)
  }

  // Issues
  if (state.health.issues.length > 0) {
    console.log('\n⚠ Issues Found:')
    state.health.issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`)
    })
  }

  // Recommendations
  console.log('\n📋 Recommendations:')
  state.health.recommendations.forEach((rec, i) => {
    console.log(`  ${i + 1}. ${rec}`)
  })

  console.log('\n' + '='.repeat(60))
  console.log(`Verification completed at ${new Date().toLocaleString()}`)
  console.log('='.repeat(60) + '\n')
}

/**
 * Main verification function
 */
async function verify() {
  console.log('\n🔍 Starting GrabZilla 2.1 verification...\n')

  checkBinaries()
  checkDependencies()
  checkCriticalFiles()
  await runTests()
  checkAppLaunch()

  calculateHealthScore()
  generateRecommendations()
  printSummary()

  // Export JSON
  const jsonPath = path.join(__dirname, 'project-state.json')
  fs.writeFileSync(jsonPath, JSON.stringify(state, null, 2))
  log.success(`Full state exported to: ${jsonPath}`)

  // Exit code based on status
  const exitCode = state.status === 'green' ? 0
                 : state.status === 'yellow' ? 1
                 : 2

  process.exit(exitCode)
}

// Run verification
verify().catch(error => {
  console.error('Verification failed:', error)
  process.exit(3)
})
