import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Permitir login y api de auth sin restricción
  if (pathname === "/login" || pathname === "/api/auth") {
    return NextResponse.next();
  }

  const auth = req.cookies.get("auth")?.value;

  if (auth !== "1") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
