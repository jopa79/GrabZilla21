# Binaries Directory

This directory should contain the required binaries for GrabZilla:

## Required Files:

### macOS/Linux:
- `yt-dlp` - YouTube downloader binary
- `ffmpeg` - Video conversion binary

### Windows:
- `yt-dlp.exe` - YouTube downloader binary
- `ffmpeg.exe` - Video conversion binary

## Installation:

1. Download yt-dlp from: https://github.com/yt-dlp/yt-dlp/releases
2. Download ffmpeg from: https://ffmpeg.org/download.html
3. Place the binaries in this directory
4. Make sure they have execute permissions (chmod +x on macOS/Linux)

## Version Tracking:

The app will automatically check for updates and track versions in `versions.json`.