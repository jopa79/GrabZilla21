# Manual Test URLs Collection

This document contains curated URLs for manual testing of GrabZilla 2.1.

---

## ✅ YouTube - Standard Videos

### Short Videos (< 5 min)
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
Title: Rick Astley - Never Gonna Give You Up
Duration: 3:33
Format: Standard video
Notes: Classic test video, reliable availability
```

```
https://www.youtube.com/watch?v=jNQXAC9IVRw
Title: "Me at the zoo"
Duration: 0:19
Format: First YouTube video
Notes: Very short, good for quick tests
```

### Medium Videos (5-15 min)
```
https://www.youtube.com/watch?v=9bZkp7q19f0
Title: PSY - Gangnam Style
Duration: 4:13
Format: Music video
Notes: High view count, multiple quality options
```

### Long Videos (15+ min)
```
https://www.youtube.com/watch?v=_OBlgSz8sSM
Title: Big Buck Bunny
Duration: 9:56
Format: Open source test video
Notes: Good for testing longer downloads
```

---

## 🎬 YouTube Shorts

```
https://www.youtube.com/shorts/dQw4w9WgXcQ
Notes: Shorts format test
```

```
https://youtube.com/shorts/5qap5aO4i9A
Notes: Alternative Shorts URL format (Lofi Girl short)
```

**Test Cases:**
- URL pattern recognition
- Normalization to standard watch URL
- Download and conversion

---

## 📋 YouTube Playlists

### Small Playlist (< 10 videos)
```
https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf
Title: Small test playlist
Notes: Good for quick playlist testing
```

### Medium Playlist (10-50 videos)
```
https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI
Notes: Tests pagination and batch processing
```

### Large Playlist (100+ videos)
```
https://www.youtube.com/playlist?list=UUbfYPyITQ-7l4upoX8nvctg
Notes: Tests performance with large playlists
```

**Test Cases:**
- Playlist URL detection
- Video extraction (all videos)
- Metadata fetching for all videos
- Selective download (pick specific videos)
- Queue management with many videos

---

## 🎥 Vimeo Videos

### Standard Vimeo
```
https://vimeo.com/148751763
Title: Vimeo test video
Notes: Public video, good for testing
```

```
https://player.vimeo.com/video/148751763
Title: Same video, player URL format
Notes: Tests URL normalization
```

---

## 🔒 Age-Restricted Content

**Note:** Requires cookie file from logged-in browser session.

```
https://www.youtube.com/watch?v=[age-restricted-video-id]
Notes: Add actual age-restricted video for testing
Cookie file needed: youtube.com_cookies.txt
```

**Test Cases:**
- Download without cookies (should fail gracefully)
- Download with cookies (should succeed)
- Error message clarity

---

## 🎬 Different Quality Options

### 4K Video
```
https://www.youtube.com/watch?v=aqz-KE-bpKQ
Title: 4K video sample
Notes: Tests high-resolution download
Available: 2160p, 1440p, 1080p, 720p, 480p, 360p
```

### 1080p Video
```
https://www.youtube.com/watch?v=9bZkp7q19f0
Available: 1080p, 720p, 480p, 360p
```

### 720p Video
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
Available: 720p, 480p, 360p
```

---

## 🎵 Audio-Only Test

```
https://www.youtube.com/watch?v=9bZkp7q19f0
Format: Audio only
Notes: Test MP3/AAC extraction
```

---

## 🚫 Edge Cases & Error Conditions

### Private Video
```
https://www.youtube.com/watch?v=PRIVATEVIDEO123
Expected: "Video is private" or "Video unavailable" error
Notes: Use any confirmed private video ID, or create test account with private video
```

### Deleted Video
```
https://www.youtube.com/watch?v=DELETEDVIDEO123
Expected: "Video unavailable" or "Video has been removed" error
Notes: Use any confirmed deleted video ID
```

### Invalid URL
```
https://www.youtube.com/watch?v=INVALID_ID
Expected: "Invalid URL" or "Video unavailable" error
Notes: Any malformed video ID will trigger validation error
```

### Geo-Restricted
```
[Add geo-restricted video if needed]
Expected: Region error or require VPN
```

---

## 📊 Testing Matrix

| Test Case | URL Type | Quality | Format | Expected Result |
|-----------|----------|---------|--------|-----------------|
| Basic download | YouTube watch | 720p | MP4 | Success |
| Shorts | YouTube shorts | Auto | MP4 | Success (normalized) |
| Playlist small | YouTube playlist | 720p | MP4 | Success (5-10 videos) |
| Playlist large | YouTube playlist | 720p | MP4 | Success (100+ videos) |
| Vimeo | Vimeo | 720p | MP4 | Success |
| High quality | YouTube watch | 1080p | MP4 | Success |
| Audio only | YouTube watch | N/A | Audio | Success (MP3/AAC) |
| Age-restricted | YouTube watch | 720p | MP4 | Fail without cookies |
| Age-restricted + cookies | YouTube watch | 720p | MP4 | Success with cookies |
| Private video | YouTube watch | Any | Any | Graceful error |
| Invalid URL | Malformed | Any | Any | Validation error |

---

## 🎯 Test Priorities

### High Priority (Must Test)
1. ✅ Standard YouTube video download (720p MP4)
2. ✅ Concurrent downloads (2, 4 videos)
3. ✅ Pause/resume functionality
4. ✅ Cancel download
5. ✅ Small playlist (5-10 videos)
6. ✅ GPU acceleration (H.264 conversion)
7. ✅ Progress reporting accuracy

### Medium Priority (Should Test)
1. ⚠️ YouTube Shorts
2. ⚠️ Large playlist (100+ videos)
3. ⚠️ Vimeo videos
4. ⚠️ Different quality options (1080p, 4K)
5. ⚠️ Audio-only extraction
6. ⚠️ Format conversion (ProRes, DNxHR)

### Low Priority (Nice to Have)
1. 📋 Age-restricted with cookies
2. 📋 Very long videos (> 1 hour)
3. 📋 Multiple playlists simultaneously
4. 📋 Queue priority changes
5. 📋 Network interruption recovery

---

## 📝 Notes for Testers

- Test on clean system when possible
- Note download speeds and times
- Check CPU/GPU usage during operations
- Verify file integrity after download
- Test on different network speeds if possible
- Document any unexpected behaviors
- Screenshot any errors

---

## 🔄 Update This Document

When testing, add your own URLs that work well or fail interestingly. Keep this document updated with:
- Working test URLs
- URLs that cause issues
- Edge cases discovered
- Platform-specific behaviors
