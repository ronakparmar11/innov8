import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Prefer server-only CAMERA_BACKEND_URL (direct IP, bypasses Cloudflare)
// Falls back to public URL if not set
const BACKEND_BASE =
    process.env.CAMERA_BACKEND_URL ||
    process.env.NEXT_PUBLIC_CAMERA_BACKEND_URL ||
    "https://api1.yashpatelis.online";

/**
 * GET /api/alerts/history — Fetch persistent alert history from backend.
 * Alerts are NEVER deleted from the backend SQLite store.
 *
 * Query params: limit, offset, camera_id, alert_type, severity, since, until
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const params = new URLSearchParams();

        // Forward all query params to backend
        for (const [key, value] of searchParams.entries()) {
            params.set(key, value);
        }

        // Set a default limit if not provided
        if (!params.has("limit")) {
            params.set("limit", "200");
        }

        const response = await fetch(
            `${BACKEND_BASE}/alerts/history?${params.toString()}`,
            {
                signal: AbortSignal.timeout(15000),
                headers: {
                    Accept: "application/json",
                    "User-Agent": "SecureSight-Frontend/1.0 (Server-Side; Next.js)",
                },
            },
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: `Backend returned ${response.status}` },
                { status: response.status },
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[alerts/history] Error: ${message}`);
        return NextResponse.json(
            { error: "Failed to fetch alert history", detail: message },
            { status: 500 },
        );
    }
}
