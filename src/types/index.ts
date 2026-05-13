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
  /** Melhor estimativa de último acesso: last_active_at > last_activity_date > last_sign_in_at */
  last_login?: string;
  /** Última atividade real no app (daily_records) */
  last_app_activity?: string;
  current_streak?: number;
  plan?: 'monthly' | 'annual' | 'beta';
  stripe_customer_id?: string;
  subscription?: any;
  initial_weight?: number;
  current_weight?: number;
  goal_weight?: number;
  start_weight_date?: string;
  in_waitlist?: boolean;
  waitlist_date?: string;
  trial_ends_at?: string;
  trial_start_date?: string;
  subscription_end_date?: string;
  is_manual_pro?: boolean;
  pro_granted_at?: string;
  /** Valor mensal normalizado para MRR (anual ÷ 12) */
  mrr_contribution?: number;
  /** True se é assinante anual */
  is_annual?: boolean;
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
  // MRR breakdown por plano
  mrrMonthly: number;
  mrrAnnual: number;
  // Upsell: usuários que foram de mensal → anual no período
  upsellCount: number;
  upsellMrr: number;
  // Novos no período
  newCount: number;
  newMrr: number;
  // Churn no período
  churnCount: number;
  churnedMrr: number;
}
