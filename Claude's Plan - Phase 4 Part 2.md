# Phase 4 Part 2: UI Components & Performance Monitoring

## Overview
Complete Phase 4 by adding user-facing UI components for parallel operations and comprehensive performance monitoring system.

**Estimated Time:** 4-5 hours
**Status:** Planning → Ready to Execute

---

## Current State (After Part 1)

✅ **Completed:**
- DownloadManager with priority, retry, cancellation
- GPU detection and hardware acceleration
- Process tracking and progress callbacks
- Comprehensive tests (29 new tests)

⚠️ **Needs Implementation:**
- UI components for queue visualization
- Performance monitoring system
- CPU/GPU utilization display
- Settings panel for GPU toggle

---

## Implementation Plan

### **Task 1: Add AppState GPU Configuration** (15 min)

#### File: `scripts/models/AppState.js`

Add GPU settings to config:

```javascript
this.config = {
  quality: '720p',
  format: 'mp4',
  savePath: '',
  cookieFile: null,
  useGPU: true,              // NEW: Enable GPU acceleration
  maxConcurrent: null        // NEW: Override auto-detection (null = auto)
}
```

**Success Criteria:**
- Config includes GPU settings
- Default values set correctly
- State persistence includes new fields

---

### **Task 2: Create Performance Monitor Module** (45 min)

#### File: `scripts/utils/performance-monitor.js` (NEW)

```javascript
const os = require('os')

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      downloads: [],
      conversions: [],
      cpuSamples: [],
      memorySamples: []
    }
    this.startTime = Date.now()
    this.startMonitoring()
  }

  startMonitoring() {
    this.monitorInterval = setInterval(() => {
      this.sampleSystemMetrics()
    }, 2000) // Every 2 seconds
  }

  sampleSystemMetrics() {
    // Calculate CPU usage
    const cpus = os.cpus()
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0)
    const totalTick = cpus.reduce((acc, cpu) => {
      return acc + Object.values(cpu.times).reduce((a, b) => a + b, 0)
    }, 0)
    const cpuUsage = 100 - (100 * totalIdle / totalTick)

    this.metrics.cpuSamples.push({
      timestamp: Date.now(),
      usage: cpuUsage,
      cores: cpus.length
    })

    // Memory usage
    const memUsage = process.memoryUsage()
    this.metrics.memorySamples.push({
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal
    })

    // Keep only last 100 samples
    if (this.metrics.cpuSamples.length > 100) {
      this.metrics.cpuSamples.shift()
      this.metrics.memorySamples.shift()
    }
  }

  recordDownload(downloadData) {
    this.metrics.downloads.push({
      videoId: downloadData.videoId,
      duration: downloadData.duration,
      success: downloadData.status === 'completed'
    })
  }

  recordConversion(conversionData) {
    this.metrics.conversions.push({
      videoId: conversionData.videoId,
      duration: conversionData.duration,
      usedGPU: conversionData.usedGPU
    })
  }

  getStats() {
    return {
      downloads: {
        total: this.metrics.downloads.length,
        successful: this.metrics.downloads.filter(d => d.success).length
      },
      conversions: {
        total: this.metrics.conversions.length,
        gpu: this.metrics.conversions.filter(c => c.usedGPU).length,
        cpu: this.metrics.conversions.filter(c => !c.usedGPU).length
      },
      system: {
        currentCPU: this.getCurrentCPU(),
        currentMemory: this.getCurrentMemory()
      }
    }
  }

  getCurrentCPU() {
    const latest = this.metrics.cpuSamples[this.metrics.cpuSamples.length - 1]
    return latest ? latest.usage.toFixed(1) : 0
  }

  getCurrentMemory() {
    const latest = this.metrics.memorySamples[this.metrics.memorySamples.length - 1]
    if (!latest) return { used: 0, total: 0 }
    return {
      used: (latest.heapUsed / 1024 / 1024).toFixed(1),
      total: (latest.heapTotal / 1024 / 1024).toFixed(1)
    }
  }

  stop() {
    if (this.monitorInterval) clearInterval(this.monitorInterval)
  }
}

module.exports = PerformanceMonitor
```

**IPC Integration in src/main.js:**

