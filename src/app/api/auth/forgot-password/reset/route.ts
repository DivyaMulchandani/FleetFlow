import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { clearSessionCookie } from '@/lib/cookies';
import { withTransaction } from '@/lib/prisma';

export const runtime = 'nodejs';

const SALT_ROUNDS = 12;
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

const resetPasswordSchema = z.object({
  token: z.string().min(32).max(512),
  newPassword: z
    .string()
    .min(PASSWORD_MIN_LENGTH)
    .max(PASSWORD_MAX_LENGTH)
    .regex(/[a-z]/, 'Password must include a lowercase letter.')
    .regex(/[A-Z]/, 'Password must include an uppercase letter.')
    .regex(/[0-9]/, 'Password must include a number.')
    .regex(/[^A-Za-z0-9]/, 'Password must include a special character.'),
});

type QueryResultRows<T> = {
  rows: T[];
};

type QueryFn = <T>(
  text: string,
  params?: readonly unknown[],
) => Promise<QueryResultRows<T>>;

type ResetTokenRow = {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  used?: boolean;
  used_at?: Date | null;
};

type ColumnRow = {
  column_name: string;
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

function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

let resetTokenUsedColumnCache: 'used' | 'used_at' | null = null;

async function getResetTokenUsedColumn(query: QueryFn): Promise<'used' | 'used_at'> {
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

async function findActiveResetToken(
  query: QueryFn,
  tokenHash: string,
  usedColumn: 'used' | 'used_at',
): Promise<ResetTokenRow | null> {
  if (usedColumn === 'used') {
    const result = await query<ResetTokenRow>(
      `SELECT id, user_id, token, expires_at, used
       FROM password_reset_tokens
       WHERE token = $1
         AND used = false
         AND expires_at > NOW()
       LIMIT 1
       FOR UPDATE`,
      [tokenHash],
    );
    return result.rows[0] ?? null;
  }

  const result = await query<ResetTokenRow>(
    `SELECT id, user_id, token, expires_at, used_at
     FROM password_reset_tokens
     WHERE token = $1
       AND used_at IS NULL
       AND expires_at > NOW()
     LIMIT 1
     FOR UPDATE`,
    [tokenHash],
  );
  return result.rows[0] ?? null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body.', 400);
    }

    const { token, newPassword } = parsed.data;
    const tokenHash = hashResetToken(token);

    const result = await withTransaction(async (client) => {
      const clientQuery: QueryFn = (text, params = []) =>
        client.query(text, params as unknown[]);

      const usedColumn = await getResetTokenUsedColumn(clientQuery);
      const resetRecord = await findActiveResetToken(clientQuery, tokenHash, usedColumn);

      if (!resetRecord || !timingSafeEqualStrings(tokenHash, resetRecord.token)) {
        return { ok: false as const };
      }

      const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      await clientQuery(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [newPasswordHash, resetRecord.user_id],
      );

      if (usedColumn === 'used') {
        await clientQuery(
          `UPDATE password_reset_tokens
           SET used = true
           WHERE user_id = $1 AND used = false`,
          [resetRecord.user_id],
        );
      } else {
        await clientQuery(
          `UPDATE password_reset_tokens
           SET used_at = NOW()
           WHERE user_id = $1 AND used_at IS NULL`,
          [resetRecord.user_id],
        );
      }

      return { ok: true as const };
    });

    if (!result.ok) {
      return errorResponse('INVALID_TOKEN', 'Token is invalid or expired.', 400);
    }

    const response = successResponse(
      { message: 'Password reset successful.' },
      200,
    );

    // Clear existing cookie in case reset is initiated from an authenticated browser.
    clearSessionCookie(response);
    return response;
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Internal server error.', 500);
  }
}
