#!/bin/bash
# GrabZilla 2.1 - Sync TODO.md with GitHub Projects
# This script helps sync tasks from TODO.md to GitHub Projects board

set -e

echo "🔄 GitHub Projects Sync Script"
echo "================================"
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "Run: gh auth login"
    exit 1
fi

# Request additional scopes if needed
echo "📋 Checking GitHub CLI permissions..."
if ! gh project list --owner jopa79 &> /dev/null; then
    echo "⚠️  Additional permissions needed"
    echo "Running: gh auth refresh -s read:project -s project"
    gh auth refresh -s read:project -s project
fi

# Get project number from URL
PROJECT_URL="https://github.com/users/jopa79/projects/2"
PROJECT_NUMBER="2"
OWNER="jopa79"

echo ""
echo "📊 Project: $PROJECT_URL"
echo "👤 Owner: $OWNER"
echo ""

# List current project items
echo "📝 Current project items:"
gh project item-list $PROJECT_NUMBER --owner $OWNER --format json | jq -r '.items[] | "  - [\(.status)] \(.title)"' 2>/dev/null || echo "  (Unable to fetch - check permissions)"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Review TODO.md priorities that need to be added"
echo "2. Create issues for pending tasks:"
echo "   gh issue create --title 'Task Title' --body 'Description' --project $PROJECT_NUMBER"
echo "3. Add existing issues to project:"
echo "   gh project item-add $PROJECT_NUMBER --owner $OWNER --url <issue-url>"
echo ""
echo "📄 Current TODO.md summary:"
echo "  ✅ Priority 1: Code Management - COMPLETED"
echo "  ✅ Priority 2: Testing & Validation - COMPLETED"
echo "  ✅ Priority 3: Binary Management - COMPLETED"
echo "  ✅ Priority 4: Performance & Parallel Processing - COMPLETED"
echo "  ✅ Priority 5: YouTube Enhancements - COMPLETED"
echo "  🟢 Priority 6: Cross-Platform & Build - PENDING"
echo ""
