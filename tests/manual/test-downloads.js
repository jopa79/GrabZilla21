#!/usr/bin/env node
/**
 * Automated Download Test Script
 * Tests various download scenarios programmatically
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

// Test configuration
const TEST_URLS = {
  short: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Me at the zoo (0:19)
  medium: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Astley (3:33)
  long: 'https://www.youtube.com/watch?v=_OBlgSz8sSM', // Big Buck Bunny (9:56)
  playlist: 'https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
  shorts: 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
  vimeo: 'https://vimeo.com/148751763'
}

const TEST_OUTPUT_DIR = path.join(os.tmpdir(), 'grabzilla-test-downloads')

class DownloadTester {
  constructor() {
    this.results = []
    this.testStartTime = Date.now()
  }

  /**
   * Setup test environment
   */
  async setup() {
    console.log('🔧 Setting up test environment...\n')

    // Create test output directory
    if (!fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true })
      console.log(`✅ Created test directory: ${TEST_OUTPUT_DIR}`)
    } else {
      console.log(`✅ Using existing test directory: ${TEST_OUTPUT_DIR}`)
    }

    // Check binaries exist
    const binariesPath = path.join(__dirname, '../../binaries')
    const ytdlp = path.join(binariesPath, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')
    const ffmpeg = path.join(binariesPath, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')

    if (!fs.existsSync(ytdlp)) {
      throw new Error('❌ yt-dlp binary not found. Run: npm run setup')
    }
    if (!fs.existsSync(ffmpeg)) {
      throw new Error('❌ ffmpeg binary not found. Run: npm run setup')
    }

    console.log('✅ Binaries found\n')
  }

  /**
   * Run a single download test
   */
  async runDownloadTest(testName, url, options = {}) {
    console.log(`\n📥 Running test: ${testName}`)
    console.log(`   URL: ${url}`)
    console.log(`   Options: ${JSON.stringify(options)}`)

    const startTime = Date.now()
    const result = {
      name: testName,
      url,
      options,
      startTime,
      status: 'running'
    }

    try {
      // Simulate download by getting video info
      const info = await this.getVideoInfo(url)

      const duration = Date.now() - startTime
      result.duration = duration
      result.status = 'passed'
      result.videoInfo = info

      console.log(`✅ Test passed in ${(duration / 1000).toFixed(2)}s`)
      console.log(`   Title: ${info.title}`)
      console.log(`   Duration: ${info.duration}`)

    } catch (error) {
      const duration = Date.now() - startTime
      result.duration = duration
      result.status = 'failed'
      result.error = error.message

      console.log(`❌ Test failed in ${(duration / 1000).toFixed(2)}s`)
      console.log(`   Error: ${error.message}`)
    }

    this.results.push(result)
    return result
  }

  /**
   * Get video info using yt-dlp
   */
  async getVideoInfo(url) {
    return new Promise((resolve, reject) => {
      const ytdlpPath = path.join(
        __dirname,
        '../../binaries',
        process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
      )

      const args = ['--dump-json', '--no-warnings', url]
      const childProcess = spawn(ytdlpPath, args)

      let stdout = ''
      let stderr = ''

      childProcess.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      childProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(stdout)
            resolve({
              title: info.title || 'Unknown',
              duration: info.duration ? this.formatDuration(info.duration) : 'Unknown',
              format: info.format || 'Unknown',
              filesize: info.filesize ? this.formatFilesize(info.filesize) : 'Unknown'
            })
          } catch (error) {
            reject(new Error('Failed to parse video info'))
          }
        } else {
          reject(new Error(stderr || 'Failed to get video info'))
        }
      })

      process.on('error', (error) => {
        reject(error)
      })
    })
  }

  /**
   * Format duration in seconds to MM:SS
   */
  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Format filesize in bytes to human readable
   */
  formatFilesize(bytes) {
    if (!bytes) return 'Unknown'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  /**
   * Test single video download
   */
  async testSingleDownload() {
    console.log('\n' + '='.repeat(60))
    console.log('TEST SUITE: Single Video Downloads')
    console.log('='.repeat(60))

    await this.runDownloadTest('Short video', TEST_URLS.short)
    await this.runDownloadTest('Medium video', TEST_URLS.medium)
    await this.runDownloadTest('Long video', TEST_URLS.long)
  }

  /**
   * Test playlist
   */
  async testPlaylist() {
    console.log('\n' + '='.repeat(60))
    console.log('TEST SUITE: Playlist Downloads')
    console.log('='.repeat(60))

    await this.runDownloadTest('Small playlist', TEST_URLS.playlist)
  }

  /**
   * Test Shorts
   */
  async testShorts() {
    console.log('\n' + '='.repeat(60))
    console.log('TEST SUITE: YouTube Shorts')
    console.log('='.repeat(60))

    await this.runDownloadTest('Shorts URL', TEST_URLS.shorts)
  }

  /**
   * Test Vimeo
   */
  async testVimeo() {
    console.log('\n' + '='.repeat(60))
    console.log('TEST SUITE: Vimeo Support')
    console.log('='.repeat(60))

    await this.runDownloadTest('Vimeo video', TEST_URLS.vimeo)
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('\n' + '='.repeat(60))
    console.log('TEST SUITE: Error Handling')
    console.log('='.repeat(60))

    await this.runDownloadTest(
      'Invalid URL',
      'https://www.youtube.com/watch?v=invalid123'
    )

    await this.runDownloadTest(
      'Malformed URL',
      'not-a-url'
    )
  }

  /**
   * Generate test report
   */
  generateReport() {
    const totalDuration = Date.now() - this.testStartTime

    console.log('\n' + '='.repeat(60))
    console.log('TEST REPORT')
    console.log('='.repeat(60))

    const passed = this.results.filter(r => r.status === 'passed').length
    const failed = this.results.filter(r => r.status === 'failed').length
    const total = this.results.length

    console.log(`\n📊 Summary:`)
    console.log(`   Total tests: ${total}`)
    console.log(`   Passed: ${passed} ✅`)
    console.log(`   Failed: ${failed} ${failed > 0 ? '❌' : ''}`)
    console.log(`   Success rate: ${((passed / total) * 100).toFixed(1)}%`)
    console.log(`   Total time: ${(totalDuration / 1000).toFixed(2)}s`)

    console.log(`\n📝 Detailed Results:`)
    this.results.forEach((result, index) => {
      const icon = result.status === 'passed' ? '✅' : '❌'
      console.log(`   ${index + 1}. ${icon} ${result.name} (${(result.duration / 1000).toFixed(2)}s)`)
      if (result.status === 'failed') {
        console.log(`      Error: ${result.error}`)
      }
    })

    // Save report to file
    const reportPath = path.join(__dirname, 'test-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2))
    console.log(`\n💾 Full report saved to: ${reportPath}`)

    return {
      passed,
      failed,
      total,
      duration: totalDuration
    }
  }

  /**
   * Cleanup test environment
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up...')
    // Note: Not deleting test directory to allow manual inspection
    console.log(`   Test files preserved in: ${TEST_OUTPUT_DIR}`)
  }
}

/**
 * Main test execution
 */
async function main() {
  console.log('🚀 GrabZilla Download Test Suite')
  console.log('================================\n')

  const tester = new DownloadTester()

  try {
    // Setup
    await tester.setup()

    // Run test suites
    await tester.testSingleDownload()
    await tester.testPlaylist()
    await tester.testShorts()
    await tester.testVimeo()
    await tester.testErrorHandling()

    // Generate report
    const summary = tester.generateReport()

    // Cleanup
    await tester.cleanup()

    // Exit with appropriate code
    process.exit(summary.failed > 0 ? 1 : 0)

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

module.exports = DownloadTester
