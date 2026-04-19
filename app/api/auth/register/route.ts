import { NextRequest, NextResponse } from "next/server";
import { registerUser, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body || {};
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 },
      );
    }
    const user = await registerUser(email, password);
    const token = signToken({ sub: user.id, email: user.email });
    return NextResponse.json({ user, token });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Registration failed" },
      { status: 400 },
    );
  }
}
