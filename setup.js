#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

console.log('🚀 Setting up GrabZilla development environment...\n');

// Platform detection
const platform = process.platform; // 'darwin', 'win32', 'linux'
const arch = process.arch; // 'x64', 'arm64', etc.

console.log(`📋 Platform: ${platform} ${arch}`);

// Create necessary directories
const dirs = [
  'binaries',
  'assets/icons',
  'dist',
  'tests'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

/**
 * Download file from URL with progress tracking
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    let downloadedBytes = 0;
    let totalBytes = 0;

    https.get(url, {
      headers: {
        'User-Agent': 'GrabZilla-Setup/2.1.0'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(response.headers.location, dest)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
      }

      totalBytes = parseInt(response.headers['content-length'], 10);

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
        process.stdout.write(`\r   Progress: ${progress}% (${(downloadedBytes / 1024 / 1024).toFixed(1)} MB / ${(totalBytes / 1024 / 1024).toFixed(1)} MB)`);
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        process.stdout.write('\n');
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(dest);
      reject(err);
    });

    file.on('error', (err) => {
      file.close();
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

/**
 * Get latest yt-dlp release info from GitHub
 */
function getLatestYtDlpRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/yt-dlp/yt-dlp/releases/latest',
      method: 'GET',
      headers: {
        'User-Agent': 'GrabZilla-Setup/2.1.0',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          resolve(release);
        } catch (error) {
          reject(new Error('Failed to parse GitHub API response'));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('GitHub API request timed out'));
    });

    req.end();
  });
}

/**
 * Download and install yt-dlp
 */
