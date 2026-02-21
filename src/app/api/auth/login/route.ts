import bcrypt from 'bcrypt';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { setSessionCookie } from '@/lib/cookies';
import { signToken } from '@/lib/jwt';
import { query } from '@/lib/prisma';

export const runtime = 'nodejs';

type LoginRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  password_hash: string;
};

const loginSchema = z.object({
  email: z.string().email().max(150),
  password: z.string().min(1).max(128),
});

const INVALID_CREDENTIALS = 'Invalid email or password.';
const DUMMY_BCRYPT_HASH = '$2b$12$eIXvBcl6Yh2u8U3u8QJQwOv2m5V7xod8fWv6n6iHjY7n8xG7uN3QG';

function successResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

function errorResponse(
  code: string,
  message: string,
  status: number,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status },
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body.', 400);
    }

    const email = parsed.data.email.toLowerCase().trim();
    const { password } = parsed.data;

    // Structure for future rate-limit adapter without changing handler signature.
    const _rateLimitContext = { identifier: email, route: 'auth:login' };
    void _rateLimitContext;

    const userResult = await query<LoginRow>(
      `SELECT id, full_name, email, role, is_active, password_hash
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email],
    );
    const user = userResult.rows[0];

    // Always execute bcrypt compare to reduce observable timing variance.
    const hashToCompare = user?.password_hash ?? DUMMY_BCRYPT_HASH;
    const passwordMatches = await bcrypt.compare(password, hashToCompare);

    if (!user || !passwordMatches) {
      return errorResponse('INVALID_CREDENTIALS', INVALID_CREDENTIALS, 401);
    }

    if (!user.is_active) {
      return errorResponse('ACCOUNT_INACTIVE', 'Account is inactive.', 403);
    }

    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const sessionToken = signToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    const response = successResponse(
      {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      },
      200,
    );

    setSessionCookie(response, sessionToken);
    return response;
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Internal server error.', 500);
  }
}
