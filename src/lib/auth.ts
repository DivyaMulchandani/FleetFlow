import { getSessionToken } from '@/lib/cookies';
import { query } from '@/lib/prisma';
import { signToken, verifyToken, JWT_EXPIRES_IN_SECONDS, type SessionJwtPayload } from '@/lib/jwt';

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
};

export type CurrentUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  let payload: SessionJwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return null;
  }

  const userResult = await query<UserRow>(
    `SELECT id, full_name, email, role, is_active
     FROM users
     WHERE id = $1 AND email = $2
     LIMIT 1`,
    [payload.userId, payload.email],
  );

  const user = userResult.rows[0];
  if (!user || !user.is_active) {
    return null;
  }

  return user;
}

export function buildAuthCookie(token: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  return [
    `fleetflow_session=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    isProd ? 'Secure' : '',
    `Max-Age=${JWT_EXPIRES_IN_SECONDS}`,
  ]
    .filter(Boolean)
    .join('; ');
}

export function buildClearCookie(): string {
  const isProd = process.env.NODE_ENV === 'production';
  return [
    'fleetflow_session=',
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    isProd ? 'Secure' : '',
    'Max-Age=0',
  ]
    .filter(Boolean)
    .join('; ');
}

export { signToken, verifyToken };
