import crypto from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { sendPasswordResetEmail } from '@/lib/email';
import { query } from '@/lib/prisma';

export const runtime = 'nodejs';

const forgotPasswordSchema = z.object({
  email: z.string().email().max(150),
});

type UserRow = {
  id: string;
  email: string;
  is_active: boolean;
};

type ColumnRow = {
  column_name: string;
};

const GENERIC_SUCCESS = {
  message: 'If the account exists, a password reset link has been sent.',
};

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

let resetTokenUsedColumnCache: 'used' | 'used_at' | null = null;

async function getResetTokenUsedColumn(): Promise<'used' | 'used_at'> {
  if (resetTokenUsedColumnCache) {
    return resetTokenUsedColumnCache;
  }

  const result = await query<ColumnRow>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'password_reset_tokens'
       AND column_name IN ('used', 'used_at')`,
  );

  const columns = new Set(result.rows.map((row) => row.column_name));
  resetTokenUsedColumnCache = columns.has('used') ? 'used' : 'used_at';
  return resetTokenUsedColumnCache;
}

function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body.', 400);
    }

    const email = parsed.data.email.toLowerCase().trim();

    const userResult = await query<UserRow>(
      `SELECT id, email, is_active
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email],
    );
    const user = userResult.rows[0];

    if (user && user.is_active) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashResetToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      const usedColumn = await getResetTokenUsedColumn();

      if (usedColumn === 'used') {
        await query(
          `INSERT INTO password_reset_tokens (user_id, token, expires_at, used)
           VALUES ($1, $2, $3, false)`,
          [user.id, tokenHash, expiresAt],
        );
      } else {
        await query(
          `INSERT INTO password_reset_tokens (user_id, token, expires_at, used_at)
           VALUES ($1, $2, $3, NULL)`,
          [user.id, tokenHash, expiresAt],
        );
      }

      await sendPasswordResetEmail(user.email, rawToken);
    }

    return successResponse(GENERIC_SUCCESS, 200);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Internal server error.', 500);
  }
}
