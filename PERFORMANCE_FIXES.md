# Performance & API Lag Fixes

## Issues Identified

1. **Aggressive Polling Interval**: API was being called every 3 seconds (3000ms) when WebSocket failed
2. **WebSocket Timeout Too Short**: 3-second timeout meant WebSocket often failed and fell back to polling
3. **Slow FPS Target**: Backend was processing at 0.8 FPS, creating backlog
4. **No Request Deduplication**: Same image was being analyzed multiple times
5. **No Caching**: Identical requests weren't cached, causing redundant backend calls

## Fixes Applied

### 1. **Increased Polling Interval** (`hooks/use-detection-alerts.ts`)
```
- From: 3000ms (3 seconds)
- To: 8000ms (8 seconds)
- Impact: 62% reduction in API calls when using polling fallback
```

### 2. **Extended WebSocket Timeout** (`hooks/use-detection-alerts.ts`)
```
- From: 3000ms (3 seconds)
- To: 5000ms (5 seconds)
- Impact: WebSocket has more time to connect, reducing polling fallback
```

### 3. **Reduced Backend FPS Target** (`hooks/use-detection-alerts.ts`)
```
- From: 0.8 FPS
- To: 0.5 FPS
- Impact: Backend processes fewer frames, reduces computational load
```

### 4. **Added Request Debouncing** (`hooks/use-detection-alerts.ts`)
- Prevents concurrent duplicate requests
- Enforces 5-second minimum between API calls from same component
- Tracks pending requests to block duplicates
- Impact: Eliminates request spam even with multiple component instances

### 5. **Added Response Caching** (`app/api/detect/route.ts`)
- Caches detection results for 10 seconds per URL + confidence threshold
- Automatically cleans up old cache entries
- Limits cache to 100 entries max
- Impact: Duplicate requests get instant cached response instead of backend hit

## Expected Improvements

- **API Load**: Reduced by ~70% with WebSocket working properly
- **Backend CPU**: Lower with reduced FPS and request caching
- **Response Times**: Cached responses return instantly
- **User Experience**: Smoother performance, no hanging requests

## Testing

After deployment, monitor:
1. Network tab in DevTools - should see fewer `/api/detect` calls
2. Backend logs - cache hit messages should appear
3. UI responsiveness - should feel snappier
4. CPU usage on backend server

## Files Modified

1. `hooks/use-detection-alerts.ts` - Poll interval, timeout, FPS, request debouncing
2. `app/api/detect/route.ts` - Response caching layer
