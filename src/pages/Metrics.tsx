import { useEffect, useState, useMemo } from 'react';
import { supabaseService, isDemoMode } from '@/services/supabaseService';
import { DailyStats } from '@/types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, LineChart, Line
} from 'recharts';
import { formatCurrency, formatPercentage, cn } from '@/lib/utils';
import { DollarSign, UserMinus, TrendingUp, Activity, Database, Users, UserPlus, Calendar, ArrowRight, Settings, Check, X } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { MetricCard } from '@/components/MetricCard';
import { InfoPopover } from '@/components/InfoPopover';
import { DateRangePicker, DateFilter } from '@/components/DateRangePicker';
import { SkeletonCard } from '@/components/SkeletonCard';
import { motion, AnimatePresence } from 'motion/react';

export function Metrics() {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [usingRealData, setUsingRealData] = useState(false);
  const getCurrentMonthFilter = (): DateFilter => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      type: 'month',
      startDate: start.toISOString(),
      endDate: now.toISOString()
    };
  };

  const [dateFilter, setDateFilter] = useState<DateFilter>(getCurrentMonthFilter());
  const { theme } = useTheme();

  // Ad Spend Settings
  const [adSpend, setAdSpend] = useState(() => {
    const saved = localStorage.getItem('metrics_ad_spend');
    return saved ? Number(saved) : 1500; // Default R$ 1.500,00
  });
  const [showSettings, setShowSettings] = useState(false);
  const [draftAdSpend, setDraftAdSpend] = useState(adSpend);

  const handleSaveSettings = () => {
    setAdSpend(draftAdSpend);
    localStorage.setItem('metrics_ad_spend', String(draftAdSpend));
    setShowSettings(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        setUsingRealData(!isDemoMode());
        const [statsData, metricsData] = await Promise.all([
          supabaseService.getDailyStats(dateFilter),
          supabaseService.getMetrics(dateFilter)
        ]);
        setDailyStats(statsData);
        setMetrics(metricsData);
      } catch (err) {
        console.error("Error fetching metrics data:", err);
        setUsingRealData(false);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateFilter]);

  // Period Summary calculation
  const periodSummary = useMemo(() => {
    if (!dailyStats.length || !metrics) return null;
    
    const totalNewUsers = dailyStats.reduce((acc, curr) => acc + curr.new_users, 0);
    
    // Determine dates
    let start, end;
    if (dateFilter.startDate && dateFilter.endDate) {
      start = new Date(dateFilter.startDate);
      end = new Date(dateFilter.endDate);
    } else {
      // Fallback to dailyStats range
      start = new Date(dailyStats[0].date);
      end = new Date(dailyStats[dailyStats.length - 1].date);
    }
    
    return {
      totalNewUsers,
      activeUsers: metrics.activeUsers || 0,
      start: start.toLocaleDateString('pt-BR'),
      end: end.toLocaleDateString('pt-BR')
    };
  }, [dailyStats, metrics, dateFilter]);

  // LTV vs CAC Trend Data
  const ltvCacTrendData = useMemo(() => {
    if (!dailyStats.length || !metrics) return [];

    // Calculate daily ad spend
    const dailyAdSpend = adSpend / 30;

    // To calculate "churn acumulado até aquele dia", we need to track cumulative cancellations and users
    let cumulativeCancellations = 0;
    let cumulativeNewUsers = 0;

    return dailyStats.map((d, index) => {
      cumulativeCancellations += d.cancellations;
      cumulativeNewUsers += d.new_users;

      // Daily ARPU
      const arpu = d.active_users > 0 ? d.mrr / d.active_users : (metrics.mrr / (metrics.activeUsers || 1) || 49.90);

      // Daily CAC (smoothed to avoid infinity)
      // If no new users that day, we use the proportional monthly spend divided by total new users so far or a default
      const dailyCac = d.new_users > 0 ? dailyAdSpend / d.new_users : (adSpend / Math.max(metrics.activeUsers || 1, 1));

      // Daily Churn (Period-to-date)
      // Formula requested: ARPU / churn_acumulado_ate_aquele_dia
      // But we need to normalize the churn to monthly to get a standard LTV
      const periodToDateChurnRate = cumulativeNewUsers > 0 ? (cumulativeCancellations / cumulativeNewUsers) : 0;
      
      // Monthly equivalent for LTV
      const daysPassed = index + 1;
      // If we have 0 churn, LTV would be infinite. We use a floor of 1% monthly churn for a "realistic" cap.
      // The user mentioned 10% floor was distorting, so we use 1% (0.01)
      const monthlyChurnEquivalent = Math.max((periodToDateChurnRate / daysPassed) * 30, 0.01);

      const ltv = arpu / monthlyChurnEquivalent;

      return {
        date: d.date,
        ltv: parseFloat(ltv.toFixed(2)),
        cac: parseFloat(dailyCac.toFixed(2)),
        ratio: parseFloat((ltv / dailyCac).toFixed(1))
      };
    });
  }, [dailyStats, metrics, adSpend]);

  const periodLabel = useMemo(() => {
    if (dateFilter.type === 'today') return 'hoje';
    if (dateFilter.type === '7d') return '7 dias';
    if (dateFilter.type === '14d') return '14 dias';
    if (dateFilter.type === '30d') return '30 dias';
    if (dateFilter.type === '90d') return '90 dias';
    if (dateFilter.type === '1y') return '1 ano';
    if (dateFilter.type === 'all') return 'todo o período';
    if (dateFilter.type === 'month') return 'este mês';
    return 'período';
  }, [dateFilter]);

  // Apenas sobrescreve CAC com base no adSpend configurável.
  // Churn, LTV, MRR e upsell vêm corretos direto do supabaseService.
  const displayMetrics = useMemo(() => {
    if (!metrics) return metrics;

    const totalNewUsers = dailyStats.reduce((acc, curr) => acc + curr.new_users, 0);
    const start = dailyStats.length > 0 ? new Date(dailyStats[0].date) : new Date();
    const end   = dailyStats.length > 0 ? new Date(dailyStats[dailyStats.length - 1].date) : new Date();
    const daysInPeriod = Math.max(Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1, 1);

    const proportionalAdSpend = (adSpend / 30) * daysInPeriod;
    const calculatedCac = totalNewUsers > 0 ? proportionalAdSpend / totalNewUsers : (adSpend / 30);

    return { ...metrics, cac: calculatedCac };
  }, [metrics, adSpend, dailyStats]);

  if (loading && !metrics) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} className="h-32" />
        ))}
      </div>
    );
  }

  // Transform daily stats for MRR visualization (mock estimation)
  const mrrData = dailyStats.map(d => ({
    date: d.date,
    mrr: d.mrr,
    churned_revenue: d.cancellations * (metrics?.mrr / (metrics?.activeUsers || 1) || 49.90)
  }));

  const isDark = theme === 'dark';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#f1f5f9';
  const tooltipText = isDark ? '#f8fafc' : '#0f172a';

  const handleQuickSelect = (type: DateFilter['type']) => {
    let start, end = new Date();
    if (type === 'today') start = end;
    else if (type === '7d') start = new Date(new Date().setDate(end.getDate() - 7));
    else if (type === '14d') start = new Date(new Date().setDate(end.getDate() - 14));
    else if (type === '30d') start = new Date(new Date().setDate(end.getDate() - 30));
    else if (type === '90d') start = new Date(new Date().setDate(end.getDate() - 90));
    else if (type === 'month') {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    }
    
    setDateFilter({
      type,
      startDate: start?.toISOString(),
      endDate: end.toISOString()
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Métricas Detalhadas</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-zinc-500 dark:text-zinc-400">Análise profunda dos 4 pilares do seu SaaS.</p>
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => {
              setDraftAdSpend(adSpend);
              setShowSettings(!showSettings);
            }}
            className={cn(
              "p-2.5 rounded-xl border transition-all flex items-center justify-center gap-2",
              showSettings 
                ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white" 
                : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800"
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm font-medium">Configurar Ads</span>
          </button>
          <DateRangePicker value={dateFilter} onChange={setDateFilter} />
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Configurações de Marketing</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Ajuste os gastos para cálculos reais de CAC e LTV.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Gasto Mensal com Ads (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">R$</span>
                    <input
                      type="number"
                      value={draftAdSpend}
                      onChange={(e) => setDraftAdSpend(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                      placeholder="Ex: 1500"
                    />
                  </div>
                </div>
                
                <div className="md:col-span-2 flex items-end">
                  <button
                    onClick={handleSaveSettings}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    <Check className="w-4 h-4" />
                    Salvar Configurações
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resumo do Período */}
      <AnimatePresence mode="wait">
        {periodSummary && (
          <motion.div 
            key={dateFilter.type + (dateFilter.startDate || '')}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Período Analisado</span>
                <div className="flex flex-wrap items-center gap-2 text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                  <span>{periodSummary.start}</span>
                  <ArrowRight className="w-4 h-4 text-zinc-300" />
                  <span>{periodSummary.end}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-8 sm:gap-12">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Novos Usuários</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-zinc-900 dark:text-white">+{periodSummary.totalNewUsers}</span>
                  <span className="text-xs text-emerald-500 font-medium">no período</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Usuários Ativos</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-zinc-900 dark:text-white">{periodSummary.activeUsers.toLocaleString()}</span>
                  <span className="text-xs text-zinc-400 font-medium">no fim</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Métricas Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <MetricCard
          title="MRR (Receita Recorrente)"
          value={formatCurrency(displayMetrics?.mrr || 0)}
          icon={DollarSign}
          description={`Snapshot em ${periodLabel}`}
          info={{
            meaning: "Monthly Recurring Revenue. É o total de receita garantida que entra todo mês através de assinaturas ativas.",
            importance: "É a métrica de saúde financeira mais importante de um SaaS, mostrando a previsibilidade do seu faturamento.",
            usage: "Use para projetar o fluxo de caixa futuro e entender se o negócio está crescendo ou encolhendo mês a mês."
          }}
        />
        <MetricCard
          title="ARR (Receita Anual)"
          value={formatCurrency(displayMetrics?.arr || 0)}
          icon={TrendingUp}
          description="Projeção anual"
          info={{
            meaning: "Annual Recurring Revenue. É o MRR multiplicado por 12, ou seja, a receita anualizada atual.",
            importance: "A métrica padrão para dimensionar e comparar o faturamento de empresas SaaS.",
            usage: "Use para medir o 'tamanho' do seu negócio no mercado e traçar metas de faturamento anual."
          }}
        />
        <MetricCard
          title="Net New MRR"
          value={formatCurrency(displayMetrics?.netNewMrr || 0)}
          icon={Activity}
          description="Crescimento líquido"
          info={{
            meaning: "Diferença entre o MRR que entrou (vendas/upgrades) e o MRR que saiu (churn/downgrade) no período.",
            importance: "Indica a velocidade real de crescimento da sua receita.",
            usage: "Se este número for negativo, seu churn está matando o crescimento, mesmo que as vendas estejam subindo."
          }}
        />
        <MetricCard
          title="Churn Rate"
          value={formatPercentage(displayMetrics?.churnRate || 0)}
          icon={UserMinus}
          description="Taxa de cancelamento"
          info={{
            meaning: "A porcentagem de clientes que cancelaram as assinaturas em relação à base total.",
            importance: "É o maior inimigo do crescimento exponencial de um SaaS.",
            usage: "Mantenha o churn abaixo de 5-7% ao mês para garantir a saúde do negócio a longo prazo."
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Crescimento de MRR</h3>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
               <span className="w-3 h-3 rounded-full bg-blue-500"></span> MRR Acumulado
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mrrData}>
                <defs>
                  <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#27272a' : '#f4f4f5'} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit' })}
                  stroke="#94a3b8" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `R$${val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText, borderRadius: '12px' }}
                  itemStyle={{ color: tooltipText }}
                  formatter={(val: number) => formatCurrency(val)}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                />
                <Area type="monotone" dataKey="mrr" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorMrr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
           <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-8">Eficiência (LTV vs CAC)</h3>
           <div className="h-72">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={ltvCacTrendData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#27272a' : '#f4f4f5'} />
                 <XAxis 
                   dataKey="date" 
                   tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit' })}
                   stroke="#94a3b8" 
                   fontSize={10}
                   tickLine={false}
                   axisLine={false}
                 />
                 <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                 <Tooltip 
                   contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText, borderRadius: '12px' }}
                   itemStyle={{ color: tooltipText }}
                   formatter={(val: number) => formatCurrency(val)}
                   labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                 />
                 <Legend verticalAlign="top" align="right" fontSize={10} />
                 <Line type="monotone" dataKey="ltv" name="LTV" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 4 }} />
                 <Line type="monotone" dataKey="cac" name="CAC" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 4 }} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
}
