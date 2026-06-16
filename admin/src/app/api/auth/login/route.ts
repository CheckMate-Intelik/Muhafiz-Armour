import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const ADMIN_TOKEN_COOKIE = 'armored_admin_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.username !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ message: 'Invalid login payload' }, { status: 400 });
  }

  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: body.username, password: body.password }),
    cache: 'no-store',
  });

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    return new NextResponse(text || res.statusText, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let token: string | undefined;
  try {
    const data = JSON.parse(text) as { token?: string; role?: string };
    token = data.token;
  } catch {
    return NextResponse.json({ message: 'Invalid login response' }, { status: 502 });
  }

  if (!token) {
    return NextResponse.json({ message: 'Invalid login response' }, { status: 502 });
  }

  const response = NextResponse.json({ role: 'ADMIN' });
  response.cookies.set(ADMIN_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return response;
}
