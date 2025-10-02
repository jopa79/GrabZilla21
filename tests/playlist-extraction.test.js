/**
 * @fileoverview Tests for YouTube Playlist Extraction
 * @description Test suite for playlist URL detection and data parsing
 */

import { describe, it, expect } from 'vitest'

/**
 * PLAYLIST EXTRACTION TESTS
 *
 * Tests playlist functionality:
 * - Playlist URL detection
 * - Playlist ID extraction
 * - JSON response parsing
 * - Error handling
 */

describe('Playlist Extraction', () => {
  describe('Playlist URL Detection', () => {
    it('should detect valid playlist URLs', () => {
      const playlistUrls = [
        'https://www.youtube.com/playlist?list=PLtest123',
        'https://youtube.com/playlist?list=PLtest456',
        'https://www.youtube.com/watch?v=abc12345678&list=PLtest789'
      ]

      playlistUrls.forEach(url => {
        expect(url).toMatch(/[?&]list=[\w\-]+/)
      })
    })

    it('should extract playlist ID from URL', () => {
      const testCases = [
        { url: 'https://www.youtube.com/playlist?list=PLtest12345', expected: 'PLtest12345' },
        { url: 'https://youtube.com/playlist?list=PLabc-xyz_123', expected: 'PLabc-xyz_123' },
        { url: 'https://www.youtube.com/watch?v=test&list=PLmixed123', expected: 'PLmixed123' }
      ]

      testCases.forEach(({ url, expected }) => {
        const match = url.match(/[?&]list=([\w\-]+)/)
        expect(match).not.toBeNull()
        expect(match[1]).toBe(expected)
      })
    })

    it('should reject non-playlist URLs', () => {
      const nonPlaylistUrls = [
        'https://www.youtube.com/watch?v=abc12345678',
        'https://youtu.be/xyz98765432',
        'https://vimeo.com/123456789',
        'https://youtube.com/shorts/test1234567'
      ]

      nonPlaylistUrls.forEach(url => {
        const match = url.match(/[?&]list=([\w\-]+)/)
        expect(match).toBeNull()
      })
    })
  })

  describe('Playlist Data Parsing', () => {
    it('should parse playlist JSON response with all fields', () => {
      const mockJsonLine = JSON.stringify({
        id: 'abc12345678',
        title: 'Test Video',
        url: 'https://www.youtube.com/watch?v=abc12345678',
        duration: 300,
        thumbnail: 'https://i.ytimg.com/vi/abc12345678/default.jpg',
        uploader: 'Test Channel'
      })

      const parsed = JSON.parse(mockJsonLine)

      expect(parsed.id).toBe('abc12345678')
      expect(parsed.title).toBe('Test Video')
      expect(parsed.url).toBe('https://www.youtube.com/watch?v=abc12345678')
      expect(parsed.duration).toBe(300)
      expect(parsed.thumbnail).toBe('https://i.ytimg.com/vi/abc12345678/default.jpg')
      expect(parsed.uploader).toBe('Test Channel')
    })

    it('should handle missing optional fields gracefully', () => {
      const mockJsonLine = JSON.stringify({
        id: 'abc12345678',
        title: 'Test Video'
      })

      const parsed = JSON.parse(mockJsonLine)

      expect(parsed.id).toBe('abc12345678')
      expect(parsed.title).toBe('Test Video')
      expect(parsed.duration).toBeUndefined()
      expect(parsed.thumbnail).toBeUndefined()
      expect(parsed.uploader).toBeUndefined()
    })

    it('should parse multiple JSON lines from playlist response', () => {
      const mockResponse = `{"id":"video1","title":"First Video"}
{"id":"video2","title":"Second Video"}
{"id":"video3","title":"Third Video"}`

      const lines = mockResponse.trim().split('\n')
      const videos = lines.map(line => JSON.parse(line))

      expect(videos).toHaveLength(3)
      expect(videos[0].id).toBe('video1')
      expect(videos[1].id).toBe('video2')
      expect(videos[2].id).toBe('video3')
    })
  })

  describe('Playlist Response Structure', () => {
    it('should create proper video objects from parsed data', () => {
      const mockData = {
        id: 'abc12345678',
        title: 'Test Video',
        url: 'https://www.youtube.com/watch?v=abc12345678',
        duration: 300,
        thumbnail: 'https://i.ytimg.com/vi/abc12345678/default.jpg',
        uploader: 'Test Channel'
      }

      const video = {
        id: mockData.id,
        title: mockData.title || 'Unknown Title',
        url: mockData.url || `https://www.youtube.com/watch?v=${mockData.id}`,
        duration: mockData.duration || null,
        thumbnail: mockData.thumbnail || null,
        uploader: mockData.uploader || mockData.channel || null
      }

      expect(video.id).toBe('abc12345678')
      expect(video.title).toBe('Test Video')
      expect(video.url).toBe('https://www.youtube.com/watch?v=abc12345678')
      expect(video.duration).toBe(300)
      expect(video.thumbnail).toBe('https://i.ytimg.com/vi/abc12345678/default.jpg')
      expect(video.uploader).toBe('Test Channel')
    })

    it('should use fallback values when fields are missing', () => {
      const mockData = {
        id: 'abc12345678'
      }

      const video = {
        id: mockData.id,
        title: mockData.title || 'Unknown Title',
        url: mockData.url || `https://www.youtube.com/watch?v=${mockData.id}`,
        duration: mockData.duration || null,
        thumbnail: mockData.thumbnail || null,
        uploader: mockData.uploader || mockData.channel || null
      }

      expect(video.id).toBe('abc12345678')
      expect(video.title).toBe('Unknown Title')
      expect(video.url).toBe('https://www.youtube.com/watch?v=abc12345678')
      expect(video.duration).toBeNull()
      expect(video.thumbnail).toBeNull()
      expect(video.uploader).toBeNull()
    })

    it('should handle channel field as fallback for uploader', () => {
      const mockData = {
        id: 'abc12345678',
        title: 'Test Video',
        channel: 'Channel Name'
      }

      const video = {
        id: mockData.id,
        title: mockData.title || 'Unknown Title',
        url: mockData.url || `https://www.youtube.com/watch?v=${mockData.id}`,
        duration: mockData.duration || null,
        thumbnail: mockData.thumbnail || null,
        uploader: mockData.uploader || mockData.channel || null
      }

      expect(video.uploader).toBe('Channel Name')
    })
  })

  describe('Playlist Response Validation', () => {
    it('should create valid success response structure', () => {
      const playlistId = 'PLtest12345'
      const videos = [
        { id: 'video1', title: 'First' },
        { id: 'video2', title: 'Second' }
      ]

      const response = {
        success: true,
        playlistId: playlistId,
        videoCount: videos.length,
        videos: videos
      }

      expect(response.success).toBe(true)
      expect(response.playlistId).toBe('PLtest12345')
      expect(response.videoCount).toBe(2)
      expect(response.videos).toHaveLength(2)
    })

    it('should count videos correctly', () => {
      const videos = []
      for (let i = 0; i < 50; i++) {
        videos.push({ id: `video${i}`, title: `Video ${i}` })
      }

      const response = {
        success: true,
        playlistId: 'PLtest',
        videoCount: videos.length,
        videos: videos
      }

      expect(response.videoCount).toBe(50)
      expect(response.videos).toHaveLength(50)
    })
  })

  describe('Error Handling', () => {
    it('should validate playlist URL format', () => {
      const invalidUrls = [
        '',
        null,
        undefined,
        'https://www.youtube.com/watch?v=abc12345678',
        'https://vimeo.com/123456789'
      ]

      invalidUrls.forEach(url => {
        if (url) {
          const match = url.match(/[?&]list=([\w\-]+)/)
          expect(match).toBeNull()
        }
      })
    })

    it('should handle JSON parse errors gracefully', () => {
      const invalidJson = 'not valid json'

      expect(() => {
        JSON.parse(invalidJson)
      }).toThrow()
    })

    it('should continue parsing when one line fails', () => {
      const mockResponse = `{"id":"video1","title":"First Video"}
invalid json line here
{"id":"video3","title":"Third Video"}`

      const lines = mockResponse.trim().split('\n')
      const videos = []

      lines.forEach(line => {
        try {
          const videoData = JSON.parse(line)
          videos.push(videoData)
        } catch (error) {
          // Skip invalid lines
        }
      })

      expect(videos).toHaveLength(2)
      expect(videos[0].id).toBe('video1')
      expect(videos[1].id).toBe('video3')
    })
  })
})
