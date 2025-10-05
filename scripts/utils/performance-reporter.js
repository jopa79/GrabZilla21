/**
 * Performance Reporter
 * Collects and analyzes performance metrics, generates reports
 */

class PerformanceReporter {
  constructor() {
    this.benchmarks = []
    this.systemInfo = {
      platform: process.platform,
      arch: process.arch,
      cpuCores: require('os').cpus().length,
      totalMemory: require('os').totalmem()
    }
  }

  /**
   * Add a benchmark result
   * @param {Object} benchmark - Benchmark data
   */
  addBenchmark(benchmark) {
    this.benchmarks.push({
      ...benchmark,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Generate comprehensive performance report
   * @returns {Object} Performance report with summary and recommendations
   */
  generateReport() {
    return {
      systemInfo: this.systemInfo,
      summary: this.getSummary(),
      detailed: this.benchmarks,
      recommendations: this.getRecommendations(),
      generatedAt: new Date().toISOString()
    }
  }

  /**
   * Calculate summary statistics
   * @returns {Object} Summary statistics
   */
  getSummary() {
    if (this.benchmarks.length === 0) {
      return { message: 'No benchmarks recorded' }
    }

    const grouped = this.groupBenchmarksByType()
    const summary = {}

    for (const [type, benchmarks] of Object.entries(grouped)) {
      const durations = benchmarks.map(b => b.duration)
      const cpuUsages = benchmarks.map(b => b.cpuAvg).filter(v => v != null)
      const memoryPeaks = benchmarks.map(b => b.memoryPeak).filter(v => v != null)

      summary[type] = {
        count: benchmarks.length,
        avgDuration: this.average(durations),
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        avgCPU: cpuUsages.length > 0 ? this.average(cpuUsages) : null,
        avgMemoryPeak: memoryPeaks.length > 0 ? this.average(memoryPeaks) : null,
        gpuUsed: benchmarks.some(b => b.gpuUsed)
      }
    }

    return summary
  }

  /**
   * Group benchmarks by type (sequential, parallel-2, parallel-4, etc.)
   * @returns {Object} Grouped benchmarks
   */
  groupBenchmarksByType() {
    const grouped = {}
    
    for (const benchmark of this.benchmarks) {
      const type = benchmark.name || benchmark.type || 'unknown'
      if (!grouped[type]) {
        grouped[type] = []
      }
      grouped[type].push(benchmark)
    }

    return grouped
  }

  /**
   * Generate optimization recommendations based on benchmark results
   * @returns {Array} Array of recommendation objects
   */
  getRecommendations() {
    const recommendations = []
    const summary = this.getSummary()

    // Check if we have comparison data
    const types = Object.keys(summary)
    if (types.length < 2) {
      recommendations.push({
        level: 'info',
        category: 'data',
        message: 'More benchmark data needed for detailed recommendations. Run benchmarks with different concurrency levels.'
      })
      return recommendations
    }

    // Compare sequential vs parallel performance
    const sequential = summary['sequential']
    const parallel2 = summary['parallel-2']
    const parallel4 = summary['parallel-4']
    const parallel8 = summary['parallel-8']

    if (sequential && parallel2) {
      const improvement = ((sequential.avgDuration - parallel2.avgDuration) / sequential.avgDuration * 100)
      if (improvement > 30) {
        recommendations.push({
          level: 'success',
          category: 'concurrency',
          message: `Parallel downloads (2 concurrent) are ${improvement.toFixed(1)}% faster than sequential. Consider increasing default concurrency.`,
          value: { improvement, optimalConcurrent: 2 }
        })
      }
    }

    if (parallel4 && parallel2) {
      const improvement = ((parallel2.avgDuration - parallel4.avgDuration) / parallel2.avgDuration * 100)
      if (improvement > 20) {
        recommendations.push({
          level: 'success',
          category: 'concurrency',
          message: `4 concurrent downloads are ${improvement.toFixed(1)}% faster than 2. Recommend maxConcurrent >= 4.`,
          value: { improvement, optimalConcurrent: 4 }
        })
      } else if (improvement < -10) {
        recommendations.push({
          level: 'warning',
          category: 'concurrency',
          message: `4 concurrent downloads are slower than 2. System may be bottlenecked. Recommend maxConcurrent = 2.`,
          value: { improvement, optimalConcurrent: 2 }
        })
      }
    }

    if (parallel8 && parallel4) {
      const improvement = ((parallel4.avgDuration - parallel8.avgDuration) / parallel4.avgDuration * 100)
      if (improvement < 10) {
        recommendations.push({
          level: 'info',
          category: 'concurrency',
          message: `8 concurrent downloads show diminishing returns (${improvement.toFixed(1)}% improvement). Recommend maxConcurrent = 4 for balanced performance.`,
          value: { improvement, optimalConcurrent: 4 }
        })
      }
    }

    // CPU usage recommendations
    const allCpuUsages = Object.values(summary).map(s => s.avgCPU).filter(v => v != null)
    if (allCpuUsages.length > 0) {
      const avgCpu = this.average(allCpuUsages)
      if (avgCpu > 80) {
        recommendations.push({
          level: 'warning',
          category: 'cpu',
          message: `High CPU usage detected (${avgCpu.toFixed(1)}%). Consider reducing maxConcurrent to prevent system slowdown.`
        })
      } else if (avgCpu < 40) {
        recommendations.push({
          level: 'info',
          category: 'cpu',
          message: `CPU usage is low (${avgCpu.toFixed(1)}%). System can handle higher concurrency.`
        })
      }
    }

    // Memory recommendations
    const allMemoryPeaks = Object.values(summary).map(s => s.avgMemoryPeak).filter(v => v != null)
    if (allMemoryPeaks.length > 0) {
      const avgMemory = this.average(allMemoryPeaks)
      const memoryUsagePercent = (avgMemory / this.systemInfo.totalMemory) * 100
      if (memoryUsagePercent > 70) {
        recommendations.push({
          level: 'warning',
          category: 'memory',
          message: `High memory usage detected (${memoryUsagePercent.toFixed(1)}% of total). Monitor for memory leaks.`
        })
      }
    }

    // GPU recommendations
    const gpuBenchmarks = this.benchmarks.filter(b => b.gpuUsed)
    const nonGpuBenchmarks = this.benchmarks.filter(b => !b.gpuUsed && b.hasConversion)
    
    if (gpuBenchmarks.length > 0 && nonGpuBenchmarks.length > 0) {
      const gpuAvgDuration = this.average(gpuBenchmarks.map(b => b.duration))
      const cpuAvgDuration = this.average(nonGpuBenchmarks.map(b => b.duration))
      const improvement = ((cpuAvgDuration - gpuAvgDuration) / cpuAvgDuration * 100)
      
      if (improvement > 30) {
        recommendations.push({
          level: 'success',
          category: 'gpu',
          message: `GPU acceleration provides ${improvement.toFixed(1)}% performance improvement. Keep GPU acceleration enabled.`,
          value: { improvement }
        })
      }
    }

    // If no specific recommendations, add a general one
    if (recommendations.length === 0) {
      recommendations.push({
        level: 'info',
        category: 'general',
        message: 'Performance appears optimal for current system configuration.'
      })
    }

    return recommendations
  }

  /**
   * Export report to JSON file
   * @param {string} filepath - Path to save report
   */
  async exportToJSON(filepath) {
    const report = this.generateReport()
    const fs = require('fs').promises
    await fs.writeFile(filepath, JSON.stringify(report, null, 2))
    return filepath
  }

  /**
   * Export report to Markdown file
   * @param {string} filepath - Path to save report
   */
  async exportToMarkdown(filepath) {
    const report = this.generateReport()
    const fs = require('fs').promises
    
    let markdown = '# GrabZilla Performance Report\n\n'
    markdown += `**Generated:** ${report.generatedAt}\n\n`
    
    // System info
    markdown += '## System Information\n\n'
    markdown += `- **Platform:** ${report.systemInfo.platform} (${report.systemInfo.arch})\n`
    markdown += `- **CPU Cores:** ${report.systemInfo.cpuCores}\n`
    markdown += `- **Total Memory:** ${(report.systemInfo.totalMemory / (1024 ** 3)).toFixed(2)} GB\n\n`
    
    // Summary
    markdown += '## Performance Summary\n\n'
    for (const [type, stats] of Object.entries(report.summary)) {
      if (typeof stats === 'object' && stats.avgDuration) {
        markdown += `### ${type}\n\n`
        markdown += `- **Count:** ${stats.count}\n`
        markdown += `- **Average Duration:** ${(stats.avgDuration / 1000).toFixed(2)}s\n`
        markdown += `- **Min Duration:** ${(stats.minDuration / 1000).toFixed(2)}s\n`
        markdown += `- **Max Duration:** ${(stats.maxDuration / 1000).toFixed(2)}s\n`
        if (stats.avgCPU) markdown += `- **Average CPU:** ${stats.avgCPU.toFixed(1)}%\n`
        if (stats.avgMemoryPeak) markdown += `- **Average Memory Peak:** ${(stats.avgMemoryPeak / (1024 ** 2)).toFixed(0)} MB\n`
        markdown += `- **GPU Used:** ${stats.gpuUsed ? 'Yes' : 'No'}\n\n`
      }
    }
    
    // Recommendations
    markdown += '## Recommendations\n\n'
    for (const rec of report.recommendations) {
      const emoji = rec.level === 'success' ? '✅' : rec.level === 'warning' ? '⚠️' : 'ℹ️'
      markdown += `${emoji} **${rec.category.toUpperCase()}:** ${rec.message}\n\n`
    }
    
    // Detailed results
    markdown += '## Detailed Results\n\n'
    markdown += '| Benchmark | Duration | CPU Avg | Memory Peak | GPU |\n'
    markdown += '|-----------|----------|---------|-------------|-----|\n'
    for (const benchmark of report.detailed) {
      const duration = (benchmark.duration / 1000).toFixed(2) + 's'
      const cpu = benchmark.cpuAvg ? benchmark.cpuAvg.toFixed(1) + '%' : 'N/A'
      const memory = benchmark.memoryPeak ? (benchmark.memoryPeak / (1024 ** 2)).toFixed(0) + ' MB' : 'N/A'
      const gpu = benchmark.gpuUsed ? 'Yes' : 'No'
      markdown += `| ${benchmark.name} | ${duration} | ${cpu} | ${memory} | ${gpu} |\n`
    }
    
    await fs.writeFile(filepath, markdown)
    return filepath
  }

  /**
   * Calculate average of array
   * @param {Array} arr - Array of numbers
   * @returns {number} Average value
   */
  average(arr) {
    if (arr.length === 0) return 0
    return arr.reduce((sum, val) => sum + val, 0) / arr.length
  }

  /**
   * Clear all benchmarks
   */
  clear() {
    this.benchmarks = []
  }
}

module.exports = PerformanceReporter

