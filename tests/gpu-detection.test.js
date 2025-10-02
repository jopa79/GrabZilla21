/**
 * GPU Detection Tests
 * Tests for hardware acceleration detection
 */

import { describe, it, expect, beforeEach } from 'vitest'
import gpuDetector from '../scripts/utils/gpu-detector.js'

describe('GPU Detection', () => {
  beforeEach(() => {
    // Reset cached capabilities
    gpuDetector.reset()
  })

  describe('Detection', () => {
    it('should detect GPU capabilities', async () => {
      const capabilities = await gpuDetector.detect()

      expect(capabilities).toHaveProperty('hasGPU')
      expect(capabilities).toHaveProperty('type')
      expect(capabilities).toHaveProperty('encoders')
      expect(capabilities).toHaveProperty('decoders')
      expect(capabilities).toHaveProperty('supported')
      expect(capabilities).toHaveProperty('platform')
      expect(capabilities).toHaveProperty('arch')
    })

    it('should cache detection results', async () => {
      const first = await gpuDetector.detect()
      const second = await gpuDetector.detect()

      expect(first).toBe(second) // Same object reference
    })

    it('should have platform information', async () => {
      const capabilities = await gpuDetector.detect()

      expect(capabilities.platform).toMatch(/darwin|win32|linux/)
      expect(capabilities.arch).toBeTruthy()
    })
  })

  describe('GPU Type Detection', () => {
    it('should detect GPU type correctly', async () => {
      const capabilities = await gpuDetector.detect()

      if (capabilities.hasGPU) {
        expect(capabilities.type).toMatch(/videotoolbox|nvenc|amf|qsv|vaapi/)
        expect(capabilities.description).toBeTruthy()
      } else {
        expect(capabilities.type).toBeNull()
      }
    })

    it('should list encoders when GPU available', async () => {
      const capabilities = await gpuDetector.detect()

      if (capabilities.hasGPU) {
        expect(Array.isArray(capabilities.encoders)).toBe(true)
        expect(capabilities.encoders.length).toBeGreaterThan(0)
      }
    })

    it('should list decoders when GPU available', async () => {
      const capabilities = await gpuDetector.detect()

      if (capabilities.hasGPU) {
        expect(Array.isArray(capabilities.decoders)).toBe(true)
        expect(capabilities.decoders.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Encoder Selection', () => {
    it('should provide H.264 encoder recommendation', () => {
      const encoder = gpuDetector.getH264Encoder()
      expect(encoder).toBeTruthy()
      expect(typeof encoder).toBe('string')
    })

    it('should provide HEVC encoder recommendation', () => {
      const encoder = gpuDetector.getHEVCEncoder()
      expect(encoder).toBeTruthy()
      expect(typeof encoder).toBe('string')
    })

    it('should fallback to software encoder when no GPU', async () => {
      const capabilities = await gpuDetector.detect()

      if (!capabilities.hasGPU) {
        const h264Encoder = gpuDetector.getH264Encoder()
        const hevcEncoder = gpuDetector.getHEVCEncoder()

        expect(h264Encoder).toBe('libx264')
        expect(hevcEncoder).toBe('libx265')
      }
    })
  })

  describe('Availability Check', () => {
    it('should check if GPU is available', async () => {
      await gpuDetector.detect()
      const isAvailable = gpuDetector.isAvailable()
      expect(typeof isAvailable).toBe('boolean')
    })

    it('should return GPU type or null', async () => {
      await gpuDetector.detect()
      const type = gpuDetector.getType()

      if (type !== null) {
        expect(type).toMatch(/videotoolbox|nvenc|amf|qsv|vaapi/)
      }
    })
  })

  describe('Platform-Specific Detection', () => {
    it('should detect VideoToolbox on macOS', async () => {
      const capabilities = await gpuDetector.detect()

      if (capabilities.platform === 'darwin' && capabilities.hasGPU) {
        expect(capabilities.type).toBe('videotoolbox')
        expect(capabilities.description).toContain('VideoToolbox')
      }
    })

    it('should detect NVENC/AMF/QSV on Windows', async () => {
      const capabilities = await gpuDetector.detect()

      if (capabilities.platform === 'win32' && capabilities.hasGPU) {
        expect(capabilities.type).toMatch(/nvenc|amf|qsv/)
      }
    })

    it('should detect VAAPI/NVENC on Linux', async () => {
      const capabilities = await gpuDetector.detect()

      if (capabilities.platform === 'linux' && capabilities.hasGPU) {
        expect(capabilities.type).toMatch(/vaapi|nvenc/)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle detection errors gracefully', async () => {
      const capabilities = await gpuDetector.detect()

      // Should always return a capabilities object even if detection fails
      expect(capabilities).toBeDefined()
      expect(capabilities).toHaveProperty('hasGPU')
      expect(capabilities).toHaveProperty('supported')
    })

    it('should not throw errors during detection', async () => {
      await expect(async () => {
        await gpuDetector.detect()
      }).not.toThrow()
    })
  })
})
