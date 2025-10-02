---
inclusion: fileMatch
fileMatchPattern: ['index.html', 'styles/**/*.css', 'scripts/**/*.js']
---

# macOS UI Design System

## Required Color Variables

Always use these exact CSS custom properties - never hardcode colors:

```css
/* Primary Colors */
--primary-blue: #155dfc;
--success-green: #00a63e;
--error-red: #e7000b;

/* Backgrounds */
--bg-dark: #1d293d;
--header-dark: #0f172b;
--card-bg: #314158;
--border-color: #45556c;

/* Text */
--text-primary: #ffffff;
--text-secondary: #cad5e2;
--text-muted: #90a1b9;
--text-disabled: #62748e;
```

## Layout Standards

- **Header**: 60px height, dark background (#0f172b)
- **Spacing**: 16px base unit, 8px tight, 24px sections
- **Grid**: CSS Grid for layout, Flexbox for alignment
- **Minimum width**: 800px
- **Border radius**: 8px buttons, 6px inputs

## Component Specifications

### Buttons
- **Primary**: Blue bg, white text, 36px height, 16px horizontal padding
- **Secondary**: Transparent bg, blue border and text
- **Destructive**: Red bg, white text
- **Hover**: 10% darker, 150ms transition

### Form Elements
- **Inputs**: Card background (#314158), border (#45556c), 6px radius
- **Focus**: Blue border (#155dfc)
- **Placeholders**: Muted text (#90a1b9)

### Status Indicators
- **Success**: Green (#00a63e) + checkmark
- **Error**: Red (#e7000b) + warning icon
- **Progress**: Blue (#155dfc) + spinner
- **Pending**: Muted (#90a1b9) + clock

## Typography
- **Base size**: 14px
- **Headers**: 18px sections, 24px page titles
- **Small text**: 12px helpers, 10px labels
- **Weights**: 400 regular, 500 medium, 600 semibold

## Code Style Rules

### CSS
- Use CSS custom properties for all colors and spacing
- Mobile-first responsive design
- BEM naming for custom components
- Tailwind utilities preferred over custom CSS

### HTML
- Semantic HTML5 elements (header, main, section)
- Proper ARIA labels for accessibility
- Data attributes for JavaScript hooks (not classes)

### JavaScript
- Separate styling from behavior logic
- Progressive enhancement patterns
- Handle reduced motion preferences
- Use semantic event delegation

## Animation Standards
- **Micro-interactions**: 100-150ms (hover, focus)
- **Transitions**: 200-300ms (modals, dropdowns)
- **Ease-out**: For entrances and hovers
- **Ease-in**: For exits and dismissals

## Accessibility Requirements
- 4.5:1 color contrast minimum
- Visible focus indicators
- Logical tab order
- ARIA labels for complex elements
- Keyboard navigation support (Enter, Space, Escape, Arrows)