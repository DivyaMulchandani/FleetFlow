// src/app/api/auth/login/route.js
// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password }
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { signToken, buildAuthCookie } from '@/lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // ── 1. Validate required fields ────────────────────────────
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // ── 2. Look up user by email ───────────────────────────────
    const result = await query(
      `SELECT id, full_name, email, password_hash, role, is_active
       FROM users
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];

    // ── 3. Use generic error to prevent user enumeration ───────
    const INVALID_MSG = 'Invalid email or password.';

    if (!user) {
      // Still run bcrypt to prevent timing attacks
      await bcrypt.compare(password, '$2b$12$invalidhashfortimingnormalization');
      return NextResponse.json(
        { success: false, message: INVALID_MSG },
        { status: 401 }
      );
    }

    // ── 4. Check account is active ─────────────────────────────
    if (!user.is_active) {
      return NextResponse.json(
        { success: false, message: 'Your account has been deactivated. Contact your administrator.' },
        { status: 403 }
      );
    }

    // ── 5. Verify password ─────────────────────────────────────
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, message: INVALID_MSG },
        { status: 401 }
      );
    }

    // ── 6. Update last_login timestamp ─────────────────────────
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // ── 7. Sign JWT ────────────────────────────────────────────
    const token = signToken({
      id:    user.id,
      email: user.email,
      role:  user.role,
    });

    // ── 8. Set cookie + return user ────────────────────────────
    const response = NextResponse.json(
      {
        success: true,
        message: 'Login successful.',
        user: {
          id:        user.id,
          full_name: user.full_name,
          email:     user.email,
          role:      user.role,
        },
      },
      { status: 200 }
    );

    response.headers.set('Set-Cookie', buildAuthCookie(token));
    return response;

  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}