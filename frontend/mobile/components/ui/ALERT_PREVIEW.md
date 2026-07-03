# Custom Alert Visual Preview

## Alert Types

### 1. Success Alert ✅
```
┌─────────────────────────────────┐
│                                 │
│         ╭───────────╮           │
│         │     ✓     │  (Green)  │
│         ╰───────────╯           │
│                                 │
│          Success                │
│                                 │
│   Profile updated successfully! │
│                                 │
│      ┌──────────────┐           │
│      │      OK      │ (Green)   │
│      └──────────────┘           │
│                                 │
└─────────────────────────────────┘
```

### 2. Error Alert ❌
```
┌─────────────────────────────────┐
│                                 │
│         ╭───────────╮           │
│         │     ⚠     │  (Red)    │
│         ╰───────────╯           │
│                                 │
│           Error                 │
│                                 │
│   Failed to save changes.       │
│   Please try again.             │
│                                 │
│      ┌──────────────┐           │
│      │      OK      │ (Red)     │
│      └──────────────┘           │
│                                 │
└─────────────────────────────────┘
```

### 3. Warning Alert ⚠️
```
┌─────────────────────────────────┐
│                                 │
│         ╭───────────╮           │
│         │     !     │  (Orange) │
│         ╰───────────╯           │
│                                 │
│          Warning                │
│                                 │
│   This action cannot be undone. │
│                                 │
│      ┌──────────────┐           │
│      │      OK      │ (Orange)  │
│      └──────────────┘           │
│                                 │
└─────────────────────────────────┘
```

### 4. Info Alert ℹ️
```
┌─────────────────────────────────┐
│                                 │
│         ╭───────────╮           │
│         │     i     │  (Blue)   │
│         ╰───────────╯           │
│                                 │
│           Info                  │
│                                 │
│   Your session will expire      │
│   in 5 minutes.                 │
│                                 │
│      ┌──────────────┐           │
│      │      OK      │ (Blue)    │
│      └──────────────┘           │
│                                 │
└─────────────────────────────────┘
```

### 5. Confirm Dialog ❓
```
┌─────────────────────────────────┐
│                                 │
│         ╭───────────╮           │
│         │     ?     │  (Purple) │
│         ╰───────────╯           │
│                                 │
│      Delete Experience          │
│                                 │
│   Are you sure you want to      │
│   delete this work experience?  │
│                                 │
│  ┌────────┐    ┌────────┐      │
│  │ Cancel │    │Confirm │       │
│  └────────┘    └────────┘       │
│   (Gray)        (Purple)        │
│                                 │
└─────────────────────────────────┘
```

### 6. Multiple Buttons
```
┌─────────────────────────────────┐
│                                 │
│         ╭───────────╮           │
│         │     📷    │  (Blue)   │
│         ╰───────────╯           │
│                                 │
│        Edit Photos              │
│                                 │
│     Choose what to edit         │
│                                 │
│  ┌────────────────────────┐    │
│  │   Change Avatar        │    │
│  └────────────────────────┘    │
│                                 │
│  ┌────────────────────────┐    │
│  │   Change Cover Photo   │    │
│  └────────────────────────┘    │
│                                 │
│  ┌────────────────────────┐    │
│  │       Cancel           │    │
│  └────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

## Design Features

### Colors by Type
- **Success**: Green (#10B981) with light green background
- **Error**: Red (#EF4444) with light red background
- **Warning**: Orange (#F59E0B) with light orange background
- **Info**: Blue (#3B82F6) with light blue background
- **Confirm**: Purple (#7C3AED) with light purple background

### Layout
- **Icon**: 72x72px circular container with colored background
- **Title**: 20px, bold (800), centered
- **Message**: 15px, regular, centered, gray text
- **Buttons**: Full width, 14px height, rounded corners
- **Spacing**: 28px padding, consistent gaps

### Animations
- **Entrance**: Fade in animation
- **Backdrop**: Semi-transparent black (60% opacity)
- **Shadow**: Soft shadow for depth

### Responsive
- **Width**: Screen width - 64px (max 400px)
- **Buttons**: Flex layout, equal width when multiple
- **Text**: Wraps automatically for long messages

## Theme Support
All colors automatically adapt to your app's theme:
- Light mode: White background, dark text
- Dark mode: Dark background, light text
- Borders and shadows adjust accordingly
