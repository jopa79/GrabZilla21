/**
 * @fileoverview GPU Hardware Acceleration Detection
 * @author GrabZilla Development Team
 * @version 2.1.0
 */

const { execSync } = require('child_process')
const os = require('os')
const path = require('path')

/**
 * GPU Detector
 * Detects available hardware acceleration for video encoding
 */
class GPUDetector {
  constructor() {
    this.platform = os.platform()
    this.arch = os.arch()
    this.capabilities = null
  }

  /**
   * Get path to ffmpeg binary
   * @returns {string} Path to ffmpeg
   * @private
   */
  getFfmpegPath() {
    const ext = process.platform === 'win32' ? '.exe' : ''
    return path.join(__dirname, '../../binaries', `ffmpeg${ext}`)
  }

  /**
   * Detect available GPU hardware acceleration
   * @returns {Promise<Object>} GPU capabilities
   */
  async detect() {
    // Return cached result if available
    if (this.capabilities) {
      return this.capabilities
    }

    const capabilities = {
      hasGPU: false,
      type: null,
      encoders: [],
      decoders: [],
      supported: false,
      platform: this.platform,
      arch: this.arch
    }

    try {
      const ffmpegPath = this.getFfmpegPath()

      // Get available encoders
      const encodersOutput = execSync(`"${ffmpegPath}" -hide_banner -encoders 2>&1`, {
        encoding: 'utf8',
        timeout: 10000,
        maxBuffer: 1024 * 1024 // 1MB buffer
      })

      // Get available hardware accelerations
      const hwaccelsOutput = execSync(`"${ffmpegPath}" -hide_banner -hwaccels 2>&1`, {
        encoding: 'utf8',
        timeout: 10000,
        maxBuffer: 1024 * 1024
      })

      // Detect platform-specific hardware acceleration
      if (this.platform === 'darwin') {
        // macOS - VideoToolbox
        if (encodersOutput.includes('h264_videotoolbox')) {
          capabilities.type = 'videotoolbox'
          capabilities.hasGPU = true
          capabilities.encoders = this.parseEncoders(encodersOutput, ['videotoolbox'])
          capabilities.decoders = ['h264', 'hevc', 'mpeg4']
          capabilities.description = 'Apple VideoToolbox (Hardware Accelerated)'
        }
      } else if (this.platform === 'win32') {
        // Windows - Check NVENC, AMF, QSV in priority order

        // NVIDIA NVENC
        if (encodersOutput.includes('h264_nvenc') && hwaccelsOutput.includes('cuda')) {
          capabilities.type = 'nvenc'
          capabilities.hasGPU = true
          capabilities.encoders = this.parseEncoders(encodersOutput, ['nvenc'])
          capabilities.decoders = ['h264', 'hevc', 'mpeg2', 'mpeg4', 'vc1', 'vp8', 'vp9']
          capabilities.description = 'NVIDIA NVENC (Hardware Accelerated)'
        }
        // AMD AMF
        else if (encodersOutput.includes('h264_amf')) {
          capabilities.type = 'amf'
          capabilities.hasGPU = true
          capabilities.encoders = this.parseEncoders(encodersOutput, ['amf'])
          capabilities.decoders = ['h264', 'hevc', 'mpeg2', 'mpeg4']
          capabilities.description = 'AMD AMF (Hardware Accelerated)'
        }
        // Intel QSV
        else if (encodersOutput.includes('h264_qsv') && hwaccelsOutput.includes('qsv')) {
          capabilities.type = 'qsv'
          capabilities.hasGPU = true
          capabilities.encoders = this.parseEncoders(encodersOutput, ['qsv'])
          capabilities.decoders = ['h264', 'hevc', 'mpeg2', 'mpeg4', 'vp8', 'vp9']
          capabilities.description = 'Intel Quick Sync (Hardware Accelerated)'
        }
      } else {
        // Linux - Check for VAAPI, NVENC
        if (encodersOutput.includes('h264_vaapi') && hwaccelsOutput.includes('vaapi')) {
          capabilities.type = 'vaapi'
          capabilities.hasGPU = true
          capabilities.encoders = this.parseEncoders(encodersOutput, ['vaapi'])
          capabilities.decoders = ['h264', 'hevc', 'mpeg2', 'mpeg4', 'vp8', 'vp9']
          capabilities.description = 'VA-API (Hardware Accelerated)'
        } else if (encodersOutput.includes('h264_nvenc') && hwaccelsOutput.includes('cuda')) {
          capabilities.type = 'nvenc'
          capabilities.hasGPU = true
          capabilities.encoders = this.parseEncoders(encodersOutput, ['nvenc'])
          capabilities.decoders = ['h264', 'hevc', 'mpeg2', 'mpeg4', 'vc1', 'vp8', 'vp9']
          capabilities.description = 'NVIDIA NVENC (Hardware Accelerated)'
        }
      }

      capabilities.supported = capabilities.hasGPU

      // Log detection results
      if (capabilities.hasGPU) {
        console.log(`🎮 GPU Acceleration: ${capabilities.description}`)
        console.log(`   Encoders: ${capabilities.encoders.join(', ')}`)
        console.log(`   Platform: ${this.platform} (${this.arch})`)
      } else {
        console.log(`⚠️  No GPU acceleration available - using software encoding`)
      }

    } catch (error) {
      console.warn('GPU detection failed:', error.message)
      capabilities.error = error.message
    }

    // Cache the result
    this.capabilities = capabilities
    return capabilities
  }

