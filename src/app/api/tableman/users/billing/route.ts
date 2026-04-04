import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/tableman/auth';
import { getUserBillingSnapshot } from '@/lib/tableman/user-billing-snapshot';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return unauthorizedResponse(admin);
  }

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const snapshot = await getUserBillingSnapshot(userId);
    return NextResponse.json(snapshot);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load billing';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