```javascript
const PerformanceMonitor = require('../scripts/utils/performance-monitor')
const performanceMonitor = new PerformanceMonitor()

// Add IPC handler
ipcMain.handle('get-performance-stats', async () => {
  return performanceMonitor.getStats()
})

// Record events
downloadManager.on('downloadCompleted', (data) => {
  performanceMonitor.recordDownload(data)
})
```

**Success Criteria:**
- CPU/memory sampled every 2 seconds
- Download/conversion metrics recorded
- Stats available via IPC
- Automatic cleanup of old samples

---

### **Task 3: Add Settings Panel UI** (30 min)

#### File: `index.html`

Add settings modal after control panel:

```html
<!-- Settings Modal -->
<div id="settingsModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center">
  <div class="bg-[#314158] border border-[#45556c] rounded-lg p-6 w-[500px] max-h-[600px] overflow-y-auto">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-[#cad5e2]">Settings</h2>
      <button id="closeSettingsBtn" class="text-[#90a1b9] hover:text-[#cad5e2]">
        ✕
      </button>
    </div>

    <!-- Performance Settings -->
    <div class="space-y-4">
      <h3 class="text-sm font-semibold text-[#cad5e2] mb-3">Performance</h3>

      <!-- GPU Acceleration -->
      <label class="flex items-center justify-between">
        <span class="text-sm text-[#90a1b9]">GPU Acceleration</span>
        <input type="checkbox" id="useGPUCheckbox" checked
               class="w-4 h-4 text-[#155dfc] bg-[#1d293d] border-[#45556c] rounded focus:ring-[#155dfc]">
      </label>
      <p id="gpuInfo" class="text-xs text-[#62748e]">Detecting GPU...</p>

      <!-- Max Concurrent Downloads -->
      <div>
        <label class="flex items-center justify-between mb-2">
          <span class="text-sm text-[#90a1b9]">Max Concurrent Downloads</span>
          <span id="concurrentValue" class="text-sm text-[#cad5e2]">Auto (4)</span>
        </label>
        <input type="range" id="maxConcurrentSlider" min="2" max="8" value="0"
               class="w-full h-2 bg-[#1d293d] rounded-lg appearance-none cursor-pointer">
        <div class="flex justify-between text-xs text-[#62748e] mt-1">
          <span>2</span>
          <span>Auto</span>
          <span>8</span>
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <button id="saveSettingsBtn"
            class="w-full mt-6 px-4 py-2 bg-[#155dfc] hover:bg-[#1247d4] text-white rounded-lg">
      Save Settings
    </button>
  </div>
</div>
```

**Button to open settings (in control panel):**

```html
<button id="settingsBtn" class="...">
  <img src="assets/icons/settings.svg" alt="" width="16" height="16">
  Settings
</button>
```

**Success Criteria:**
- Settings modal with GPU toggle
- Concurrent downloads slider (2-8, 0=auto)
- GPU info displayed from detection
- Save button updates config

---

### **Task 4: Add Queue Status Panel** (45 min)

#### File: `index.html`

Add after control panel, before footer:

```html
<!-- Queue Status Panel -->
<div id="queuePanel" class="bg-[#314158] border border-[#45556c] rounded-lg p-4 mb-4">
  <div class="flex items-center justify-between mb-3">
    <h3 class="text-sm font-semibold text-[#cad5e2]">Download Queue</h3>
    <div class="flex items-center gap-2 text-xs">
      <span class="text-[#90a1b9]">Active:</span>
      <span id="activeCount" class="text-[#cad5e2] font-mono">0</span>
      <span class="text-[#90a1b9]">/</span>
      <span id="maxConcurrentDisplay" class="text-[#cad5e2] font-mono">4</span>
      <span class="text-[#90a1b9] ml-4">Queued:</span>
      <span id="queuedCount" class="text-[#cad5e2] font-mono">0</span>
    </div>
  </div>

  <!-- System Metrics -->
  <div class="grid grid-cols-3 gap-4 pt-3 border-t border-[#45556c]">
    <div>
      <div class="text-xs text-[#62748e]">CPU Usage</div>
      <div id="cpuUsage" class="text-sm text-[#cad5e2] font-mono">--</div>
    </div>
    <div>
      <div class="text-xs text-[#62748e]">Memory</div>
      <div id="memoryUsage" class="text-sm text-[#cad5e2] font-mono">--</div>
    </div>
    <div>
      <div class="text-xs text-[#62748e]">GPU Accel</div>
      <div id="gpuStatus" class="text-sm text-[#cad5e2] font-mono">--</div>
    </div>
  </div>
</div>
```

