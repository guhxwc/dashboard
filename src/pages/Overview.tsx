import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { mockService } from '@/services/mockData';
import { supabaseService, isDemoMode } from '@/services/supabaseService';
import { DailyStats, Metrics } from '@/types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { DollarSign, Users, Activity, TrendingUp, UserMinus, UserPlus, Database } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function Overview() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingRealData, setUsingRealData] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setUsingRealData(!isDemoMode());
        const [dataMetrics, dataStats] = await Promise.all([
          supabaseService.getMetrics(),
          supabaseService.getDailyStats()
        ]);
        setMetrics(dataMetrics);
        setDailyStats(dataStats);
      } catch (err) {
        console.error("Error fetching overview data:", err);
        // Fallback to mock on error
        const [mockMetrics, mockStats] = await Promise.all([
          mockService.getMetrics(),
          mockService.getDailyStats()
        ]);
        setMetrics(mockMetrics);
        setDailyStats(mockStats);
        setUsingRealData(false);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96 dark:text-slate-400">Carregando dados...</div>;

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899'];
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#334155' : '#f1f5f9';
  const axisColor = isDark ? '#94a3b8' : '#94a3b8';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#f1f5f9';
  const tooltipText = isDark ? '#f8fafc' : '#0f172a';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Visão Geral</h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-slate-500 dark:text-slate-400">Métricas de saúde do seu SaaS.</p>
          {usingRealData ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
              <Database className="w-3 h-3" /> Supabase (Real)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
              <Database className="w-3 h-3" /> Dados de Exemplo
            </span>
          )}
        </div>
      </div>

      {/* 4 Métricas de Ouro */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="MRR (Receita Recorrente)"
          value={formatCurrency(metrics?.mrr || 0)}
          icon={DollarSign}
          trend="+12.5%"
          trendUp={true}
          description="Assinaturas ativas mensais"
        />
        <MetricCard
          title="Churn Rate"
          value={formatPercentage(metrics?.churnRate || 0)}
          icon={UserMinus}
          trend="-0.5%"
          trendUp={true} // Lower churn is good
          description="Cancelamentos mensais"
          className={(metrics?.churnRate || 0) > 10 ? "border-rose-200 bg-rose-50 dark:bg-rose-900/10 dark:border-rose-900/30" : ""}
        />
        <MetricCard
          title="CAC (Custo de Aquisição)"
          value={formatCurrency(metrics?.cac || 0)}
          icon={TrendingUp}
          description="Custo médio por novo cliente"
        />
        <MetricCard
          title="LTV (Lifetime Value)"
          value={formatCurrency(metrics?.ltv || 0)}
          icon={Activity}
          description="Valor médio por cliente"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Crescimento */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Crescimento de Usuários</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Novos usuários vs. Cancelamentos nos últimos 30 dias</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-xs font-medium text-indigo-700 dark:text-indigo-400">Novos</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30">
                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                <span className="text-xs font-medium text-rose-700 dark:text-rose-400">Cancelamentos</span>
              </div>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCancel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(str) => {
                    const d = new Date(str);
                    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                  }}
                  stroke={axisColor}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke={axisColor}
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  dx={-10}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-slate-800 p-4 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl ring-1 ring-black/5">
                          <p className="text-sm font-medium text-slate-900 dark:text-white mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
                            {new Date(label).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </p>
                          <div className="space-y-2">
                            {payload.map((entry: any, index: number) => (
                              <div key={index} className="flex items-center justify-between gap-8 text-sm">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-700 shadow-sm" 
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                                    {entry.name}
                                  </span>
                                </div>
                                <span className="font-bold text-slate-900 dark:text-white font-mono">
                                  +{entry.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="new_users" 
                  name="Novos Usuários" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorNew)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="cancellations" 
                  name="Cancelamentos" 
                  stroke="#f43f5e" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCancel)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#f43f5e' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Origem do Tráfego */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Origem do Tráfego</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics?.trafficSource || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(metrics?.trafficSource || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={isDark ? '#0f172a' : '#fff'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}
                  itemStyle={{ color: tooltipText }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
            {(metrics?.trafficSource || []).map((source: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-600 dark:text-slate-300">{source.name}</span>
                </div>
                <span className="font-medium text-slate-900 dark:text-white">{source.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Users Counter */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 text-white shadow-lg shadow-indigo-200 dark:shadow-none">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-indigo-100 font-medium">Total de Usuários Ativos</p>
            <h2 className="text-4xl font-bold mt-1">{metrics?.activeUsers?.toLocaleString() || 0}</h2>
          </div>
        </div>
      </div>
    </div>
  );
}
