import { useEffect, useState, useMemo } from 'react';
import { supabaseService, isDemoMode } from '@/services/supabaseService';
import { mockService } from '@/services/mockData';
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

  // Override metrics CAC with calculated one if using adSpend
  const displayMetrics = useMemo(() => {
    if (!metrics || !dailyStats.length) return metrics;
    
    const totalNewUsers = dailyStats.reduce((acc, curr) => acc + curr.new_users, 0);
    const totalCancellations = dailyStats.reduce((acc, curr) => acc + curr.cancellations, 0);
    
    // Calculate period length in days
    const start = new Date(dailyStats[0].date);
    const end = new Date(dailyStats[dailyStats.length - 1].date);
    const daysInPeriod = Math.max(Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1, 1);

    // CAC = (Proportional Ad Spend) / New Customers
    const proportionalAdSpend = (adSpend / 30) * daysInPeriod;
    const calculatedCac = totalNewUsers > 0 ? proportionalAdSpend / totalNewUsers : (adSpend / 30); // Fallback to daily spend if no users

    // LTV = ARPU / Monthly Churn Rate
    const arpu = metrics.activeUsers > 0 ? metrics.mrr / metrics.activeUsers : 49.90;
    
    // Calculate monthly churn equivalent from period data
    // Churn Rate = Cancellations / New Users (or Active Users)
    // Here we use the user's requested logic: churn_acumulado / period
    const periodChurnRate = totalNewUsers > 0 ? (totalCancellations / totalNewUsers) : (metrics.churnRate / 100);
    const monthlyChurnEquivalent = Math.max((periodChurnRate / daysInPeriod) * 30, 0.01); // 1% floor
    
    const calculatedLtv = arpu / monthlyChurnEquivalent;

    return {
      ...metrics,
      cac: calculatedCac,
      ltv: calculatedLtv
    };
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
            meaning: "Annual Recurring Revenue. É o MRR multiplicado por 12, ou seja, a projeção de receita recorrente para um ano inteiro.",
            importance: "Usado para avaliar o tamanho do negócio a longo prazo e é a principal métrica olhada por investidores.",
            usage: "Use para definir metas anuais de faturamento e calcular o valuation da sua empresa."
          }}
        />
        <MetricCard
          title="Net New MRR"
          value={formatCurrency(displayMetrics?.netNewMrr || 0)}
          icon={Activity}
          trend={displayMetrics?.netNewMrr && displayMetrics.netNewMrr >= 0 ? "Positivo" : "Negativo"}
          trendUp={displayMetrics?.netNewMrr ? displayMetrics.netNewMrr >= 0 : true}
          description={`Saldo em ${periodLabel}`}
          info={{
            meaning: "É o saldo do MRR no período: (Novas Assinaturas + Upgrades) - (Cancelamentos + Downgrades).",
            importance: "Mostra a velocidade real de crescimento. Se for negativo, seu negócio está perdendo receita mais rápido do que ganha.",
            usage: "Acompanhe mensalmente para garantir que o crescimento de novas vendas supere as perdas com cancelamentos."
          }}
        />
        <MetricCard
          title="Usuários Ativos"
          value={displayMetrics?.activeUsers?.toLocaleString() || '0'}
          icon={Users}
          description={`Total em ${periodLabel}`}
          info={{
            meaning: "Número total de clientes que possuem uma assinatura paga e ativa no momento.",
            importance: "Indica o tamanho real da sua base de clientes pagantes e o alcance do seu produto.",
            usage: "Cruze com o MRR para descobrir o ticket médio (ARPU) e monitore para ver se a base está expandindo."
          }}
        />
        <MetricCard
          title="Churn Rate"
          value={formatPercentage(displayMetrics?.churnRate || 0)}
          icon={UserMinus}
          trendUp={true} // Lower churn is good
          description={`Cancelamentos em ${periodLabel}`}
          className={(displayMetrics?.churnRate || 0) > 10 ? "border-rose-200 bg-rose-50 dark:bg-rose-900/10 dark:border-rose-900/30" : ""}
          info={{
            meaning: "Taxa de cancelamento. A porcentagem de clientes que cancelaram a assinatura em um determinado período.",
            importance: "Um churn alto destrói o crescimento do MRR. É o 'vazamento no balde' do seu SaaS.",
            usage: "Mantenha abaixo de 5% ao mês. Se subir, investigue problemas no produto, suporte ou onboarding."
          }}
        />
        <MetricCard
          title="Conversão Global"
          value={formatPercentage(displayMetrics?.conversionRate || 0)}
          icon={UserPlus}
          description="Leads que viraram Pro"
          info={{
            meaning: "Porcentagem de usuários que criaram uma conta gratuita (ou trial) e se tornaram clientes pagantes.",
            importance: "Mede a eficiência do seu funil de vendas e o quão bem o produto convence o usuário a pagar.",
            usage: "Use para otimizar o onboarding, campanhas de e-mail e descobrir onde os usuários desistem antes de pagar."
          }}
        />
        <MetricCard
          title="LTV (Lifetime Value)"
          value={formatCurrency(displayMetrics?.ltv || 0)}
          icon={Database}
          description="LTV Médio Projetado"
          info={{
            meaning: "Valor do Tempo de Vida. É a estimativa de quanto dinheiro um cliente gasta com você durante todo o tempo que permanece assinante.",
            importance: "Define o teto de quanto você pode gastar para adquirir um novo cliente (CAC) e ainda ter lucro.",
            usage: "Compare com o CAC (ideal: LTV ser 3x maior que o CAC). Para aumentar o LTV, reduza o churn ou aumente o ticket médio."
          }}
        />
        <MetricCard
          title="CAC (Custo de Aquisição)"
          value={formatCurrency(displayMetrics?.cac || 0)}
          icon={TrendingUp}
          description="Custo médio por cliente"
          info={{
            meaning: "Custo de Aquisição de Cliente. É o total gasto em marketing e vendas dividido pelo número de novos clientes conquistados.",
            importance: "Mostra a eficiência dos seus investimentos em crescimento. Um CAC muito alto torna o negócio insustentável.",
            usage: "Monitore para garantir que não está pagando caro demais por clientes. Tente otimizar anúncios e conversão orgânica para reduzi-lo."
          }}
        />
      </div>

      {/* MRR Section */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 dark:bg-zinc-800 rounded-lg">
            <DollarSign className="w-6 h-6 text-blue-600 dark:text-white" />
          </div>
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">MRR (Monthly Recurring Revenue)</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Receita recorrente mensal baseada em assinaturas ativas.</p>
            </div>
            <InfoPopover
              title="MRR (Receita Recorrente)"
              meaning="Monthly Recurring Revenue. É o total de receita garantida que entra todo mês através de assinaturas ativas."
              importance="É a métrica de saúde financeira mais importante de um SaaS, mostrando a previsibilidade do seu faturamento."
              usage="Use para projetar o fluxo de caixa futuro e entender se o negócio está crescendo ou encolhendo mês a mês."
            />
          </div>
          <div className="ml-auto text-right">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{formatCurrency(displayMetrics?.mrr || 0)}</div>
            <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">+12.5% este mês</div>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mrrData}>
              <defs>
                <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-zinc-800" />
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
              <Area type="monotone" dataKey="mrr" stroke="#60a5fa" fillOpacity={1} fill="url(#colorMrr)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Churn Rate */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 min-w-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
              <UserMinus className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="flex items-center gap-2">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Churn Rate</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Taxa de cancelamento mensal.</p>
              </div>
              <InfoPopover
                title="Churn Rate"
                meaning="Taxa de cancelamento. A porcentagem de clientes que cancelaram a assinatura em um determinado período."
                importance="Um churn alto destrói o crescimento do MRR. É o 'vazamento no balde' do seu SaaS."
                usage="Mantenha abaixo de 5% ao mês. Se subir, investigue problemas no produto, suporte ou onboarding."
              />
            </div>
            <div className="ml-auto text-right">
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">{formatPercentage(displayMetrics?.churnRate || 0)}</div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">-0.5% vs mês anterior</div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-zinc-800" />
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
                <Bar dataKey="cancellations" fill="#fb7185" radius={[4, 4, 0, 0]} name="Cancelamentos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LTV & CAC */}
        <div className="space-y-6 min-w-0">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">LTV (Lifetime Value)</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Quanto cada cliente gasta em média.</p>
                </div>
                <InfoPopover
                  title="LTV (Lifetime Value)"
                  meaning="Valor do Tempo de Vida. É a estimativa de quanto dinheiro um cliente gasta com você durante todo o tempo que permanece assinante."
                  importance="Define o teto de quanto você pode gastar para adquirir um novo cliente (CAC) e ainda ter lucro."
                  usage="Compare com o CAC (ideal: LTV ser 3x maior que o CAC). Para aumentar o LTV, reduza o churn ou aumente o ticket médio."
                />
              </div>
            </div>
            <div className="flex items-end gap-4">
              <div className="text-3xl font-bold text-zinc-900 dark:text-white">{formatCurrency(displayMetrics?.ltv || 0)}</div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">LTV Médio</div>
            </div>
            <div className="mt-4 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, ((displayMetrics?.ltv || 0) / 800) * 100)}%` }}></div>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">Meta: R$ 800,00</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">CAC (Custo de Aquisição)</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Custo médio para atrair um cliente.</p>
                </div>
                <InfoPopover
                  title="CAC (Custo de Aquisição)"
                  meaning="Custo de Aquisição de Cliente. É o total gasto em marketing e vendas dividido pelo número de novos clientes conquistados."
                  importance="Mostra a eficiência dos seus investimentos em crescimento. Um CAC muito alto torna o negócio insustentável."
                  usage="Monitore para garantir que não está pagando caro demais por clientes. Tente otimizar anúncios e conversão orgânica para reduzi-lo."
                />
              </div>
            </div>
            <div className="flex items-end gap-4">
              <div className="text-3xl font-bold text-zinc-900 dark:text-white">{formatCurrency(displayMetrics?.cac || 0)}</div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Ads / Novos Clientes</div>
            </div>
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold">LTV/CAC Ratio:</span> {((displayMetrics?.ltv || 0) / (displayMetrics?.cac || 1)).toFixed(1)}x
              <span className="block text-xs mt-1 opacity-75">Saudável (Ideal {'>'} 3x)</span>
            </div>
          </div>
        </div>
      </div>

      {/* LTV vs CAC Comparison Section */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-zinc-800 rounded-lg">
              <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Eficiência de Aquisição (LTV vs CAC)</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Comparação entre valor gerado e custo de aquisição.</p>
            </div>
          </div>

          {/* Custom Circular Date Filter */}
          <div className="overflow-x-auto scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
            <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-1.5 rounded-full border border-zinc-100 dark:border-zinc-800 w-fit">
              <div className="pl-2 pr-1">
                <Calendar className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="flex gap-1">
                {(['today', '7d', '14d', '30d', '90d', 'month'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleQuickSelect(type)}
                    className={cn(
                      "h-9 rounded-full flex items-center justify-center text-[10px] font-bold transition-all whitespace-nowrap",
                      (type === 'today' || type === 'month') ? "px-4" : "w-9",
                      dateFilter.type === type 
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm" 
                        : "text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    )}
                  >
                    {type === 'today' ? 'Hoje' : type === 'month' ? 'Mês' : type.replace('d', '')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-4">
          <div className="lg:col-span-3 h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ltvCacTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-zinc-800" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(str) => new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} 
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
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText, borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: tooltipText }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name.toUpperCase()]}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="ltv" name="LTV" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="cac" name="CAC" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex flex-col justify-center space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">LTV Médio</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{formatCurrency(displayMetrics?.ltv || 0)}</p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">CAC Médio</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{formatCurrency(displayMetrics?.cac || 0)}</p>
            </div>
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/20">
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Ratio LTV/CAC</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{((displayMetrics?.ltv || 0) / (displayMetrics?.cac || 1)).toFixed(1)}x</p>
                <span className="text-[10px] font-medium text-emerald-500">Saudável</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
