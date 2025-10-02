---
inclusion: manual
---

# Browser MCP Integration Guide

## When to Use Browser MCP

**Useful for development tasks:**
- Testing web-based components locally
- Validating responsive design behavior
- Debugging UI issues in browser environment
- Automated testing of web interfaces
- Research and documentation gathering

**YouTube Downloader App Context:**
- Test local development server (http://localhost:8000)
- Validate responsive behavior across screen sizes
- Debug JavaScript functionality in browser
- Test drag-and-drop URL functionality
- Validate accessibility features

## Tool Usage Protocol

1. **navigate**: Open local development server or test URLs
2. **get_clickable_elements**: Identify interactive elements for testing
3. **click/hover/form_input_fill**: Simulate user interactions
4. **screenshot**: Capture visual states for validation
5. **get_markdown/get_text**: Extract content for analysis
6. **close**: Clean up browser sessions

## Development Workflow Integration

**Local Testing:**
```javascript
// Start local server first
python3 -m http.server 8000
// Then use browser MCP to test
navigate('http://localhost:8000')
```

**Testing Scenarios:**
- URL paste and validation functionality
- Video queue management interactions
- Download progress visualization
- Error state handling
- Mobile responsive behavior

## Security Considerations

- Only navigate to trusted local development URLs
- Avoid testing with real credentials or sensitive data
- Use browser MCP for UI testing, not production interactions
- Close browser sessions after testing

## Performance Guidelines

- Take screenshots for visual regression testing
- Use `get_clickable_elements` sparingly (can be slow)
- Close browser when testing is complete
- Limit concurrent browser sessions