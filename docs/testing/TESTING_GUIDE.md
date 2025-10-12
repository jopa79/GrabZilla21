# GrabZilla 2.1 - Manual Testing Guide

Complete guide for manual testing of all features before production release.

---

## 🎯 Testing Objectives

1. Verify all download functionality works with real videos
2. Test parallel processing with multiple concurrent downloads
3. Validate GPU acceleration improves performance
4. Ensure pause/resume works correctly
5. Test queue management (cancel, priority)
6. Verify error handling and user feedback
7. Confirm UI responsiveness and accuracy

---

## 🛠️ Test Environment Setup

### Prerequisites
```bash
# 1. Ensure binaries are installed
npm run setup

# 2. Start in development mode (with DevTools)
npm run dev

# 3. Check binary versions
# Should see yt-dlp and ffmpeg versions in statusline
```

### Cookie File for Age-Restricted Videos

Some videos (like Big Buck Bunny) may require authentication. To download these:

1. **Export cookies from your browser**:
   - Chrome: Use extension like "Get cookies.txt LOCALLY"
   - Firefox: Use extension like "cookies.txt"
   - Export in Netscape format

2. **Select cookie file in GrabZilla**:
   - Click the "Cookie: Select File" button
   - Choose your exported .txt file
   - You'll see the filename displayed next to the button

3. **Cookie file is automatically used** for all downloads once selected
   - No need to re-select for each video
   - Persists for the session

**Note**: The cookie file path is shown in the UI after selection. If you see "Age-restricted video - authentication required" errors, make sure you've selected a valid cookie file first.

### System Requirements
- macOS 10.15+ / Windows 10+ / Linux (Ubuntu 20.04+)
- 8GB RAM minimum (16GB recommended)
- 5GB free disk space for test downloads
- Internet connection (stable, > 5 Mbps)

---

## 📋 Test Procedures

### Test 1: Basic Download (10 min)

**Objective:** Verify single video download works end-to-end.

**Steps:**
1. Launch GrabZilla in dev mode
2. Paste URL: `https://www.youtube.com/watch?v=jNQXAC9IVRw`
3. Click "Add Videos"
4. Select save directory
5. Choose quality: 720p
6. Choose format: MP4 (H.264)
7. Click "Download Videos"

**Expected Results:**
- ✅ Video appears in video list with "Ready" status
- ✅ Download starts automatically
- ✅ Progress bar updates smoothly (0-100%)
- ✅ Speed displayed in MB/s or KB/s
- ✅ Status changes: Ready → Downloading → Completed
- ✅ File saved to selected directory
- ✅ File plays correctly in video player
- ✅ Statusline shows updated metrics

**Success Criteria:**
- Download completes without errors
- Progress reporting is accurate
- File integrity verified (plays correctly)
- Time: < 30 seconds for short video

---

### Test 2: Concurrent Downloads (15 min)

**Objective:** Test parallel processing with multiple videos.

**Setup:**
Use these 4 URLs:
```
https://www.youtube.com/watch?v=jNQXAC9IVRw
https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://www.youtube.com/watch?v=9bZkp7q19f0
https://www.youtube.com/watch?v=_OBlgSz8sSM
```

**Steps:**
1. Paste all 4 URLs (one per line or comma-separated)
2. Click "Add Videos"
3. Verify all 4 appear in video list
4. Click "Download Videos"
5. Watch queue panel

**Expected Results:**
- ✅ Queue panel shows: Active: 4/4, Queued: 0
- ✅ All 4 videos download simultaneously
- ✅ Each video has individual progress bar
- ✅ Each video shows its own speed
- ✅ CPU usage displayed in queue panel (should be < 5%)
- ✅ Downloads complete in parallel (not sequential)
- ✅ All 4 files saved correctly

**Success Criteria:**
- Parallel downloads work correctly
- No race conditions or crashes
- CPU usage remains reasonable
- Time: ~2-3 minutes total (much faster than sequential)

**Comparison:**
- Sequential: Would take ~4-6 minutes
- Parallel (4): Should take ~1-2 minutes
- **Improvement: 2-4x faster** ⚡

---

### Test 3: Pause & Resume (10 min)

**Objective:** Verify pause/resume functionality.

**Steps:**
1. Start downloading: `https://www.youtube.com/watch?v=_OBlgSz8sSM` (longer video)
2. Wait for download to reach ~30%
3. Click "Pause" button on video item
4. Wait 5 seconds
5. Verify download is paused (progress frozen)
6. Click "Resume" button
7. Wait for download to complete

**Expected Results:**
- ✅ Pause button appears during download
- ✅ Click pause → download stops immediately
- ✅ Progress bar frozen at ~30%
- ✅ Status shows "Paused"
- ✅ Resume button appears
- ✅ Click resume → download continues from 30%
- ✅ Download completes successfully
- ✅ File integrity maintained (plays correctly)

**Success Criteria:**
- Pause response: < 1 second
- Resume works correctly from paused point
- No corruption in downloaded file
- Progress accurate after resume

