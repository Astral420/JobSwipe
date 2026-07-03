# Phase 2.3 Implementation: Match Manual Decline

**Status**: ✅ Complete  
**Date**: May 7, 2026  
**File**: `frontend/mobile/app/(tabs)/matches.tsx`

## Overview

Added a subtle "Not interested" button to match cards, allowing applicants to manually decline matches they don't want to pursue. Previously, matches could only expire after 24 hours or be accepted by messaging.

## What Was Missing

- ❌ No manual decline button in UI
- ❌ No way for applicant to proactively decline a match
- ❌ Matches could only expire naturally after 24 hours

## What Was Added

### 1. State Management
```typescript
const [decliningMatchId, setDecliningMatchId] = useState<MatchId | null>(null);
```
Tracks which match is currently being declined to show loading state.

### 2. Decline Handler Function
- **Function**: `handleDeclineMatch(matchId, companyName)`
- **Endpoint**: `POST /applicant/matches/{id}/decline`
- **Features**:
  - Shows confirmation dialog before declining
  - Mentions company name in confirmation
  - Warns that action cannot be undone
  - Calls API to decline match
  - Removes match from local state (both matchCompanies and conversations)
  - Shows success feedback
  - Shows error alert on failure
  - Loading state during API call

### 3. UI Changes

**Match Card Structure:**
- Wrapped card content in TouchableOpacity (for opening match)
- Added decline button at bottom of card
- Decline button is outside the main touchable area

**Decline Button:**
- Text: "Not interested"
- Style: Small gray text (subtle, not prominent)
- Position: Bottom of match card
- Hit slop: 8px padding for easier tapping
- Loading state: Shows "Declining..." during API call
- Disabled during decline operation

### 4. Component Updates

**MatchCarousel Component:**
- Added `onDecline` prop
- Added `decliningMatchId` prop
- Passed to match card rendering

**Match Card Rendering:**
- Changed from single TouchableOpacity to View container
- Main content in TouchableOpacity (opens match)
- Decline button separate (prevents opening match when declining)
- Stop propagation on decline button press

## Backend Endpoint Used

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| POST | `/applicant/matches/{id}/decline` | Manually decline a match | ✅ Integrated |

## Key Implementation Details

### Confirmation Dialog
```typescript
Alert.alert(
  'Decline Match',
  `Are you sure you want to decline this match with ${companyName}? This action cannot be undone.`,
  [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Decline',
      style: 'destructive',
      onPress: async () => { /* decline logic */ }
    }
  ]
);
```

### Local State Update
After successful decline, match is removed from both arrays:
```typescript
setMatchCompanies(prev => prev.filter(m => m.id !== matchId));
setConversations(prev => prev.filter(c => c.id !== matchId));
```

This ensures the match disappears from:
- New matches carousel
- Conversations list (if it had been started)

### Event Handling
```typescript
<TouchableOpacity
  onPress={(e) => {
    e.stopPropagation();  // Prevent opening match
    onDecline(match.id, match.company);
  }}
>
```

### Error Handling
- API errors caught and shown to user
- Error logged to console for debugging
- Loading state cleared even on error
- User-friendly error messages

## UI/UX Features

### Subtle Design
- **Color**: Gray (#9a93b1) - not attention-grabbing
- **Size**: Small text (10px)
- **Position**: Bottom of card, below main content
- **No icon**: Just text, minimal visual weight
- **No border**: No button styling, just text link

### Confirmation Required
- Prevents accidental declines
- Shows company name in confirmation
- Warns about irreversibility
- Destructive style on confirm button (red)

### Loading State
- Button text changes to "Declining..."
- Button disabled during operation
- Prevents duplicate submissions

### Feedback
- Success alert: "Match Declined - This match has been removed from your list."
- Error alert: Shows specific error message or generic fallback
- Immediate UI update (match disappears)

## Styles Added

```typescript
declineBtn: {
  marginTop: 8,
  paddingVertical: 4,
  paddingHorizontal: 8,
},
declineBtnText: {
  fontSize: 10,
  color: '#9a93b1',  // Subtle gray
  textAlign: 'center',
},
```

## Testing Checklist

TODO: Add tests for:
- [ ] Decline button appears on all match cards
- [ ] Decline button is subtle and not prominent
- [ ] Click decline shows confirmation dialog
- [ ] Confirmation shows correct company name
- [ ] Cancel button dismisses dialog
- [ ] Decline button calls API
- [ ] Match disappears from list after decline
- [ ] Success message shows
- [ ] Error handling for API failures
- [ ] Loading state during decline
- [ ] Button disabled during decline
- [ ] Cannot decline same match twice

## Known Limitations

1. **No Undo**: Once declined, match is permanently gone. No way to undo or restore.

2. **No Decline Reason**: Cannot specify why declining. Backend may want this data for analytics.

3. **No Bulk Decline**: Can only decline one match at a time.

4. **No Decline History**: No record of declined matches visible to user.

5. **Immediate Removal**: Match disappears immediately from UI. No animation or transition.

## Future Enhancements

1. **Decline Reasons**:
   - Add optional reason selection
   - "Not interested in role"
   - "Not interested in company"
   - "Location doesn't work"
   - "Salary expectations"
   - Send reason to backend for analytics

2. **Undo Functionality**:
   - Brief undo period (5-10 seconds)
   - Toast message with undo button
   - Restore match if undo clicked

3. **Decline Animation**:
   - Fade out animation
   - Slide out animation
   - Smooth transition

4. **Bulk Decline**:
   - Select multiple matches
   - Decline all at once
   - Useful for clearing expired matches

5. **Decline History**:
   - View declined matches
   - Restore declined match (if within time window)
   - Analytics on decline patterns

6. **Smart Suggestions**:
   - "You've declined 3 similar roles. Update your preferences?"
   - Learn from decline patterns
   - Improve match quality

## Design Rationale

### Why Subtle?
- Don't want to encourage declining
- Matches are valuable - should be accepted when possible
- Decline is escape hatch, not primary action
- Prominent decline button would hurt match acceptance rate

### Why Confirmation?
- Prevents accidental declines
- Gives user moment to reconsider
- Shows seriousness of action
- Reduces support requests ("I declined by accident")

### Why No Undo?
- Simplifies implementation
- Backend may have already notified company
- Encourages thoughtful decisions
- Can be added later if needed

## Related Files

- `frontend/mobile/services/api.ts` - API client
- `backend/app/Http/Controllers/Applicant/MatchController.php` - Match controller

## Verification Steps

1. ✅ Open matches screen
2. ✅ Verify "Not interested" button appears on match cards
3. ✅ Verify button is subtle (small gray text)
4. ✅ Click "Not interested"
5. ✅ Verify confirmation dialog appears
6. ✅ Verify company name in dialog
7. ✅ Click "Cancel"
8. ✅ Verify dialog dismisses, match still visible
9. ✅ Click "Not interested" again
10. ✅ Click "Decline"
11. ✅ Verify loading state ("Declining...")
12. ✅ Verify match disappears from list
13. ✅ Verify success message
14. ✅ Verify match doesn't reappear after refresh

---

**Implementation Complete** ✅

Match manual decline functionality is now fully integrated. Applicants can decline matches they're not interested in, with appropriate confirmation and feedback.

