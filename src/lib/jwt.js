import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { z } from 'zod';

const jwtEnvSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long.'),
});

const parsedEnv = jwtEnvSchema.safeParse(process.env);
if (!parsedEnv.success) {
  throw new Error('Invalid JWT environment configuration.');
}

const JWT_SECRET = parsedEnv.data.JWT_SECRET;
const JWT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;
const JWT_EXPIRES_IN = '7d';

export class InvalidTokenError extends Error {
  constructor(message = 'Invalid session token.') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export class ExpiredTokenError extends Error {
  constructor(message = 'Session token has expired.') {
    super(message);
    this.name = 'ExpiredTokenError';
  }
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });

    if (!decoded.userId || !decoded.role || !decoded.email) {
      throw new InvalidTokenError();
    }

    return {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    };
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new ExpiredTokenError();
    }
    throw new InvalidTokenError();
  }
}

export { JWT_EXPIRES_IN_SECONDS };