async function installYtDlp() {
  console.log('\n📥 Installing yt-dlp...');

  try {
    const release = await getLatestYtDlpRelease();
    const version = release.tag_name || 'latest';
    console.log(`   Latest version: ${version}`);

    // Determine download URL based on platform
    let assetName;
    if (platform === 'darwin' || platform === 'linux') {
      assetName = 'yt-dlp';
    } else if (platform === 'win32') {
      assetName = 'yt-dlp.exe';
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const asset = release.assets.find(a => a.name === assetName);
    if (!asset) {
      throw new Error(`No suitable yt-dlp binary found for ${platform}`);
    }

    const downloadUrl = asset.browser_download_url;
    const binaryPath = path.join('binaries', assetName);

    console.log(`   Downloading from: ${downloadUrl}`);
    await downloadFile(downloadUrl, binaryPath);

    // Make executable on Unix-like systems
    if (platform !== 'win32') {
      fs.chmodSync(binaryPath, 0o755);
      console.log('   Made executable');
    }

    console.log('✅ yt-dlp installed successfully');
    return true;
  } catch (error) {
    console.error(`❌ Failed to install yt-dlp: ${error.message}`);
    return false;
  }
}

/**
 * Download and install ffmpeg
 */
async function installFfmpeg() {
  console.log('\n📥 Installing ffmpeg...');

  try {
    let downloadUrl;
    let binaryName;
    let needsExtraction = false;

    if (platform === 'darwin') {
      // For macOS, use static builds from evermeet
      downloadUrl = 'https://evermeet.cx/ffmpeg/ffmpeg-7.1.zip';
      binaryName = 'ffmpeg';
      needsExtraction = true;
    } else if (platform === 'win32') {
      // Windows: Use gyan.dev builds
      downloadUrl = 'https://github.com/GyanD/codexffmpeg/releases/download/6.1.1/ffmpeg-6.1.1-essentials_build.zip';
      binaryName = 'ffmpeg.exe';
      needsExtraction = true;
    } else if (platform === 'linux') {
      // Linux: Use johnvansickle builds
      if (arch === 'x64') {
        downloadUrl = 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz';
      } else if (arch === 'arm64') {
        downloadUrl = 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-arm64-static.tar.xz';
      } else {
        throw new Error(`Unsupported Linux architecture: ${arch}`);
      }
      binaryName = 'ffmpeg';
      needsExtraction = true;
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    console.log(`   Downloading from: ${downloadUrl}`);

    if (needsExtraction) {
      // Download archive
      const archiveName = path.basename(downloadUrl);
      const archivePath = path.join('binaries', archiveName);

      await downloadFile(downloadUrl, archivePath);

      console.log('   Extracting ffmpeg...');

      // Extract based on archive type
      const binaryPath = path.join('binaries', binaryName);

      if (archiveName.endsWith('.zip')) {
        // Use unzip command for macOS/Linux, or manual extraction for Windows
        if (platform === 'darwin') {
          execSync(`unzip -o "${archivePath}" -d binaries/`, { stdio: 'inherit' });
          // Find the ffmpeg binary in extracted files
          if (fs.existsSync('binaries/ffmpeg')) {
            // Already at root
            console.log('   Found ffmpeg at root');
          } else {
            throw new Error('ffmpeg not found after extraction');
          }
        } else if (platform === 'win32') {
          // Windows: Need to handle ZIP extraction differently
          console.log('⚠️  Manual extraction required on Windows');
          console.log(`   Please extract ${archivePath} and place ffmpeg.exe in binaries/`);
          return false;
        }
      } else if (archiveName.endsWith('.tar.xz')) {
        // Linux tar.xz extraction
        execSync(`tar -xf "${archivePath}" -C binaries/`, { stdio: 'inherit' });

        // Find ffmpeg in extracted directory
        const extractedDir = fs.readdirSync('binaries/').find(f => f.startsWith('ffmpeg-') && fs.statSync(path.join('binaries', f)).isDirectory());
        if (extractedDir) {
          const ffmpegInDir = path.join('binaries', extractedDir, 'ffmpeg');
          if (fs.existsSync(ffmpegInDir)) {
            fs.copyFileSync(ffmpegInDir, binaryPath);
            console.log(`   Copied ffmpeg from ${extractedDir}`);
          }
        }
      }

      // Clean up archive
      if (fs.existsSync(archivePath)) {
        fs.unlinkSync(archivePath);
        console.log('   Cleaned up archive');
      }

      // Make executable on Unix-like systems
      if (platform !== 'win32' && fs.existsSync(binaryPath)) {
        fs.chmodSync(binaryPath, 0o755);
        console.log('   Made executable');
      }
    } else {
      // Direct binary download (not currently used)
      const binaryPath = path.join('binaries', binaryName);
      await downloadFile(downloadUrl, binaryPath);

      if (platform !== 'win32') {
        fs.chmodSync(binaryPath, 0o755);
        console.log('   Made executable');
      }
    }

    console.log('✅ ffmpeg installed successfully');
    return true;
  } catch (error) {
    console.error(`❌ Failed to install ffmpeg: ${error.message}`);
    console.error('   You may need to install ffmpeg manually');
    return false;
  }
}

/**
 * Main setup function
 */
async function main() {
  console.log('\n🔧 Installing required binaries...\n');

  // Check if binaries already exist
  const ytdlpPath = path.join('binaries', platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  const ffmpegPath = path.join('binaries', platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');

  let ytdlpExists = fs.existsSync(ytdlpPath);
  let ffmpegExists = fs.existsSync(ffmpegPath);

  if (ytdlpExists && ffmpegExists) {
    console.log('✅ All binaries already installed');
    console.log('\n🎯 Development Commands:');
    console.log('- npm run dev     # Run in development mode');
    console.log('- npm start       # Run in production mode');
    console.log('- npm run build   # Build for current platform');
    console.log('- npm test        # Run tests\n');
    console.log('✨ Setup complete! Ready to develop GrabZilla 2.1');
    return;
  }

  // Install missing binaries
  if (!ytdlpExists) {
    await installYtDlp();
  } else {
    console.log('✅ yt-dlp already installed');
  }

  if (!ffmpegExists) {
    await installFfmpeg();
  } else {
    console.log('✅ ffmpeg already installed');
  }

  // Final status check
  ytdlpExists = fs.existsSync(ytdlpPath);
  ffmpegExists = fs.existsSync(ffmpegPath);

  console.log('\n📊 Installation Summary:');
  console.log(`   yt-dlp: ${ytdlpExists ? '✅ Installed' : '❌ Missing'}`);
  console.log(`   ffmpeg: ${ffmpegExists ? '✅ Installed' : '❌ Missing'}`);

  if (ytdlpExists && ffmpegExists) {
    console.log('\n✨ Setup complete! All binaries installed successfully');
  } else {
    console.log('\n⚠️  Some binaries could not be installed automatically');
    console.log('   Please install them manually:');
    if (!ytdlpExists) {
      console.log('   - yt-dlp: https://github.com/yt-dlp/yt-dlp/releases');
    }
    if (!ffmpegExists) {
      console.log('   - ffmpeg: https://ffmpeg.org/download.html');
    }
  }

  console.log('\n🎯 Development Commands:');
  console.log('- npm run dev     # Run in development mode');
  console.log('- npm start       # Run in production mode');
  console.log('- npm run build   # Build for current platform');
  console.log('- npm test        # Run tests');
}

// Run setup
main().catch((error) => {
  console.error('\n❌ Setup failed:', error.message);
  process.exit(1);
});
