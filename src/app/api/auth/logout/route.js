import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/cookies';

export const runtime = 'nodejs';

function successResponse(data, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export async function POST() {
  const response = successResponse({ message: 'Logged out successfully.' }, 200);
  clearSessionCookie(response);
  return response;
}
