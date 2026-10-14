import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("auth")?.value;
  const valido = !!token && !!process.env.AUTH_TOKEN && token === process.env.AUTH_TOKEN;

  // La API de login queda abierta
  if (pathname === "/api/auth") return NextResponse.next();

  // Login: si la sesión sigue activa, entra directo al panel
  if (pathname === "/login") {
    if (valido) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!valido) {
    // Las rutas de API responden 401 en JSON (el panel redirige al login)
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "Sesión expirada" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-touch-icon.png).*)"],
};