---

### Test 4: Cancel Download (5 min)

**Objective:** Verify cancellation works correctly.

**Steps:**
1. Start downloading a video
2. Wait for download to reach ~20%
3. Click "Cancel" button
4. Verify download stops

**Expected Results:**
- ✅ Download stops immediately
- ✅ Video removed from active queue
- ✅ Partial file cleaned up (or marked incomplete)
- ✅ No errors in console
- ✅ Queue panel updates (Active count decreases)

**Success Criteria:**
- Cancel response: < 1 second
- Clean termination (no zombie processes)
- UI updates correctly

---

### Test 5: GPU Acceleration (15 min)

**Objective:** Verify GPU hardware acceleration improves performance.

**Setup:**
- Video requiring conversion (download best quality, convert to H.264)

**Steps:**

**Part A: With GPU (Default)**
1. Settings → GPU Acceleration: ON
2. Download video: `https://www.youtube.com/watch?v=aqz-KE-bpKQ`
3. Quality: 1080p
4. Format: H.264
5. Note conversion time and CPU usage

**Part B: Without GPU**
1. Settings → GPU Acceleration: OFF
2. Download same video again (different name)
3. Same quality and format
4. Note conversion time and CPU usage

**Expected Results:**

| Metric | With GPU | Without GPU | Improvement |
|--------|----------|-------------|-------------|
| Conversion time | ~30s | ~90s | **3x faster** |
| CPU usage | 10-20% | 80-100% | **4-5x lower** |
| GPU status | Shows type | "Software" | N/A |

**Success Criteria:**
- GPU accelerated conversion is 2-5x faster
- CPU usage significantly lower with GPU
- Both produce playable videos
- File size similar (within 10%)

**GPU Types by Platform:**
- macOS: VideoToolbox
- Windows (NVIDIA): NVENC
- Windows (AMD): AMF
- Windows (Intel): QSV
- Linux: VA-API or NVENC

---

### Test 6: Queue Management (10 min)

**Objective:** Test queue with many videos and priority.

**Steps:**
1. Add 8 videos to queue
2. Settings → Max Concurrent: 2
3. Start downloads
4. Observe queue panel: Active: 2, Queued: 6
5. Cancel one active download
6. Verify queued video starts automatically
7. Change concurrency to 4
8. Verify 2 more downloads start

**Expected Results:**
- ✅ Queue respects concurrency limit
- ✅ Queued videos wait their turn
- ✅ When slot opens, next video starts automatically
- ✅ Queue panel shows accurate counts
- ✅ Changing concurrency takes effect immediately

**Success Criteria:**
- Queue system works correctly
- Automatic slot filling
- Settings changes apply in real-time

---

### Test 7: Playlist Download (20 min)

**Objective:** Test playlist parsing and batch download.

**Small Playlist:**
```
https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf
```

**Steps:**
1. Paste playlist URL
2. Click "Add Videos"
3. Verify all videos from playlist appear in list
4. Each video shows title, duration, thumbnail
5. Start download (concurrent)
6. Monitor queue panel

**Expected Results:**
- ✅ Playlist URL recognized
- ✅ All videos extracted (5-10 videos)
- ✅ Metadata fetched for each video
- ✅ Downloads proceed in parallel
- ✅ All videos download successfully
- ✅ Progress tracked individually

**Success Criteria:**
- Playlist parsing works
- Batch metadata fetching
- Concurrent downloads of playlist items
- Time: ~2-5 minutes for small playlist

**Large Playlist (Optional):**
- Test with 100+ videos
- Verify performance remains good
- Check memory usage doesn't spike

---

### Test 8: YouTube Shorts (5 min)

**Objective:** Verify Shorts URL support.

**Steps:**
1. Paste Shorts URL: `https://www.youtube.com/shorts/dQw4w9WgXcQ`
2. Click "Add Videos"
3. Verify URL normalized to watch URL
4. Download video

**Expected Results:**
- ✅ Shorts URL recognized
- ✅ Converted to: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- ✅ Download works normally
- ✅ Video quality matches original

**Success Criteria:**
- Shorts pattern detected
- URL normalization works
- Download succeeds

---

### Test 9: Vimeo Support (5 min)

**Objective:** Test Vimeo video downloads.

**Steps:**
1. Paste Vimeo URL: `https://vimeo.com/148751763`
2. Add and download

**Expected Results:**
- ✅ Vimeo URL recognized
- ✅ Metadata fetched
- ✅ Download succeeds
- ✅ File plays correctly

**Success Criteria:**
- Vimeo support working
- Same quality as YouTube workflow

---

### Test 10: Error Handling (10 min)

**Objective:** Verify graceful error handling.

**Test Cases:**

**A. Invalid URL**
```
Input: https://www.youtube.com/watch?v=invalid123
Expected: Error message "Video unavailable or invalid URL"
```

**B. Private Video**
```
Input: [Private video URL]
Expected: Error message "Video is private"
```

