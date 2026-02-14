import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db/index';
import * as schema from '@/lib/db/schema';
import { cache } from 'react';

const CHROME_EXTENSION_ID = process.env.NEXT_PUBLIC_CHROME_EXTENSION_ID || 'lmepenbgdgfihjehjnanphnfhobclghl';

function toOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const SITE_TRUSTED_ORIGINS = [
  toOrigin(process.env.NEXT_PUBLIC_BASE_URL),
  toOrigin(process.env.NEXT_PUBLIC_SITE_URL),
].filter(Boolean) as string[];

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: schema,
  }),

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },

  session: {},

  pages: {
    signIn: '/login',
    error: '/auth/error',
  },

  cors: {
    origin: [`chrome-extension://${CHROME_EXTENSION_ID}`],
    credentials: true,
  },

  trustedOrigins: [
    `chrome-extension://${CHROME_EXTENSION_ID}`,
    ...SITE_TRUSTED_ORIGINS,
  ],
});

/**
 * 获取会话（请求内缓存）
 *
 * Session 只包含身份认证信息：user.id, user.email, user.name, user.image
 * 业务数据（订阅、时区等）请使用 getUserSettings(userId)
 */
export const getSession = cache(async () => {
  const { headers } = await import('next/headers');
  const h = await headers();
  return await auth.api.getSession({ headers: h });
});

export async function signIn(provider: string) {
  return { url: `/api/auth/better-auth/signin/${provider}` };
}

export async function signOut() {
  return { redirect: '/api/auth/better-auth/signout' };
}

export const SESSION_COOKIE_NAME = 'better-auth.session_token';

export {getUserSettings} from './helpers/get-user-settings';