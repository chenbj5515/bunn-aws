export type BillingBreakdownItem = {
  id: string;
  label: string;
  micro: number;
  usd: number;
  calculationNote: string;
};

export type UserBillingSnapshot = {
  userId: string;
  billingAsPaid: boolean;
  subscriptionActive: boolean;
  subscriptionType: 'subscription' | 'oneTime' | null;
  subscriptionExpireTime: string | null;
  subscriptionId: string | null;
  timezone: string;
  mode: 'subscription' | 'free';
  periodLabel: string;
  totalMicro: number;
  totalUsd: number;
  quotaMicro: number;
  quotaUsd: number;
  breakdown: BillingBreakdownItem[];
  resetAtIso: string | null;
  resetHint: string;
  costKeyTtlSeconds: number | null;
  methodology: string[];
};
