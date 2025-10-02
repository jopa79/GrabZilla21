# GrabZilla 2.1 - Development TODO List

**Last Updated**: September 30, 2025  
**Project Status**: Production-ready with enhancement features in progress

---

## 📋 Complete Task List

### **Priority 1: Code Management & Current Work** 🔴

- [ ] **Task 1**: Commit current changes
  - Stage and commit all modified files (README.md, index.html, app.js, models, main.js, preload.js)
  - Commit new metadata service (`scripts/services/metadata-service.js`)
  - Clean commit message describing the metadata service integration

---

### **Priority 2: Testing & Validation** 🟡

- [ ] **Task 2**: Test metadata service integration
  - Verify MetadataService works correctly with real YouTube/Vimeo URLs
  - Test caching mechanism (duplicate URL requests)
  - Test retry logic with network failures
  - Test timeout handling (30-second limit)
  - Verify fallback metadata extraction

- [ ] **Task 3**: Run existing test suite
  - Execute `npm test` to ensure all 15+ test files still pass
  - Check for any regressions after recent changes
  - Review test output for warnings or errors

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

### **Priority 3: Binary Management Fixes** 🔧

- [ ] **Task 13**: Fix binary update system
  - Debug automatic update checking for yt-dlp and ffmpeg binaries
  - Ensure version comparison works correctly
  - Fix GitHub API rate limiting issues
  - Implement proper error handling for update failures
  - Test update notifications

- [ ] **Task 14**: Fix statusline version display
  - Implement statusline/footer showing currently installed versions of yt-dlp and ffmpeg
  - Add visual indicators for update availability
  - Display binary paths and last update check time
  - Add manual update check button
  - Style statusline to match design system

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
- ✅ **Metadata Service**: Implemented and integrated
- ⏳ **Binary Management**: Fixes needed
- ⏳ **Parallel Processing**: Implementation pending
- ⏳ **GPU Acceleration**: Research and implementation pending
- ⏳ **YouTube Enhancements**: Implementation pending

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
