/**
 * @fileoverview FAST metadata extraction using oEmbed API + predictable patterns
 * 10-20x faster than yt-dlp for instant UI feedback
 * @author GrabZilla Development Team
 * @version 2.1.0
 */

const https = require('https');
const { URL } = require('url');

/**
 * Extract YouTube video ID from URL
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID or null
 */
function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Extract Vimeo video ID from URL
 * @param {string} url - Vimeo URL
 * @returns {string|null} Video ID or null
 */
function extractVimeoId(url) {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

/**
 * Fetch data via HTTPS GET request
 * @param {string} url - URL to fetch
 * @returns {Promise<Object>} Parsed JSON response
 */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error('Failed to parse JSON response'));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Get instant metadata for YouTube video using oEmbed API
 * FAST: 100-200ms vs 2-3 seconds for yt-dlp
 * @param {string} url - YouTube video URL
 * @returns {Promise<Object>} Metadata {title, thumbnail, author}
 */
async function getYouTubeOEmbed(url) {
  const videoId = extractYouTubeId(url);

  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  try {
    // Use oEmbed API (no authentication needed, instant response)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const data = await httpsGet(oembedUrl);

    return {
      title: data.title || `YouTube Video (${videoId})`,
      thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      author: data.author_name || 'Unknown',
      videoId
    };
  } catch (error) {
    console.warn('oEmbed failed, using fallback:', error.message);

    // Fallback: Use predictable patterns (always works)
    return {
      title: `YouTube Video (${videoId})`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      author: 'Unknown',
      videoId
    };
  }
}

/**
 * Get instant metadata for Vimeo video using oEmbed API
 * @param {string} url - Vimeo video URL
 * @returns {Promise<Object>} Metadata {title, thumbnail, author}
 */
async function getVimeoOEmbed(url) {
  const videoId = extractVimeoId(url);

  if (!videoId) {
    throw new Error('Invalid Vimeo URL');
  }

  try {
    const oembedUrl = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`;
    const data = await httpsGet(oembedUrl);

    return {
      title: data.title || `Vimeo Video (${videoId})`,
      thumbnail: data.thumbnail_url || null,
      author: data.author_name || 'Unknown',
      videoId
    };
  } catch (error) {
    console.warn('Vimeo oEmbed failed:', error.message);

    return {
      title: `Vimeo Video (${videoId})`,
      thumbnail: null,
      author: 'Unknown',
      videoId
    };
  }
}

/**
 * Get INSTANT metadata for any supported video URL
 * Uses oEmbed API (100-200ms) instead of yt-dlp (2-3s)
 * Duration is NOT available via oEmbed - must fetch separately
 *
 * @param {string} url - Video URL (YouTube or Vimeo)
 * @returns {Promise<Object>} Fast metadata {title, thumbnail, duration: null}
 */
async function getFastMetadata(url) {
  const startTime = Date.now();

  try {
    let metadata;

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      metadata = await getYouTubeOEmbed(url);
    } else if (url.includes('vimeo.com')) {
      metadata = await getVimeoOEmbed(url);
    } else {
      throw new Error('Unsupported platform - only YouTube and Vimeo supported');
    }

    const duration = Date.now() - startTime;
    console.log(`⚡ Fast metadata fetched in ${duration}ms:`, metadata.title);

    return {
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      duration: null, // Duration not available via oEmbed, will fetch async
      uploader: metadata.author
    };

  } catch (error) {
    console.error('Fast metadata failed:', error);
    throw error;
  }
}

/**
 * Get INSTANT metadata for multiple URLs in parallel
 * SUPER FAST: All HTTP requests happen simultaneously
 *
 * @param {string[]} urls - Array of video URLs
 * @returns {Promise<Object[]>} Array of metadata objects with url property
 */
async function getFastMetadataBatch(urls) {
  const startTime = Date.now();

  try {
    console.log(`⚡ Fetching fast metadata for ${urls.length} videos...`);

    // Fire all HTTP requests in parallel (no yt-dlp spawning!)
    const promises = urls.map(async (url) => {
      try {
        const metadata = await getFastMetadata(url);
        return { ...metadata, url };
      } catch (error) {
        console.warn(`Failed to fetch metadata for ${url}:`, error.message);
        return {
          url,
          title: 'Unknown Video',
          thumbnail: null,
          duration: null,
          uploader: null
        };
      }
    });

    const results = await Promise.all(promises);

    const duration = Date.now() - startTime;
    const avgTime = duration / urls.length;
    console.log(`⚡ Fast metadata complete: ${urls.length} videos in ${duration}ms (${avgTime.toFixed(0)}ms avg)`);

    return results;

  } catch (error) {
    console.error('Batch fast metadata failed:', error);
    throw error;
  }
}

module.exports = {
  getFastMetadata,
  getFastMetadataBatch,
  extractYouTubeId,
  extractVimeoId
};
