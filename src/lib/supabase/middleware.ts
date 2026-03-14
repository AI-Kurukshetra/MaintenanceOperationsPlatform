import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/types";

const defaultCookieOptions: CookieOptions = {
  path: "/",
  sameSite: "lax",
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
};

export async function updateSession(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv();

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookieOptions: defaultCookieOptions,
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...defaultCookieOptions,
          ...options,
        });

        response = NextResponse.next({ request });
        response.cookies.set({
          name,
          value,
          ...defaultCookieOptions,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value: "",
          maxAge: 0,
          ...defaultCookieOptions,
          ...options,
        });

        response = NextResponse.next({ request });
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

  await supabase.auth.getUser();

  return response;
}
