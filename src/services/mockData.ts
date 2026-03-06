import { Customer, DailyStats, Transaction, Metrics, Affiliate } from '../types';
import { subDays, format } from 'date-fns';

// Mock Data Generators
const generateDailyStats = (days: number): DailyStats[] => {
  const stats: DailyStats[] = [];
  let activeUsers = 1200;

  for (let i = days; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const newUsers = Math.floor(Math.random() * 50) + 10;
    const cancellations = Math.floor(Math.random() * 20) + 2;
    activeUsers = activeUsers + newUsers - cancellations;

    stats.push({
      date: format(date, 'yyyy-MM-dd'),
      new_users: newUsers,
      cancellations: cancellations,
      active_users: activeUsers,
    });
  }
  return stats;
};

const generateTransactions = (count: number): Transaction[] => {
  const transactions: Transaction[] = [];
  const types: ('subscription' | 'upsell_vip')[] = ['subscription', 'subscription', 'subscription', 'upsell_vip'];
  const affiliates = ['victor_hugo', 'allan_stachuk', undefined, undefined, undefined];

  for (let i = 0; i < count; i++) {
    const isUpsell = Math.random() > 0.8;
    const amount = isUpsell ? 197.00 : 49.90;
    
    transactions.push({
      id: `txn_${Math.random().toString(36).substr(2, 9)}`,
      amount: amount,
      status: 'succeeded',
      created_at: subDays(new Date(), Math.floor(Math.random() * 30)).toISOString(),
      customer_id: `cus_${Math.random().toString(36).substr(2, 9)}`,
      affiliate_id: affiliates[Math.floor(Math.random() * affiliates.length)],
      type: isUpsell ? 'upsell_vip' : 'subscription',
    });
  }
  return transactions;
};

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
    created_at: subDays(new Date(), 60).toISOString(),
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
    created_at: subDays(new Date(), 45).toISOString(),
  }
];

// Mock Service
export const mockService = {
  getDailyStats: async (): Promise<DailyStats[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(generateDailyStats(30)), 500);
    });
  },

  getCustomers: async (): Promise<Customer[]> => {
    return new Promise((resolve) => {
      const customers: Customer[] = [];
      const sources: ('direct' | 'victor_hugo' | 'allan_stachuk')[] = ['direct', 'victor_hugo', 'allan_stachuk'];
      const statuses: ('active' | 'canceled' | 'past_due')[] = ['active', 'active', 'active', 'canceled', 'past_due'];
      
      for (let i = 0; i < 50; i++) {
        customers.push({
          id: `cus_${Math.random().toString(36).substr(2, 9)}`,
          name: `User ${i + 1}`,
          email: `user${i + 1}@example.com`,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          created_at: subDays(new Date(), Math.floor(Math.random() * 90)).toISOString(),
          source: sources[Math.floor(Math.random() * sources.length)],
          ltv: Math.floor(Math.random() * 500) + 50,
        });
      }
      setTimeout(() => resolve(customers), 500);
    });
  },

  getTransactions: async (): Promise<Transaction[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(generateTransactions(200)), 500);
    });
  },

  getMetrics: async (): Promise<Metrics> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({
        mrr: 45200.00,
        churnRate: 4.2,
        cac: 32.50,
        ltv: 450.00,
        activeUsers: 1450,
        trafficSource: [
          { name: 'Victor Hugo', value: 400 },
          { name: 'Allan Stachuk', value: 350 },
          { name: 'Tráfego Pago', value: 700 },
        ]
      }), 500);
    });
  },

  getAffiliates: async (): Promise<Affiliate[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockAffiliates]), 500);
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
      setTimeout(() => resolve(newAffiliate), 500);
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
      setTimeout(() => resolve(mockAffiliates[index]), 500);
    });
  },

  deleteAffiliate: async (id: string): Promise<void> => {
    return new Promise((resolve) => {
      mockAffiliates = mockAffiliates.filter(a => a.id !== id);
      setTimeout(() => resolve(), 500);
    });
  }
};
