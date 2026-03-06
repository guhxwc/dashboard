import { useEffect, useState } from 'react';
import { mockService } from '@/services/mockData';
import { DailyStats } from '@/types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend
} from 'recharts';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { DollarSign, UserMinus, TrendingUp, Activity } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function Metrics() {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      const [statsData, metricsData] = await Promise.all([
        mockService.getDailyStats(),
        mockService.getMetrics()
      ]);
      setDailyStats(statsData);
      setMetrics(metricsData);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96 dark:text-slate-400">Carregando métricas...</div>;

  // Transform daily stats for MRR visualization (mock estimation)
  const mrrData = dailyStats.map(d => ({
    date: d.date,
    mrr: d.active_users * 49.90, // Assuming avg ticket
    churned_revenue: d.cancellations * 49.90
  }));

  const isDark = theme === 'dark';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#f1f5f9';
  const tooltipText = isDark ? '#f8fafc' : '#0f172a';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Métricas Detalhadas</h1>
        <p className="text-slate-500 dark:text-slate-400">Análise profunda dos 4 pilares do seu SaaS.</p>
      </div>

      {/* MRR Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <DollarSign className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">MRR (Monthly Recurring Revenue)</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Receita recorrente mensal baseada em assinaturas ativas.</p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(metrics.mrr)}</div>
            <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">+12.5% este mês</div>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mrrData}>
              <defs>
                <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(str) => new Date(str).getDate().toString()} 
                stroke="#94a3b8" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `R$${val/1000}k`} 
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}
                itemStyle={{ color: tooltipText }}
              />
              <Area type="monotone" dataKey="mrr" stroke="#6366f1" fillOpacity={1} fill="url(#colorMrr)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Churn Rate */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
              <UserMinus className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Churn Rate</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Taxa de cancelamento mensal.</p>
            </div>
            <div className="ml-auto text-right">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatPercentage(metrics.churnRate)}</div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">-0.5% vs mês anterior</div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(str) => new Date(str).getDate().toString()} 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}
                  itemStyle={{ color: tooltipText }}
                />
                <Bar dataKey="cancellations" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Cancelamentos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LTV & CAC */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">LTV (Lifetime Value)</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Quanto cada cliente gasta em média.</p>
              </div>
            </div>
            <div className="flex items-end gap-4">
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(metrics.ltv)}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Média histórica</div>
            </div>
            <div className="mt-4 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '75%' }}></div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Meta: R$ 500,00</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">CAC (Custo de Aquisição)</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Custo médio para atrair um cliente.</p>
              </div>
            </div>
            <div className="flex items-end gap-4">
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(metrics.cac)}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Ads / Novos Clientes</div>
            </div>
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold">LTV/CAC Ratio:</span> {(metrics.ltv / metrics.cac).toFixed(1)}x
              <span className="block text-xs mt-1 opacity-75">Saudável (Ideal {'>'} 3x)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
