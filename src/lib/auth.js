// src/lib/auth.js
// ─────────────────────────────────────────────────────────────
// JWT signing, verification, and cookie helpers.
// ─────────────────────────────────────────────────────────────

import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

// ─── Sign a JWT ───────────────────────────────────────────────
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// ─── Verify a JWT ─────────────────────────────────────────────
// Returns decoded payload or throws an error
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ─── Get current user from cookie (server-side) ───────────────
// Use inside Server Components or Route Handlers
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fleetflow_token')?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

// ─── Build Set-Cookie header value ────────────────────────────
export function buildAuthCookie(token) {
  const isProd = process.env.NODE_ENV === 'production';
  return [
    `fleetflow_token=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Strict',
    isProd ? 'Secure' : '',
    'Max-Age=604800', // 7 days in seconds
  ]
    .filter(Boolean)
    .join('; ');
}

// ─── Build clear-cookie header value ──────────────────────────
export function buildClearCookie() {
  return 'fleetflow_token=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0';
}