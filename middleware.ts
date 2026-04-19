import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Protect live monitoring routes with lightweight cookie auth
  if (pathname.startsWith("/live")) {
    const token = request.cookies.get("ss_live_auth")?.value;
    if (token !== "1") {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/live-access";
      loginUrl.searchParams.set("next", `${pathname}${search ?? ""}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/live/:path*"],
};
