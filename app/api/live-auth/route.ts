import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const LIVE_ACCESS_USERNAME = process.env.LIVE_ACCESS_USERNAME || "admin";
const LIVE_ACCESS_PASSWORD = process.env.LIVE_ACCESS_PASSWORD || "admin";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      username?: string;
      password?: string;
    };

    const username = body.username?.trim() || "";
    const password = body.password || "";

    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    if (
      username !== LIVE_ACCESS_USERNAME ||
      password !== LIVE_ACCESS_PASSWORD
    ) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set("ss_live_auth", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12 hours
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
