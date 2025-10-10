#!/usr/bin/env node
/**
 * Script to replace console.* calls with logger.* calls
 * Intelligently maps console levels to logger levels
 */

const fs = require('fs');
const path = require('path');

// Files to process
const files = [
  'src/main.js',
  'src/download-manager.js',
  'src/security-utils.js'
];

function processFile(filePath) {
  console.log(`Processing ${filePath}...`);

  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  // Count occurrences before
  const beforeCount = (content.match(/console\.(log|warn|error|info)/g) || []).length;

  // Replace patterns
  const replacements = [
    // console.error with Error objects - extract message
    { pattern: /console\.error\((.*?),\s*error\)/g, replacement: 'logger.error($1, error.message)' },

    // console.error with simple messages
    { pattern: /console\.error\((.*?)\)/g, replacement: 'logger.error($1)' },

    // console.warn - keep as warn
    { pattern: /console\.warn\((.*?)\)/g, replacement: 'logger.warn($1)' },

    // console.log with debug symbols (✓, ✗, 🚀, ❌, etc.) - these are debug logs
    { pattern: /console\.log\((['"`])(?:✓|✗|🚀|❌|Starting|Fetching|Adding|Updated|Extracted|Processing|Cleaned)/g, replacement: 'logger.debug($1' },

    // console.log with important operations - map to info
    { pattern: /console\.log\((.*?)\)/g, replacement: 'logger.debug($1)' },

    // console.info - keep as info
    { pattern: /console\.info\((.*?)\)/g, replacement: 'logger.info($1)' }
  ];

  replacements.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      changes += matches.length;
    }
  });

  // Count occurrences after
  const afterCount = (content.match(/console\.(log|warn|error|info)/g) || []).length;

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✓ ${filePath}: ${beforeCount - afterCount} console.* replaced (${afterCount} remaining)`);

  return { file: filePath, changes, remaining: afterCount };
}

// Process all files
const results = files.map(processFile);

// Summary
console.log('\n=== Summary ===');
results.forEach(({ file, changes, remaining }) => {
  console.log(`${path.basename(file)}: ${changes} changes, ${remaining} remaining`);
});

const totalRemaining = results.reduce((sum, r) => sum + r.remaining, 0);
if (totalRemaining > 0) {
  console.log(`\n⚠️  ${totalRemaining} console.* statements still need manual review`);
} else {
  console.log('\n✅ All console.* statements replaced!');
}
