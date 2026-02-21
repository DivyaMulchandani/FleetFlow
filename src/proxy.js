// src/middleware.js
// ─────────────────────────────────────────────────────────────
// Route protection middleware.
// Protected routes require a valid JWT cookie.
// Role-based access control (RBAC) is enforced here.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// ── Routes that don't require authentication ──────────────────
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/login',
  '/register',
];

// ── Role-based route restrictions ─────────────────────────────
const ROLE_RESTRICTED = {
  '/api/financial':  ['financial_analyst', 'fleet_manager'],
  '/api/safety':     ['safety_officer', 'fleet_manager'],
  '/api/trips':      ['dispatcher', 'fleet_manager'],
};

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Allow public routes through
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // ── Extract token from cookie ──────────────────────────────
  const token = request.cookies.get('fleetflow_session')?.value;

  if (!token) {
    // API routes → return 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }
    // Page routes → redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ── Verify JWT ─────────────────────────────────────────────
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired session. Please log in again.' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ── RBAC check ─────────────────────────────────────────────
  for (const [restrictedPath, allowedRoles] of Object.entries(ROLE_RESTRICTED)) {
    if (pathname.startsWith(restrictedPath)) {
      if (!allowedRoles.includes(decoded.role)) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { success: false, message: 'You do not have permission to access this resource.' },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }
  }

  // ── Pass user info in headers to route handlers ────────────
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id',    decoded.userId);
  requestHeaders.set('x-user-email', decoded.email);
  requestHeaders.set('x-user-role',  decoded.role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
