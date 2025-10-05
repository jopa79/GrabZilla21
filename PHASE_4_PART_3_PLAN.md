# Phase 4 Part 3: Parallel Processing Integration & Performance Benchmarking

**Start Date:** October 2, 2025  
**Estimated Time:** 9-12 hours (6-8 hours Part A + 3-4 hours Part B)  
**Status:** Planning → Implementation

---

## Overview

Complete the parallel processing system by:
1. **Part A**: Integrating DownloadManager with UI (Tasks 15-17)
2. **Part B**: Benchmarking and optimizing the system (Task 25)

---

## Part A: Parallel Processing Integration (6-8 hours)

### Task 1: Connect DownloadManager to app.js (2 hours)

**Goal**: Replace sequential download logic with parallel DownloadManager

**Files to Modify:**
- `scripts/app.js` - handleDownloadVideos() method

**Implementation Steps:**

1. **Import and Initialize DownloadManager**
```javascript
// At top of app.js
this.downloadManager = null; // Will be set via IPC

// In init()
if (window.electronAPI) {
  // DownloadManager is in main process, access via IPC
}
```

2. **Update handleDownloadVideos() Method**
```javascript
async handleDownloadVideos() {
  const videos = this.getDownloadableVideos();
  if (videos.length === 0) return;

  // Use download manager instead of sequential loop
  for (const video of videos) {
    try {
      // Add to download queue via IPC
      await window.electronAPI.queueDownload({
        videoId: video.id,
        url: video.url,
        quality: video.quality,
        format: video.format,
        savePath: this.state.config.savePath,
        cookieFile: this.state.config.cookieFile,
        priority: video.priority || 0
      });
      
      // Update UI to show queued status
      this.state.updateVideo(video.id, { status: 'queued' });
    } catch (error) {
      console.error(`Failed to queue video ${video.id}:`, error);
    }
  }
}
```

3. **Set Up Download Event Listeners**
```javascript
setupDownloadEventListeners() {
  // Listen for download started
  window.electronAPI.onDownloadStarted?.((data) => {
    this.state.updateVideo(data.videoId, { 
      status: 'downloading',
      progress: 0 
    });
  });

  // Listen for download progress (already exists)
  window.IPCManager.onDownloadProgress('app', (progressData) => {
    this.handleDownloadProgress(progressData);
  });

  // Listen for download completed
  window.electronAPI.onDownloadCompleted?.((data) => {
    this.state.updateVideo(data.videoId, {
      status: 'completed',
      progress: 100,
      filename: data.filename
    });
    this.showDownloadNotification(data.video, 'success');
  });

  // Listen for download failed
  window.electronAPI.onDownloadFailed?.((data) => {
    this.state.updateVideo(data.videoId, {
      status: 'error',
      error: data.error
    });
    this.showDownloadNotification(data.video, 'error', data.error);
  });
}
```

---

### Task 2: Add IPC Methods for Download Queue Management (1 hour)

**Files to Modify:**
- `src/preload.js` - Add new IPC methods
- `src/main.js` - Add download manager IPC handlers

**preload.js Additions:**
```javascript
// Queue management
queueDownload: (options) => ipcRenderer.invoke('queue-download', options),
cancelDownload: (videoId) => ipcRenderer.invoke('cancel-download', videoId),
pauseDownload: (videoId) => ipcRenderer.invoke('pause-download', videoId),
resumeDownload: (videoId) => ipcRenderer.invoke('resume-download', videoId),
getQueueStatus: () => ipcRenderer.invoke('get-queue-status'),

// Event listeners
onDownloadStarted: (callback) => {
  ipcRenderer.on('download-started', (event, data) => callback(data));
  return () => ipcRenderer.removeListener('download-started', callback);
},
onDownloadCompleted: (callback) => {
  ipcRenderer.on('download-completed', (event, data) => callback(data));
  return () => ipcRenderer.removeListener('download-completed', callback);
},
onDownloadFailed: (callback) => {
  ipcRenderer.on('download-failed', (event, data) => callback(data));
  return () => ipcRenderer.removeListener('download-failed', callback);
}
```

**main.js Additions:**
```javascript
// Queue download handler
ipcMain.handle('queue-download', async (event, options) => {
  try {
    const downloadId = await downloadManager.addDownload(options);
    return { success: true, downloadId };
  } catch (error) {
    console.error('Error queuing download:', error);
    return { success: false, error: error.message };
  }
});

// Pause download handler
ipcMain.handle('pause-download', async (event, videoId) => {
  try {
    const paused = downloadManager.pauseDownload(videoId);
    return { success: paused };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Resume download handler
ipcMain.handle('resume-download', async (event, videoId) => {
  try {
    const resumed = downloadManager.resumeDownload(videoId);
    return { success: resumed };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get queue status handler
ipcMain.handle('get-queue-status', async (event) => {
  try {
    const status = downloadManager.getQueueStatus();
    return { success: true, status };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Set up download manager events
downloadManager.on('downloadStarted', (data) => {
  mainWindow?.webContents.send('download-started', data);
});

downloadManager.on('downloadCompleted', (data) => {
  mainWindow?.webContents.send('download-completed', data);
  performanceMonitor.recordDownload(data);
});

downloadManager.on('downloadFailed', (data) => {
  mainWindow?.webContents.send('download-failed', data);
});
```

