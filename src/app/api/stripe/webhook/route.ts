import { NextRequest, NextResponse } from 'next/server';
import { db, userSubscription } from '@/lib/db';
import { stripe } from '@/stripe';
import type Stripe from 'stripe';
import { redis } from '@/lib/redis';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { SUBSCRIPTION_KEYS, USER_KEYS } from '@/constants/redis-keys';
import { logWebhook, type WebhookProcessingBranch } from '@/lib/webhook-log';

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
}): Promise<string | undefined> {
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

    return subscriptionId;
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
            const userId = session.client_reference_id;

            if (!userId) {
                await logWebhook({
                    stripeEventId: event.id,
                    eventType: event.type,
                    userId: null,
                    processingBranch: 'skipped',
                    success: true,
                    payload: { reason: '未找到用户ID', sessionId: session.id }
                });
                return NextResponse.json({ success: true, message: '未找到用户ID' });
            }

            try {
                const now = dayjs();
                const startTime = now.toISOString();
                const endTime = now.add(1, 'month').toISOString();

                const { stripeCustomerId, stripeCustomerEmail } = session.customer 
                    ? await getStripeCustomerInfo(session.customer as string) 
                    : { stripeCustomerId: null, stripeCustomerEmail: null };
                
                const subscriptionId = await processSubscription({
                    userId,
                    startTime,
                    endTime,
                    stripeCustomerId,
                    stripeCustomerEmail,
                    subscriptionType: 'oneTime'
                });

                await logWebhook({
                    stripeEventId: event.id,
                    eventType: event.type,
                    userId,
                    stripeCustomerId,
                    stripeCustomerEmail,
                    processingBranch: 'one_time_payment',
                    success: true,
                    subscriptionId,
                    payload: { startTime, endTime, sessionId: session.id }
                });

                return NextResponse.json({ success: true });
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : '处理一次性支付事件失败';
                console.error('处理一次性支付事件失败:', err);
                
                await logWebhook({
                    stripeEventId: event.id,
                    eventType: event.type,
                    userId,
                    processingBranch: 'error',
                    success: false,
                    errorMessage,
                    payload: { sessionId: session.id }
                });
                
                return NextResponse.json({ success: false, error: '处理一次性支付事件失败' }, { status: 500 });
            }
        } else {
            await logWebhook({
                stripeEventId: event.id,
                eventType: event.type,
                userId: session.client_reference_id,
                processingBranch: 'subscription_checkout_skip',
                success: true,
                payload: { reason: '订阅模式checkout完成，等待invoice事件处理', sessionId: session.id }
            });
            return NextResponse.json({ success: true, message: '订阅模式checkout完成，等待invoice事件处理' });
        }
    }

    if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object as Stripe.Invoice;

        const subscriptionDetails = invoice.parent?.subscription_details;
        if (!subscriptionDetails?.subscription) {
            await logWebhook({
                stripeEventId: event.id,
                eventType: event.type,
                processingBranch: 'skipped',
                success: true,
                payload: { reason: '非订阅类型发票，跳过', invoiceId: invoice.id }
            });
            return NextResponse.json({ success: true, message: '非订阅类型发票，跳过' });
        }

        const stripeSubscriptionId = typeof subscriptionDetails.subscription === 'string' 
            ? subscriptionDetails.subscription 
            : subscriptionDetails.subscription.id;

        try {
            const subscriptionObject = await stripe.subscriptions.retrieve(stripeSubscriptionId);
            
            const userId = subscriptionObject.metadata?.userId;
            if (!userId) {
                console.warn('[Webhook] subscription metadata 中没有 userId', {
                    invoiceId: invoice.id,
                    stripeSubscriptionId
                });
                await logWebhook({
                    stripeEventId: event.id,
                    eventType: event.type,
                    processingBranch: 'skipped',
                    success: true,
                    payload: { reason: '未找到用户ID', invoiceId: invoice.id, stripeSubscriptionId }
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
            
            const subscriptionId = await processSubscription({
                userId,
                startTime,
                endTime,
                stripeCustomerId,
                stripeCustomerEmail,
                subscriptionType: 'subscription'
            });

            await logWebhook({
                stripeEventId: event.id,
                eventType: event.type,
                userId,
                stripeCustomerId,
                stripeCustomerEmail,
                processingBranch: 'subscription',
                success: true,
                subscriptionId,
                payload: { startTime, endTime, invoiceId: invoice.id, stripeSubscriptionId }
            });

            return NextResponse.json({ success: true });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '处理订阅事件失败';
            console.error('处理订阅事件失败:', err);
            
            await logWebhook({
                stripeEventId: event.id,
                eventType: event.type,
                processingBranch: 'error',
                success: false,
                errorMessage,
                payload: { invoiceId: invoice.id, stripeSubscriptionId }
            });
            
            return NextResponse.json({ success: false, error: '处理订阅事件失败' }, { status: 500 });
        }
    }

    await logWebhook({
        stripeEventId: event.id,
        eventType: event.type,
        processingBranch: 'unhandled',
        success: true,
        payload: { message: '事件已接收但未处理' }
    });

    return NextResponse.json({ success: true, message: '事件已接收但未处理' });
}
