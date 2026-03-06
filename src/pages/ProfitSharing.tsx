import { useEffect, useState } from 'react';
import { mockService } from '@/services/mockData';
import { Transaction } from '@/types';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Crown, Shield, Zap, User } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function ProfitSharing() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      const data = await mockService.getTransactions();
      setTransactions(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96 dark:text-slate-400">Calculando divisão de lucros...</div>;

  // 1. Calculate Gross Revenue
  const grossRevenue = transactions.reduce((acc, curr) => acc + curr.amount, 0);

  // 2. Deduct Fees & Taxes
  const paymentFees = transactions.reduce((acc, curr) => acc + (curr.amount * 0.039) + 0.39, 0);
  const taxes = grossRevenue * 0.06; // Estimated 6%

  // 3. Deduct Partner Commissions (Payouts)
  const calculateCommission = (txn: Transaction) => {
    if (txn.affiliate_id === 'victor_hugo') return txn.amount * 0.40;
    if (txn.affiliate_id === 'allan_stachuk') return txn.amount * 0.40;
    if (txn.type === 'upsell_vip') return txn.amount * 0.30; // Nutri share
    return 0;
  };
  const totalCommissions = transactions.reduce((acc, curr) => acc + calculateCommission(curr), 0);

  // 4. Deduct Server Costs (Fixed estimate for example)
  const serverCosts = 150.00; // Example fixed cost

  // 5. Net Distributable Profit
  const netDistributable = grossRevenue - paymentFees - taxes - totalCommissions - serverCosts;

  // 6. Split
  const partners = [
    { name: 'Gustavo', share: 27.5, icon: Crown, color: '#6366f1' },
    { name: 'Nicolas', share: 27.5, icon: Shield, color: '#8b5cf6' },
    { name: 'Yulian', share: 17.5, icon: Zap, color: '#ec4899' },
    { name: 'Lucas', share: 17.5, icon: Zap, color: '#f43f5e' },
    { name: 'Murilo', share: 10.0, icon: User, color: '#10b981' },
  ];

  const data = partners.map(p => ({
    name: p.name,
    value: netDistributable * (p.share / 100),
    share: p.share,
    color: p.color,
    icon: p.icon
  }));

  const isDark = theme === 'dark';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#f1f5f9';
  const tooltipText = isDark ? '#f8fafc' : '#0f172a';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Divisão de Sócios</h1>
        <p className="text-slate-500 dark:text-slate-400">Distribuição automática do lucro líquido.</p>
      </div>

      <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-8 text-white shadow-xl border border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div>
            <p className="text-slate-400 font-medium mb-1">Lucro Líquido Distribuível</p>
            <h2 className="text-4xl font-bold text-white">{formatCurrency(netDistributable)}</h2>
            <p className="text-sm text-slate-500 mt-2">
              Após taxas, impostos, comissões e custos.
            </p>
          </div>
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-slate-800 dark:bg-slate-900 rounded-lg border border-slate-700 dark:border-slate-800">
              <span className="block text-slate-400 text-xs">Faturamento</span>
              <span className="font-medium">{formatCurrency(grossRevenue)}</span>
            </div>
            <div className="p-3 bg-slate-800 dark:bg-slate-900 rounded-lg border border-slate-700 dark:border-slate-800">
              <span className="block text-slate-400 text-xs">Comissões</span>
              <span className="font-medium text-rose-400">-{formatCurrency(totalCommissions)}</span>
            </div>
            <div className="p-3 bg-slate-800 dark:bg-slate-900 rounded-lg border border-slate-700 dark:border-slate-800">
              <span className="block text-slate-400 text-xs">Taxas/Imp.</span>
              <span className="font-medium text-rose-400">-{formatCurrency(paymentFees + taxes)}</span>
            </div>
            <div className="p-3 bg-slate-800 dark:bg-slate-900 rounded-lg border border-slate-700 dark:border-slate-800">
              <span className="block text-slate-400 text-xs">Custos Fixos</span>
              <span className="font-medium text-rose-400">-{formatCurrency(serverCosts)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Distribuição</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}
                  itemStyle={{ color: tooltipText }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Partners List */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.map((partner) => {
            const Icon = partner.icon;
            return (
              <div key={partner.name} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${partner.color}20` }}>
                    <Icon className="w-6 h-6" style={{ color: partner.color }} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{partner.name}</h4>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {partner.share}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(partner.value)}</div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">A receber</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
