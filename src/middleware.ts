import type { NextFetchEvent, NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(req: NextRequest, _evt: NextFetchEvent) {
  const res = NextResponse.next();
  const isProd = process.env.NODE_ENV === 'production';

  // Minimal, safe defaults. CSP é básica para não quebrar a app.
  const cspParts = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https:",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
  ];

  res.headers.set('Content-Security-Policy', cspParts.join('; '));
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-Frame-Options', 'DENY');
  if (isProd) {
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};