---

### Task 3: Update Queue Status Panel Integration (1 hour)

**Files to Modify:**
- `scripts/app.js` - updateQueuePanel() method

**Enhanced updateQueuePanel():**
```javascript
async updateQueuePanel() {
  if (!window.electronAPI || !window.electronAPI.getDownloadStats) return;

  try {
    // Get download manager stats
    const result = await window.electronAPI.getDownloadStats();
    if (result && result.success && result.stats) {
      const stats = result.stats;

      // Update counts
      document.getElementById('activeCount').textContent = stats.active || 0;
      document.getElementById('queuedCount').textContent = stats.queued || 0;
      
      // Update max concurrent from settings
      const maxConcurrent = this.state.config.maxConcurrent || stats.maxConcurrent || 4;
      document.getElementById('maxConcurrentDisplay').textContent = maxConcurrent;
    }

    // Get queue status for detailed info
    const queueResult = await window.electronAPI.getQueueStatus?.();
    if (queueResult && queueResult.success) {
      this.updateActiveDownloadsList(queueResult.status);
    }
  } catch (error) {
    console.error('Failed to update queue panel:', error);
  }
}

updateActiveDownloadsList(queueStatus) {
  // Update individual video progress bars
  queueStatus.active?.forEach(download => {
    const video = this.state.getVideo(download.videoId);
    if (video) {
      this.state.updateVideo(video.id, {
        status: 'downloading',
        progress: download.progress,
        downloadSpeed: download.speed,
        eta: download.eta
      });
    }
  });
}
```

---

### Task 4: Add Download Speed Indicators (1.5 hours)

**Files to Modify:**
- `scripts/app.js` - getStatusText() and updateVideoElement()
- `index.html` - Update video item template

**Update Video Status Display:**
```javascript
getStatusText(video) {
  switch (video.status) {
    case 'downloading':
      const speed = video.downloadSpeed ? ` (${this.formatSpeed(video.downloadSpeed)})` : '';
      const eta = video.eta ? ` - ${this.formatETA(video.eta)}` : '';
      return `Downloading ${video.progress || 0}%${speed}${eta}`;
    case 'queued':
      return 'Queued';
    case 'converting':
      return `Converting ${video.progress || 0}%`;
    case 'completed':
      return 'Completed';
    case 'error':
      return 'Error';
    case 'ready':
    default:
      return 'Ready';
  }
}

formatSpeed(bytesPerSecond) {
  if (bytesPerSecond < 1024) return `${bytesPerSecond} B/s`;
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`;
}

