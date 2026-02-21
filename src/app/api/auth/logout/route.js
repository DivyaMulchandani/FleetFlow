// src/app/api/auth/logout/route.js
// ─────────────────────────────────────────────────────────────
// POST /api/auth/logout
// Clears the HttpOnly auth cookie
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { buildClearCookie } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully.' },
    { status: 200 }
  );

  response.headers.set('Set-Cookie', buildClearCookie());
  return response;
}