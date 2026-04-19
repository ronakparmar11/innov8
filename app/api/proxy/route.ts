import { NextRequest } from "next/server";
import http from "http";
import https from "https";

// Streaming MJPEG Proxy
// Fixes "Stream connection timed out" by using native http streaming without buffering.

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  
  if (!target) {
    return new Response(JSON.stringify({ error: "Missing url param" }), { status: 400 });
  }

  console.log(`[Proxy] Incoming request for: ${target}`);

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400 });
  }

  const client = targetUrl.protocol === "https:" ? https : http;

  // We return a promise that resolves to a Response object
  return new Promise<Response>((resolve) => {
    const upstreamReq = client.get(target, {
      headers: {
        'User-Agent': 'SecureSight/1.0',
        'Connection': 'keep-alive',
      },
      timeout: 10000,
      // Allow self-signed certs (IP Webcam on Android uses self-signed HTTPS)
      rejectUnauthorized: false,
    }, (upstreamRes) => {
      console.log(`[Proxy] Upstream connection successful: ${upstreamRes.statusCode}`);
      
      const headers = new Headers();
      
      // Critical for MJPEG streaming: Pass through multipart headers
      const contentType = upstreamRes.headers['content-type'];
      if (contentType) {
        headers.set('Content-Type', contentType);
      } else {
        headers.set('Content-Type', 'multipart/x-mixed-replace; boundary=frame');
      }
      
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
      headers.set('Connection', 'close');

      // Create a readable stream from the node response
      // @ts-ignore - ReadableStream.from is available in modern node runtimes or we can wrap the stream
      const stream = new ReadableStream({
        start(controller) {
          upstreamRes.on('data', (chunk) => controller.enqueue(chunk));
          upstreamRes.on('end', () => controller.close());
          upstreamRes.on('error', (err) => controller.error(err));
        },
        cancel() {
          upstreamRes.destroy();
        }
      });

      resolve(new Response(stream, {
        status: upstreamRes.statusCode,
        headers,
      }));
    });

    upstreamReq.on('error', (e) => {
      console.error(`[Proxy] Upstream error: ${e.message}`);
      resolve(new Response(JSON.stringify({ error: `Connection failed: ${e.message}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      }));
    });

    upstreamReq.on('timeout', () => {
      console.error(`[Proxy] Upstream timeout`);
      upstreamReq.destroy();
      resolve(new Response(JSON.stringify({ error: "Stream connection timed out" }), {
        status: 504,
        headers: { 'Content-Type': 'application/json' }
      }));
    });
  });
}
