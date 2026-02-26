'use server';

import { getSession } from '@/lib/auth';
import { updateUserSettings } from '@/lib/auth/helpers/update-user-settings';

interface UpdateUserRedisResult {
  success: boolean;
  error?: string;
}

export async function updateUserRedis(timezone: string): Promise<UpdateUserRedisResult> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    await updateUserSettings(session.user.id, { timezone });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
