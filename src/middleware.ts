import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import { getSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/types";

const authRoutes = new Set(["/login", "/signup"]);

const protectedRoutePatterns: RegExp[] = [
  /^\/$/,
  /^\/dashboard(?:\/|$)/,
  /^\/assets(?:\/|$)/,
  /^\/inventory(?:\/|$)/,
  /^\/locations(?:\/|$)/,
  /^\/maintenance(?:\/|$)/,
  /^\/notifications(?:\/|$)/,
  /^\/profile(?:\/|$)/,
  /^\/reports(?:\/|$)/,
  /^\/settings(?:\/|$)/,
  /^\/vendors(?:\/|$)/,
  /^\/work-orders(?:\/|$)/,
];

const defaultCookieOptions: CookieOptions = {
  path: "/",
  sameSite: "lax",
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
};

function isProtectedRoute(pathname: string) {
  return protectedRoutePatterns.some((pattern) => pattern.test(pathname));
}

export async function middleware(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv();
  const response = await updateSession(request);

  const supabase = createServerClient<Database>(url, anonKey, {
    cookieOptions: defaultCookieOptions,
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({
          name,
          value,
          ...defaultCookieOptions,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({
          name,
          value: "",
          maxAge: 0,
          ...defaultCookieOptions,
          ...options,
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const requiresAuth = isProtectedRoute(pathname);
  const isAuthRoute = authRoutes.has(pathname);

  if (!user && requiresAuth) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
