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
  status: 'active' | 'canceled' | 'past_due' | 'pending' | 'tester';
  created_at: string;
  source: string;
  ltv: number;
  last_login?: string;
  current_streak?: number;
  plan?: 'monthly' | 'annual';
  stripe_customer_id?: string;
  subscription?: any;
  initial_weight?: number;
  current_weight?: number;
  goal_weight?: number;
}

export interface DailyLog {
  id: string;
  user_id: string;
  date: string;
  protein_met: boolean;
  water_met: boolean;
  workout_met: boolean;
  protein_grams?: number;
  water_liters?: number;
  workouts_count?: number;
}

export interface DailyStats {
  date: string;
  new_users: number;
  cancellations: number;
  active_users: number;
  mrr: number;
}

export interface MonthlyStats {
  month: string;
  mrr: number;
  new_users: number;
  cancellations: number;
}

export interface WeeklyStats {
  week: string;
  new_users: number;
  cancellations: number;
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
  total_paid?: number;
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
  arr: number;
  netNewMrr: number;
  churnRate: number;
  cac: number;
  ltv: number;
  activeUsers: number;
  totalUsers: number;
  conversionRate: number;
  trafficSource: { name: string; value: number }[];
}
