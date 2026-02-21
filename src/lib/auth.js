import { getSessionToken } from '@/lib/cookies';
import { query } from '@/lib/prisma';
import { signToken, verifyToken, JWT_EXPIRES_IN_SECONDS } from '@/lib/jwt';

export async function getCurrentUser() {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return null;
  }

  const userResult = await query(
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

export function buildAuthCookie(token) {
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

export function buildClearCookie() {
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