**C. Network Error**
1. Start download
2. Disconnect internet at 50%
3. Reconnect after 10 seconds
4. Expected: Retry automatically (up to 3 times)

**D. Disk Full**
1. Select directory with insufficient space
2. Start large video download
3. Expected: Error message "Insufficient disk space"

**Success Criteria:**
- All errors caught and handled
- User-friendly error messages
- No crashes or hangs
- Retry logic works for network errors

---

### Test 11: UI Responsiveness (5 min)

**Objective:** Verify UI remains responsive during operations.

**Steps:**
1. Start 8 concurrent downloads
2. Try to:
   - Scroll video list
   - Open settings modal
   - Add more videos
   - Cancel downloads
   - Pause/resume

**Expected Results:**
- ✅ UI never freezes
- ✅ All controls responsive
- ✅ Smooth scrolling
- ✅ No lag in interactions
- ✅ Progress updates don't cause jank

**Success Criteria:**
- UI frame rate > 30 FPS
- Interaction latency < 100ms
- No visual glitches

---

### Test 12: Settings Persistence (5 min)

**Objective:** Verify settings save and load correctly.

**Steps:**
1. Change settings:
   - GPU Acceleration: OFF
   - Max Concurrent: 6
   - Quality: 1080p
   - Format: ProRes
2. Close application
3. Reopen application
4. Check settings

**Expected Results:**
- ✅ All settings preserved
- ✅ GPU setting: OFF
- ✅ Concurrency: 6
- ✅ Quality: 1080p
- ✅ Format: ProRes

**Success Criteria:**
- Settings persist across sessions
- No data loss

---

## 📊 Performance Benchmarks

Track these metrics during testing:

### Download Performance
- Single video download time: _______ seconds
- 4 concurrent downloads time: _______ seconds
- 8 concurrent downloads time: _______ seconds
- Speedup vs sequential: _______ x faster

### GPU Acceleration
- CPU encoding time: _______ seconds
- GPU encoding time: _______ seconds
- Speedup: _______ x faster
- CPU usage (GPU): _______ %
- CPU usage (CPU): _______ %

### System Resources
- Peak CPU usage: _______ %
- Peak memory usage: _______ MB
- Disk I/O: _______ MB/s
- Network speed: _______ MB/s

### Stability
- Total downloads tested: _______
- Successful: _______
- Failed: _______
- Success rate: _______ %

---

## 🐛 Bug Reporting Template

```markdown
## Bug Report

**Test:** [Test name]
**Date:** [Date]
**Platform:** [macOS/Windows/Linux + version]
**Build:** [Dev/Prod]

### Description
[Clear description of the bug]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happened]

### Screenshots/Logs
[Attach screenshots or console logs]

### System Info
- CPU: [Model]
- RAM: [Amount]
- GPU: [Model]
- Network: [Speed]

### Severity
- [ ] Critical (app crashes/data loss)
- [ ] High (feature doesn't work)
- [ ] Medium (feature works but has issues)
- [ ] Low (cosmetic/minor)
```

---

## ✅ Test Completion Checklist

### Core Functionality
- [ ] Basic single video download
- [ ] Concurrent downloads (2, 4, 8 videos)
- [ ] Pause/resume functionality
- [ ] Cancel downloads
- [ ] Queue management

### Advanced Features
- [ ] GPU acceleration (vs CPU comparison)
- [ ] Playlist downloads (small)
- [ ] Playlist downloads (large - optional)
- [ ] YouTube Shorts support
- [ ] Vimeo support

### Quality & Formats
- [ ] Different qualities (720p, 1080p, 4K)
- [ ] Different formats (MP4, ProRes, DNxHR)
- [ ] Audio-only extraction

### Edge Cases
- [ ] Invalid URLs
- [ ] Private videos
- [ ] Network interruption recovery
- [ ] Disk space errors
- [ ] Age-restricted content (with cookies)

### Performance
- [ ] CPU usage acceptable (< 10% idle, < 50% active)
- [ ] Memory usage stable (< 500MB)
- [ ] UI remains responsive
- [ ] No memory leaks (test for 30+ min)

### UI/UX
- [ ] Progress reporting accurate
- [ ] Speed display correct
- [ ] Queue panel updates
- [ ] Settings save/load
- [ ] Error messages clear and helpful

### Cross-Platform (if applicable)
- [ ] macOS Intel
- [ ] macOS Apple Silicon
- [ ] Windows 10/11
- [ ] Linux (Ubuntu/Fedora)

---

## 📝 Final Sign-Off

**Tester:** _______________________
**Date:** _______________________
**Build Version:** _______________________
**Overall Assessment:** [ ] Pass / [ ] Pass with issues / [ ] Fail

**Notes:**
_______________________________________________________________________________________
_______________________________________________________________________________________
_______________________________________________________________________________________

**Ready for Production:** [ ] Yes / [ ] No / [ ] With fixes

---

**Good luck with testing!** 🚀

Remember: The goal is to find issues before users do. Be thorough, document everything, and don't hesitate to test edge cases.
