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
      .select('user_id, affiliate_ref, status, created_at');
    
    const referralMap = new Map<string, { ref: string; status: string }>();
    if (referrals) {
      referrals.forEach((r: any) =>
        referralMap.set(r.user_id, { ref: r.affiliate_ref, status: r.status || 'pending' })
      );
    }

    // 2. Busca de múltiplas fontes
    const [profilesRes, usersViewRes, subsRes, weightHistoryRes, waitlistRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('fitmind_users_view').select('*'),
      supabase.from('subscriptions').select('*'),
      supabase.from('weight_history').select('*').order('date', { ascending: false }),
      supabase.from('launch_waitlist').select('*')
    ]);

    if (profilesRes.error) console.error('Error fetching profiles:', profilesRes.error);
    if (usersViewRes.error) console.error('Error fetching fitmind_users_view:', usersViewRes.error);
    if (subsRes.error) console.error('Error fetching subscriptions:', subsRes.error);
    if (weightHistoryRes.error) console.error('Error fetching weight_history:', weightHistoryRes.error);
    if (waitlistRes.error) console.error('Error fetching launch_waitlist:', waitlistRes.error);

    console.log('Dashboard Data Sync:', {
      profiles: profilesRes.data?.length || 0,
      auth_users_view: usersViewRes.data?.length || 0,
      subscriptions: subsRes.data?.length || 0,
      weight_history: weightHistoryRes.data?.length || 0,
      waitlist: waitlistRes.data?.length || 0
    });

    const latestWeightMap = new Map<string, number>();
    if (weightHistoryRes.data) {
      weightHistoryRes.data.forEach((wh: any) => {
        if (!latestWeightMap.has(wh.user_id)) {
          latestWeightMap.set(wh.user_id, Number(wh.weight));
        }
      });
    }

    const waitlistMap = new Map<string, any>();
    if (waitlistRes.data) {
      waitlistRes.data.forEach((w: any) => {
        waitlistMap.set(w.user_id, w);
      });
    }

    const allUsersMap = new Map<string, any>();
    const emailToIdMap = new Map<string, string>();

    // Função auxiliar para mesclar sem sobrescrever com nulos
    const mergeData = (target: any, source: any) => {
      const result = { ...target };
      Object.keys(source).forEach(key => {
        if (source[key] !== null && source[key] !== undefined && source[key] !== '') {
          result[key] = source[key];
        }
      });
      return result;
    };

    // 1. Processa usuários da View (Fonte oficial do auth.users)
    if (usersViewRes.data && usersViewRes.data.length > 0) {
      usersViewRes.data.forEach((u: any) => {
        const metadata = u.raw_user_meta_data || {};
        const metadataName = metadata.full_name || metadata.name || metadata.display_name;
        
        // Extração robusta de pesos do metadata
        const initialWeight = metadata.initial_weight || metadata.peso_inicial || metadata.starting_weight || metadata.weight_initial || metadata.peso_inicio;
        const currentWeight = metadata.current_weight || metadata.peso_atual || metadata.weight || metadata.peso || metadata.peso_agora;
        const goalWeight = metadata.goal_weight || metadata.meta_peso || metadata.target_weight || metadata.weight_goal || metadata.peso_meta || metadata.meta;

        allUsersMap.set(u.id, { 
          ...u, 
          name: metadataName,
          source_table: 'auth_users',
          initial_weight: initialWeight ? Number(initialWeight) : undefined,
          current_weight: currentWeight ? Number(currentWeight) : undefined,
          goal_weight: goalWeight ? Number(goalWeight) : undefined
        });
        
        if (u.email) {
          emailToIdMap.set(u.email.toLowerCase(), u.id);
        }
      });
    }

    // 2. Processa profiles (Dados extras do FitMind)
    if (profilesRes.data) {
      profilesRes.data.forEach((p: any) => {
        const existing = allUsersMap.get(p.id);
        
        // Extração robusta de pesos do profile
        const initialWeight = p.start_weight || p.initial_weight || p.peso_inicial || p.starting_weight || p.weight_initial || p.peso_inicio;
        const currentWeightFromHistory = latestWeightMap.get(p.id);
        const currentWeight = currentWeightFromHistory || p.current_weight || p.peso_atual || p.weight || p.peso || p.peso_agora;
        const goalWeight = p.goal_weight || p.meta_peso || p.target_weight || p.weight_goal || p.peso_meta || p.meta;

        const weightData = {
          initial_weight: initialWeight ? Number(initialWeight) : undefined,
          current_weight: currentWeight ? Number(currentWeight) : undefined,
          goal_weight: goalWeight ? Number(goalWeight) : undefined,
          start_weight_date: p.start_weight_date
        };

        allUsersMap.set(p.id, mergeData(existing || {}, { ...p, ...weightData, source_table: existing ? 'merged' : 'profiles' }));
        
        if (p.email) {
          emailToIdMap.set(p.email.toLowerCase(), p.id);
        }
      });
    }

    // 3. Processa subscriptions (Dados de pagamento)
    if (subsRes.data) {
      subsRes.data.forEach((s: any) => {
        // Tenta encontrar o ID do usuário: 
        // 1. Pelo user_id da assinatura
        // 2. Pelo email (caso o user_id esteja nulo na tabela de assinaturas)
        // 3. Usa o stripe_customer_id como último recurso (cria um novo registro se não achar o usuário)
        let userId = s.user_id;
        
        if (!userId && s.customer_email) {
          userId = emailToIdMap.get(s.customer_email.toLowerCase());
        }
        
        if (!userId) {
          userId = s.stripe_customer_id || s.id; // Fallback final
        }

        if (!userId) return;
        
        const existing = allUsersMap.get(userId);
        
        // Prioritize active subscriptions over canceled ones
        const sIsActive = s.status === 'active' || s.status === 'succeeded' || s.status === 'paid';
        const existingIsActive = existing?.subscription_status === 'active' || existing?.subscription_status === 'succeeded' || existing?.subscription_status === 'paid';
        
        if (existing && existingIsActive && !sIsActive) {
          // Keep the existing active subscription data
          return;
        }

        const subData = {
          id: userId,
          name: s.customer_name,
          email: s.customer_email,
          subscription_status: s.status,
          stripe_customer_id: s.stripe_customer_id,
          plan_amount: s.plan_amount,
          subscription_date: s.subscription_date || s.created_at,
          subscription_end_date: s.current_period_end || s.subscription_end_date || s.cancel_at || s.ends_at,
          plan: s.plan || s.plan_name || (s.plan_amount > 100 ? 'annual' : (s.plan_amount === 0 ? 'beta' : 'monthly')),
          affiliate_id: s.affiliate_id || s.coupon || s.affiliate_ref || s.promo_code,
          has_subscription: true
        };

        allUsersMap.set(userId, mergeData(existing || {}, subData));
      });
    }

    // 4. Processa waitlist (Garante que usuários só na waitlist apareçam)
    if (waitlistRes.data) {
      waitlistRes.data.forEach((w: any) => {
        const existing = allUsersMap.get(w.user_id);
        if (!existing) {
          allUsersMap.set(w.user_id, {
            id: w.user_id,
            email: w.email,
            created_at: w.created_at,
            source_table: 'waitlist_only'
          });
        }
      });
    }

    // 5. Processa referrals (Garante que usuários indicados apareçam mesmo sem profile completo)
    if (referrals) {
      referrals.forEach((r: any) => {
        const existing = allUsersMap.get(r.user_id);
        if (!existing) {
          allUsersMap.set(r.user_id, {
            id: r.user_id,
            source_table: 'referrals_only',
            created_at: r.created_at || new Date().toISOString()
          });
        }
      });
    }

    if (allUsersMap.size === 0) {
      console.warn('Nenhum usuário encontrado. Verifique as tabelas no Supabase.');
      return [];
    }

    const finalUsers = Array.from(allUsersMap.values());

    return finalUsers.map((p: any) => {
      const userId = p.id || p.user_id;
      
      // Tenta achar a origem (cupom/afiliado) em várias colunas possíveis
      const possibleAffiliateId = p.affiliate_id || p.coupon || p.affiliate_ref || p.promo_code;
      const referral = referralMap.get(userId) || (possibleAffiliateId ? { ref: possibleAffiliateId, status: 'active' } : null);
      
      const subStatus = (p.subscription_status || p.status || p.plan_status || p.stripe_status || '').toLowerCase();
      const planName = (p.plan || p.plan_name || p.subscription_plan || '').toLowerCase();
      
      // isPro baseia-se apenas em is_pro e subscription_status
      // NAO usar planName pois um usuario cancelado pode ter plan='monthly' salvo
      const isPro = (p.is_pro === true || p.is_pro === 'true') &&
                    subStatus !== 'canceled' &&
                    subStatus !== 'past_due';
      
      const isTester = p.is_tester === true || p.is_tester === 'true';
      
      let status: 'active' | 'canceled' | 'past_due' | 'pending' | 'tester' = 'pending';
      if (isTester) status = 'tester';
      else if (isPro) status = 'active';
      else if (subStatus === 'canceled') status = 'canceled';
      else if (subStatus === 'past_due') status = 'past_due';
      else status = 'pending';

      // Fallback robusto para Nome e Email
      const finalEmail = p.email || p.customer_email || '';
      const finalName = p.name || p.customer_name || (finalEmail ? finalEmail.split('@')[0] : 'Usuário');

      const waitlistRecord = waitlistMap.get(userId);
      
      // Tenta pegar o valor da assinatura de várias colunas possíveis
      const planAmount = Number(p.plan_amount) || Number(p.subscription_price) || Number(p.subscription_amount) || Number(p.amount) || Number(p.price) || 49.90;

      return {
        id: userId,
        name: finalName,
        email: finalEmail,
        source: referral?.ref || 'direct',
        status,
        created_at: p.created_at,
        ltv: status === 'tester' ? 0 : (isPro ? planAmount : 0),
        last_login: p.last_active_at || p.created_at,
        current_streak: p.current_streak || 0,
        plan: p.plan || (planName === 'annual' ? 'annual' : 'monthly'),
        stripe_customer_id: p.stripe_customer_id,
        initial_weight: p.initial_weight,
        current_weight: p.current_weight,
        goal_weight: p.goal_weight,
        start_weight_date: p.start_weight_date,
        in_waitlist: !!waitlistRecord,
        waitlist_date: waitlistRecord?.created_at,
        trial_ends_at: p.trial_ends_at,
        trial_start_date: p.subscription_date || p.created_at,
        subscription_end_date: p.subscription_end_date || p.pro_expires_at,
        is_manual_pro: p.is_pro === true,
        pro_granted_at: p.pro_granted_at,
      };
    }) as Customer[];

    return [];
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
    
    // 1. Get all customers to accurately filter testers and calculate baseline
    const customers = await supabaseService.getCustomers();
    
    // Calculate baseline (users active before startDate)
    let currentActive = customers.filter(c => c.status === 'active' && new Date(c.created_at) < new Date(startDateIso)).length;
    let currentMrr = currentActive * 49.90; // Approximate baseline MRR

    // 2. Tenta buscar estatísticas da view de usuários reais no período
    const { data: realUsers, error: usersError } = await supabase
      .from('fitmind_users_view')
      .select('id, created_at')
      .gte('created_at', startDateIso)
      .lte('created_at', endDateIso);

    if (usersError) console.error('Error fetching fitmind_users_view in getDailyStats:', usersError);

    // 3. Busca também de subscriptions para ter dados de cancelamento no período
    // Buscamos tanto as criadas no período quanto as canceladas no período
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('user_id, created_at, updated_at, status, plan_amount')
      .or(`created_at.gte.${startDateIso},updated_at.gte.${startDateIso}`)
      .lte('created_at', endDateIso);

    // 4. Busca revogações manuais no admin_actions_log
    let manualRevocations: any[] = [];
    try {
      const { data: logs } = await supabase
        .from('admin_actions_log' as any)
        .select('user_id, created_at')
        .eq('action', 'revoke')
        .gte('created_at', startDateIso)
        .lte('created_at', endDateIso);
      manualRevocations = logs || [];
    } catch (e) {
      console.warn("Could not fetch admin_actions_log for daily stats", e);
    }

    // Decide qual fonte usar para "Novos Usuários"
    const newUsersSource = (realUsers && realUsers.length > 0) ? realUsers : (subs?.filter(s => s.created_at >= startDateIso) || []);

    // Group by date
    const statsMap = new Map<string, DailyStats & { new_active: number }>();
    
    // Initialize days
    for (let i = days; i >= 0; i--) {
      const date = format(subDays(endDate, i), 'yyyy-MM-dd');
      statsMap.set(date, { date, new_users: 0, cancellations: 0, active_users: 0, mrr: 0, new_active: 0 });
    }

    // Populate new users count
    newUsersSource.forEach((item: any) => {
      // Exclude testers and admins (admins are not in the customers list)
      const customer = customers.find(c => c.id === (item.id || item.user_id));
      if (!customer || customer.status === 'tester') return;

      const date = format(new Date(item.created_at), 'yyyy-MM-dd');
      if (statsMap.has(date)) {
        const stat = statsMap.get(date)!;
        stat.new_users += 1;
        
        // Check if user is active based on the ultimate source of truth
        if (customer.status === 'active') {
          stat.new_active += 1;
        }
      }
    });

    // Populate cancellations from subscriptions
    subs?.forEach((sub: any) => {
      // Exclude testers and admins
      const customer = customers.find(c => c.id === sub.user_id);
      if (!customer || customer.status === 'tester') return;

      const subStatus = (sub.status || '').toLowerCase();
      if (subStatus === 'canceled' && sub.updated_at) {
        const date = format(new Date(sub.updated_at), 'yyyy-MM-dd');
        if (statsMap.has(date)) {
          const stat = statsMap.get(date)!;
          stat.cancellations += 1;
        }
      }
    });

    // Populate manual cancellations
    manualRevocations.forEach((log: any) => {
      // Exclude testers and admins
      const customer = customers.find(c => c.id === log.user_id);
      if (!customer || customer.status === 'tester') return;

      const date = format(new Date(log.created_at), 'yyyy-MM-dd');
      if (statsMap.has(date)) {
        const stat = statsMap.get(date)!;
        stat.cancellations += 1;
      }
    });

    // Calculate active users and MRR with baseline
    const sortedStats = Array.from(statsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    
    // Track daily MRR changes more precisely if possible
    const dailyMrrChanges = new Map<string, number>();
    subs?.forEach((sub: any) => {
      // Exclude testers and admins
      const customer = customers.find(c => c.id === sub.user_id);
      if (!customer || customer.status === 'tester') return;

      const createdDate = format(new Date(sub.created_at), 'yyyy-MM-dd');
      if (statsMap.has(createdDate)) {
        dailyMrrChanges.set(createdDate, (dailyMrrChanges.get(createdDate) || 0) + (sub.plan_amount || 49.90));
      }
      const subStatus = (sub.status || '').toLowerCase();
      if (subStatus === 'canceled' && sub.updated_at) {
        const canceledDate = format(new Date(sub.updated_at), 'yyyy-MM-dd');
        if (statsMap.has(canceledDate)) {
          dailyMrrChanges.set(canceledDate, (dailyMrrChanges.get(canceledDate) || 0) - (sub.plan_amount || 49.90));
        }
      }
    });

    return sortedStats.map(stat => {
      currentActive += stat.new_active - stat.cancellations;
      // Use the daily changes if we have them, otherwise fallback to average
      const mrrChange = dailyMrrChanges.get(stat.date) || (stat.new_active - stat.cancellations) * 49.90;
      currentMrr += mrrChange;
      
      const { new_active, ...rest } = stat;
      return { ...rest, active_users: Math.max(0, currentActive), mrr: Math.max(0, currentMrr) };
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
    const { data: transactions } = await supabase.from('transactions').select('customer_id, amount, affiliate_id, created_at').gte('created_at', startDateIso).lte('created_at', endDateIso);
    const { data: subscriptions } = await supabase.from('subscriptions').select('user_id, status, plan_amount, created_at, updated_at, customer_email, stripe_customer_id');
    const { data: affiliates } = await supabase.from('affiliates').select('code, name');
    
    // Tenta pegar contagem real de usuários
    const customers = await supabaseService.getCustomers();
    const realUserCount = customers.length;
    const activeProfileCount = customers.filter(c => c.status === 'active').length;

    console.log('Metrics Calculation Debug:', {
      subscriptionsCount: subscriptions?.length || 0,
      activeProfileCount,
      realUserCount
    });

    if (!transactions || !subscriptions) {
      return {
        mrr: 0,
        arr: 0,
        netNewMrr: 0,
        churnRate: 0,
        cac: 0,
        ltv: 0,
        activeUsers: activeProfileCount || 0,
        totalUsers: realUserCount || 0,
        conversionRate: 0,
        trafficSource: []
      };
    }

    // MRR & ARR (Snapshot at the END of the period)
    // Get only the latest subscription per user to avoid double counting
    const latestSubsMap = new Map<string, any>();
    
    // Create an email to ID map from customers for matching
    const emailToIdMap = new Map<string, string>();
    customers.forEach(c => {
      if (c.email) emailToIdMap.set(c.email.toLowerCase(), c.id);
    });

    subscriptions.forEach((s: any) => {
      // Use the same ID matching logic as getCustomers
      let effectiveId = s.user_id;
      if (!effectiveId && s.customer_email) {
        effectiveId = emailToIdMap.get(s.customer_email.toLowerCase());
      }
      if (!effectiveId) {
        effectiveId = s.stripe_customer_id || s.id;
      }

      if (!effectiveId) return;

      const existing = latestSubsMap.get(effectiveId);
      const sIsActive = s.status === 'active' || s.status === 'succeeded' || s.status === 'paid';
      
      if (!existing) {
        latestSubsMap.set(effectiveId, { ...s, effectiveId });
      } else {
        const existingIsActive = existing.status === 'active' || existing.status === 'succeeded' || existing.status === 'paid';
        
        if (sIsActive && !existingIsActive) {
          latestSubsMap.set(effectiveId, { ...s, effectiveId });
        } else if (sIsActive === existingIsActive && new Date(s.created_at) > new Date(existing.created_at)) {
          latestSubsMap.set(effectiveId, { ...s, effectiveId });
        }
      }
    });

    // Active Users (Paying) at end of period
    // We use the customers array directly as it is the ultimate source of truth for the Users page
    const activeAtEndCustomers = customers.filter(c => {
      if (c.status === 'tester') return false;
      
      const created = new Date(c.created_at);
      if (created > endDate) return false;
      
      // If endDate is today (or in the future), just use current status
      if (endDate >= new Date(new Date().setHours(0,0,0,0))) {
        return c.status === 'active';
      }
      
      // For past dates, approximate based on current status
      return c.status === 'active';
    });

    const activeUsersCount = activeAtEndCustomers.length;
    
    // Calcula o MRR baseado no plano real de cada usuario
    let mrr = 0;
    activeAtEndCustomers.forEach(c => {
      if (c.plan === 'annual') {
        // Plano anual: divide o valor anual por 12 para obter MRR
        mrr += (c.ltv || 299.00) / 12;
      } else {
        mrr += (c.ltv || 49.90);
      }
    });

    const arr = mrr * 12;
    const activeUsers = activeUsersCount;

    // Churn Rate (Period specific)
    // Approximate active users at start
    const activeAtStartCustomers = customers.filter(c => {
      if (c.status === 'tester') return false;
      const created = new Date(c.created_at);
      if (created >= new Date(startDateIso)) return false; // Created after start date
      
      return c.status === 'active'; 
    });

    const activeAtStart = activeAtStartCustomers.length;

    const recentCancellations = subscriptions.filter((s: any) => {
      // Exclude testers and admins
      const customer = customers.find(c => c.id === s.user_id);
      if (!customer || customer.status === 'tester') return false;

      return s.status === 'canceled' && 
        s.updated_at >= startDateIso && 
        s.updated_at <= endDateIso;
    }).length;

    // Also count manual revocations from admin_actions_log if table exists
    let manualRevocations = 0;
    try {
      const { data: adminLogs } = await supabase
        .from('admin_actions_log' as any)
        .select('*')
        .eq('action', 'revoke')
        .gte('created_at', startDateIso)
        .lte('created_at', endDateIso);
      
      if (adminLogs) {
        manualRevocations = adminLogs.filter((log: any) => {
          const customer = customers.find(c => c.id === log.user_id);
          return !(customer && customer.status === 'tester');
        }).length;
      }
    } catch (e) {
      console.warn("Could not fetch admin_actions_log for churn calculation", e);
    }

    const totalCancellations = recentCancellations + manualRevocations;
    
    // Use average active users as denominator for a more stable churn rate during growth
    const avgActiveUsers = (activeAtStart + activeUsersCount) / 2;
    const periodChurnRate = avgActiveUsers > 0 ? (totalCancellations / avgActiveUsers) * 100 : 0;
    
    // Normalize Churn to Monthly (30 days) for LTV calculation
    // If period is 7 days, monthly churn is roughly periodChurn * (30/7)
    const dayCount = Math.max(days, 1);
    const monthlyChurnEquivalent = (periodChurnRate / dayCount) * 30;
    
    // Stable Churn for LTV (using a floor to avoid infinity and a ceiling for realism)
    // We use the monthly equivalent for LTV to keep it consistent across filters
    const stableChurnForLtv = Math.max(monthlyChurnEquivalent, 0.5); // Minimum 0.5% for LTV safety
    
    // CAC & LTV
    const cac = 0; // CAC real: sem dados de custo de aquisição ainda
    const arpu = activeUsers > 0 ? mrr / activeUsers : 49.90;
    const ltv = arpu / (Math.max(stableChurnForLtv, 0.1) / 100);
    
    // Net New MRR (Actual change in MRR during the period)
    const newSubsInPeriod = subscriptions.filter((s: any) => {
      // Exclude testers
      const customer = customers.find(c => c.id === s.user_id);
      if (customer && customer.status === 'tester') return false;
      
      return s.created_at >= startDateIso && s.created_at <= endDateIso;
    });
    const newMrr = newSubsInPeriod.reduce((acc: number, curr: any) => acc + (curr.plan_amount || 49.90), 0);
    
    const lostMrr = (recentCancellations + manualRevocations) * (mrr / (activeUsers || 1) || 49.90);
    
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
      // Exclude testers
      const customer = customers.find(c => c.id === t.customer_id);
      if (customer && customer.status === 'tester') return;

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
      totalUsers: realUserCount || 0,
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
  },

  manageUserPro: async (userId: string, action: 'grant' | 'revoke', reason?: string): Promise<{ success: boolean; message: string }> => {
    const { data, error } = await supabase.functions.invoke('admin-manage-subscription', {
      body: { user_id: userId, action, reason }
    });

    if (error) {
      console.error('Error invoking function:', error);
      return { success: false, message: error.message || 'Erro ao processar solicitação' };
    }

    if (data?.success) {
      // Atualiza a data de concessão manual no profile
      await supabase
        .from('profiles')
        .update({ 
          pro_granted_at: action === 'grant' ? new Date().toISOString() : null 
        })
        .eq('id', userId);
    }

    return { 
      success: data?.success || false, 
      message: data?.message || (data?.success ? 'Operação realizada com sucesso' : 'Falha na operação') 
    };
  },

  manageUserTester: async (userId: string, isTester: boolean): Promise<{ success: boolean; message: string }> => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_tester: isTester })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Error updating tester status:', error);
      return { success: false, message: error.message || 'Erro ao atualizar status de tester' };
    }

    if (!data || data.length === 0) {
      return { success: false, message: 'Não foi possível atualizar o status. Verifique as permissões (RLS) da tabela profiles.' };
    }

    return { success: true, message: `Usuário ${isTester ? 'marcado como' : 'removido de'} tester com sucesso.` };
  },

  getAdminReferrals: async (): Promise<any[]> => {
    // Busca referrals e faz join com profiles e fitmind_users_view em memória
    const [referralsRes, profilesRes, usersViewRes, subsRes] = await Promise.all([
      supabase.from('referrals').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
      supabase.from('fitmind_users_view').select('id, raw_user_meta_data, email'),
      supabase.from('subscriptions').select('user_id, affiliate_id, coupon, promo_code, affiliate_ref, created_at')
    ]);

    const userMap = new Map<string, any>();
    
    // Primeiro popula com a view (auth users)
    if (usersViewRes.data) {
      usersViewRes.data.forEach(u => {
        const metadata = u.raw_user_meta_data || {};
        const name = metadata.full_name || metadata.name || metadata.display_name || (u.email ? u.email.split('@')[0] : 'Usuário');
        userMap.set(u.id, { id: u.id, name, email: u.email });
      });
    }

    // Depois sobrescreve com profiles (mais atualizado se existir)
    if (profilesRes.data) {
      profilesRes.data.forEach(p => {
        const existing = userMap.get(p.id);
        userMap.set(p.id, { 
          id: p.id, 
          name: p.name || existing?.name || 'Usuário', 
          email: p.email || existing?.email || '' 
        });
      });
    }

    // Mapeia todas as indicações
    const allReferralsMap = new Map<string, any>();

    // 1. Adiciona da tabela oficial de referrals
    if (referralsRes.data) {
      referralsRes.data.forEach(ref => {
        allReferralsMap.set(ref.user_id, {
          ...ref,
          user: userMap.get(ref.user_id) || null
        });
      });
    }

    // 2. Adiciona de profiles (se tiver cupom/affiliate_id e não estiver na tabela referrals)
    if (profilesRes.data) {
      profilesRes.data.forEach(p => {
        const possibleRef = p.affiliate_id || p.coupon || p.affiliate_ref || p.promo_code;
        if (possibleRef && !allReferralsMap.has(p.id)) {
          allReferralsMap.set(p.id, {
            id: `prof-${p.id}`,
            user_id: p.id,
            affiliate_ref: possibleRef,
            status: 'active', // Assumimos active se veio do profile
            created_at: p.created_at || new Date().toISOString(),
            user: userMap.get(p.id) || null
          });
        }
      });
    }

    // 3. Adiciona de subscriptions (se tiver cupom/affiliate_id e não estiver mapeado)
    if (subsRes.data) {
      subsRes.data.forEach(s => {
        const possibleRef = s.affiliate_id || s.coupon || s.affiliate_ref || s.promo_code;
        if (possibleRef && s.user_id && !allReferralsMap.has(s.user_id)) {
          allReferralsMap.set(s.user_id, {
            id: `sub-${s.user_id}`,
            user_id: s.user_id,
            affiliate_ref: possibleRef,
            status: 'active',
            created_at: s.created_at || new Date().toISOString(),
            user: userMap.get(s.user_id) || null
          });
        }
      });
    }

    return Array.from(allReferralsMap.values()).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
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
  },
  manageUserPro: async (userId: string, action: 'grant' | 'revoke', reason?: string): Promise<{ success: boolean; message: string }> => {
    if (isDemoMode()) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, message: `[DEMO] Pro ${action === 'grant' ? 'concedido' : 'revogado'} com sucesso.` });
        }, 1000);
      });
    }
    return realSupabaseService.manageUserPro(userId, action, reason);
  },
  manageUserTester: async (userId: string, isTester: boolean): Promise<{ success: boolean; message: string }> => {
    if (isDemoMode()) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, message: `[DEMO] Usuário ${isTester ? 'marcado como' : 'removido de'} tester com sucesso.` });
        }, 1000);
      });
    }
    return realSupabaseService.manageUserTester(userId, isTester);
  },
  getAdminReferrals: async (): Promise<any[]> => {
    if (isDemoMode()) return [];
    return realSupabaseService.getAdminReferrals();
  }
};