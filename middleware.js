import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Login y su API quedan abiertos
  if (pathname === "/login" || pathname === "/api/auth") {
    return NextResponse.next();
  }

  // La cookie debe coincidir con el token secreto (no un "1" adivinable)
  const token = req.cookies.get("auth")?.value;
  if (!token || token !== process.env.AUTH_TOKEN) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
