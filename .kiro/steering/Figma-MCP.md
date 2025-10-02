---
inclusion: manual
---

# Figma MCP Integration Guide

## When to Use Figma MCP

**Mandatory for UI implementation:**
- Converting Figma designs to code
- Extracting design tokens and variables
- Getting component specifications
- Implementing responsive layouts
- Ensuring design-code consistency

**Use with YouTube Downloader App:**
- Reference existing UI design at node ID `5:461` (GrabZilla2.0_UI)
- Extract exact color values and spacing
- Get component dimensions and layouts
- Validate implementation against design

## Tool Usage Protocol

1. **get_metadata**: Get overview of design structure and node IDs
2. **get_code**: Generate implementation code for specific components
3. **get_variable_defs**: Extract design tokens (colors, spacing, typography)
4. **get_screenshot**: Visual reference for implementation validation

## Design System Integration

**Extract from Figma:**
- Color variables (--primary-blue: #155dfc, --bg-dark: #1d293d)
- Component dimensions and spacing
- Typography scales and weights
- Icon specifications and SVG exports

**Implementation Guidelines:**
- Always use `get_code` after `get_metadata` for implementation
- Reference specific node IDs for targeted component extraction
- Validate responsive behavior against Figma breakpoints
- Maintain exact color values from design system

## Node ID Reference (GrabZilla 2.0)

- Main Frame: `5:461` (GrabZilla2.0_UI)
- Header: `5:463` (Container with logo and title)
- Input Section: `5:483` (URL input and controls)
- Video List: `5:537` (Table with video items)
- Control Panel: `5:825` (Action buttons)

## Quality Checkpoints

- Visual output matches Figma design exactly
- All design tokens are extracted and used
- Responsive behavior follows design specifications
- Component hierarchy matches Figma structure