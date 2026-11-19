import { NextResponse } from 'next/server';

export async function POST(req) {
  const { login, password } = await req.json();
  const validLogin = process.env.ADMIN_LOGIN || 'arenda';
  const validPassword = process.env.ADMIN_PASSWORD || '295114174';

  if (login === validLogin && password === validPassword) {
    return NextResponse.json({ status: 'success' });
  }
  return NextResponse.json({ status: 'error' }, { status: 401 });
}