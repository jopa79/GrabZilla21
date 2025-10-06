# GrabZilla 2.1 - Development TODO List

**Last Updated**: January 7, 2025  
**Project Status**: Production-ready with enhancement features in progress

---

## 📋 Complete Task List

---

## ✅ Recent Improvements (January 2025)

### **Settings Reorganization**
- [x] Restored "Check for Updates" button to main control panel
- [x] Renamed "Advanced" tab to "Cookie" in Settings modal
- [x] Moved "Max Retry Attempts" and "Request Timeout" to General tab
- [x] Improved settings organization by purpose (General vs Cookie)

### **Cookie File Metadata Support (Critical Bug Fix)**
- [x] Added cookie file parameter to `get-video-metadata` IPC handler
- [x] Added cookie file parameter to `get-batch-video-metadata` IPC handler
- [x] Updated preload.js API signatures to accept cookie file
- [x] Updated ipc-integration.js to pass cookie file parameter
- [x] Modified MetadataService to retrieve cookie file from app state
- [x] Added debug logging for cookie file usage
- [x] Fixed age-restricted video metadata extraction
- [x] Enabled private/members-only video support with authentication

**Impact:** Cookie files now work for BOTH metadata extraction AND downloads, fixing a critical bug where age-restricted videos could not be added to the download queue.

**Files Modified:**
- `index.html` - Settings UI reorganization
- `src/main.js` - Cookie file support in metadata handlers (lines 1079-1115, 1159-1209)
- `src/preload.js` - Updated API signatures (lines 38-39)
- `scripts/utils/ipc-integration.js` - Cookie file parameter passing (lines 148-158, 172-182)
- `scripts/services/metadata-service.js` - Cookie file retrieval (lines 83-84, 319-320)

**Documentation:**
- `HANDOFF_NOTES.md` - Updated with session details
- `CLAUDE.md` - Added Cookie File Support section
- `SESSION_JAN7_SETTINGS_AND_COOKIE_FIX.md` - Comprehensive session summary with before/after comparisons

---

### **Priority 1: Code Management & Current Work** ✅ **COMPLETED**

- [x] **Task 1**: Commit current changes
  - ✅ Staged and committed all modified files
  - ✅ Committed settings reorganization changes
  - ✅ Committed cookie file metadata support fix
  - ✅ Clean commit message with detailed description
  - ✅ Pushed to remote repository (commit 1698249)

---

### **Priority 2: Testing & Validation** ✅ **COMPLETED**

- [x] **Task 2**: Test metadata service integration
  - ✅ Verified MetadataService works correctly with real YouTube/Vimeo URLs
  - ✅ Tested with age-restricted videos (now working with cookie file)
  - ✅ Confirmed caching mechanism works properly
  - ✅ Verified fallback metadata extraction for failed requests

- [x] **Task 3**: Run existing test suite
  - ✅ Executed `npm test` - all tests passing without errors
  - ✅ No regressions detected after recent changes
  - ✅ All metadata and cookie file changes verified

- [ ] **Task 4**: Write metadata service tests
  - Create comprehensive unit tests for `metadata-service.js`
  - Test caching functionality
  - Test retry logic with mock failures
  - Test timeout scenarios
  - Test fallback metadata generation
  - Test prefetch functionality

- [ ] **Task 5**: Integration testing
  - Test complete workflow: paste URLs → metadata fetch → download → conversion → completion
  - Verify metadata service integrates properly with video queue
  - Test with multiple simultaneous metadata requests
  - Verify UI updates correctly with fetched metadata

- [ ] **Task 6**: Performance validation
  - Verify app startup is still under 2 seconds
  - Test metadata caching improves performance
  - Check for memory leaks with large video queues
  - Profile metadata service performance

- [ ] **Task 7**: Edge case testing
  - Test with invalid URLs
  - Test with network failures
  - Test with slow connections
  - Test with age-restricted videos
  - Test with private/deleted videos
  - Test with very long playlists

---

### **Priority 3: Binary Management Fixes** ✅ **COMPLETED**

- [x] **Task 13**: Fix binary update system
  - ✅ Fixed GitHub API rate limiting issues (better headers, 10s timeout)
  - ✅ Improved error handling (graceful null returns instead of exceptions)
  - ✅ Version comparison working correctly (date-based and semantic)
  - ✅ Comprehensive test coverage (25 new tests in binary-versions.test.js)
  - ✅ Update notifications working with info dialog

- [x] **Task 14**: Fix statusline version display
  - ✅ Implemented statusline with yt-dlp and ffmpeg versions
  - ✅ Added animated update badge (pulsing indicator) when updates available
  - ✅ Display last update check timestamp with full datetime tooltip
  - ✅ Manual update check button with loading states
  - ✅ Styled statusline with design system (monospace fonts, proper colors)