**Success Criteria:**
- Queue stats displayed (active/max/queued)
- System metrics updated every 2 seconds
- GPU status shows type or "Software"
- Clean, compact design

---

### **Task 5: Implement UI Logic in app.js** (1.5 hours)

#### File: `scripts/app.js`

Add settings management:

```javascript
// Settings modal handlers
initSettingsModal() {
  const modal = document.getElementById('settingsModal')
  const settingsBtn = document.getElementById('settingsBtn')
  const closeBtn = document.getElementById('closeSettingsBtn')
  const saveBtn = document.getElementById('saveSettingsBtn')

  settingsBtn?.addEventListener('click', () => this.openSettings())
  closeBtn?.addEventListener('click', () => this.closeSettings())
  saveBtn?.addEventListener('click', () => this.saveSettings())
}

async openSettings() {
  const modal = document.getElementById('settingsModal')
  modal.classList.remove('hidden')

  // Load current settings
  const useGPU = document.getElementById('useGPUCheckbox')
  const slider = document.getElementById('maxConcurrentSlider')

  useGPU.checked = this.state.config.useGPU
  slider.value = this.state.config.maxConcurrent || 0

  // Get GPU info
  const gpuInfo = await window.IPCManager.getGPUInfo()
  this.displayGPUInfo(gpuInfo)
}

saveSettings() {
  const useGPU = document.getElementById('useGPUCheckbox').checked
  const maxConcurrent = parseInt(document.getElementById('maxConcurrentSlider').value)

  this.state.updateConfig({
    useGPU,
    maxConcurrent: maxConcurrent === 0 ? null : maxConcurrent
  })

  this.closeSettings()
}

// Queue panel updates
async updateQueuePanel() {
  const stats = await window.IPCManager.getDownloadStats()

  document.getElementById('activeCount').textContent = stats.active
  document.getElementById('maxConcurrentDisplay').textContent = stats.maxConcurrent
  document.getElementById('queuedCount').textContent = stats.queued
}

// Performance metrics
async updatePerformanceMetrics() {
  const stats = await window.IPCManager.getPerformanceStats()

  document.getElementById('cpuUsage').textContent = `${stats.system.currentCPU}%`

  const mem = stats.system.currentMemory
  document.getElementById('memoryUsage').textContent = `${mem.used}/${mem.total} MB`

  const gpuStatus = this.state.config.useGPU && stats.gpu?.type
    ? stats.gpu.type
    : 'Software'
  document.getElementById('gpuStatus').textContent = gpuStatus
}

// Start monitoring
startMonitoring() {
  // Update every 2 seconds
  this.monitoringInterval = setInterval(() => {
    this.updateQueuePanel()
    this.updatePerformanceMetrics()
  }, 2000)
}
```

**Success Criteria:**
- Settings modal opens/closes correctly
- GPU info displayed from detection
- Settings saved to AppState
- Queue panel updates every 2 seconds
- Performance metrics displayed

---

### **Task 6: Add IPC Handlers** (30 min)

#### File: `src/preload.js`

```javascript
// Performance monitoring
getPerformanceStats: () => ipcRenderer.invoke('get-performance-stats'),

// GPU info
getGPUInfo: () => ipcRenderer.invoke('get-gpu-info'),

// Download stats (already exists, verify)
getDownloadStats: () => ipcRenderer.invoke('get-download-stats')
```

#### File: `src/main.js`

```javascript
// GPU info handler
ipcMain.handle('get-gpu-info', async () => {
  const gpuDetector = require('../scripts/utils/gpu-detector')
  const capabilities = await gpuDetector.detect()

  return {
    hasGPU: capabilities.hasGPU,
    type: capabilities.type,
    description: capabilities.description,
    encoders: capabilities.encoders
  }
})
```

