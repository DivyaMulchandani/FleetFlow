import { NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/cookies';
import { ExpiredTokenError, verifyToken } from '@/lib/jwt';
import { query } from '@/lib/prisma';

export const runtime = 'nodejs';

function successResponse(data, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

function errorResponse(code, message, status) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status },
  );
}

export async function GET() {
  try {
    const token = await getSessionToken();
    if (!token) {
      return errorResponse('UNAUTHORIZED', 'Authentication required.', 401);
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      if (error instanceof ExpiredTokenError) {
        return errorResponse('TOKEN_EXPIRED', 'Session expired.', 401);
      }
      return errorResponse('UNAUTHORIZED', 'Invalid session token.', 401);
    }

    const userResult = await query(
      `SELECT id, full_name, email, role, is_active
       FROM users
       WHERE id = $1 AND email = $2
       LIMIT 1`,
      [payload.userId, payload.email],
    );
    const user = userResult.rows[0];

    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Invalid session token.', 401);
    }

    if (!user.is_active) {
      return errorResponse('ACCOUNT_INACTIVE', 'Account is inactive.', 403);
    }

    return successResponse(user, 200);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Internal server error.', 500);
  }
}
