# GrabZilla Performance Report

**Generated:** 2025-10-02T12:29:38.801Z

## System Information

- **Platform:** darwin (arm64)
- **CPU Cores:** 16
- **Total Memory:** 128.00 GB

## Performance Summary

### sequential

- **Count:** 1
- **Average Duration:** 0.40s
- **Min Duration:** 0.40s
- **Max Duration:** 0.40s
- **Average CPU:** 0.4%
- **Average Memory Peak:** 0 MB
- **GPU Used:** No

### parallel-2

- **Count:** 1
- **Average Duration:** 0.20s
- **Min Duration:** 0.20s
- **Max Duration:** 0.20s
- **Average CPU:** 0.2%
- **Average Memory Peak:** 0 MB
- **GPU Used:** No

### parallel-4

- **Count:** 1
- **Average Duration:** 0.10s
- **Min Duration:** 0.10s
- **Max Duration:** 0.10s
- **Average CPU:** 0.8%
- **Average Memory Peak:** 0 MB
- **GPU Used:** No

### parallel-8

- **Count:** 1
- **Average Duration:** 0.10s
- **Min Duration:** 0.10s
- **Max Duration:** 0.10s
- **Average CPU:** 1.0%
- **Average Memory Peak:** 0 MB
- **GPU Used:** No

## Recommendations

✅ **CONCURRENCY:** Parallel downloads (2 concurrent) are 50.2% faster than sequential. Consider increasing default concurrency.

✅ **CONCURRENCY:** 4 concurrent downloads are 50.2% faster than 2. Recommend maxConcurrent >= 4.

ℹ️ **CONCURRENCY:** 8 concurrent downloads show diminishing returns (0.0% improvement). Recommend maxConcurrent = 4 for balanced performance.

ℹ️ **CPU:** CPU usage is low (0.6%). System can handle higher concurrency.

## Detailed Results

| Benchmark | Duration | CPU Avg | Memory Peak | GPU |
|-----------|----------|---------|-------------|-----|
| sequential | 0.40s | 0.4% | 0 MB | No |
| parallel-2 | 0.20s | 0.2% | 0 MB | No |
| parallel-4 | 0.10s | 0.8% | 0 MB | No |
| parallel-8 | 0.10s | 1.0% | 0 MB | No |
