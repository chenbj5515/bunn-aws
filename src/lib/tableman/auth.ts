import { getSession } from '@/lib/auth';
import { NextResponse } from 'next/server';

export type AdminCheckResult =
  | { authorized: true; userId: string }
  | { authorized: false; status: 401 | 403; message: string };

export async function requireAdmin(): Promise<AdminCheckResult> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { authorized: false, status: 401, message: 'Unauthorized' };
  }

  const role = (session.user as { role?: string }).role;

  if (role !== 'admin') {
    return { authorized: false, status: 403, message: 'Admin access required' };
  }

  return { authorized: true, userId: session.user.id };
}

export function unauthorizedResponse(result: { status: 401 | 403; message: string }) {
  return NextResponse.json({ error: result.message }, { status: result.status });
}
