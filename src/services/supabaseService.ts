import { supabase } from '@/lib/supabase';
import { Customer, DailyStats, Transaction, Metrics, Affiliate } from '@/types';
import { format, subDays, subYears } from 'date-fns';
import { mockService } from './mockData';
import { DateFilter } from '@/components/DateRangePicker';

const DEMO_MODE_KEY = 'demo_mode_active';

export const isDemoMode = () => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(DEMO_MODE_KEY) === 'true';
  } catch (e) {
    console.warn('localStorage access failed:', e);
    return false;
  }
};

export const setDemoMode = (enabled: boolean) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(DEMO_MODE_KEY, String(enabled));
    } catch (e) {
      console.warn('localStorage setItem failed:', e);
    }
    window.location.reload();
  }
};

const realSupabaseService = {
  getTransactions: async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return data as Transaction[];
  },

  getCustomers: async (): Promise<Customer[]> => {
    // 1. Busca referrals: user_id -> affiliate_ref (código do afiliado)
    const { data: referrals } = await supabase
      .from('referrals')
      .select('user_id, affiliate_ref, status');
    
    // Map: user_id -> { affiliate_ref, referral_status }
    const referralMap = new Map<string, { ref: string; status: string }>();
    if (referrals) {
      referrals.forEach((r: any) =>
        referralMap.set(r.user_id, { ref: r.affiliate_ref, status: r.status || 'pending' })
      );
    }

    // 2. Busca profiles (tabela principal do Fitmind)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, is_pro, subscription_status, created_at, last_active_at, current_streak')
      .order('created_at', { ascending: false });

    if (profiles && profiles.length > 0) {
      return profiles.map((p: any) => {
        const referral = referralMap.get(p.id);
        const isPro = p.is_pro || p.subscription_status === 'active';
        return {
          id: p.id,
          name: p.name || 'Usuário',
          email: '',
          // source = código do afiliado (ex: "JOAO10") ou 'direct'
          source: referral?.ref || 'direct',
          status: isPro ? 'active' : (p.subscription_status === 'canceled' ? 'canceled' : 'past_due'),
          created_at: p.created_at,
          ltv: isPro ? 49.90 : 0,
          last_login: p.last_active_at || p.created_at,
          current_streak: p.current_streak || 0,
        };
      }) as Customer[];
    }

    if (profileError) console.error('Error fetching profiles:', profileError);

    // 3. Fallback: tenta admin_users_view
    const { data: realUsers } = await supabase
      .from('admin_users_view')
      .select('*')
      .order('created_at', { ascending: false });

    if (realUsers && realUsers.length > 0) {
      return realUsers.map((user: any) => {
        const referral = referralMap.get(user.id);
        return {
          id: user.id,
          name: user.name || user.email?.split('@')[0] || 'Usuário',
          email: user.email || '',
          status: 'active' as const,
          created_at: user.created_at,
          source: referral?.ref || 'direct',
          ltv: 0,
          last_login: user.last_active_at || user.created_at,
          current_streak: user.current_streak || 0,
        };
      }) as Customer[];
    }

    // 4. Último fallback: subscriptions
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }

    return (data || []).map((sub: any) => {
      const referral = referralMap.get(sub.user_id);
      return {
        id: sub.id,
        name: sub.customer_name || 'Cliente',
        email: sub.customer_email || '',
        status: sub.status,
        created_at: sub.created_at,
        source: referral?.ref || sub.affiliate_id || 'direct',
        ltv: sub.plan_amount || 0,
      };
    }) as Customer[];
  },

  getDailyLogs: async (date: string) => {
    const { data, error } = await supabase
      .from('daily_goals_met')
      .select('*')
      .eq('date', date);

    if (error) {
      console.error('Error fetching daily goals:', error);
      return [];
    }
    return data;
  },

  getLogsByDateRange: async (startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('daily_goals_met')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching logs by date range:', error);
      return [];
    }
    return data;
  },

  getDailyStats: async (filter?: DateFilter): Promise<DailyStats[]> => {
    let days = 30;
    let endDate = new Date();
    
    if (filter) {
      if (filter.type === 'today') days = 0;
      else if (filter.type === '7d') days = 7;
      else if (filter.type === '14d') days = 14;
      else if (filter.type === '30d') days = 30;
      else if (filter.type === '90d') days = 90;
      else if (filter.type === '1y') days = 365;
      else if (filter.type === 'all') days = 3650;
      else if (filter.type === 'month') {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const diffTime = Math.abs(now.getTime() - startOfMonth.getTime());
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      else if (filter.type === 'custom' && filter.startDate && filter.endDate) {
        const start = new Date(filter.startDate);
        const end = new Date(filter.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        endDate = end;
      }
    }

    const startDateIso = subDays(endDate, days).toISOString();
    const endDateIso = endDate.toISOString();
    
    // 1. Calculate baseline (users active before startDate)
    const { count: activeBeforeCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', startDateIso)
      .or('is_pro.eq.true,subscription_status.eq.active');

    let currentActive = activeBeforeCount || 0;
    let currentMrr = currentActive * 49.90; // Approximate baseline MRR

    // 2. Tenta buscar estatísticas da view de usuários reais no período
    const { data: realUsers } = await supabase
      .from('admin_users_view')
      .select('created_at')
      .gte('created_at', startDateIso)
      .lte('created_at', endDateIso);

    // 3. Busca também de subscriptions para ter dados de cancelamento no período
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('created_at, status')
      .gte('created_at', startDateIso)
      .lte('created_at', endDateIso);

    // Decide qual fonte usar para "Novos Usuários"
    const newUsersSource = (realUsers && realUsers.length > 0) ? realUsers : (subs || []);

    // Group by date
    const statsMap = new Map<string, DailyStats>();
    
    // Initialize days
    for (let i = days; i >= 0; i--) {
      const date = format(subDays(endDate, i), 'yyyy-MM-dd');
      statsMap.set(date, { date, new_users: 0, cancellations: 0, active_users: 0, mrr: 0 });
    }

    // Populate new users count
    newUsersSource.forEach((item: any) => {
      const date = format(new Date(item.created_at), 'yyyy-MM-dd');
      if (statsMap.has(date)) {
        const stat = statsMap.get(date)!;
        stat.new_users += 1;
      }
    });

    // Populate cancellations
    subs?.forEach((sub: any) => {
      const date = format(new Date(sub.created_at), 'yyyy-MM-dd');
      if (statsMap.has(date) && sub.status === 'canceled') {
        const stat = statsMap.get(date)!;
        stat.cancellations += 1;
      }
    });

    // Calculate active users and MRR with baseline
    const sortedStats = Array.from(statsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    
    return sortedStats.map(stat => {
      currentActive += stat.new_users - stat.cancellations;
      currentMrr = currentActive * 49.90;
      return { ...stat, active_users: Math.max(0, currentActive), mrr: Math.max(0, currentMrr) };
    });
  },

  getMetrics: async (filter?: DateFilter): Promise<Metrics> => {
    let days = 30;
    let endDate = new Date();
    
    if (filter) {
      if (filter.type === 'today') days = 0;
      else if (filter.type === '7d') days = 7;
      else if (filter.type === '14d') days = 14;
      else if (filter.type === '30d') days = 30;
      else if (filter.type === '90d') days = 90;
      else if (filter.type === '1y') days = 365;
      else if (filter.type === 'all') days = 3650;
      else if (filter.type === 'month') {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const diffTime = Math.abs(now.getTime() - startOfMonth.getTime());
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      else if (filter.type === 'custom' && filter.startDate && filter.endDate) {
        const start = new Date(filter.startDate);
        const end = new Date(filter.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        endDate = end;
      }
    }

    const startDateIso = subDays(endDate, days).toISOString();
    const endDateIso = endDate.toISOString();

    // Fetch aggregates
    const { data: transactions } = await supabase.from('transactions').select('amount, affiliate_id, created_at').gte('created_at', startDateIso).lte('created_at', endDateIso);
    const { data: subscriptions } = await supabase.from('subscriptions').select('status, plan_amount, created_at, updated_at');
    const { data: affiliates } = await supabase.from('affiliates').select('code, name');
    
    // Tenta pegar contagem real de usuários da view/profiles
    const { count: realUserCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: activeProfileCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .or('is_pro.eq.true,subscription_status.eq.active');

    if (!transactions || !subscriptions) {
      return {
        mrr: 0,
        arr: 0,
        netNewMrr: 0,
        churnRate: 0,
        cac: 0,
        ltv: 0,
        activeUsers: activeProfileCount || 0,
        conversionRate: 0,
        trafficSource: []
      };
    }

    // MRR & ARR (Snapshot at the END of the period)
    const activeAtEnd = subscriptions.filter((s: any) => {
      const created = new Date(s.created_at);
      const isCreatedBeforeEnd = created <= endDate;
      const isActive = s.status === 'active';
      const isCanceledAfterEnd = s.status === 'canceled' && new Date(s.updated_at) > endDate;
      return isCreatedBeforeEnd && (isActive || isCanceledAfterEnd);
    });
    
    // Se não houver assinaturas mas houver perfis ativos, usamos os perfis para o MRR base
    const activeUsersCount = Math.max(activeAtEnd.length, activeProfileCount || 0);
    const mrr = activeAtEnd.length > 0 
      ? activeAtEnd.reduce((acc: number, curr: any) => acc + (curr.plan_amount || 49.90), 0)
      : (activeProfileCount || 0) * 49.90;

    const arr = mrr * 12;

    // Active Users (Paying) at end of period
    const activeUsers = activeUsersCount;

    // Churn Rate (Period specific)
    // Subscriptions that were active at start but canceled during period
    const activeAtStart = subscriptions.filter((s: any) => {
      const created = new Date(s.created_at);
      const isCreatedBeforeStart = created < new Date(startDateIso);
      const isActive = s.status === 'active';
      const isCanceledAfterStart = s.status === 'canceled' && new Date(s.updated_at) >= new Date(startDateIso);
      return isCreatedBeforeStart && (isActive || isCanceledAfterStart);
    }).length;

    const recentCancellations = subscriptions.filter((s: any) => 
      s.status === 'canceled' && 
      s.updated_at >= startDateIso && 
      s.updated_at <= endDateIso
    ).length;
    
    const periodChurnRate = activeAtStart > 0 ? (recentCancellations / activeAtStart) * 100 : 0;
    
    // Normalize Churn to Monthly (30 days) for LTV calculation
    // If period is 7 days, monthly churn is roughly periodChurn * (30/7)
    const dayCount = Math.max(days, 1);
    const monthlyChurnEquivalent = (periodChurnRate / dayCount) * 30;
    
    // Stable Churn for LTV (using a floor to avoid infinity and a ceiling for realism)
    // We use the monthly equivalent for LTV to keep it consistent across filters
    const stableChurnForLtv = Math.max(monthlyChurnEquivalent, 10.0);
    
    // CAC & LTV
    const cac = 45.00; // Estimated acquisition cost
    const arpu = activeUsers > 0 ? mrr / activeUsers : 49.90;
    const ltv = arpu / (stableChurnForLtv / 100);
    
    // Net New MRR (Actual change in MRR during the period)
    const newSubsInPeriod = subscriptions.filter((s: any) => 
      s.created_at >= startDateIso && s.created_at <= endDateIso
    );
    const newMrr = newSubsInPeriod.reduce((acc: number, curr: any) => acc + (curr.plan_amount || 49.90), 0);
    
    const canceledInPeriod = subscriptions.filter((s: any) => 
      s.status === 'canceled' && s.updated_at >= startDateIso && s.updated_at <= endDateIso
    );
    const lostMrr = canceledInPeriod.reduce((acc: number, curr: any) => acc + (curr.plan_amount || 49.90), 0);
    
    const netNewMrr = newMrr - lostMrr;

    // Churn Rate to display: we show the period churn, but maybe labeled as such
    // For now, let's keep periodChurnRate as the primary display metric
    const churnRate = periodChurnRate;

    // Conversion Rate
    const totalLeads = realUserCount || subscriptions.length;
    const conversionRate = totalLeads > 0 ? (activeUsers / totalLeads) * 100 : 0;

    // Traffic Source
    const trafficSourceMap = new Map<string, number>();
    let directCount = 0;

    transactions.forEach((t: any) => {
      if (t.affiliate_id) {
        const count = trafficSourceMap.get(t.affiliate_id) || 0;
        trafficSourceMap.set(t.affiliate_id, count + 1);
      } else {
        directCount++;
      }
    });

    const trafficSource = [];
    
    // Add affiliates found in transactions
    if (affiliates) {
      affiliates.forEach(aff => {
        // Check if we have transactions for this affiliate code
        const count = trafficSourceMap.get(aff.code) || 0;
        if (count > 0) {
          trafficSource.push({ name: aff.name, value: count });
          trafficSourceMap.delete(aff.code); // Remove processed
        }
      });
    }

    // Add remaining (legacy or unknown) affiliates
    trafficSourceMap.forEach((value, key) => {
      trafficSource.push({ name: key, value: value });
    });

    // Add Direct
    if (directCount > 0) {
      trafficSource.push({ name: 'Direto / Outros', value: directCount });
    }

    return {
      mrr,
      arr,
      netNewMrr,
      churnRate,
      cac,
      ltv,
      activeUsers,
      conversionRate,
      trafficSource
    };
  },

  getAffiliates: async (): Promise<Affiliate[]> => {
    const { data, error } = await supabase
      .from('affiliates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching affiliates:', error);
      return [];
    }
    return data as Affiliate[];
  },

  createAffiliate: async (affiliate: Omit<Affiliate, 'id' | 'created_at'>): Promise<Affiliate> => {
    const { data, error } = await supabase
      .from('affiliates')
      .insert([affiliate])
      .select()
      .single();

    if (error) throw error;
    return data as Affiliate;
  },

  updateAffiliate: async (id: string, updates: Partial<Affiliate>): Promise<Affiliate> => {
    const { data, error } = await supabase
      .from('affiliates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Affiliate;
  },

  deleteAffiliate: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('affiliates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

export const supabaseService = {
  getTransactions: async (): Promise<Transaction[]> => {
    if (isDemoMode()) return mockService.getTransactions();
    return realSupabaseService.getTransactions();
  },
  getCustomers: async (): Promise<Customer[]> => {
    if (isDemoMode()) return mockService.getCustomers();
    return realSupabaseService.getCustomers();
  },
  getDailyLogs: async (date: string) => {
    if (isDemoMode()) return [];
    return realSupabaseService.getDailyLogs(date);
  },
  getLogsByDateRange: async (startDate: string, endDate: string) => {
    if (isDemoMode()) return [];
    return realSupabaseService.getLogsByDateRange(startDate, endDate);
  },
  getDailyStats: async (filter?: DateFilter): Promise<DailyStats[]> => {
    if (isDemoMode()) return mockService.getDailyStats(filter);
    return realSupabaseService.getDailyStats(filter);
  },
  getMetrics: async (filter?: DateFilter): Promise<Metrics> => {
    if (isDemoMode()) return mockService.getMetrics(filter);
    return realSupabaseService.getMetrics(filter);
  },
  getAffiliates: async (): Promise<Affiliate[]> => {
    if (isDemoMode()) return mockService.getAffiliates();
    return realSupabaseService.getAffiliates();
  },
  createAffiliate: async (affiliate: Omit<Affiliate, 'id' | 'created_at'>): Promise<Affiliate> => {
    if (isDemoMode()) return mockService.createAffiliate(affiliate);
    return realSupabaseService.createAffiliate(affiliate);
  },
  updateAffiliate: async (id: string, updates: Partial<Affiliate>): Promise<Affiliate> => {
    if (isDemoMode()) return mockService.updateAffiliate(id, updates);
    return realSupabaseService.updateAffiliate(id, updates);
  },
  deleteAffiliate: async (id: string): Promise<void> => {
    if (isDemoMode()) return mockService.deleteAffiliate(id);
    return realSupabaseService.deleteAffiliate(id);
  }
};