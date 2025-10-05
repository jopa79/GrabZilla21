#!/usr/bin/env node
/**
 * Test script for batch metadata extraction
 * Tests the new optimized batch API vs individual requests
 */

const { spawn } = require('child_process');
const path = require('path');

// Test URLs from TESTING_GUIDE.md
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

async function testIndividualMetadata(urls) {
  console.log('\n🔍 Testing INDIVIDUAL metadata extraction...');
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
        duration: metadata.duration
      });
    } catch (error) {
      console.error(`  ❌ Failed to fetch ${url}:`, error.message);
    }
  }

  const duration = Date.now() - startTime;
  const avgTime = duration / urls.length;

  console.log(`  ✅ Fetched ${results.length}/${urls.length} videos`);
  console.log(`  ⏱️  Total time: ${duration}ms`);
  console.log(`  📊 Average per video: ${avgTime.toFixed(1)}ms`);

  return { results, duration, avgTime };
}

async function testBatchMetadata(urls) {
  console.log('\n🚀 Testing BATCH metadata extraction...');
  const ytDlpPath = getBinaryPath('yt-dlp');
  const startTime = Date.now();

  try {
    const args = [
      '--dump-json',
      '--no-warnings',
      '--skip-download',
      '--ignore-errors',
      '--extractor-args', 'youtube:skip=hls,dash',
      '--flat-playlist',
      ...urls
    ];

    const output = await runCommand(ytDlpPath, args);
    const lines = output.trim().split('\n');
    const results = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const metadata = JSON.parse(line);
        results.push({
          url: metadata.webpage_url || metadata.url,
          title: metadata.title,
          duration: metadata.duration
        });
      } catch (error) {
        console.error('  ⚠️  Failed to parse line');
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
  console.log('🧪 Batch Metadata Extraction Performance Test');
  console.log('============================================\n');
  console.log(`Testing with ${testUrls.length} YouTube URLs...\n`);

  try {
    // Test individual requests
    const individual = await testIndividualMetadata(testUrls);

    // Test batch request
    const batch = await testBatchMetadata(testUrls);

    // Compare results
    console.log('\n📈 Performance Comparison:');
    console.log('==========================');

    if (batch.duration > 0) {
      const speedup = ((individual.duration - batch.duration) / individual.duration * 100).toFixed(1);
      const timesFaster = (individual.duration / batch.duration).toFixed(1);

      console.log(`Individual: ${individual.duration}ms total (${individual.avgTime.toFixed(1)}ms avg)`);
      console.log(`Batch:      ${batch.duration}ms total (${batch.avgTime.toFixed(1)}ms avg)`);
      console.log(`\n🎉 Batch is ${speedup}% faster (${timesFaster}x speedup)!`);
    } else {
      console.log('❌ Batch test failed, cannot compare');
    }

    console.log('\n✅ Test complete!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();
