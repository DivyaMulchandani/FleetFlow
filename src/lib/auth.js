import { z } from 'zod';
import { query } from '@/lib/db';
import {
  signToken as signJwtToken,
  verifyToken as verifyJwtToken,
  JWT_EXPIRES_IN_SECONDS,
  ExpiredTokenError,
} from '@/lib/jwt';
import { ApiError } from '@/lib/response';

const authPayloadSchema = z.object({
  userId: z.string().uuid(),
  role: z.string(),
  email: z.string().email(),
});

export function signToken(payload) {
  return signJwtToken(payload);
}

export function verifyToken(token) {
  return verifyJwtToken(token);
}

export function getTokenFromCookies(request) {
  const cookieStore = request?.cookies;
  if (cookieStore && typeof cookieStore.get === 'function') {
    return cookieStore.get('fleetflow_session')?.value ?? null;
  }

  const cookieHeader = request?.headers?.get?.('cookie') ?? '';
  const match = cookieHeader.match(/(?:^|;\s*)fleetflow_session=([^;]+)/);
  return match?.[1] ?? null;
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

export async function requireAuth(request) {
  const token = getTokenFromCookies(request);
  if (!token) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (error) {
    if (error instanceof ExpiredTokenError) {
      throw new ApiError(401, 'TOKEN_EXPIRED', 'Session expired.');
    }
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid session token.');
  }

  const parsedPayload = authPayloadSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid session token.');
  }

  const { userId, role } = parsedPayload.data;
  const userResult = await query(
    `SELECT id, role, is_active
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );

  const user = userResult.rows[0];
  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid session token.');
  }
  if (!user.is_active) {
    throw new ApiError(403, 'ACCOUNT_INACTIVE', 'Account is inactive.');
  }

  if (user.role !== role) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid session token.');
  }

  return {
    userId: user.id,
    role: user.role,
  };
}