---

### **Priority 4: Performance & Parallel Processing** ⚡

- [ ] **Task 15**: Research parallel download architecture
  - Investigate Node.js worker threads for CPU-intensive tasks
  - Research child process pooling strategies
  - Determine optimal concurrency limits for video downloads
  - Study best practices for parallel video processing
  - Research queue management patterns

- [ ] **Task 16**: Implement multi-threaded download queue
  - Create download manager with parallel processing
  - Implement worker pool based on CPU core count
  - Utilize all CPU cores including Apple Silicon efficiency/performance cores
  - Add queue prioritization system
  - Implement proper resource cleanup

- [ ] **Task 17**: Optimize for Apple Silicon
  - Leverage M-series CPU architecture (M1/M2/M3/M4)
  - Proper core allocation (performance vs efficiency cores)
  - Detect Apple Silicon and optimize accordingly
  - Test on different M-series chip generations
  - Benchmark performance improvements

- [ ] **Task 18**: GPU acceleration research
  - Investigate hardware acceleration for ffmpeg video conversion
  - Research Apple Silicon GPU capabilities (VideoToolbox)
  - Research NVIDIA GPU acceleration (NVENC)
  - Research AMD GPU acceleration (AMF)
  - Compare performance benchmarks

- [ ] **Task 19**: Implement GPU-accelerated conversion
  - Enable hardware video encoding/decoding in ffmpeg
  - Implement VideoToolbox support for macOS (Apple Silicon and Intel)
  - Implement NVENC support for NVIDIA GPUs
  - Implement AMD AMF support for AMD GPUs
  - Add fallback to software encoding when GPU unavailable
  - Add GPU detection and capability checking

- [ ] **Task 24**: Update UI for parallel downloads
  - Add concurrent download indicators
  - Show progress for multiple simultaneous downloads
  - Add queue management controls (pause, resume, reorder)
  - Display CPU/GPU utilization metrics
  - Add download speed indicators for each active download
  - Update status badges for parallel operations

- [ ] **Task 25**: Performance benchmarking
  - Test parallel download performance vs sequential
  - Measure CPU/GPU utilization during operations
  - Optimize thread pool size based on system capabilities
  - Test with various video sizes and formats
  - Create performance comparison reports
  - Identify and fix bottlenecks

---

### **Priority 5: New Features - YouTube Enhancements** 🚀

- [ ] **Task 20**: Add YouTube playlist parsing
  - Implement playlist URL detection (already partially in url-validator.js)
  - Extract all video URLs from playlists using yt-dlp
  - Add batch import functionality for playlists
  - Show playlist metadata (title, video count)
  - Add option to select which videos from playlist to download
  - Handle large playlists (1000+ videos)

- [ ] **Task 21**: Test playlist feature
  - Verify playlist parsing works with various playlist sizes
  - Test with small playlists (1-10 videos)
  - Test with medium playlists (10-100 videos)
  - Test with large playlists (100-1000+ videos)
  - Test with private playlists (should fail gracefully)
  - Test with deleted/unavailable playlists
  - Test playlist + individual video mixing

- [ ] **Task 22**: Add YouTube Shorts support
  - Implement Shorts URL pattern detection (`youtube.com/shorts/`)
  - Add regex pattern to url-validator.js
  - Validate Shorts URLs and add to download queue
  - Handle Shorts-specific metadata
  - Test with various Shorts URLs

- [ ] **Task 23**: Test Shorts feature
  - Verify Shorts downloads work correctly
  - Test quality selection for Shorts
  - Test format conversion for Shorts
  - Test with various Shorts (different lengths, formats)
  - Verify metadata extraction for Shorts

---

### **Priority 6: Cross-Platform & Build** 🟢

- [ ] **Task 8**: Cross-platform build testing
  - Build and test on macOS (Intel and Apple Silicon)
  - Build and test on Windows 10/11
  - Build and test on Linux (Ubuntu, Fedora)
  - Ensure metadata service works on all platforms
  - Verify parallel downloads work cross-platform
  - Test GPU acceleration on different platforms

- [ ] **Task 11**: Production build
  - Create final production builds for all platforms
  - Build macOS DMG (Universal Binary for Intel + Apple Silicon)
  - Build Windows NSIS installer
  - Build Linux AppImage
  - Verify installer packages work correctly
  - Test auto-updater functionality

---

### **Priority 7: Documentation & Release** 🔵

