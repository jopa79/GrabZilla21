# GrabZilla 2.1 - Future Features

**Created:** October 5, 2025
**Status:** Feature backlog for future development
**Priority:** To be determined based on user feedback

---

## 🎯 Feature Backlog

### Performance & UX

#### 1. Resume Interrupted Downloads
**Description:** Continue downloads from where they stopped instead of restarting
**Technical approach:**
- Track download progress state (bytes downloaded)
- Use yt-dlp's `--continue` flag
- Restore download state on app restart
**Estimated effort:** 4-6 hours
**User benefit:** Avoid wasted bandwidth on failed downloads

#### 3. Estimated Time Remaining
**Description:** Show ETA for each download based on current speed
**Technical approach:**
- Calculate from: (total_size - downloaded_size) / current_speed
- Update ETA every 2-3 seconds
- Display in video list (e.g., "5 min remaining")
**Estimated effort:** 3-4 hours
**User benefit:** Better visibility into download progress

#### 4. Thumbnail Preview Hover
**Description:** Show larger preview on hover over video thumbnail
**Technical approach:**
- CSS hover state with scaled thumbnail
- Preload higher-res thumbnail on hover
- Smooth transition animation
**Estimated effort:** 1-2 hours
**User benefit:** Better video identification before download

---

### Video Management

#### 5. Batch Quality/Format Change
**Description:** Change settings for multiple selected videos at once
**Technical approach:**
- Multi-select checkbox UI
- Bulk update dialog for quality/format
- Update all selected videos in state
**Estimated effort:** 3-4 hours
**User benefit:** Faster workflow when managing many videos

#### 7. Export/Import Video List
**Description:** Save and load video queues for later use
**Technical approach:**
- Export to JSON file (URLs, settings, metadata)
- Import JSON and restore video objects
- File format validation
**Estimated effort:** 4-5 hours
**User benefit:** Save work-in-progress queues, share lists with others

#### 8. Duplicate URL Detection Enhancement
**Description:** Better handling of duplicate URLs with merge option
**Technical approach:**
- Detect duplicates before adding
- Show dialog: "Skip", "Replace", or "Keep Both"
- Smart merge: keep best quality/format
**Estimated effort:** 2-3 hours
**User benefit:** Avoid accidental duplicates, smart handling

---

### Download Features

#### 9. Audio-Only Extraction
**Description:** Download just the audio track (MP3, M4A)
**Technical approach:**
- Add "Audio Only" format option
- Use yt-dlp `-f bestaudio` + `--extract-audio`
- Support MP3, M4A, FLAC, WAV formats
**Estimated effort:** 3-4 hours
**User benefit:** Smaller file sizes for music/podcasts

---

### Advanced

#### 15. Automatic Retry Logic
**Description:** Auto-retry failed downloads with exponential backoff
**Technical approach:**
- Already partially implemented in DownloadManager
- Enhance UI to show retry attempts
- Configurable max retries (default: 3)
- Exponential backoff: 5s, 15s, 45s delays
**Estimated effort:** 2-3 hours (mostly UI work)
**User benefit:** Reduce manual intervention for transient failures

---

### Integration

#### 17. Browser Extension
**Description:** Send URLs from browser to GrabZilla
**Technical approach:**
- Chrome/Firefox extension with context menu
- Native messaging protocol to Electron app
- "Send to GrabZilla" on YouTube/Vimeo pages
**Estimated effort:** 8-12 hours (extension + native messaging)
**User benefit:** Seamless browser integration

#### 18. Clipboard Monitoring
**Description:** Auto-detect URLs copied to clipboard
**Technical approach:**
- Monitor clipboard for video URLs
- Show toast notification: "Video URL detected"
- One-click to add to queue
- Enable/disable toggle in settings
**Estimated effort:** 3-4 hours
**User benefit:** Faster workflow, no manual paste

#### 19. Playlist Bulk Operations
**Description:** Better playlist management and bulk actions
**Technical approach:**
- "Download All" button for playlists
- Selective download (checkboxes per video)
- Playlist metadata (title, video count)
- Progress bar for playlist extraction
**Estimated effort:** 5-6 hours
**User benefit:** Easier batch playlist downloads

#### 20. Video Preview Player
**Description:** Preview videos before downloading
**Technical approach:**
- Embed YouTube/Vimeo player in modal
- Show video info (views, likes, description)
- Quick quality comparison
**Estimated effort:** 4-5 hours
**User benefit:** Verify video content before downloading

---

## 📊 Feature Priority Matrix

### High Impact, Low Effort (Quick Wins)
- [4] Thumbnail preview hover (1-2 hours)
- [15] Automatic retry logic UI (2-3 hours)
- [8] Duplicate URL detection enhancement (2-3 hours)

### High Impact, Medium Effort
- [9] Audio-only extraction (3-4 hours)
- [3] Estimated time remaining (3-4 hours)
- [5] Batch quality/format change (3-4 hours)
- [18] Clipboard monitoring (3-4 hours)

### High Impact, High Effort
- [1] Resume interrupted downloads (4-6 hours)
- [7] Export/Import video list (4-5 hours)
- [19] Playlist bulk operations (5-6 hours)
- [20] Video preview player (4-5 hours)
- [17] Browser extension (8-12 hours)

---

## 🚀 Suggested Implementation Order

### Phase 1: Quick Wins (5-7 hours total)
1. Thumbnail preview hover
2. Automatic retry logic UI
3. Duplicate URL detection enhancement

### Phase 2: High-Value Features (12-15 hours total)
4. Audio-only extraction
5. Estimated time remaining
6. Clipboard monitoring
7. Batch quality/format change

### Phase 3: Advanced Features (20-25 hours total)
8. Resume interrupted downloads
9. Export/Import video list
10. Playlist bulk operations
11. Video preview player

### Phase 4: Integration (8-12 hours)
12. Browser extension

---

## 💡 Implementation Notes

### Dependencies
- All features require existing architecture (DownloadManager, AppState, IPC)
- Browser extension requires separate repository/build process
- Some features may need additional npm packages

### Testing Requirements
- Each feature needs unit tests
- Integration tests for IPC-based features
- Manual testing procedures for UI features

### Documentation Updates
- CLAUDE.md patterns for new features
- HANDOFF_NOTES.md with implementation details
- User-facing README updates

---

## 📝 Feature Request Process

When implementing a feature from this list:

1. **Read feature description** - Understand requirements
2. **Check technical approach** - Review suggested implementation
3. **Estimate actual effort** - Adjust based on current codebase
4. **Create implementation plan** - Break into smaller tasks
5. **Write tests first** - TDD approach when possible
6. **Implement feature** - Follow existing patterns
7. **Update documentation** - CLAUDE.md, HANDOFF_NOTES.md, etc.
8. **Manual testing** - Verify in running app
9. **Commit with detailed message** - Explain what and why

---

## 🎯 User-Requested Features

Add user-requested features here as they come up:

- (None yet)

---

**Last Updated:** October 5, 2025
**Status:** Ready for future development
**Next Review:** After current bug fixes complete
