// GrabZilla 2.1 - URL Validation Utilities
// Comprehensive URL validation for video platforms

class URLValidator {
    /**
     * Detect punycode/IDN domains that might be used for spoofing
     * @param {string} hostname - Domain hostname to check
     * @returns {boolean} True if punycode detected
     */
    static isPunycode(hostname) {
        if (!hostname || typeof hostname !== 'string') {
            return false;
        }

        // Punycode domains start with "xn--"
        return hostname.toLowerCase().includes('xn--');
    }

    /**
     * Detect potential homograph attacks using lookalike characters
     * @param {string} hostname - Domain hostname to check
     * @returns {object} Detection result with suspicious characters
     */
    static detectHomographAttack(hostname) {
        if (!hostname || typeof hostname !== 'string') {
            return { suspicious: false, characters: [] };
        }

        // Common homograph character mappings
        const suspiciousChars = [
            // Cyrillic lookalikes
            { char: 'а', lookalike: 'a', name: 'Cyrillic а' },
            { char: 'е', lookalike: 'e', name: 'Cyrillic е' },
            { char: 'о', lookalike: 'o', name: 'Cyrillic о' },
            { char: 'р', lookalike: 'p', name: 'Cyrillic р' },
            { char: 'с', lookalike: 'c', name: 'Cyrillic с' },
            { char: 'у', lookalike: 'y', name: 'Cyrillic у' },
            { char: 'х', lookalike: 'x', name: 'Cyrillic х' },

            // Greek lookalikes
            { char: 'ο', lookalike: 'o', name: 'Greek omicron' },
            { char: 'ν', lookalike: 'v', name: 'Greek nu' },
            { char: 'α', lookalike: 'a', name: 'Greek alpha' },

            // Other suspicious characters
            { char: 'і', lookalike: 'i', name: 'Ukrainian i' },
            { char: 'ј', lookalike: 'j', name: 'Cyrillic j' }
        ];

        const found = [];
        const lowerHostname = hostname.toLowerCase();

        for (const { char, lookalike, name } of suspiciousChars) {
            if (lowerHostname.includes(char)) {
                found.push({ char, lookalike, name });
            }
        }

        // Check for mixed scripts (ASCII + non-ASCII)
        const hasAscii = /[a-z]/i.test(hostname);
        const hasNonAscii = /[^\x00-\x7F]/.test(hostname);
        const mixedScripts = hasAscii && hasNonAscii;

        return {
            suspicious: found.length > 0 || mixedScripts,
            characters: found,
            mixedScripts
        };
    }

