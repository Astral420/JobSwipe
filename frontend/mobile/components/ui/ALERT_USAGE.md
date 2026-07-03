# Custom Alert Usage Guide

## Overview
Custom alert component that replaces React Native's default `Alert.alert` with a beautiful, themed modal.

## Features
- ✅ **5 Alert Types**: success, error, warning, info, confirm
- ✅ **Theme Support**: Automatically uses app theme colors
- ✅ **Custom Icons**: Material Community Icons for each type
- ✅ **Flexible Buttons**: Support for multiple buttons with different styles
- ✅ **Easy API**: Simple helper methods for common use cases

## Setup (Already Done)
The `AlertProvider` is already set up in `app/_layout.tsx` at the root level.

## Usage

### Import
```typescript
import { AlertHelper } from '../../components/ui/CustomAlert';
```

### Basic Usage

#### Success Alert
```typescript
AlertHelper.success('Success', 'Profile updated successfully!');
```

#### Error Alert
```typescript
AlertHelper.error('Error', 'Failed to save changes. Please try again.');
```

#### Warning Alert
```typescript
AlertHelper.warning('Warning', 'This action cannot be undone.');
```

#### Info Alert
```typescript
AlertHelper.info('Info', 'Your session will expire in 5 minutes.');
```

#### Confirm Dialog
```typescript
AlertHelper.confirm(
  'Delete Item',
  'Are you sure you want to delete this item?',
  () => {
    // User confirmed
    console.log('Deleted!');
  },
  () => {
    // User cancelled
    console.log('Cancelled');
  }
);
```

### Advanced Usage

#### Custom Buttons
```typescript
AlertHelper.show(
  'Choose Action',
  'What would you like to do?',
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Save Draft', onPress: () => saveDraft() },
    { text: 'Publish', onPress: () => publish() },
  ],
  'info'
);
```

#### With Callback
```typescript
AlertHelper.success('Success', 'Profile updated!', () => {
  // This runs after user clicks OK
  router.push('/profile');
});
```

## Alert Types

### Success (Green)
- Icon: check-circle
- Use for: Successful operations, confirmations
- Example: "Profile updated successfully!"

### Error (Red)
- Icon: alert-circle
- Use for: Failed operations, errors
- Example: "Failed to save changes"

### Warning (Orange)
- Icon: alert
- Use for: Cautions, important notices
- Example: "This action cannot be undone"

### Info (Blue)
- Icon: information
- Use for: General information, tips
- Example: "Your session will expire soon"

### Confirm (Purple)
- Icon: help-circle
- Use for: Confirmation dialogs, questions
- Example: "Are you sure you want to delete?"

## Button Styles

### Default
```typescript
{ text: 'OK', style: 'default' }
```
- Colored background (matches alert type)
- White text

### Cancel
```typescript
{ text: 'Cancel', style: 'cancel' }
```
- Light background
- Gray text

### Destructive
```typescript
{ text: 'Delete', style: 'destructive' }
```
- Red background
- White text

## Migration from Alert.alert

### Before
```typescript
Alert.alert('Success', 'Profile updated!');
```

### After
```typescript
AlertHelper.success('Success', 'Profile updated!');
```

### Before (Confirm)
```typescript
Alert.alert(
  'Delete Item',
  'Are you sure?',
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteItem() }
  ]
);
```

### After (Confirm)
```typescript
AlertHelper.confirm(
  'Delete Item',
  'Are you sure?',
  () => deleteItem()
);
```

## Styling
The alert automatically adapts to your app's theme:
- Uses `T.surface` for background
- Uses `T.border` for borders
- Uses `T.textPrimary` and `T.textSub` for text
- Supports both light and dark modes

## Examples in Codebase

Check these files for real-world usage:
- `app/(tabs)/profile.tsx` - Success, error, warning alerts
- `components/profile/EditExperienceSheet.tsx` - Confirm dialogs
- `components/profile/EditEducationSheet.tsx` - Confirm dialogs
