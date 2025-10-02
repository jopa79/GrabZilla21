---
inclusion: always
---

# Context7 MCP Integration Guide

## Mandatory Documentation Lookup

**MUST use Context7 MCP before implementing:**
- Binary execution (`child_process.spawn`, `execFile`)
- Electron IPC patterns (main ↔ renderer communication)
- File system operations (downloads, path validation)
- Video processing (yt-dlp/ffmpeg command construction)
- URL parsing and validation logic
- Error handling patterns for async operations

## Library Resolution

**Required Context7 library searches:**
- **Electron**: Search "electron" → Use exact library ID for IPC/security docs
- **Node.js**: Search "node" → Core modules (fs, child_process, path, url, stream)
- **yt-dlp**: Search "yt-dlp" → Command options, output formats, error codes
- **ffmpeg**: Search "ffmpeg" → Codec parameters, conversion options

## Implementation Protocol

1. **Documentation first**: Query Context7 before writing any code
2. **Security validation**: Look up input sanitization patterns
3. **Error boundaries**: Research exception handling for subprocess operations
4. **Platform compatibility**: Verify cross-platform behavior (Windows/macOS/Linux)
5. **Performance patterns**: Check async/await best practices

## Critical Documentation Areas

### Process Management
- `spawn()` vs `execFile()` selection criteria
- stdio pipe configuration (`['pipe', 'pipe', 'pipe']`)
- Process lifecycle (spawn → monitor → cleanup)
- Signal handling and graceful termination
- Command injection prevention

### Electron Architecture
- Preload script security (`contextIsolation`, `nodeIntegration: false`)
- IPC channel design (`ipcMain.handle`, `ipcRenderer.invoke`)
- Renderer sandboxing and privilege escalation prevention
- File access through main process only

### Binary Integration
- yt-dlp format codes (`-f "best[height<=720]"`)
- ffmpeg codec selection (`-c:v libx264`, `-c:a aac`)
- Progress monitoring (stdout parsing, regex patterns)
- Metadata extraction (`--dump-json`, `--no-download`)
- Cookie file handling for authentication

### Error Handling
- Process exit codes and stderr parsing
- Network timeout handling (5s max for API calls)
- Graceful degradation when binaries missing
- User-friendly error message mapping

## Query Optimization

**Effective searches:**
- "electron contextIsolation preload security"
- "child_process spawn stdio error handling node"
- "yt-dlp format selection quality options"
- "ffmpeg mp4 conversion parameters"

**Avoid generic terms:**
- "electron basics"
- "node subprocess"
- "video download"