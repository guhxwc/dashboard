import { Customer, DailyStats, Transaction, Metrics, Affiliate } from '../types';
import { subDays, format } from 'date-fns';
import { DateFilter } from '@/components/DateRangePicker';

const TOTAL_ACTIVE_USERS = 1000;
const PLAN_PRICE = 49.90;
const UPSELL_PRICE = 197.00;

// Affiliates
let mockAffiliates: Affiliate[] = [
  {
    id: 'aff_1',
    name: 'Victor Hugo',
    email: 'victor@example.com',
    code: 'VICTORHUGO',
    discount_rate: 0.10,
    commission_rate: 0.40,
    pix_key: 'victor@pix.com.br',
    status: 'active',
    created_at: subDays(new Date(), 180).toISOString(),
    total_paid: 12500.00,
  },
  {
    id: 'aff_2',
    name: 'Allan Stachuk',
    email: 'allan@example.com',
    code: 'ALLANSTACHUK',
    discount_rate: 0.15,
    commission_rate: 0.40,
    pix_key: 'allan@pix.com.br',
    status: 'active',
    created_at: subDays(new Date(), 150).toISOString(),
    total_paid: 8400.00,
  }
];

// Generate Customers
const generateCustomers = (): Customer[] => {
  const customers: Customer[] = [];
  const sources = ['direct', 'direct', 'direct', 'direct', 'VICTORHUGO', 'VICTORHUGO', 'ALLANSTACHUK'];
  
  // 1000 Active
  for (let i = 0; i < TOTAL_ACTIVE_USERS; i++) {
    const source = sources[Math.floor(Math.random() * sources.length)];
    const createdDaysAgo = Math.floor(Math.random() * 365);
    const initialWeight = 70 + Math.random() * 40;
    const currentWeight = initialWeight - (Math.random() * 15);
    const goalWeight = initialWeight - 10 - (Math.random() * 10);

    customers.push({
      id: `cus_act_${i}`,
      name: `Cliente Ativo ${i + 1}`,
      email: `cliente.ativo${i + 1}@email.com`,
      status: 'active',
      created_at: subDays(new Date(), createdDaysAgo).toISOString(),
      source: source,
      ltv: PLAN_PRICE * Math.max(1, Math.floor(createdDaysAgo / 30)) + (Math.random() > 0.85 ? UPSELL_PRICE : 0),
      last_login: subDays(new Date(), Math.floor(Math.random() * 5)).toISOString(),
      plan: 'monthly',
      initial_weight: Number(initialWeight.toFixed(1)),
      current_weight: Number(currentWeight.toFixed(1)),
      goal_weight: Number(goalWeight.toFixed(1)),
    });
  }

  // 120 Canceled
  for (let i = 0; i < 120; i++) {
    const source = sources[Math.floor(Math.random() * sources.length)];
    const createdDaysAgo = Math.floor(Math.random() * 365) + 30;
    const initialWeight = 70 + Math.random() * 40;
    const currentWeight = initialWeight - (Math.random() * 5);
    const goalWeight = initialWeight - 15;

    customers.push({
      id: `cus_can_${i}`,
      name: `Cliente Cancelado ${i + 1}`,
      email: `cliente.cancelado${i + 1}@email.com`,
      status: 'canceled',
      created_at: subDays(new Date(), createdDaysAgo).toISOString(),
      source: source,
      ltv: PLAN_PRICE * Math.max(1, Math.floor((createdDaysAgo - 15) / 30)),
      last_login: subDays(new Date(), Math.floor(Math.random() * 60) + 10).toISOString(),
      plan: 'monthly',
      initial_weight: Number(initialWeight.toFixed(1)),
      current_weight: Number(currentWeight.toFixed(1)),
      goal_weight: Number(goalWeight.toFixed(1)),
    });
  }

  // 30 Past Due
  for (let i = 0; i < 30; i++) {
    const source = sources[Math.floor(Math.random() * sources.length)];
    const initialWeight = 80 + Math.random() * 30;
    const currentWeight = initialWeight - (Math.random() * 2);
    const goalWeight = initialWeight - 12;

    customers.push({
      id: `cus_past_${i}`,
      name: `Cliente Inadimplente ${i + 1}`,
      email: `cliente.inadimplente${i + 1}@email.com`,
      status: 'past_due',
      created_at: subDays(new Date(), Math.floor(Math.random() * 180)).toISOString(),
      source: source,
      ltv: PLAN_PRICE * 2,
      last_login: subDays(new Date(), Math.floor(Math.random() * 15) + 5).toISOString(),
      plan: 'monthly',
      initial_weight: Number(initialWeight.toFixed(1)),
      current_weight: Number(currentWeight.toFixed(1)),
      goal_weight: Number(goalWeight.toFixed(1)),
    });
  }

  return customers;
};

const mockCustomers = generateCustomers();

