# UI Tuning Guide: Swipe Header + Hint + NS Button Layout

This document describes where to adjust sizes, positioning, and spacing for the Swipe Header, Hint, and NS Button components.

## Overview

The swipe card interface consists of:
1. **SwipeHeaderHint** - Absolute overlay at the top showing "< Swipe >" and hint text
2. **SwipeCard** - The main interactive card
3. **NS Button** - "Not sure" button positioned below the card

## File Locations

### SwipeHeaderHint Component
**File:** `client/src/components/SwipeHeaderHint.js`

#### Positioning from Top
- **Location:** `styles.wrap` → `top` prop (passed from parent)
- **Current value:** `HEADER_TOP = 16` (defined in screen files)
- **To change:** Modify `HEADER_TOP` constant in `DiagnosticFlowScreen.js` or `ReflectionFlowScreen.js`

#### Swipe Text Styling
- **Location:** `styles.swipe`
- **Properties:**
  - `fontSize: 13` - Size of "< Swipe >" text
  - `fontWeight: '700'` - Bold weight
  - `letterSpacing: 0.6` - Character spacing
  - `opacity: 0.9` - Text opacity

#### Hint Text Styling
- **Location:** `styles.hint`
- **Properties:**
  - `marginTop: 6` - **Spacing between "< Swipe >" and hint text**
  - `fontSize: 12` - Size of hint text
  - `opacity: 0.85` - Text opacity
  - `maxWidth: 320` - Maximum width before wrapping

### Screen Layout Constants
**Files:** 
- `client/src/screens/DiagnosticFlowScreen.js`
- `client/src/screens/ReflectionFlowScreen.js`

#### Header Position
- **Location:** `const HEADER_TOP = 16;` (near return statement)
- **Purpose:** Distance from top of screen to SwipeHeaderHint
- **Example change:** To lower header by 8px: `HEADER_TOP = 16` → `HEADER_TOP = 24`

#### Header Height
- **Location:** `const HEADER_HEIGHT = 44;`
- **Purpose:** Approximate height of SwipeHeaderHint block (swipe text + hint)
- **Note:** This is used to calculate content padding

#### Content Top Padding
- **Location:** `const CONTENT_TOP_PADDING = HEADER_TOP + HEADER_HEIGHT;`
- **Purpose:** Total space reserved at top for header (prevents card from overlapping hint)
- **Usage:** Applied to content wrapper: `<View style={{ paddingTop: CONTENT_TOP_PADDING }}>`
- **Example change:** To increase gap between header and card by 8px: `CONTENT_TOP_PADDING = HEADER_TOP + HEADER_HEIGHT + 8`

### NS Button Positioning
**File:** `client/src/components/SwipeCard.js`

#### Button Position
- **Location:** `styles.notSureBtn` → `bottom: -60`
- **Purpose:** Distance below card's bottom edge (negative value = below card)
- **Example change:** To move button further down: `bottom: -60` → `bottom: -80`
- **Example change:** To move button closer: `bottom: -60` → `bottom: -40`

#### Button Styling
- **Location:** `styles.notSureBtn` and `styles.notSureText`
- **Properties:**
  - `paddingVertical: 10` - Vertical padding inside button
  - `paddingHorizontal: 16` - Horizontal padding inside button
  - `borderRadius: 999` - Fully rounded button
  - `fontSize: 16` (in `notSureText`) - Button text size
  - `fontWeight: '700'` (in `notSureText`) - Button text weight

## Common Tuning Scenarios

### Scenario 1: Lower the Header
**Goal:** Move "< Swipe >" further from top of screen

**Change in:** `DiagnosticFlowScreen.js` and `ReflectionFlowScreen.js`
```javascript
// Before
const HEADER_TOP = 16;

// After
const HEADER_TOP = 24; // +8px lower
```

### Scenario 2: Increase Distance Between Header and Card
**Goal:** More space between hint and card

**Change in:** `DiagnosticFlowScreen.js` and `ReflectionFlowScreen.js`
```javascript
// Before
const CONTENT_TOP_PADDING = HEADER_TOP + HEADER_HEIGHT;

// After
const CONTENT_TOP_PADDING = HEADER_TOP + HEADER_HEIGHT + 8; // +8px gap
```

### Scenario 3: Make Hint Text Smaller
**Goal:** Reduce hint font size

**Change in:** `client/src/components/SwipeHeaderHint.js`
```javascript
// Before
hint: {
  fontSize: 12,
  // ...
}

// After
hint: {
  fontSize: 11, // -1px smaller
  // ...
}
```

### Scenario 4: Adjust Spacing Between "< Swipe >" and Hint
**Goal:** Change gap between swipe text and hint

**Change in:** `client/src/components/SwipeHeaderHint.js`
```javascript
// Before
hint: {
  marginTop: 6,
  // ...
}

// After
hint: {
  marginTop: 8, // +2px more space
  // ...
}
```

### Scenario 5: Move NS Button Closer to Card
**Goal:** Reduce gap between card and NS button

**Change in:** `client/src/components/SwipeCard.js`
```javascript
// Before
notSureBtn: {
  bottom: -60,
  // ...
}

// After
notSureBtn: {
  bottom: -40, // -20px closer (less negative = closer)
  // ...
}
```

## Layout Structure

```
ScreenWrapper
└── View (container)
    ├── SwipeHeaderHint (absolute, top={HEADER_TOP})
    │   ├── Text "< Swipe >" (bold)
    │   └── Text hint (if provided)
    └── View (paddingTop={CONTENT_TOP_PADDING})
        └── SwipeCard
            ├── Animated.View (card)
            └── Pressable (NS button, bottom: -60)
```

## Important Notes

1. **SwipeHeaderHint** uses `pointerEvents="none"` - it does not intercept touches
2. **NS Button** is positioned absolutely within SwipeCard's container
3. **All constants** should be kept in sync between `DiagnosticFlowScreen.js` and `ReflectionFlowScreen.js`
4. **HEADER_HEIGHT** is approximate - adjust if hint text wraps to multiple lines
5. **Negative bottom value** in NS button means it's positioned below the card's bottom edge

## Testing Checklist

After making changes, verify:
- [ ] Header is visible and not cut off at top
- [ ] Hint text is readable and doesn't overlap card
- [ ] Card doesn't overlap hint
- [ ] NS button is below card (not floating in middle)
- [ ] NS button is clickable
- [ ] Layout works on different screen sizes
- [ ] Deep Dive and Simplified flows look consistent