formatETA(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
```

---

### Task 5: Add Queue Management Controls (1.5 hours)

**Files to Modify:**
- `scripts/app.js` - Add pause/resume/cancel handlers
- Update video item template with control buttons

**Add Control Buttons to Video Items:**
```javascript
// In createVideoElement(), add control buttons
const controlsHTML = video.status === 'downloading' || video.status === 'queued' ? `
  <div class="flex items-center gap-1">
    ${video.status === 'downloading' ? `
      <button class="pause-download-btn p-1 rounded hover:bg-[#45556c]" 
              aria-label="Pause download" title="Pause">
        ⏸️
      </button>
    ` : ''}
    ${video.status === 'queued' ? `
      <button class="resume-download-btn p-1 rounded hover:bg-[#45556c]"
              aria-label="Start download" title="Start">
        ▶️
      </button>
    ` : ''}
    <button class="cancel-download-btn p-1 rounded hover:bg-red-600"
            aria-label="Cancel download" title="Cancel">
      ⏹️
    </button>
  </div>
` : '';
```

**Add Event Handlers:**
```javascript
handleVideoListClick(event) {
  const target = event.target;
  const videoItem = target.closest('.video-item');
  if (!videoItem) return;
  
  const videoId = videoItem.dataset.videoId;

  // Pause download
  if (target.closest('.pause-download-btn')) {
    this.handlePauseDownload(videoId);
    return;
  }

  // Resume download
  if (target.closest('.resume-download-btn')) {
    this.handleResumeDownload(videoId);
    return;
  }

  // Cancel download
  if (target.closest('.cancel-download-btn')) {
    this.handleCancelDownload(videoId);
    return;
  }

  // ... existing handlers
}

async handlePauseDownload(videoId) {
  try {
    const result = await window.electronAPI.pauseDownload(videoId);
    if (result.success) {
      this.state.updateVideo(videoId, { status: 'paused' });
      this.updateStatusMessage('Download paused');
    }
  } catch (error) {
    this.showError(`Failed to pause download: ${error.message}`);
  }
}

async handleResumeDownload(videoId) {
  try {
    const result = await window.electronAPI.resumeDownload(videoId);
    if (result.success) {
      this.state.updateVideo(videoId, { status: 'downloading' });
      this.updateStatusMessage('Download resumed');
    }
  } catch (error) {
    this.showError(`Failed to resume download: ${error.message}`);
  }
}

async handleCancelDownload(videoId) {
  try {
    const result = await window.electronAPI.cancelDownload(videoId);
    if (result.success) {
      this.state.updateVideo(videoId, { 
        status: 'ready',
        progress: 0,
        error: 'Cancelled by user'
      });
      this.updateStatusMessage('Download cancelled');
    }
  } catch (error) {
    this.showError(`Failed to cancel download: ${error.message}`);
  }
}
```

---

## Part B: Performance Benchmarking (3-4 hours)

### Task 6: Create Benchmark Suite (1.5 hours)

**File to Create:**
- `tests/performance-benchmark.test.js`

**Benchmark Tests:**
```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'

describe('Performance Benchmarks', () => {
  const testVideos = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Short video
    'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Medium video
    // Add more test URLs
  ];

  it('should benchmark sequential downloads', async () => {
    const startTime = Date.now();
    // Download videos sequentially
    const duration = Date.now() - startTime;
    console.log(`Sequential: ${duration}ms`);
  }, 300000); // 5 min timeout

  it('should benchmark parallel downloads (2 concurrent)', async () => {
    const startTime = Date.now();
    // Download with maxConcurrent=2
    const duration = Date.now() - startTime;
    console.log(`Parallel (2): ${duration}ms`);
  }, 300000);

  it('should benchmark parallel downloads (4 concurrent)', async () => {
    const startTime = Date.now();
    // Download with maxConcurrent=4
    const duration = Date.now() - startTime;
    console.log(`Parallel (4): ${duration}ms`);
  }, 300000);

  it('should measure CPU usage during downloads', async () => {
    // Track CPU usage throughout download
  });

  it('should measure memory usage during downloads', async () => {
    // Track memory usage
  });

  it('should measure GPU utilization', async () => {
    // Track GPU usage during conversion
  });
});
```

---

### Task 7: Create Performance Report Generator (1 hour)

**File to Create:**
- `scripts/utils/performance-reporter.js`

```javascript
class PerformanceReporter {
  constructor() {
    this.benchmarks = [];
  }

  addBenchmark(name, duration, cpuAvg, memoryPeak, gpuUsed) {
    this.benchmarks.push({
      name,
      duration,
      cpuAvg,
      memoryPeak,
      gpuUsed,
      timestamp: new Date()
    });
  }

  generateReport() {
    return {
      summary: this.getSummary(),
      detailed: this.benchmarks,
      recommendations: this.getRecommendations()
    };
  }

  getSummary() {
    // Calculate averages and best performers
  }

  getRecommendations() {
    // Provide optimization recommendations
  }

  exportToFile(filepath) {
    // Export as JSON or Markdown
  }
}
```

---

### Task 8: Optimization Based on Benchmarks (30 min)

**Files to Modify:**
- `scripts/models/AppState.js` - Adjust defaults
- `src/download-manager.js` - Tune concurrency

**Potential Optimizations:**
- Adjust default maxConcurrent based on CPU cores
- Optimize buffer sizes
- Tune retry delays
- Adjust progress update frequency

---

## Success Criteria

### Part A: Integration
- ✅ Downloads use DownloadManager (parallel processing)
- ✅ Queue status panel shows real-time counts
- ✅ Download speed displayed for active downloads
- ✅ Pause/resume/cancel controls work
- ✅ Multiple videos download simultaneously
- ✅ Progress updates correctly for all active downloads
- ✅ CPU/GPU metrics tracked during downloads

### Part B: Benchmarking
- ✅ Benchmark suite complete with tests
- ✅ Performance comparison (sequential vs parallel)
- ✅ CPU/GPU/Memory metrics collected
- ✅ Performance report generated
- ✅ Optimization recommendations documented
- ✅ System tuned based on findings

---

## Testing Plan

1. **Unit Tests**: Download manager integration
2. **Integration Tests**: Full download workflow
3. **Performance Tests**: Benchmark suite
4. **Manual Tests**: UI controls (pause/resume/cancel)
5. **Stress Tests**: Many concurrent downloads

---

## Implementation Order

1. ✅ Update TODO.md (COMPLETE)
2. Connect DownloadManager to app.js
3. Add IPC methods for queue management
4. Update queue status panel integration
5. Add download speed indicators
6. Add queue management controls
7. Create benchmark suite
8. Create performance reporter
9. Run benchmarks and optimize
10. Document findings

**Total Estimated Time**: 9-12 hours

Ready to begin implementation! 🚀

