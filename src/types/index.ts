export interface Transaction {
  id: string;
  amount: number;
  status: 'succeeded' | 'pending' | 'failed';
  created_at: string;
  customer_id: string;
  affiliate_id?: string; // 'victor_hugo', 'allan_stachuk', or null/undefined
  type: 'subscription' | 'upsell_vip';
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'canceled' | 'past_due';
  created_at: string;
  source: 'direct' | 'victor_hugo' | 'allan_stachuk';
  ltv: number;
}

export interface DailyStats {
  date: string;
  new_users: number;
  cancellations: number;
  active_users: number;
}

export interface FinancialSummary {
  gross_revenue: number;
  stripe_fees: number;
  taxes: number;
  net_profit: number;
}

export interface Affiliate {
  id: string;
  name: string;
  email: string;
  code: string;
  discount_rate: number; // 0.10 for 10%
  commission_rate: number; // 0.40 for 40%
  pix_key?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface PartnerPayout {
  partner_id: string;
  name: string;
  role: 'affiliate' | 'partner';
  percentage: number; // 0-100
  amount: number;
  details?: string;
}

export interface Metrics {
  mrr: number;
  churnRate: number;
  cac: number;
  ltv: number;
  activeUsers: number;
  trafficSource: { name: string; value: number }[];
}
