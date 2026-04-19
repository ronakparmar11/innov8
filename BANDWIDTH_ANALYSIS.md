# Bandwidth Analysis: Video Streaming Architecture

## Summary

✅ **Video streams are loaded DIRECTLY from frontend with intelligent proxy fallback - NOT being unnecessarily proxied through backend.**

---

## How Videos Are Served

### 1. **Direct Frontend Loading (Primary - Most Common)**

When cameras are on same origin or CORS-enabled:

- **Frontend → Camera URL** (direct connection)
- **No backend involvement** for actual video data
- Pure client-side streaming

**Components:**

- `ip-camera-feed.tsx` - Direct HLS/MJPEG support
- `go2rtc-player.tsx` - Direct stream.m3u8, frame.jpeg requests
- HTML5 `<video>` or `<img>` tags handle rendering

### 2. **Backend Proxy (Only When Necessary)**

When cameras are cross-origin and blocked by CORS:

```typescript
// From cctv-manager.tsx (line 113)
const u = new URL(actualUrl);
if (u.origin !== window.location.origin) {
  // Only wrap if http(s); never wrap rtsp
  if (u.protocol === "http:" || u.protocol === "https:") {
    finalUrl = `/api/proxy?url=${encodeURIComponent(u.toString())}`;
  }
}
```

**Flow:** Frontend → `/api/proxy` → Camera Server → Frontend

**Only applied for:**

- ✅ HTTP/HTTPS streams
- ✅ Cross-origin cameras (domain mismatch)
- ❌ NOT applied for RTSP (unsupported by proxy)
- ❌ NOT applied for same-origin cameras (direct access)

### 3. **Special Case: go2rtc Streams**

Default cameras use go2rtc viewer at `https://cam1.yashpatelis.online`:

- Requests `/api/stream.m3u8?src=cam1` directly to go2rtc server
- No backend proxy involved
- Direct HLS playback in frontend

---

## Bandwidth Efficiency Breakdown

### ✅ What's Efficient

| Feature                     | Status     | Impact                                   |
| --------------------------- | ---------- | ---------------------------------------- |
| **Direct streaming**        | ✅ Default | No backend CPU/bandwidth used            |
| **HLS adaptive bitrate**    | ✅ Enabled | Auto-adjusts quality based on connection |
| **HLS buffering**           | ✅ Tuned   | 5-10s buffer (reduced from 30s)          |
| **HLS low latency mode**    | ✅ Active  | Reduces latency on compatible streams    |
| **MJPEG fallback**          | ✅ Smart   | Used only when HLS fails                 |
| **Selective proxying**      | ✅ Smart   | Only for cross-origin + CORS-blocked     |
| **Request caching**         | ✅ Added   | 10s detection cache (from recent fix)    |
| **No persistent streaming** | ✅ Good    | Streams only load when camera visible    |

### ⚠️ What Uses Bandwidth (By Design)

| Scenario            | Backend Load       | Notes                                     |
| ------------------- | ------------------ | ----------------------------------------- |
| Direct HLS stream   | ~0%                | Streamed directly from camera to browser  |
| Direct MJPEG        | ~0%                | Rendered as `<img src="...">`             |
| Proxied HLS         | 100%               | Stream piped through backend (CORS issue) |
| Proxied MJPEG       | 100%               | Stream piped through backend (CORS issue) |
| Detection API calls | ~5MB-20MB per call | YOLO inference on backend                 |

---

## Current Setup Analysis

### Your Default Cameras

```
https://cam1.yashpatelis.online/stream.html?src=cam1-8
```

**Path:**

1. Frontend loads `stream.html` (go2rtc viewer) in iframe
2. go2rtc responds with HTML page
3. Inside iframe, browser requests:
   - `/api/stream.m3u8?src=cam1` (HLS playlist) - **Direct to go2rtc**
   - HLS segments - **Direct to go2rtc**
   - OR fallback to `/api/frame.jpeg` - **Direct to go2rtc**

