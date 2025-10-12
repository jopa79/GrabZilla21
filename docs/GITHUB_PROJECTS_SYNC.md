# GitHub Projects Sync Guide

This guide helps you sync TODO.md with your GitHub Projects board at:
https://github.com/users/jopa79/projects/2/views/1

## Quick Setup

### 1. Grant GitHub CLI Permissions

Run this command to add project management scopes:

```bash
gh auth refresh -s read:project -s project -h github.com
```

This will open your browser to authorize the additional permissions.

### 2. Verify Access

Check if you can access your project:

```bash
gh project list --owner jopa79
```

You should see "GrabZilla 2.1" (project #2) in the list.

## Current TODO.md Status

### ✅ Completed Priorities (Already Done)

**Priority 1: Code Management** ✅
- All code committed and pushed
- Commit: 1698249

**Priority 2: Testing & Validation** ✅
- All tests passing (npm test)
- Metadata service verified
- Cookie file support working

**Priority 3: Binary Management** ✅
- Version checking implemented
- Statusline with updates
- Binary path management

**Priority 4: Performance & Parallel Processing** ✅
- Parallel downloads (4x faster)
- GPU acceleration
- Performance monitoring
- Metadata optimization (70% less data)

**Priority 5: YouTube Enhancements** ✅
- YouTube Shorts support
- Playlist parsing
- Batch import

### 🟢 Pending Priority (To Add to Project)

**Priority 6: Cross-Platform & Build**

Tasks to add as GitHub Issues:

1. **Cross-platform build testing**
   - Build and test on macOS (Intel and Apple Silicon)
   - Build and test on Windows 10/11
   - Build and test on Linux (Ubuntu, Fedora, Arch)

2. **Distribution setup**
   - Configure electron-builder for all platforms
   - Create installers (DMG, NSIS, AppImage)
   - Code signing setup
   - Auto-update configuration

3. **Release pipeline**
   - GitHub Actions workflow for builds
   - Automated testing on all platforms
   - Release notes generation
   - Version bumping automation

## Manual Sync Options

### Option A: Create Issues via GitHub CLI

```bash
# Create an issue and add to project
gh issue create \
  --title "Cross-platform build testing" \
  --body "Build and test on macOS, Windows, and Linux" \
  --label "priority-6" \
  --project "jopa79/2"

gh issue create \
  --title "Distribution setup with electron-builder" \
  --body "Configure installers for DMG, NSIS, AppImage" \
  --label "priority-6" \
  --project "jopa79/2"

gh issue create \
  --title "Release pipeline automation" \
  --body "GitHub Actions workflow for automated builds" \
  --label "priority-6" \
  --project "jopa79/2"
```

### Option B: Create Issues via GitHub Web UI

1. Go to: https://github.com/jopa79/GrabZilla21/issues
2. Click "New Issue"
3. Fill in title and description from TODO.md
4. Add labels (e.g., "priority-6", "enhancement")
5. Link to project: Select "Projects" → "GrabZilla 2.1"

### Option C: Bulk Create via Script

Run the sync script:

```bash
./scripts/sync-github-projects.sh
```

This will:
- Check GitHub CLI setup
- Request permissions if needed
- Show current project status
- Provide commands to sync tasks

## Keeping in Sync

### When completing tasks in TODO.md:

1. **Update TODO.md** (mark task as completed)
2. **Update GitHub Issue** (close issue or move to "Done")
3. **Commit changes** (git commit with reference to issue #)

Example:
```bash
git commit -m "feat: Complete cross-platform builds

- ✅ macOS Intel and Apple Silicon builds
- ✅ Windows 10/11 builds
- ✅ Linux builds (Ubuntu, Fedora)

Closes #42"
```

### Automation Ideas

You could set up GitHub Actions to:
- Auto-create issues from TODO.md changes
- Update project board when commits reference issues
- Sync completed tasks back to TODO.md

## Current Project Status

Based on TODO.md (as of Jan 7, 2025):

| Priority | Status | Tasks Completed | Tasks Pending |
|----------|--------|-----------------|---------------|
| P1: Code Management | ✅ Done | 1/1 | 0 |
| P2: Testing | ✅ Done | 3/7 | 4* |
| P3: Binary Mgmt | ✅ Done | All | 0 |
| P4: Performance | ✅ Done | 6/6 | 0 |
| P5: YouTube | ✅ Done | 4/4 | 0 |
| P6: Cross-Platform | 🟢 Pending | 0/3 | 3 |

*P2 remaining tasks are optional/future enhancements

## Next Steps

1. ✅ Run `gh auth refresh` to grant permissions (if needed)
2. Create 3 issues for Priority 6 tasks
3. Add issues to your project board
4. Start working on cross-platform builds
5. Update TODO.md and GitHub Issues as you progress

---

**Questions?** Check the GitHub CLI docs: https://cli.github.com/manual/
