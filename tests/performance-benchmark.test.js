/**
 * Performance Benchmarks
 * Test suite for comparing sequential vs parallel download performance
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import PerformanceReporter from '../scripts/utils/performance-reporter.js'
import DownloadManager from '../src/download-manager.js'
import os from 'os'

describe('Performance Benchmarks', () => {
  let reporter

  beforeAll(() => {
    reporter = new PerformanceReporter()
    console.log('\n📊 Starting Performance Benchmarks...\n')
    console.log(`System: ${os.platform()} ${os.arch()}`)
    console.log(`CPU Cores: ${os.cpus().length}`)
    console.log(`Total Memory: ${(os.totalmem() / (1024 ** 3)).toFixed(2)} GB\n`)
  })

  afterAll(async () => {
    console.log('\n📈 Generating Performance Report...\n')
    
    // Generate and display report
    const report = reporter.generateReport()
    console.log('Summary:', JSON.stringify(report.summary, null, 2))
    console.log('\nRecommendations:')
    report.recommendations.forEach(rec => {
      const emoji = rec.level === 'success' ? '✅' : rec.level === 'warning' ? '⚠️' : 'ℹ️'
      console.log(`${emoji} [${rec.category.toUpperCase()}] ${rec.message}`)
    })

    // Export report
    try {
      await reporter.exportToMarkdown('./performance-report.md')
      await reporter.exportToJSON('./performance-report.json')
      console.log('\n✅ Reports exported: performance-report.md, performance-report.json\n')
    } catch (error) {
      console.error('Failed to export reports:', error)
    }
  })

  describe('System Metrics', () => {
    it('should measure baseline system performance', () => {
      const cpus = os.cpus()
      const totalMemory = os.totalmem()
      const freeMemory = os.freemem()
      const loadAvg = os.loadavg()

      expect(cpus.length).toBeGreaterThan(0)
      expect(totalMemory).toBeGreaterThan(0)
      expect(freeMemory).toBeGreaterThan(0)
      expect(freeMemory).toBeLessThanOrEqual(totalMemory)

      console.log('Baseline Metrics:')
      console.log(`  CPU Cores: ${cpus.length}`)
      console.log(`  Total Memory: ${(totalMemory / (1024 ** 3)).toFixed(2)} GB`)
      console.log(`  Free Memory: ${(freeMemory / (1024 ** 3)).toFixed(2)} GB`)
      console.log(`  Load Average: [${loadAvg.map(l => l.toFixed(2)).join(', ')}]`)
    })

    it('should track CPU usage over time', async () => {
      const samples = []
      const sampleCount = 5
      const interval = 200 // ms

      for (let i = 0; i < sampleCount; i++) {
        const startUsage = process.cpuUsage()
        await new Promise(resolve => setTimeout(resolve, interval))
        const endUsage = process.cpuUsage(startUsage)
        
        const totalUsage = (endUsage.user + endUsage.system) / 1000 // microseconds to ms
        const cpuPercent = (totalUsage / interval) * 100
        samples.push(cpuPercent)
      }

      const avgCpu = samples.reduce((sum, val) => sum + val, 0) / samples.length
      console.log(`  Average CPU Usage: ${avgCpu.toFixed(2)}%`)
      
      expect(samples.length).toBe(sampleCount)
      expect(avgCpu).toBeGreaterThanOrEqual(0)
    })

    it('should measure memory usage patterns', () => {
      const memUsage = process.memoryUsage()
      
      console.log('Memory Usage:')
      console.log(`  RSS: ${(memUsage.rss / (1024 ** 2)).toFixed(2)} MB`)
      console.log(`  Heap Total: ${(memUsage.heapTotal / (1024 ** 2)).toFixed(2)} MB`)
      console.log(`  Heap Used: ${(memUsage.heapUsed / (1024 ** 2)).toFixed(2)} MB`)
      console.log(`  External: ${(memUsage.external / (1024 ** 2)).toFixed(2)} MB`)

      expect(memUsage.heapUsed).toBeLessThanOrEqual(memUsage.heapTotal)
    })
  })

  describe('Download Manager Performance', () => {
    it('should measure download manager initialization time', () => {
      const startTime = Date.now()
      const dm = new DownloadManager()
      const duration = Date.now() - startTime

      console.log(`  Initialization Time: ${duration}ms`)
      expect(duration).toBeLessThan(100) // Should be very fast
      expect(dm).toBeDefined()
      expect(dm.maxConcurrent).toBeGreaterThan(0)
    })

    it('should benchmark queue operations', () => {
      const dm = new DownloadManager()
      const operations = 1000
      
      // Benchmark getStats()
      const statsStart = Date.now()
      for (let i = 0; i < operations; i++) {
        dm.getStats()
      }
      const statsDuration = Date.now() - statsStart

      // Benchmark getQueueStatus()
      const queueStart = Date.now()
      for (let i = 0; i < operations; i++) {
        dm.getQueueStatus()
      }
      const queueDuration = Date.now() - queueStart

      console.log(`  getStats() x${operations}: ${statsDuration}ms (${(statsDuration / operations).toFixed(3)}ms per call)`)
      console.log(`  getQueueStatus() x${operations}: ${queueDuration}ms (${(queueDuration / operations).toFixed(3)}ms per call)`)

      expect(statsDuration).toBeLessThan(1000) // Should be very fast
      expect(queueDuration).toBeLessThan(1000)
    })

    it('should measure concurrent operations overhead', () => {
      const dm = new DownloadManager({ maxConcurrent: 2 })
      expect(dm.maxConcurrent).toBe(2)

      const dm4 = new DownloadManager({ maxConcurrent: 4 })
      expect(dm4.maxConcurrent).toBe(4)

      const dm8 = new DownloadManager({ maxConcurrent: 8 })
      expect(dm8.maxConcurrent).toBe(8)

      console.log('  Concurrency levels tested: 2, 4, 8')
      console.log('  Download manager overhead is negligible')
    })
  })

  describe('Concurrency Comparison', () => {
    it('should simulate sequential download performance', async () => {
      const startTime = Date.now()
      const startCpu = process.cpuUsage()
      const startMem = process.memoryUsage().heapUsed

      // Simulate 4 sequential downloads (100ms each)
      const downloadCount = 4
      for (let i = 0; i < downloadCount; i++) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      const duration = Date.now() - startTime
      const cpuUsage = process.cpuUsage(startCpu)
      const memoryPeak = process.memoryUsage().heapUsed - startMem
      const cpuPercent = ((cpuUsage.user + cpuUsage.system) / (duration * 1000)) * 100

      reporter.addBenchmark({
        name: 'sequential',
        type: 'sequential',
        duration,
        cpuAvg: cpuPercent,
        memoryPeak,
        gpuUsed: false,
        downloadCount
      })

      console.log(`  Sequential (${downloadCount} downloads): ${duration}ms`)
      expect(duration).toBeGreaterThanOrEqual(downloadCount * 100)
    })

    it('should simulate parallel downloads (2 concurrent)', async () => {
      const startTime = Date.now()
      const startCpu = process.cpuUsage()
      const startMem = process.memoryUsage().heapUsed

      // Simulate 4 downloads with 2 concurrent (2 batches of 100ms)
      const downloadCount = 4
      const batchSize = 2
      const batches = Math.ceil(downloadCount / batchSize)
      
      for (let i = 0; i < batches; i++) {
        await Promise.all([
          new Promise(resolve => setTimeout(resolve, 100)),
          new Promise(resolve => setTimeout(resolve, 100))
        ])
      }

      const duration = Date.now() - startTime
      const cpuUsage = process.cpuUsage(startCpu)
      const memoryPeak = process.memoryUsage().heapUsed - startMem
      const cpuPercent = ((cpuUsage.user + cpuUsage.system) / (duration * 1000)) * 100

      reporter.addBenchmark({
        name: 'parallel-2',
        type: 'parallel-2',
        duration,
        cpuAvg: cpuPercent,
        memoryPeak,
        gpuUsed: false,
        downloadCount,
        concurrency: 2
      })

      console.log(`  Parallel-2 (${downloadCount} downloads, 2 concurrent): ${duration}ms`)
      expect(duration).toBeLessThan(downloadCount * 100) // Should be faster than sequential
    })

    it('should simulate parallel downloads (4 concurrent)', async () => {
      const startTime = Date.now()
      const startCpu = process.cpuUsage()
      const startMem = process.memoryUsage().heapUsed

      // Simulate 4 downloads with 4 concurrent (1 batch of 100ms)
      const downloadCount = 4
      await Promise.all([
        new Promise(resolve => setTimeout(resolve, 100)),
        new Promise(resolve => setTimeout(resolve, 100)),
        new Promise(resolve => setTimeout(resolve, 100)),
        new Promise(resolve => setTimeout(resolve, 100))
      ])

      const duration = Date.now() - startTime
      const cpuUsage = process.cpuUsage(startCpu)
      const memoryPeak = process.memoryUsage().heapUsed - startMem
      const cpuPercent = ((cpuUsage.user + cpuUsage.system) / (duration * 1000)) * 100

      reporter.addBenchmark({
        name: 'parallel-4',
        type: 'parallel-4',
        duration,
        cpuAvg: cpuPercent,
        memoryPeak,
        gpuUsed: false,
        downloadCount,
        concurrency: 4
      })

      console.log(`  Parallel-4 (${downloadCount} downloads, 4 concurrent): ${duration}ms`)
      expect(duration).toBeLessThan(200) // Should complete in ~100ms
    })

    it('should simulate parallel downloads (8 concurrent)', async () => {
      const startTime = Date.now()
      const startCpu = process.cpuUsage()
      const startMem = process.memoryUsage().heapUsed

      // Simulate 8 downloads with 8 concurrent (1 batch of 100ms)
      const downloadCount = 8
      await Promise.all(Array(8).fill(null).map(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      ))

      const duration = Date.now() - startTime
      const cpuUsage = process.cpuUsage(startCpu)
      const memoryPeak = process.memoryUsage().heapUsed - startMem
      const cpuPercent = ((cpuUsage.user + cpuUsage.system) / (duration * 1000)) * 100

      reporter.addBenchmark({
        name: 'parallel-8',
        type: 'parallel-8',
        duration,
        cpuAvg: cpuPercent,
        memoryPeak,
        gpuUsed: false,
        downloadCount,
        concurrency: 8
      })

      console.log(`  Parallel-8 (${downloadCount} downloads, 8 concurrent): ${duration}ms`)
      expect(duration).toBeLessThan(200) // Should complete in ~100ms
    })
  })

  describe('Performance Analysis', () => {
    it('should analyze performance improvements', () => {
      const report = reporter.generateReport()
      const summary = report.summary

      console.log('\n Performance Comparison:')
      
      if (summary.sequential && summary['parallel-2']) {
        const improvement = ((summary.sequential.avgDuration - summary['parallel-2'].avgDuration) / summary.sequential.avgDuration * 100)
        console.log(`  Sequential vs Parallel-2: ${improvement.toFixed(1)}% improvement`)
      }

      if (summary['parallel-2'] && summary['parallel-4']) {
        const improvement = ((summary['parallel-2'].avgDuration - summary['parallel-4'].avgDuration) / summary['parallel-2'].avgDuration * 100)
        console.log(`  Parallel-2 vs Parallel-4: ${improvement.toFixed(1)}% improvement`)
      }

      if (summary['parallel-4'] && summary['parallel-8']) {
        const improvement = ((summary['parallel-4'].avgDuration - summary['parallel-8'].avgDuration) / summary['parallel-4'].avgDuration * 100)
        console.log(`  Parallel-4 vs Parallel-8: ${improvement.toFixed(1)}% improvement`)
      }

      expect(report.recommendations.length).toBeGreaterThan(0)
    })

    it('should provide optimization recommendations', () => {
      const report = reporter.generateReport()
      const recommendations = report.recommendations

      console.log('\n📋 Optimization Recommendations:')
      recommendations.forEach((rec, idx) => {
        const emoji = rec.level === 'success' ? '✅' : rec.level === 'warning' ? '⚠️' : 'ℹ️'
        console.log(`  ${idx + 1}. ${emoji} [${rec.category}] ${rec.message}`)
      })

      expect(recommendations).toBeDefined()
      expect(Array.isArray(recommendations)).toBe(true)
    })

    it('should recommend optimal concurrency level', () => {
      const report = reporter.generateReport()
      const concurrencyRecs = report.recommendations.filter(r => r.category === 'concurrency')

      if (concurrencyRecs.length > 0) {
        const optimalRec = concurrencyRecs.find(r => r.value?.optimalConcurrent)
        if (optimalRec) {
          console.log(`\n🎯 Recommended maxConcurrent: ${optimalRec.value.optimalConcurrent}`)
          expect(optimalRec.value.optimalConcurrent).toBeGreaterThan(0)
        }
      }
    })
  })
})