  /**
   * Parse encoder list for specific hardware type
   * @param {string} encodersOutput - Output from ffmpeg -encoders
   * @param {Array<string>} keywords - Keywords to filter (e.g., ['nvenc', 'videotoolbox'])
   * @returns {Array<string>} List of available encoders
   * @private
   */
  parseEncoders(encodersOutput, keywords) {
    const encoders = []
    const lines = encodersOutput.split('\n')

    for (const line of lines) {
      // Skip header lines
      if (line.trim().startsWith('--') || line.trim().length === 0) continue

      // Check if line contains any of the keywords
      const matchesKeyword = keywords.some(keyword =>
        line.toLowerCase().includes(keyword.toLowerCase())
      )

      if (matchesKeyword) {
        // Extract encoder name (format: " V..... h264_videotoolbox       ...")
        const match = line.match(/^\s*[VA\.]+\s+(\S+)\s/)
        if (match) {
          encoders.push(match[1])
        }
      }
    }

    return encoders
  }

  /**
   * Get recommended encoder for H.264
   * @returns {string} Encoder name
   */
  getH264Encoder() {
    if (!this.capabilities || !this.capabilities.hasGPU) {
      return 'libx264' // Software fallback
    }

    const h264Encoders = this.capabilities.encoders.filter(e =>
      e.includes('h264') || e.includes('264')
    )

    return h264Encoders.length > 0 ? h264Encoders[0] : 'libx264'
  }

  /**
   * Get recommended encoder for HEVC/H.265
   * @returns {string} Encoder name
   */
  getHEVCEncoder() {
    if (!this.capabilities || !this.capabilities.hasGPU) {
      return 'libx265' // Software fallback
    }

    const hevcEncoders = this.capabilities.encoders.filter(e =>
      e.includes('hevc') || e.includes('265')
    )

    return hevcEncoders.length > 0 ? hevcEncoders[0] : 'libx265'
  }

  /**
   * Check if GPU is available
   * @returns {boolean} True if GPU hardware acceleration is available
   */
  isAvailable() {
    return this.capabilities && this.capabilities.hasGPU
  }

  /**
   * Get GPU type
   * @returns {string|null} GPU type (videotoolbox, nvenc, amf, qsv, vaapi) or null
   */
  getType() {
    return this.capabilities ? this.capabilities.type : null
  }

  /**
   * Reset cached capabilities (for testing)
   */
  reset() {
    this.capabilities = null
  }
}

// Export singleton instance
module.exports = new GPUDetector()
