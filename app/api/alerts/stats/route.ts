import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Prefer server-only CAMERA_BACKEND_URL (direct IP, bypasses Cloudflare)
const BACKEND_BASE =
    process.env.CAMERA_BACKEND_URL ||
    process.env.NEXT_PUBLIC_CAMERA_BACKEND_URL ||
    "https://api1.yashpatelis.online";

/**
 * GET /api/alerts/stats — Fetch alert statistics from backend.
 */
export async function GET(req: NextRequest) {
    try {
        const response = await fetch(`${BACKEND_BASE}/alerts/stats`, {
            signal: AbortSignal.timeout(10000),
            headers: {
                Accept: "application/json",
                "User-Agent": "SecureSight-Frontend/1.0 (Server-Side; Next.js)",
            },
        });

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
        console.error(`[alerts/stats] Error: ${message}`);
        return NextResponse.json(
            { error: "Failed to fetch alert stats", detail: message },
            { status: 500 },
        );
    }
}