- [ ] **Task 9**: Update CLAUDE.md
  - Add metadata service documentation with usage examples
  - Document parallel download architecture
  - Add GPU acceleration implementation details
  - Document Apple Silicon optimizations
  - Add best practices for new features
  - Update development workflow

- [ ] **Task 10**: Final code review
  - Review all recent changes for code quality
  - Remove any console.logs in production code
  - Ensure JSDoc comments are complete
  - Verify error handling is comprehensive
  - Check for security vulnerabilities
  - Ensure code follows project style guide

- [ ] **Task 12**: Create release notes
  - Document v2.1 changes including metadata service
  - Document performance improvements (parallel downloads, GPU acceleration)
  - Document bug fixes (binary updates, statusline)
  - Document new features (playlists, Shorts support)
  - Create changelog with version comparison
  - Prepare marketing materials and screenshots

---

## 🎯 Technical Implementation Notes

### **Parallel Downloads Architecture**
```javascript
// Use Node.js worker threads for CPU-intensive tasks
const { Worker } = require('worker_threads');
const os = require('os');

// Pool of download workers based on CPU core count
const workerPool = os.cpus().length;
const maxConcurrentDownloads = Math.max(2, Math.floor(workerPool * 0.75));
```

### **Apple Silicon Optimization**
```javascript
// Detect M-series chips and utilize performance cores
const isAppleSilicon = process.arch === 'arm64' && process.platform === 'darwin';

if (isAppleSilicon) {
  // M1/M2/M3/M4 have 4-12 performance cores + 4 efficiency cores
  // Set higher concurrency for performance cores
  const performanceCores = 8; // Adjust based on chip model
  maxConcurrentDownloads = performanceCores;
}
```

### **GPU Acceleration (ffmpeg)**
```bash
# macOS VideoToolbox (Apple Silicon & Intel)
ffmpeg -hwaccel videotoolbox -i input.mp4 -c:v h264_videotoolbox output.mp4

# Windows NVENC (NVIDIA GPUs)
ffmpeg -hwaccel cuda -i input.mp4 -c:v h264_nvenc output.mp4

# AMD AMF (AMD GPUs)
ffmpeg -hwaccel amf -i input.mp4 -c:v h264_amf output.mp4
```

### **YouTube Shorts & Playlist Support**
```javascript
// YouTube Shorts pattern
const shortsRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/;

// YouTube Playlist pattern (already exists in url-validator.js)
const playlistRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/;

// Use yt-dlp to extract playlist videos
const args = ['--flat-playlist', '--dump-json', playlistUrl];
```

---

## 📊 Progress Tracking

### **Current Status**
- ✅ **Core Features**: Complete (Tasks 1-15 from original plan)
- ✅ **Metadata Service**: Implemented and integrated (Phase 1)
- ✅ **YouTube Enhancements**: Shorts & Playlists support (Phase 2)
- ✅ **Binary Management**: Fixed with statusline (Phase 3)
- ✅ **Settings UI**: Reorganized for better usability (January 2025)
- ✅ **Cookie File Bug Fix**: Metadata extraction now supports cookie files (January 2025)
- ⏳ **Parallel Processing**: Implementation pending
- ⏳ **GPU Acceleration**: Research and implementation pending

### **Estimated Timeline**
- **Tasks 1-7** (Current work + Testing): 4-6 hours
- **Tasks 13-14** (Binary fixes): 2-3 hours
- **Tasks 15-19** (Parallel/GPU): 8-12 hours
- **Tasks 20-23** (Playlists/Shorts): 4-6 hours
- **Tasks 24-25** (UI/Benchmarking): 3-4 hours
- **Tasks 8, 11** (Cross-platform/Build): 3-4 hours
- **Tasks 9-10, 12** (Documentation/Release): 2-3 hours

**Total Estimated Time**: ~25-35 hours of development work

---

## 🔄 Where the TODO List is Stored

**Cursor Internal Storage:**
- Global State: `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` (SQLite database)
- Workspace State: `~/Library/Application Support/Cursor/User/workspaceStorage/[workspace-id]/state.vscdb`

**Project Backup:**
- This file: `/Users/joachimpaul/_DEV_/GrabZilla21/TODO.md`
- Version control: Commit this file to track progress over time

---

## 📝 Notes

- **Priority**: Focus on Tasks 1-7 first (current work and testing)
- **Dependencies**: Some tasks depend on others (e.g., Task 16 depends on Task 15)
- **Flexibility**: Adjust priorities based on user feedback and critical issues
- **Testing**: Always test after implementing each feature
- **Documentation**: Update documentation as features are completed

---

**Remember**: Mark tasks as complete by changing `[ ]` to `[x]` as you finish them!
