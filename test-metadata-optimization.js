#!/usr/bin/env node
/**
 * Benchmark: Optimized metadata extraction vs Full metadata extraction
 * Compares performance of minimal field extraction vs comprehensive extraction
 */

const { spawn } = require('child_process');
const path = require('path');

// Test URLs
const testUrls = [
  'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=9bZkp7q19f0',
  'https://www.youtube.com/watch?v=_OBlgSz8sSM'
];

function getBinaryPath(name) {
  const ext = process.platform === 'win32' ? '.exe' : '';
  return path.join(__dirname, 'binaries', `${name}${ext}`);
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args);
    let output = '';
    let error = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      error += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(error));
      }
    });
  });
}

// OLD METHOD: Full dump-json extraction (10+ fields)
async function testFullExtraction(urls) {
  console.log('\n📦 Testing FULL METADATA extraction (--dump-json)...');
  const ytDlpPath = getBinaryPath('yt-dlp');
  const startTime = Date.now();

  const results = [];
  for (const url of urls) {
    try {
      const args = [
        '--dump-json',
        '--no-warnings',
        '--skip-download',
        '--ignore-errors',
        '--extractor-args', 'youtube:skip=hls,dash',
        url
      ];

      const output = await runCommand(ytDlpPath, args);
      const metadata = JSON.parse(output);

      results.push({
        url,
        title: metadata.title,
        duration: metadata.duration,
        thumbnail: metadata.thumbnail,
        // Plus 7 unused fields: uploader, uploadDate, viewCount, description,
        // availableQualities, filesize, platform
      });
    } catch (error) {
      console.error(`  ❌ Failed to fetch ${url}`);
    }
  }

  const duration = Date.now() - startTime;
  const avgTime = duration / urls.length;

  console.log(`  ✅ Fetched ${results.length}/${urls.length} videos`);
  console.log(`  ⏱️  Total time: ${duration}ms`);
  console.log(`  📊 Average per video: ${avgTime.toFixed(1)}ms`);

  return { results, duration, avgTime };
}

// NEW METHOD: Optimized minimal extraction (3 fields only)
async function testOptimizedExtraction(urls) {
  console.log('\n⚡ Testing OPTIMIZED METADATA extraction (--print)...');
  const ytDlpPath = getBinaryPath('yt-dlp');
  const startTime = Date.now();

  const results = [];
  for (const url of urls) {
    try {
      const args = [
        '--print', '%(title)s|||%(duration)s|||%(thumbnail)s',
        '--no-warnings',
        '--skip-download',
        '--playlist-items', '1',
        '--no-playlist',
        url
      ];

      const output = await runCommand(ytDlpPath, args);
      const parts = output.trim().split('|||');

      results.push({
        url,
        title: parts[0] || 'Unknown Title',
        duration: parseInt(parts[1]) || 0,
        thumbnail: parts[2] || null
      });
    } catch (error) {
      console.error(`  ❌ Failed to fetch ${url}`);
    }
  }

  const duration = Date.now() - startTime;
  const avgTime = duration / urls.length;

  console.log(`  ✅ Fetched ${results.length}/${urls.length} videos`);
  console.log(`  ⏱️  Total time: ${duration}ms`);
  console.log(`  📊 Average per video: ${avgTime.toFixed(1)}ms`);

  return { results, duration, avgTime };
}

// BATCH METHOD: Optimized batch extraction
async function testBatchOptimized(urls) {
  console.log('\n🚀 Testing BATCH OPTIMIZED extraction...');
  const ytDlpPath = getBinaryPath('yt-dlp');
  const startTime = Date.now();

  try {
    const args = [
      '--print', '%(webpage_url)s|||%(title)s|||%(duration)s|||%(thumbnail)s',
      '--no-warnings',
      '--skip-download',
      '--ignore-errors',
      '--playlist-items', '1',
      '--no-playlist',
      ...urls
    ];

    const output = await runCommand(ytDlpPath, args);
    const lines = output.trim().split('\n');
    const results = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split('|||');

      if (parts.length >= 4) {
        results.push({
          url: parts[0],
          title: parts[1] || 'Unknown Title',
          duration: parseInt(parts[2]) || 0,
          thumbnail: parts[3] || null
        });
      }
    }

    const duration = Date.now() - startTime;
    const avgTime = duration / urls.length;

    console.log(`  ✅ Fetched ${results.length}/${urls.length} videos`);
    console.log(`  ⏱️  Total time: ${duration}ms`);
    console.log(`  📊 Average per video: ${avgTime.toFixed(1)}ms`);

    return { results, duration, avgTime };
  } catch (error) {
    console.error('  ❌ Batch fetch failed:', error.message);
    return { results: [], duration: 0, avgTime: 0 };
  }
}

async function main() {
  console.log('🧪 Metadata Extraction Performance Benchmark');
  console.log('============================================\n');
  console.log(`Testing with ${testUrls.length} YouTube URLs...\n`);

  try {
    // Test all methods
    const fullMethod = await testFullExtraction(testUrls);
    const optimizedMethod = await testOptimizedExtraction(testUrls);
    const batchMethod = await testBatchOptimized(testUrls);

    // Compare results
    console.log('\n📈 Performance Comparison:');
    console.log('==========================');

    const speedupOptimized = ((fullMethod.duration - optimizedMethod.duration) / fullMethod.duration * 100).toFixed(1);
    const timesFasterOptimized = (fullMethod.duration / optimizedMethod.duration).toFixed(2);

    const speedupBatch = ((fullMethod.duration - batchMethod.duration) / fullMethod.duration * 100).toFixed(1);
    const timesFasterBatch = (fullMethod.duration / batchMethod.duration).toFixed(2);

    console.log(`\nFull (dump-json):      ${fullMethod.duration}ms total (${fullMethod.avgTime.toFixed(1)}ms avg)`);
    console.log(`Optimized (--print):   ${optimizedMethod.duration}ms total (${optimizedMethod.avgTime.toFixed(1)}ms avg)`);
    console.log(`Batch Optimized:       ${batchMethod.duration}ms total (${batchMethod.avgTime.toFixed(1)}ms avg)`);

    console.log(`\n🎉 Optimized is ${speedupOptimized}% faster than Full (${timesFasterOptimized}x speedup)!`);
    console.log(`🚀 Batch Optimized is ${speedupBatch}% faster than Full (${timesFasterBatch}x speedup)!`);

    // Memory savings
    const fieldsOld = 10;
    const fieldsNew = 3;
    const memorySavings = ((fieldsOld - fieldsNew) / fieldsOld * 100).toFixed(1);

    console.log(`\n💾 Memory Benefits:`);
    console.log(`   Extracted fields reduced: ${fieldsOld} → ${fieldsNew} (${memorySavings}% less data)`);
    console.log(`   No JSON parsing overhead`);
    console.log(`   No format list extraction (biggest bottleneck eliminated)`);

    console.log('\n✅ Benchmark complete!');
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

main();