// Generate Transactions for the last 30 days
const generateTransactions = (): Transaction[] => {
  const transactions: Transaction[] = [];
  
  // Renewals & New Sales (1000 total)
  for (let i = 0; i < TOTAL_ACTIVE_USERS; i++) {
    const customer = mockCustomers[i];
    transactions.push({
      id: `txn_sub_${i}`,
      amount: PLAN_PRICE,
      status: 'succeeded',
      created_at: subDays(new Date(), Math.floor(Math.random() * 30)).toISOString(),
      customer_id: customer.id,
      affiliate_id: customer.source !== 'direct' ? customer.source : undefined,
      type: 'subscription',
    });
  }

  // Upsells (150 total)
  for (let i = 0; i < 150; i++) {
    const customer = mockCustomers[Math.floor(Math.random() * TOTAL_ACTIVE_USERS)];
    transactions.push({
      id: `txn_up_${i}`,
      amount: UPSELL_PRICE,
      status: 'succeeded',
      created_at: subDays(new Date(), Math.floor(Math.random() * 30)).toISOString(),
      customer_id: customer.id,
      affiliate_id: customer.source !== 'direct' ? customer.source : undefined,
      type: 'upsell_vip',
    });
  }

  // Failed transactions
  for (let i = 0; i < 45; i++) {
    transactions.push({
      id: `txn_fail_${i}`,
      amount: PLAN_PRICE,
      status: 'failed',
      created_at: subDays(new Date(), Math.floor(Math.random() * 30)).toISOString(),
      customer_id: `cus_past_${i % 30}`,
      type: 'subscription',
    });
  }

  return transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

const mockTransactions = generateTransactions();

const generateDailyStats = (filter?: DateFilter): DailyStats[] => {
  const stats: DailyStats[] = [];
  let days = 30;
  let endDate = new Date();
  
  if (filter) {
    if (filter.type === 'today') days = 0;
    else if (filter.type === '7d') days = 7;
    else if (filter.type === '14d') days = 14;
    else if (filter.type === '30d') days = 30;
    else if (filter.type === '90d') days = 90;
    else if (filter.type === '1y') days = 365;
    else if (filter.type === 'all') days = 365;
    else if (filter.type === 'month') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      days = Math.ceil(Math.abs(now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  let currentActive = TOTAL_ACTIVE_USERS;
  
  for (let i = 0; i <= days; i++) {
    const date = subDays(endDate, i);
    
    const newUsers = Math.floor(Math.random() * 8) + 2;
    const cancellations = Math.floor(Math.random() * 3) + 1;
    
    stats.unshift({
      date: format(date, 'yyyy-MM-dd'),
      new_users: newUsers,
      cancellations: cancellations,
      active_users: currentActive,
      mrr: currentActive * PLAN_PRICE,
    });
    
    currentActive = currentActive - newUsers + cancellations;
  }
  
  return stats;
};

// Mock Service
export const mockService = {
  getDailyStats: async (filter?: DateFilter): Promise<DailyStats[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(generateDailyStats(filter)), 300);
    });
  },

  getCustomers: async (): Promise<Customer[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockCustomers), 300);
    });
  },

  getTransactions: async (): Promise<Transaction[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockTransactions), 300);
    });
  },

  getMetrics: async (filter?: DateFilter): Promise<Metrics> => {
    return new Promise((resolve) => {
      let multiplier = 1;
      if (filter) {
        if (filter.type === 'today') multiplier = 0.03;
        else if (filter.type === '7d') multiplier = 0.25;
        else if (filter.type === '14d') multiplier = 0.5;
        else if (filter.type === '30d') multiplier = 1.0;
        else if (filter.type === '90d') multiplier = 3.0;
        else if (filter.type === '1y') multiplier = 12.0;
        else if (filter.type === 'all') multiplier = 15.0;
        else if (filter.type === 'month') multiplier = 0.8;
      }

      const mrr = TOTAL_ACTIVE_USERS * PLAN_PRICE;
      const activeUsers = TOTAL_ACTIVE_USERS;
      const churnRate = 5.2; 
      const arpu = PLAN_PRICE + ((150 * UPSELL_PRICE) / TOTAL_ACTIVE_USERS); // Average revenue per user including upsells
      const ltv = arpu / (churnRate / 100); 
      const cac = 42.00;

      setTimeout(() => resolve({
        mrr,
        arr: mrr * 12,
        netNewMrr: 1250.00 * multiplier,
        churnRate,
        cac,
        ltv,
        activeUsers,
        totalUsers: activeUsers * 1.5,
        conversionRate: 15.5,
        trafficSource: [
          { name: 'Victor Hugo', value: Math.floor(285 * multiplier) },
          { name: 'Allan Stachuk', value: Math.floor(142 * multiplier) },
          { name: 'Tráfego Pago / Direto', value: Math.floor(573 * multiplier) },
        ]
      }), 300);
    });
  },

  getAffiliates: async (): Promise<Affiliate[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockAffiliates]), 300);
    });
  },

  createAffiliate: async (affiliate: Omit<Affiliate, 'id' | 'created_at'>): Promise<Affiliate> => {
    return new Promise((resolve) => {
      const newAffiliate: Affiliate = {
        ...affiliate,
        id: `aff_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
      };
      mockAffiliates.push(newAffiliate);
      setTimeout(() => resolve(newAffiliate), 300);
    });
  },

  updateAffiliate: async (id: string, updates: Partial<Affiliate>): Promise<Affiliate> => {
    return new Promise((resolve, reject) => {
      const index = mockAffiliates.findIndex(a => a.id === id);
      if (index === -1) {
        reject(new Error('Affiliate not found'));
        return;
      }
      mockAffiliates[index] = { ...mockAffiliates[index], ...updates };
      setTimeout(() => resolve(mockAffiliates[index]), 300);
    });
  },

  deleteAffiliate: async (id: string): Promise<void> => {
    return new Promise((resolve) => {
      mockAffiliates = mockAffiliates.filter(a => a.id !== id);
      setTimeout(() => resolve(), 300);
    });
  }
};