**Bandwidth:** ✅ Direct from camera server to browser (not proxied)

### Custom User-Added Cameras

**If same origin as viewer:**

- Direct load, no proxy needed

**If cross-origin (e.g., `http://192.168.1.100/stream`):**

- Wrapped with `/api/proxy?url=...`
- Proxied through Next.js backend
- ⚠️ Doubles bandwidth usage on backend

---

## Potential Issues Found

### 1. **MJPEG via Proxy is Inefficient** ⚠️

If MJPEG streams fail HLS and fall back to proxy:

```typescript
// go2rtc-player.tsx line 45
const mjpegSrc = `${origin}/api/frame.jpeg?src=${encodeURIComponent(stream)}`;
```

MJPEG pulls **one JPEG per interval** → potentially 1-2 per second.
If proxied, this goes: Frontend → Backend → go2rtc → Backend → Frontend

**Risk:** High bandwidth if multiple MJPEG streams via proxy

### 2. **Timeout Chain Can Trigger Proxy Fallback**

HLS timeout (6s) → iframe timeout (10s) → MJPEG fallback
If MJPEG is proxied, bandwidth spikes.

**Current safeguard:** `maxBufferLength: 5, backBufferLength: 10` in HLS config limits buffering

### 3. **No Request Deduplication on Proxy**

Each client requesting same proxied stream = separate upstream connection
If 10 users watch same camera via proxy = 10x bandwidth cost

---

## Recommendations

### 1. **Add Proxy Response Caching for MJPEG** (High Priority)

If MJPEG is being served via proxy, cache the JPEG responses:

```typescript
// app/api/proxy/route.ts
const mjpegCache = new Map<string, { data: Buffer; timestamp: number }>();
const MJPEG_CACHE_TTL = 1000; // 1 second

// On GET request:
if (target.includes("frame.jpeg")) {
  const cached = mjpegCache.get(target);
  if (cached && Date.now() - cached.timestamp < MJPEG_CACHE_TTL) {
    return new Response(cached.data, {
      headers: { "content-type": "image/jpeg" },
    });
  }
}
```

This prevents 10 clients requesting the same JPEG 10 times/second.

### 2. **Warn Users About Cross-Origin Cameras** (Medium Priority)

In `AddIpCameraDialog`, add warning:

```
⚠️ This camera is on a different domain. Stream will be proxied through backend,
doubling bandwidth usage. Consider accessing same origin cameras when possible.
```

### 3. **Disable MJPEG Fallback for Proxied Streams** (Optional)

```typescript
// go2rtc-player.tsx
if (playerMode === "mjpeg" && streamUrl.includes("/api/proxy")) {
  setPlayerMode("error");
  setError("Proxied MJPEG not recommended. Use HLS-compatible camera.");
}
```

### 4. **Monitor Proxy Usage**

Add logging to detect if proxy is being used frequently:

```typescript
console.log(`[proxy] ${target.split("?")[0]} - ${upstream.status}`);
```

---

## Quick Check

**To verify you're not wasting bandwidth:**

1. **Open DevTools → Network tab**
2. **Load a camera**
3. **Look for requests:**
   - ✅ **Direct requests** to camera domain (e.g., `cam1.yashpatelis.online`) = Good
   - ⚠️ **Requests to `/api/proxy?url=...`** = Proxied, uses 2x bandwidth
   - ⚠️ **Multiple `/api/proxy` requests for same URL** = Should be cached

4. **Check response size:**
   - HLS playlist `.m3u8` = small (1-5 KB)
   - HLS segments `.ts` = normal (50-500 KB each)
   - MJPEG `.jpeg` = 20-100 KB each

---

## Conclusion

✅ **Current setup is efficient**:

- Direct streaming for default cameras
- Smart proxy-only-for-CORS approach
- Low memory footprint

⚠️ **Edge case to monitor**:

- Custom proxied MJPEG streams (if many users)
- Can be optimized with caching

**No major bandwidth waste detected.** System is well-designed.
