# GrabZilla 2.1 - Open TODOs

**Last Updated:** January 7, 2025

## Summary

All open TODO items have been created as GitHub Issues for tracking.

**Total Open Tasks:** 9
**GitHub Project:** https://github.com/users/jopa79/projects/2/views/1

---

## Open Tasks by Priority

### Priority 2: Testing & Validation (4 tasks)

These are optional enhancement tests. Core functionality is already tested and working.

| # | Task | Issue | Status |
|---|------|-------|--------|
| 4 | Write comprehensive metadata service tests | [#2](https://github.com/jopa79/GrabZilla21/issues/2) | 🟡 Optional |
| 5 | Integration testing for complete workflow | [#3](https://github.com/jopa79/GrabZilla21/issues/3) | 🟡 Optional |
| 6 | Performance validation and profiling | [#4](https://github.com/jopa79/GrabZilla21/issues/4) | 🟡 Optional |
| 7 | Edge case testing for robustness | [#5](https://github.com/jopa79/GrabZilla21/issues/5) | 🟡 Optional |

**Note:** Core tests (`npm test`) already passing. These are additional comprehensive tests for extra confidence.

---

### Priority 6: Cross-Platform & Build (2 tasks)

Required for production release.

| # | Task | Issue | Status |
|---|------|-------|--------|
| 8 | Cross-platform build testing | [#6](https://github.com/jopa79/GrabZilla21/issues/6) | 🟢 Required |
| 11 | Production builds for all platforms | [#9](https://github.com/jopa79/GrabZilla21/issues/9) | 🟢 Required |

**Dependencies:** Task 11 requires Task 8 to be completed first.

---

### Priority 7: Documentation & Release (3 tasks)

Required before v2.1 release.

| # | Task | Issue | Status |
|---|------|-------|--------|
| 9 | Update CLAUDE.md with latest architecture | [#7](https://github.com/jopa79/GrabZilla21/issues/7) | 🟢 Required |
| 10 | Final code review before release | [#8](https://github.com/jopa79/GrabZilla21/issues/8) | 🟢 Required |
| 12 | Create v2.1 release notes | [#10](https://github.com/jopa79/GrabZilla21/issues/10) | 🟢 Required |

---

## Completed Priorities (Reference)

✅ **Priority 1:** Code Management - All committed and pushed
✅ **Priority 2:** Testing (Core) - npm test passing, metadata verified
✅ **Priority 3:** Binary Management - Version checking, statusline
✅ **Priority 4:** Performance - Parallel downloads (4x faster), GPU acceleration
✅ **Priority 5:** YouTube Features - Shorts and playlist support

---

## Recommended Task Order

### Phase 1: Documentation & Review (1-2 days)
1. **Issue #7** - Update CLAUDE.md with latest features
2. **Issue #8** - Final code review and cleanup

### Phase 2: Cross-Platform Testing (2-3 days)
3. **Issue #6** - Test on macOS, Windows, Linux

### Phase 3: Production Build (1 day)
4. **Issue #9** - Create installers for all platforms

### Phase 4: Release Prep (1 day)
5. **Issue #10** - Create release notes and changelog

### Optional: Enhanced Testing (2-3 days)
- **Issue #2** - Metadata service tests
- **Issue #3** - Integration tests
- **Issue #4** - Performance profiling
- **Issue #5** - Edge case tests

---

## Quick Actions

### View all open issues:
```bash
gh issue list --state open
```

### Add issues to GitHub Project:
```bash
# First, grant project permissions
gh auth refresh -s read:project -s project -h github.com

# Then add issues to project #2
gh project item-add 2 --owner jopa79 --url https://github.com/jopa79/GrabZilla21/issues/6
gh project item-add 2 --owner jopa79 --url https://github.com/jopa79/GrabZilla21/issues/7
gh project item-add 2 --owner jopa79 --url https://github.com/jopa79/GrabZilla21/issues/8
gh project item-add 2 --owner jopa79 --url https://github.com/jopa79/GrabZilla21/issues/9
gh project item-add 2 --owner jopa79 --url https://github.com/jopa79/GrabZilla21/issues/10
```

### Start working on an issue:
```bash
git checkout -b feature/issue-6-cross-platform-testing
```

### Close an issue with commit:
```bash
git commit -m "feat: Complete cross-platform testing

Closes #6"
```

---

## Project Status

**Current Version:** 2.1.0-dev
**Target Release:** v2.1.0
**Estimated Time to Release:** 5-7 days (excluding optional tests)

**Ready For:**
- ✅ Development on macOS
- ✅ Feature complete (all Phase 1-5 done)
- ✅ Core testing complete
- 🟢 Cross-platform builds needed
- 🟢 Final documentation needed

---

## Notes

- All critical features are implemented and tested
- Optional testing tasks can be done after release
- Focus on Priority 6 & 7 for production release
- GitHub Issues created for better tracking
- See GITHUB_PROJECTS_SYNC.md for project board setup

---

**Next Step:** Start with Issue #7 (Update CLAUDE.md) or Issue #8 (Code review)
