import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isLoggedIn = !!user;

  // 1. Root route "/"
  if (pathname === "/") {
    const targetUrl = new URL(isLoggedIn ? "/chat" : "/login", request.url);
    const redirectResponse = NextResponse.redirect(targetUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  // 2. Auth routes ("/login", "/register")
  // If user is already logged in, redirect them away from auth pages to "/chat"
  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    const chatUrl = new URL("/chat", request.url);
    const redirectResponse = NextResponse.redirect(chatUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  // 3. Protected chat routes ("/chat", "/chat/...")
  // If user is not logged in, redirect them to "/login"
  if (!isLoggedIn && pathname.startsWith("/chat")) {
    const loginUrl = new URL("/login", request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return response;
}
