import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function readPublicFlag(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "true" || value === "1";
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!readPublicFlag("NEXT_PUBLIC_HULL_SERVICES_ENABLED") && pathname.startsWith("/services")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!readPublicFlag("NEXT_PUBLIC_HULL_MARKETPLACE_RESALE_ENABLED") && pathname.startsWith("/marketplace")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/services/:path*", "/marketplace/:path*"],
};
