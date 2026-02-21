import { cookies } from 'next/headers';
import { type NextResponse } from 'next/server';
import { JWT_EXPIRES_IN_SECONDS } from '@/lib/jwt';

export const SESSION_COOKIE_NAME = 'fleetflow_session';

const isProduction = process.env.NODE_ENV === 'production';

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: JWT_EXPIRES_IN_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}
