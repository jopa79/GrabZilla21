// GrabZilla 2.1 - Performance Monitoring
// Tracks CPU, memory, download, and conversion metrics

const os = require('os');

/**
 * Performance monitoring system for tracking system resources and download statistics
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            downloads: [],
            conversions: [],
            cpuSamples: [],
            memorySamples: []
        };
        this.startTime = Date.now();
        this.monitorInterval = null;
        this.startMonitoring();
    }

    /**
     * Start monitoring system metrics every 2 seconds
     */
    startMonitoring() {
        this.monitorInterval = setInterval(() => {
            this.sampleSystemMetrics();
        }, 2000); // Every 2 seconds
    }

    /**
     * Sample current CPU and memory usage
     */
    sampleSystemMetrics() {
        // Calculate CPU usage
        const cpus = os.cpus();
        const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
        const totalTick = cpus.reduce((acc, cpu) => {
            return acc + Object.values(cpu.times).reduce((a, b) => a + b, 0);
        }, 0);
        const cpuUsage = 100 - (100 * totalIdle / totalTick);

        this.metrics.cpuSamples.push({
            timestamp: Date.now(),
            usage: cpuUsage,
            cores: cpus.length
        });

        // Memory usage
        const memUsage = process.memoryUsage();
        this.metrics.memorySamples.push({
            timestamp: Date.now(),
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal
        });

        // Keep only last 100 samples (~ 3 minutes of history)
        if (this.metrics.cpuSamples.length > 100) {
            this.metrics.cpuSamples.shift();
            this.metrics.memorySamples.shift();
        }
    }

    /**
     * Record a completed download
     * @param {Object} downloadData - Download information
     * @param {string} downloadData.videoId - Video ID
     * @param {number} downloadData.duration - Download duration in ms
     * @param {string} downloadData.status - Download status
     */
    recordDownload(downloadData) {
        this.metrics.downloads.push({
            videoId: downloadData.videoId,
            duration: downloadData.duration,
            success: downloadData.status === 'completed',
            timestamp: Date.now()
        });

        // Keep only last 1000 download records
        if (this.metrics.downloads.length > 1000) {
            this.metrics.downloads.shift();
        }
    }

    /**
     * Record a completed conversion
     * @param {Object} conversionData - Conversion information
     * @param {string} conversionData.videoId - Video ID
     * @param {number} conversionData.duration - Conversion duration in ms
     * @param {boolean} conversionData.usedGPU - Whether GPU was used
     */
    recordConversion(conversionData) {
        this.metrics.conversions.push({
            videoId: conversionData.videoId,
            duration: conversionData.duration,
            usedGPU: conversionData.usedGPU,
            timestamp: Date.now()
        });

        // Keep only last 1000 conversion records
        if (this.metrics.conversions.length > 1000) {
            this.metrics.conversions.shift();
        }
    }

    /**
     * Get current statistics
     * @returns {Object} Performance statistics
     */
    getStats() {
        return {
            downloads: {
                total: this.metrics.downloads.length,
                successful: this.metrics.downloads.filter(d => d.success).length,
                failed: this.metrics.downloads.filter(d => !d.success).length
            },
            conversions: {
                total: this.metrics.conversions.length,
                gpu: this.metrics.conversions.filter(c => c.usedGPU).length,
                cpu: this.metrics.conversions.filter(c => !c.usedGPU).length
            },
            system: {
                currentCPU: this.getCurrentCPU(),
                currentMemory: this.getCurrentMemory(),
                uptime: Date.now() - this.startTime
            }
        };
    }

    /**
     * Get current CPU usage percentage
     * @returns {string} CPU usage as formatted string
     */
    getCurrentCPU() {
        const latest = this.metrics.cpuSamples[this.metrics.cpuSamples.length - 1];
        return latest ? latest.usage.toFixed(1) : '0.0';
    }

    /**
     * Get current memory usage
     * @returns {Object} Memory usage in MB
     */
    getCurrentMemory() {
        const latest = this.metrics.memorySamples[this.metrics.memorySamples.length - 1];
        if (!latest) return { used: '0.0', total: '0.0' };
        return {
            used: (latest.heapUsed / 1024 / 1024).toFixed(1),
            total: (latest.heapTotal / 1024 / 1024).toFixed(1)
        };
    }

    /**
     * Get average CPU usage over recent samples
     * @param {number} samples - Number of recent samples to average (default 10)
     * @returns {number} Average CPU usage
     */
    getAverageCPU(samples = 10) {
        const recentSamples = this.metrics.cpuSamples.slice(-samples);
        if (recentSamples.length === 0) return 0;
        const sum = recentSamples.reduce((acc, sample) => acc + sample.usage, 0);
        return sum / recentSamples.length;
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.metrics = {
            downloads: [],
            conversions: [],
            cpuSamples: [],
            memorySamples: []
        };
        this.startTime = Date.now();
    }

    /**
     * Stop monitoring and clean up resources
     */
    stop() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
    }
}

module.exports = PerformanceMonitor;


