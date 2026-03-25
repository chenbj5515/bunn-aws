import { NextRequest, NextResponse } from 'next/server';
import { db, userSubscription } from '@/lib/db';
import { stripe } from '@/stripe';
import type Stripe from 'stripe';
import { redis } from '@/lib/redis';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { SUBSCRIPTION_KEYS, USER_KEYS } from '@/constants/redis-keys';

/**
 * 安全解析Redis中的用户设置数据
 * @param value Redis中存储的值
 * @returns 解析后的对象，失败时返回空对象
 */
function parseUserSettings(value: unknown): Record<string, any> {
  if (!value) return {}

  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (parseError) {
      console.warn('解析Redis用户设置失败，使用默认值:', parseError)
      return {}
    }
  }

  if (typeof value === 'object') {
    return value as Record<string, any>
  }

  return {}
}

dayjs.extend(utc);

/**
 * 获取所有订阅用户相关的Redis key
 * @param userId 用户ID
 * @returns 所有需要删除的key数组
 */
function getAllSubscriptionKeys(userId: string): string[] {
    const keys: string[] = [];

    keys.push(SUBSCRIPTION_KEYS.tokens(userId));
    keys.push(SUBSCRIPTION_KEYS.tokensInput(userId));
    keys.push(SUBSCRIPTION_KEYS.tokensOutput(userId));

    keys.push(SUBSCRIPTION_KEYS.modelTokens.gpt4o.total(userId));
    keys.push(SUBSCRIPTION_KEYS.modelTokens.gpt4o.input(userId));
    keys.push(SUBSCRIPTION_KEYS.modelTokens.gpt4o.output(userId));
    keys.push(SUBSCRIPTION_KEYS.modelTokens.gpt4oMini.total(userId));
    keys.push(SUBSCRIPTION_KEYS.modelTokens.gpt4oMini.input(userId));
    keys.push(SUBSCRIPTION_KEYS.modelTokens.gpt4oMini.output(userId));

    keys.push(SUBSCRIPTION_KEYS.costs.total(userId));
    keys.push(SUBSCRIPTION_KEYS.costs.openaiTotal(userId));
    keys.push(SUBSCRIPTION_KEYS.costs.minimaxTts(userId));
    keys.push(SUBSCRIPTION_KEYS.costs.vercelBlob(userId));

    return keys;
}

export const dynamic = 'force-dynamic';

type SubscriptionType = 'subscription' | 'oneTime';

async function processSubscription({
    userId,
    startTime,
    endTime,
    stripeCustomerId,
    stripeCustomerEmail,
    subscriptionType
}: {
    userId: string,
    startTime: string,
    endTime: string,
    stripeCustomerId: string | null,
    stripeCustomerEmail: string | null,
    subscriptionType: SubscriptionType
}) {
    const inserted = await db.insert(userSubscription).values({
        userId,
        stripeCustomerId,
        stripeCustomerEmail,
        startTime,
        endTime,
        subscriptionType,
    }).returning({ id: userSubscription.id });
    const subscriptionId = inserted?.[0]?.id;

    try {
        const redisKey = USER_KEYS.settings(userId);
        
        const existingSettings = await redis.get(redisKey);
        const settings = parseUserSettings(existingSettings);
        
        const updatedSettings = {
            ...settings,
            subscription: {
                active: true,
                expireTime: endTime,
                type: subscriptionType,
                subscription_id: subscriptionId || settings.subscription?.subscription_id
            }
        };
        
        await redis.set(redisKey, JSON.stringify(updatedSettings));

        const allSubscriptionKeys = getAllSubscriptionKeys(userId);
        if (allSubscriptionKeys.length > 0) {
            await redis.del(...allSubscriptionKeys);
        }
    } catch (redisError) {
        console.error('Redis操作失败:', redisError);
    }
}

async function getStripeCustomerInfo(customerId: string) {
    let stripeCustomerId = null;
    let stripeCustomerEmail = null;
    
    try {
        const customerInfo = await stripe.customers.retrieve(customerId);
        
        if (customerInfo && !customerInfo.deleted) {
            stripeCustomerId = customerInfo.id;
            stripeCustomerEmail = customerInfo.email || null;
        }
    } catch (customerError) {
        console.error('获取 Stripe 客户信息失败:', customerError);
    }
    
    return { stripeCustomerId, stripeCustomerEmail };
}

export async function POST(req: NextRequest) {
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    if (!signature) {
        return NextResponse.json({ success: false, error: '缺少 Stripe 签名' }, { status: 400 });
    }

    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

    if (!STRIPE_WEBHOOK_SECRET) {
        return NextResponse.json({ success: false, error: '未配置 Stripe Webhook Secret' }, { status: 500 });
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            payload,
            signature,
            STRIPE_WEBHOOK_SECRET
        );
    } catch (err: any) {
        return NextResponse.json(
            { message: `Webhook Error: ${err.message}` },
            { status: 400 }
        );
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'payment') {
            try {
                const userId = session.client_reference_id;

                if (!userId) {
                    return NextResponse.json({ success: true, message: '未找到用户ID' });
                }

                const now = dayjs();
                const startTime = now.toISOString();
                const endTime = now.add(1, 'month').toISOString();

                const { stripeCustomerId, stripeCustomerEmail } = session.customer 
                    ? await getStripeCustomerInfo(session.customer as string) 
                    : { stripeCustomerId: null, stripeCustomerEmail: null };
                
                await processSubscription({
                    userId,
                    startTime,
                    endTime,
                    stripeCustomerId,
                    stripeCustomerEmail,
                    subscriptionType: 'oneTime'
                });

                return NextResponse.json({ success: true });
            } catch (err) {
                console.error('处理一次性支付事件失败:', err);
                return NextResponse.json({ success: false, error: '处理一次性支付事件失败' }, { status: 500 });
            }
        } else {
            return NextResponse.json({ success: true, message: '订阅模式checkout完成，等待invoice事件处理' });
        }
    }

    if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object as Stripe.Invoice;

        try {
            const subscriptionDetails = invoice.parent?.subscription_details;
            if (!subscriptionDetails?.subscription) {
                return NextResponse.json({ success: true, message: '非订阅类型发票，跳过' });
            }

            const subscriptionId = typeof subscriptionDetails.subscription === 'string' 
                ? subscriptionDetails.subscription 
                : subscriptionDetails.subscription.id;

            const subscriptionObject = await stripe.subscriptions.retrieve(subscriptionId);
            
            const userId = subscriptionObject.metadata?.userId;
            if (!userId) {
                console.warn('[Webhook] subscription metadata 中没有 userId', {
                    invoiceId: invoice.id,
                    subscriptionId
                });
                return NextResponse.json({ success: true, message: '未找到用户ID' });
            }

            const startTime = dayjs(invoice.period_start * 1000).toISOString();
            const endTime = dayjs(invoice.period_end * 1000).toISOString();

            const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
            const { stripeCustomerId, stripeCustomerEmail } = customerId
                ? await getStripeCustomerInfo(customerId) 
                : { stripeCustomerId: null, stripeCustomerEmail: null };
            
            console.log('[Webhook] 处理订阅:', { userId, startTime, endTime, stripeCustomerId });
            
            await processSubscription({
                userId,
                startTime,
                endTime,
                stripeCustomerId,
                stripeCustomerEmail,
                subscriptionType: 'subscription'
            });

            return NextResponse.json({ success: true });
        } catch (err) {
            console.error('处理订阅事件失败:', err);
            return NextResponse.json({ success: false, error: '处理订阅事件失败' }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true, message: '事件已接收但未处理' });
}
