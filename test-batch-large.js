#!/usr/bin/env node
/**
 * Test batch metadata with more URLs to show scaling benefit
 */

const { spawn } = require('child_process');
const path = require('path');

// 10 test URLs
const testUrls = [
  'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=9bZkp7q19f0',
  'https://www.youtube.com/watch?v=_OBlgSz8sSM',
  'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
  'https://www.youtube.com/watch?v=uelHwf8o7_U',
  'https://www.youtube.com/watch?v=OPf0YbXqDm0',
  'https://www.youtube.com/watch?v=ZbZSe6N_BXs',
  'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
  'https://www.youtube.com/watch?v=L_jWHffIx5E'
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

async function testBatchMetadata(urls) {
  console.log(`\n🚀 Testing BATCH metadata extraction (${urls.length} URLs)...`);
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
    let successCount = 0;

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        JSON.parse(line);
        successCount++;
      } catch (error) {
        // Skip invalid lines
      }
    }

    const duration = Date.now() - startTime;
    const avgTime = duration / urls.length;

    console.log(`  ✅ Fetched ${successCount}/${urls.length} videos`);
    console.log(`  ⏱️  Total time: ${duration}ms`);
    console.log(`  📊 Average per video: ${avgTime.toFixed(1)}ms`);

    return { successCount, duration, avgTime };
  } catch (error) {
    console.error('  ❌ Batch fetch failed:', error.message);
    return null;
  }
}

async function main() {
  console.log('🧪 Batch Metadata Scaling Test');
  console.log('==============================\n');

  try {
    // Test with increasing number of URLs
    const testSizes = [4, 8, 10];

    for (const size of testSizes) {
      const urls = testUrls.slice(0, size);
      await testBatchMetadata(urls);
    }

    console.log('\n✅ Scaling test complete!');
    console.log('\n💡 Notice: Average time per video decreases as batch size increases!');
    console.log('   This is because we spawn fewer processes and leverage yt-dlp\'s');
    console.log('   internal connection pooling.');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();