**Success Criteria:**
- IPC handlers registered
- GPU info accessible from renderer
- Performance stats accessible
- No TypeErrors or missing methods

---

### **Task 7: Add CSS Styling** (15 min)

#### File: `styles/main.css`

```css
/* Queue Panel */
#queuePanel {
  font-family: ui-monospace, "SF Mono", Monaco, "Cascadia Code", monospace;
}

/* Settings Modal */
#settingsModal {
  backdrop-filter: blur(4px);
}

/* Range Slider */
input[type="range"] {
  accent-color: var(--primary-blue);
}

input[type="range"]::-webkit-slider-thumb {
  background: var(--primary-blue);
  cursor: pointer;
}

/* Checkbox */
input[type="checkbox"]:checked {
  background-color: var(--primary-blue);
  border-color: var(--primary-blue);
}
```

**Success Criteria:**
- Queue panel uses monospace font
- Settings modal has backdrop blur
- Range slider styled with primary blue
- Checkbox matches design system

---

### **Task 8: Testing** (45 min)

#### File: `tests/performance-monitor.test.js` (NEW)

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import PerformanceMonitor from '../scripts/utils/performance-monitor.js'

describe('Performance Monitor', () => {
  let monitor

  beforeEach(() => {
    monitor = new PerformanceMonitor()
  })

  afterEach(() => {
    monitor.stop()
  })

  it('should initialize correctly', () => {
    expect(monitor.metrics).toBeDefined()
    expect(monitor.startTime).toBeGreaterThan(0)
  })

  it('should sample system metrics', () => {
    monitor.sampleSystemMetrics()
    expect(monitor.metrics.cpuSamples.length).toBeGreaterThan(0)
    expect(monitor.metrics.memorySamples.length).toBeGreaterThan(0)
  })

  it('should record downloads', () => {
    monitor.recordDownload({
      videoId: 'test1',
      duration: 5000,
      status: 'completed'
    })
    expect(monitor.metrics.downloads.length).toBe(1)
  })

  it('should get stats', () => {
    const stats = monitor.getStats()
    expect(stats).toHaveProperty('downloads')
    expect(stats).toHaveProperty('conversions')
    expect(stats).toHaveProperty('system')
  })

  it('should limit sample history to 100', () => {
    for (let i = 0; i < 150; i++) {
      monitor.sampleSystemMetrics()
    }
    expect(monitor.metrics.cpuSamples.length).toBeLessThanOrEqual(100)
  })
})
```

**Success Criteria:**
- All performance monitor tests pass
- Integration tests for IPC handlers
- UI component visibility tests

---

## Implementation Order

1. **AppState GPU Config** (15 min) - Foundation for settings
2. **Performance Monitor Module** (45 min) - Core monitoring system
3. **IPC Handlers** (30 min) - Bridge for data access
4. **Settings Panel UI** (30 min) - User configuration interface
5. **Queue Status Panel** (45 min) - Real-time status display
6. **UI Logic in app.js** (1.5 hours) - Wire everything together
7. **CSS Styling** (15 min) - Polish the UI
8. **Testing** (45 min) - Quality assurance

**Total Time:** ~4.5 hours

---

## Success Metrics

### Functional Requirements
- ✅ Settings modal opens and saves GPU/concurrency settings
- ✅ Queue panel shows active/queued download counts
- ✅ Performance metrics update every 2 seconds
- ✅ GPU info displayed correctly (type or "Software")
- ✅ CPU and memory usage displayed

### Performance Requirements
- ✅ UI updates don't block main thread
- ✅ Metrics sampling minimal CPU overhead (< 1%)
- ✅ Settings save instantly to state

### User Experience
- ✅ Clean, intuitive settings interface
- ✅ Real-time feedback on system performance
- ✅ GPU status clearly communicated
- ✅ Concurrency slider with visual feedback

---

## Next Actions

Once approved, I'll execute in this order:

1. Add GPU config to AppState
2. Create PerformanceMonitor module
3. Add IPC handlers for GPU info and performance stats
4. Build Settings modal HTML
5. Build Queue status panel HTML
6. Implement UI logic in app.js
7. Add CSS styling
8. Create tests

Ready to begin! 🚀
