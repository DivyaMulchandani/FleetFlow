// src/app/api/auth/register/route.js
// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// Body: { full_name, email, password, role }
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { query } from '@/lib/db';
import { signToken, buildAuthCookie } from '@/lib/auth';

const VALID_ROLES = ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'];

export async function POST(request) {
  try {
    const body = await request.json();
    const { full_name, email, password, role } = body;

    // ── 1. Validate required fields ────────────────────────────
    if (!full_name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, message: 'full_name, email, password and role are required.' },
        { status: 400 }
      );
    }

    // ── 2. Validate email format ───────────────────────────────
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format.' },
        { status: 400 }
      );
    }

    // ── 3. Validate password strength ─────────────────────────
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    // ── 4. Validate role ───────────────────────────────────────
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, message: `Role must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // ── 5. Check if email already exists ──────────────────────
    const existing = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    // ── 6. Hash the password ───────────────────────────────────
    const salt          = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // ── 7. Insert user ─────────────────────────────────────────
    const result = await query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, role, is_active, created_at`,
      [full_name.trim(), email.toLowerCase().trim(), password_hash, role]
    );

    const user = result.rows[0];

    // ── 8. Sign JWT ────────────────────────────────────────────
    const token = signToken({
      userId: user.id,
      email: user.email,
      role:  user.role,
    });

    // ── 9. Set HttpOnly cookie + return user ───────────────────
    const response = NextResponse.json(
      {
        success: true,
        message: 'Account created successfully.',
        user: {
          id:         user.id,
          full_name:  user.full_name,
          email:      user.email,
          role:       user.role,
          is_active:  user.is_active,
          created_at: user.created_at,
        },
      },
      { status: 201 }
    );

    response.headers.set('Set-Cookie', buildAuthCookie(token));
    return response;

  } catch (error) {
    console.error('[REGISTER ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
