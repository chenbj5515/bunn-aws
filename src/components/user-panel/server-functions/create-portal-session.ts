'use server'

import { getSession } from '@/lib/auth';
import { stripe } from '@/stripe'
import { cookies } from 'next/headers'
import { db } from '@/lib/db';
import { userSubscription, user } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// Stripe 支持的语言代码类型
type Locale = 'bg' | 'cs' | 'da' | 'de' | 'el' | 'en' | 'es' | 'et' | 'fi' | 'fil' | 'fr' | 'hr' | 'hu' | 'id' | 'it' | 'ja' | 'ko' | 'lt' | 'lv' | 'ms' | 'mt' | 'nb' | 'nl' | 'pl' | 'pt' | 'ro' | 'ru' | 'sk' | 'sl' | 'sv' | 'th' | 'tr' | 'vi' | 'zh';

// 将 Next.js 的语言代码映射到 Stripe 支持的语言代码
function mapLocaleToStripe(locale: string): Locale {
    // 这里可以添加更多的映射关系
    const mapping: Record<string, Locale> = {
        'zh-CN': 'zh',
        'zh-TW': 'zh',
        'zh': 'zh',
        'en': 'en',
        'ja': 'ja'
    };
    return mapping[locale] || 'en';
}

export async function createPortalSession() {
    const session = await getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('未登录');
    const cookieStore = await cookies();
    const nextLocale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
    const locale = mapLocaleToStripe(nextLocale);

    const userRow = await db.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { email: true }
    });
    const email = userRow?.email;
    if (!email) throw new Error('Not authenticated')

    // 先查询用户最新的订阅记录，尝试获取保存的 Stripe 客户 ID
    let customerId: string | null = null;
    
    {
        const userSubs = await db.query.userSubscription.findMany({
            where: eq(userSubscription.userId, userId),
            orderBy: [desc(userSubscription.startTime)],
            limit: 1
        });
        
        if (userSubs && userSubs.length > 0 && userSubs[0]?.stripeCustomerId) {
            customerId = userSubs[0].stripeCustomerId;
        }
    }
    
    // 如果订阅表中没有找到 Stripe 客户 ID，则通过邮箱查询
    if (!customerId) {
        // 获取用户的 Stripe 客户 ID
        const customer = await stripe.customers.list({
            email,
            limit: 1
        });

        if (!customer.data.length) {
            throw new Error('No Stripe customer found')
        }
        
        customerId = customer.data[0]!.id;
    }

    // 创建一个新的门户会话
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}`,
        locale: locale,
    })

    return portalSession.url
} 