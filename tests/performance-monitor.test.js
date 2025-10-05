import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('Performance Monitor', () => {
    let PerformanceMonitor
    let monitor

    beforeEach(async () => {
        // Mock os module
        vi.mock('os', () => ({
            cpus: () => [
                {
                    times: { idle: 1000, user: 500, sys: 300, nice: 0, irq: 0 }
                },
                {
                    times: { idle: 1100, user: 450, sys: 250, nice: 0, irq: 0 }
                },
                {
                    times: { idle: 900, user: 600, sys: 350, nice: 0, irq: 0 }
                },
                {
                    times: { idle: 950, user: 550, sys: 300, nice: 0, irq: 0 }
                }
            ]
        }))

        // Dynamically import after mock is set up
        PerformanceMonitor = (await import('../scripts/utils/performance-monitor.js')).default
        monitor = new PerformanceMonitor()
    })

    afterEach(() => {
        if (monitor) {
            monitor.stop()
        }
        vi.clearAllMocks()
    })

    it('should initialize correctly', () => {
        expect(monitor).toBeDefined()
        expect(monitor.metrics).toBeDefined()
        expect(monitor.metrics.downloads).toEqual([])
        expect(monitor.metrics.conversions).toEqual([])
        expect(monitor.metrics.cpuSamples).toEqual([])
        expect(monitor.metrics.memorySamples).toEqual([])
        expect(monitor.startTime).toBeGreaterThan(0)
    })

    it('should sample system metrics', () => {
        monitor.sampleSystemMetrics()
        
        expect(monitor.metrics.cpuSamples.length).toBeGreaterThan(0)
        expect(monitor.metrics.memorySamples.length).toBeGreaterThan(0)

        const cpuSample = monitor.metrics.cpuSamples[0]
        expect(cpuSample).toHaveProperty('timestamp')
        expect(cpuSample).toHaveProperty('usage')
        expect(cpuSample).toHaveProperty('cores')
        expect(cpuSample.cores).toBeGreaterThan(0) // At least 1 core

        const memSample = monitor.metrics.memorySamples[0]
        expect(memSample).toHaveProperty('timestamp')
        expect(memSample).toHaveProperty('heapUsed')
        expect(memSample).toHaveProperty('heapTotal')
    })

    it('should record downloads', () => {
        const downloadData = {
            videoId: 'test-video-1',
            duration: 5000,
            status: 'completed'
        }

        monitor.recordDownload(downloadData)
        
        expect(monitor.metrics.downloads.length).toBe(1)
        expect(monitor.metrics.downloads[0].videoId).toBe('test-video-1')
        expect(monitor.metrics.downloads[0].duration).toBe(5000)
        expect(monitor.metrics.downloads[0].success).toBe(true)
    })

    it('should record failed downloads', () => {
        const downloadData = {
            videoId: 'test-video-2',
            duration: 2000,
            status: 'error'
        }

        monitor.recordDownload(downloadData)
        
        expect(monitor.metrics.downloads.length).toBe(1)
        expect(monitor.metrics.downloads[0].success).toBe(false)
    })

    it('should record conversions', () => {
        const conversionData = {
            videoId: 'test-video-3',
            duration: 8000,
            usedGPU: true
        }

        monitor.recordConversion(conversionData)
        
        expect(monitor.metrics.conversions.length).toBe(1)
        expect(monitor.metrics.conversions[0].videoId).toBe('test-video-3')
        expect(monitor.metrics.conversions[0].duration).toBe(8000)
        expect(monitor.metrics.conversions[0].usedGPU).toBe(true)
    })

    it('should get comprehensive stats', () => {
        // Add some data
        monitor.recordDownload({ videoId: 'v1', duration: 5000, status: 'completed' })
        monitor.recordDownload({ videoId: 'v2', duration: 3000, status: 'completed' })
        monitor.recordDownload({ videoId: 'v3', duration: 2000, status: 'error' })
        
        monitor.recordConversion({ videoId: 'v1', duration: 8000, usedGPU: true })
        monitor.recordConversion({ videoId: 'v2', duration: 6000, usedGPU: false })

        const stats = monitor.getStats()
        
        expect(stats).toHaveProperty('downloads')
        expect(stats.downloads.total).toBe(3)
        expect(stats.downloads.successful).toBe(2)
        expect(stats.downloads.failed).toBe(1)

        expect(stats).toHaveProperty('conversions')
        expect(stats.conversions.total).toBe(2)
        expect(stats.conversions.gpu).toBe(1)
        expect(stats.conversions.cpu).toBe(1)

        expect(stats).toHaveProperty('system')
        expect(stats.system).toHaveProperty('currentCPU')
        expect(stats.system).toHaveProperty('currentMemory')
        expect(stats.system).toHaveProperty('uptime')
    })

    it('should limit CPU sample history to 100', () => {
        // Add more than 100 samples
        for (let i = 0; i < 150; i++) {
            monitor.sampleSystemMetrics()
        }
        
        expect(monitor.metrics.cpuSamples.length).toBeLessThanOrEqual(100)
        expect(monitor.metrics.memorySamples.length).toBeLessThanOrEqual(100)
    })

    it('should limit download history to 1000', () => {
        // Add more than 1000 downloads
        for (let i = 0; i < 1050; i++) {
            monitor.recordDownload({
                videoId: `video-${i}`,
                duration: 1000,
                status: 'completed'
            })
        }
        
        expect(monitor.metrics.downloads.length).toBeLessThanOrEqual(1000)
    })

    it('should limit conversion history to 1000', () => {
        // Add more than 1000 conversions
        for (let i = 0; i < 1050; i++) {
            monitor.recordConversion({
                videoId: `video-${i}`,
                duration: 1000,
                usedGPU: i % 2 === 0
            })
        }
        
        expect(monitor.metrics.conversions.length).toBeLessThanOrEqual(1000)
    })

    it('should get current CPU usage', () => {
        monitor.sampleSystemMetrics()
        
        const currentCPU = monitor.getCurrentCPU()
        expect(currentCPU).toBeDefined()
        expect(typeof currentCPU).toBe('string')
        expect(parseFloat(currentCPU)).toBeGreaterThanOrEqual(0)
        expect(parseFloat(currentCPU)).toBeLessThanOrEqual(100)
    })

    it('should get current memory usage', () => {
        monitor.sampleSystemMetrics()
        
        const currentMemory = monitor.getCurrentMemory()
        expect(currentMemory).toBeDefined()
        expect(currentMemory).toHaveProperty('used')
        expect(currentMemory).toHaveProperty('total')
        expect(parseFloat(currentMemory.used)).toBeGreaterThan(0)
        expect(parseFloat(currentMemory.total)).toBeGreaterThan(0)
    })

    it('should calculate average CPU usage', () => {
        // Add some samples
        for (let i = 0; i < 20; i++) {
            monitor.sampleSystemMetrics()
        }
        
        const avgCPU = monitor.getAverageCPU(10)
        expect(avgCPU).toBeDefined()
        expect(typeof avgCPU).toBe('number')
        expect(avgCPU).toBeGreaterThanOrEqual(0)
        expect(avgCPU).toBeLessThanOrEqual(100)
    })

    it('should reset metrics', () => {
        // Add some data
        monitor.recordDownload({ videoId: 'v1', duration: 5000, status: 'completed' })
        monitor.recordConversion({ videoId: 'v1', duration: 8000, usedGPU: true })
        monitor.sampleSystemMetrics()

        // Reset
        monitor.reset()

        expect(monitor.metrics.downloads).toEqual([])
        expect(monitor.metrics.conversions).toEqual([])
        expect(monitor.metrics.cpuSamples).toEqual([])
        expect(monitor.metrics.memorySamples).toEqual([])
    })

    it('should stop monitoring', () => {
        expect(monitor.monitorInterval).not.toBeNull()
        
        monitor.stop()
        
        expect(monitor.monitorInterval).toBeNull()
    })

    it('should handle multiple stop calls gracefully', () => {
        monitor.stop()
        monitor.stop() // Should not throw
        
        expect(monitor.monitorInterval).toBeNull()
    })

    it('should return default values when no samples exist', () => {
        const newMonitor = new PerformanceMonitor()
        newMonitor.stop() // Stop sampling
        
        const currentCPU = newMonitor.getCurrentCPU()
        expect(currentCPU).toBe('0.0')
        
        const currentMemory = newMonitor.getCurrentMemory()
        expect(currentMemory.used).toBe('0.0')
        expect(currentMemory.total).toBe('0.0')
        
        newMonitor.stop()
    })

    it('should sample metrics automatically every 2 seconds', (done) => {
        const newMonitor = new PerformanceMonitor()
        
        // Wait for some automatic sampling
        setTimeout(() => {
            expect(newMonitor.metrics.cpuSamples.length).toBeGreaterThan(0)
            expect(newMonitor.metrics.memorySamples.length).toBeGreaterThan(0)
            newMonitor.stop()
            done()
        }, 2500)
    }, 3000)
})

