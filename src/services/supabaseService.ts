import { supabase } from '@/lib/supabase';
import { Customer, DailyStats, Transaction, Metrics, Affiliate } from '@/types';
import { format, subDays } from 'date-fns';
import { mockService } from './mockData';

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
    // 1. Fetch referrals to map user_id -> affiliate_ref
    const { data: referrals } = await supabase.from('referrals').select('user_id, affiliate_ref');
    const referralMap = new Map<string, string>();
    if (referrals) {
      referrals.forEach((r: any) => referralMap.set(r.user_id, r.affiliate_ref));
    }

    // 2. Tenta buscar da view de usuários reais (se existir)
    // Isso é útil se você já tem usuários no Supabase Auth e criou a view 'admin_users_view'
    const { data: realUsers, error: realError } = await supabase
      .from('admin_users_view')
      .select('*')
      .order('created_at', { ascending: false });

    if (realUsers && realUsers.length > 0) {
      return realUsers.map((user: any) => ({
        id: user.id,
        name: user.name || user.name_alt || user.email?.split('@')[0] || 'Usuário',
        email: user.email || 'sem-email@exemplo.com',
        status: 'active', // Assumindo ativo se está na base de usuários
        created_at: user.created_at,
        source: referralMap.get(user.id) || 'direct', // Use referral map
        ltv: 0, // Não temos info de pagamento na tabela de auth
      })) as Customer[];
    }

    // 3. Se falhar ou não tiver view, tenta buscar de subscriptions (fallback para webhook do Stripe)
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      // Se der erro em ambos, retorna array vazio
      return [];
    }

    // Map subscription data to Customer interface
    return data.map((sub: any) => ({
      id: sub.id,
      name: sub.customer_name || 'Cliente',
      email: sub.customer_email || 'email@exemplo.com',
      status: sub.status,
      created_at: sub.created_at,
      source: sub.affiliate_id || referralMap.get(sub.user_id) || 'direct',
      ltv: sub.plan_amount || 0, // Simplified LTV
    })) as Customer[];
  },

  getDailyStats: async (): Promise<DailyStats[]> => {
    // Fetch last 30 days of data
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
    
    // 1. Tenta buscar estatísticas da view de usuários reais
    const { data: realUsers } = await supabase
      .from('admin_users_view')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo);

    // 2. Busca também de subscriptions para ter dados de cancelamento (se houver)
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('created_at, status')
      .gte('created_at', thirtyDaysAgo);

    // Decide qual fonte usar para "Novos Usuários"
    // Se tiver usuários reais na view, usa eles. Senão, usa subscriptions.
    const newUsersSource = (realUsers && realUsers.length > 0) ? realUsers : (subs || []);

    // Group by date
    const statsMap = new Map<string, DailyStats>();
    
    // Initialize last 30 days
    for (let i = 0; i < 30; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      statsMap.set(date, { date, new_users: 0, cancellations: 0, active_users: 0 });
    }

    // Populate new users count
    newUsersSource.forEach((item: any) => {
      const date = format(new Date(item.created_at), 'yyyy-MM-dd');
      if (statsMap.has(date)) {
        const stat = statsMap.get(date)!;
        stat.new_users += 1;
      }
    });

    // Populate cancellations (only available from subscriptions)
    subs?.forEach((sub: any) => {
      const date = format(new Date(sub.created_at), 'yyyy-MM-dd');
      if (statsMap.has(date) && sub.status === 'canceled') {
        const stat = statsMap.get(date)!;
        stat.cancellations += 1;
      }
    });

    // Calculate active users (cumulative approximation)
    let currentActive = 0; // You would ideally fetch the total active count from DB
    const sortedStats = Array.from(statsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    
    return sortedStats.map(stat => {
      currentActive += stat.new_users - stat.cancellations;
      return { ...stat, active_users: Math.max(0, currentActive) }; // Prevent negative
    });
  },

  getMetrics: async (): Promise<Metrics> => {
    // Fetch aggregates
    const { data: transactions } = await supabase.from('transactions').select('amount, affiliate_id');
    const { data: subscriptions } = await supabase.from('subscriptions').select('status, plan_amount');
    const { data: affiliates } = await supabase.from('affiliates').select('code, name');
    
    // Tenta pegar contagem real de usuários da view
    const { count: realUserCount } = await supabase
      .from('admin_users_view')
      .select('*', { count: 'exact', head: true });

    if (!transactions || !subscriptions) {
      return {
        mrr: 0,
        churnRate: 0,
        cac: 0,
        ltv: 0,
        activeUsers: realUserCount || 0,
        trafficSource: []
      };
    }

    // MRR
    const activeSubs = subscriptions.filter((s: any) => s.status === 'active');
    const mrr = activeSubs.reduce((acc: number, curr: any) => acc + (curr.plan_amount || 0), 0);

    // Churn
    const totalSubs = subscriptions.length;
    const canceledSubs = subscriptions.filter((s: any) => s.status === 'canceled').length;
    const churnRate = totalSubs > 0 ? (canceledSubs / totalSubs) * 100 : 0;

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
      churnRate,
      cac: 0, // Hard to calculate without ad spend data
      ltv: 0, // Needs complex calculation
      activeUsers: realUserCount || activeSubs.length,
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
  getDailyStats: async (): Promise<DailyStats[]> => {
    if (isDemoMode()) return mockService.getDailyStats();
    return realSupabaseService.getDailyStats();
  },
  getMetrics: async (): Promise<Metrics> => {
    if (isDemoMode()) return mockService.getMetrics();
    return realSupabaseService.getMetrics();
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