    /**
     * Validate URL against security threats (punycode, homographs)
     * @param {string} url - URL to validate
     * @returns {object} Validation result with security warnings
     */
    static validateUrlSecurity(url) {
        if (!url || typeof url !== 'string') {
            return { safe: false, warnings: ['Invalid URL'] };
        }

        try {
            const parsed = new URL(url.startsWith('http') ? url : 'https://' + url);
            const hostname = parsed.hostname.toLowerCase();
            const warnings = [];

            // Check for punycode
            if (this.isPunycode(hostname)) {
                warnings.push('⚠️ Punycode domain detected - may be used for spoofing');
            }

            // Check for homograph attacks
            const homograph = this.detectHomographAttack(hostname);
            if (homograph.suspicious) {
                if (homograph.characters.length > 0) {
                    warnings.push(`⚠️ Suspicious lookalike characters detected: ${homograph.characters.map(c => c.name).join(', ')}`);
                }
                if (homograph.mixedScripts) {
                    warnings.push('⚠️ Mixed character scripts detected - potential homograph attack');
                }
            }

            // Verify against trusted domains
            const trustedDomains = [
                'youtube.com',
                'youtu.be',
                'vimeo.com'
            ];

            const isTrusted = trustedDomains.some(domain =>
                hostname === domain ||
                hostname.endsWith('.' + domain) ||
                hostname === 'www.' + domain
            );

            if (!isTrusted && warnings.length === 0) {
                warnings.push('⚠️ Domain not in trusted list');
            }

            return {
                safe: warnings.length === 0,
                warnings,
                hostname,
                isTrusted
            };
        } catch (error) {
            return {
                safe: false,
                warnings: ['Invalid URL format']
            };
        }
    }
    // Check if URL is a valid video URL from supported platforms
    static isValidVideoUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }

        const trimmedUrl = url.trim();
        if (trimmedUrl.length === 0) {
            return false;
        }

        // SECURITY: Check for punycode and homograph attacks
        const securityCheck = this.validateUrlSecurity(trimmedUrl);
        if (!securityCheck.safe) {
            // Log security warnings but still allow if domain is trusted
            if (!securityCheck.isTrusted) {
                console.warn('URL security warnings:', securityCheck.warnings);
                return false;
            }
        }

        // Check against supported platforms
        return this.isYouTubeUrl(trimmedUrl) ||
               this.isVimeoUrl(trimmedUrl) ||
               this.isGenericVideoUrl(trimmedUrl);
    }

    // Validate YouTube URLs (including Shorts)
    static isYouTubeUrl(url) {
        // Match YouTube URLs with any query parameters (including Shorts)
        const videoPattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)[\w\-_]{11}([?&].*)?$/i;
        const playlistPattern = /^(https?:\/\/)?(www\.)?youtube\.com\/playlist\?list=[\w\-]+/i;
        return videoPattern.test(url) || playlistPattern.test(url);
    }

    // Validate Vimeo URLs
    static isVimeoUrl(url) {
        const patterns = window.AppConfig?.VALIDATION_PATTERNS || {
            VIMEO_URL: /^(https?:\/\/)?(www\.)?(vimeo\.com\/\d+|player\.vimeo\.com\/video\/\d+)/i
        };
        return patterns.VIMEO_URL.test(url);
    }

    // Check if URL is a YouTube playlist
    static isYouTubePlaylist(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }
        return /[?&]list=[\w\-]+/.test(url);
    }

    // Check if URL is a YouTube Shorts video
    static isYouTubeShorts(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }
        return /youtube\.com\/shorts\/[\w\-_]{11}/i.test(url);
    }

    // Validate generic video URLs
    static isGenericVideoUrl(url) {
        // Disable generic video URL validation to be more strict
        // Only allow explicitly supported platforms (YouTube, Vimeo)
        return false;
    }

    // Extract video ID from YouTube URL (including Shorts)
    static extractYouTubeId(url) {
        if (!this.isYouTubeUrl(url)) {
            return null;
        }

        const patterns = [
            /[?&]v=([^&#]*)/,                    // youtube.com/watch?v=ID
            /\/embed\/([^\/\?]*)/,               // youtube.com/embed/ID
            /\/v\/([^\/\?]*)/,                   // youtube.com/v/ID
            /\/shorts\/([^\/\?]*)/,              // youtube.com/shorts/ID
            /youtu\.be\/([^\/\?]*)/              // youtu.be/ID
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }

    // Extract video ID from Vimeo URL
    static extractVimeoId(url) {
        if (!this.isVimeoUrl(url)) {
            return null;
        }

        const match = url.match(/vimeo\.com\/(\d+)/);
        return match ? match[1] : null;
    }

    // Normalize URL to standard format
    static normalizeUrl(url) {
        if (!url || typeof url !== 'string') {
            return url;
        }

        let normalizedUrl = url.trim();

        // Add protocol if missing
        if (!/^https?:\/\//i.test(normalizedUrl)) {
            normalizedUrl = 'https://' + normalizedUrl;
        }

        // Normalize YouTube URLs
        if (this.isYouTubeUrl(normalizedUrl)) {
            const videoId = this.extractYouTubeId(normalizedUrl);
            if (videoId) {
                return `https://www.youtube.com/watch?v=${videoId}`;
            }
        }

        // Normalize Vimeo URLs
        if (this.isVimeoUrl(normalizedUrl)) {
            const videoId = this.extractVimeoId(normalizedUrl);
            if (videoId) {
                return `https://vimeo.com/${videoId}`;
            }
        }

        return normalizedUrl;
    }

    // Get platform name from URL
    static getPlatform(url) {
        if (this.isYouTubeUrl(url)) {
            return 'YouTube';
        }
        if (this.isVimeoUrl(url)) {
            return 'Vimeo';
        }
        return 'Unknown';
    }

    // Validate multiple URLs (one per line)
    static validateMultipleUrls(urlText) {
        if (!urlText || typeof urlText !== 'string') {
            return { valid: [], invalid: [] };
        }

        // Extract all URLs from text using regex patterns
        // Match entire YouTube URLs including all query parameters (including Shorts)
        const youtubePattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)[\w\-_]{11}(?:[?&][^\s]*)*/gi;
        const vimeoPattern = /(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/|player\.vimeo\.com\/video\/)\d+/gi;

        const youtubeMatches = urlText.match(youtubePattern) || [];
        const vimeoMatches = urlText.match(vimeoPattern) || [];

        const allUrls = [...youtubeMatches, ...vimeoMatches];

        const valid = [];
        const invalid = [];
        const seen = new Set();

        allUrls.forEach(url => {
            // Fully normalize URLs to canonical format for deduplication
            const normalizedUrl = this.normalizeUrl(url);

            // Deduplicate based on normalized canonical URL
            if (!seen.has(normalizedUrl)) {
                seen.add(normalizedUrl);
                if (this.isValidVideoUrl(normalizedUrl)) {
                    valid.push(normalizedUrl);
                } else {
                    invalid.push(url);
                }
            }
        });

        return { valid, invalid };
    }

    // Check for duplicate URLs in a list
    static findDuplicates(urls) {
        const normalized = urls.map(url => this.normalizeUrl(url));
        const duplicates = [];
        const seen = new Set();

        normalized.forEach((url, index) => {
            if (seen.has(url)) {
                duplicates.push({ url: urls[index], index });
            } else {
                seen.add(url);
            }
        });

        return duplicates;
    }

    // Get validation error message
    static getValidationError(url) {
        if (url === null || url === undefined) {
            return 'URL is required';
        }

        if (typeof url !== 'string' || url.trim().length === 0) {
            return 'URL cannot be empty';
        }

        const trimmedUrl = url.trim();

        if (!/^https?:\/\//i.test(trimmedUrl) && !/^www\./i.test(trimmedUrl) && !trimmedUrl.includes('.')) {
            return 'Invalid URL format - must include domain';
        }

        if (!this.isValidVideoUrl(trimmedUrl)) {
            return 'Unsupported video platform - currently supports YouTube and Vimeo';
        }

        return null; // Valid URL
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = URLValidator;
} else {
    // Browser environment - attach to window
    window.URLValidator = URLValidator;
}