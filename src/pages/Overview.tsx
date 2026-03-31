import { useEffect, useState, FormEvent } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { InfoPopover } from '@/components/InfoPopover';
import { SkeletonCard } from '@/components/SkeletonCard';
import { mockService } from '@/services/mockData';
import { supabaseService, isDemoMode } from '@/services/supabaseService';
import { DailyStats, Metrics } from '@/types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts';
import { formatCurrency, formatPercentage, cn } from '@/lib/utils';
import { DollarSign, Users, Activity, TrendingUp, UserMinus, UserPlus, Database, Cloud, Download, CheckCircle2, Circle, Plus, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { DateRangePicker, DateFilter } from '@/components/DateRangePicker';

const DAS_SCHEDULE = [
  { month: 'Março/2026', due: '2026-04-20', amount: 86.05 },
  { month: 'Abril/2026', due: '2026-05-20', amount: 86.05 },
  { month: 'Maio/2026', due: '2026-06-22', amount: 86.05 },
  { month: 'Junho/2026', due: '2026-07-20', amount: 86.05 },
  { month: 'Julho/2026', due: '2026-08-20', amount: 86.05 },
  { month: 'Agosto/2026', due: '2026-09-21', amount: 86.05 },
  { month: 'Setembro/2026', due: '2026-10-20', amount: 86.05 },
  { month: 'Outubro/2026', due: '2026-11-23', amount: 86.05 },
  { month: 'Novembro/2026', due: '2026-12-21', amount: 86.05 },
  { month: 'Dezembro/2026', due: '2027-01-20', amount: 86.05 },
];

export function Overview({ onTabChange, session }: { onTabChange?: (tab: string, filter?: string) => void, session?: any }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingRealData, setUsingRealData] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ type: 'month' });
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Revisar métricas semanais', completed: false },
    { id: 2, text: 'Aprovar campanha de marketing', completed: false },
    { id: 3, text: 'Reunião de alinhamento Q3', completed: true },
  ]);
  const [newTaskText, setNewTaskText] = useState('');
  const [taskFilter, setTaskFilter] = useState<'active' | 'completed'>('active');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [insightTab, setInsightTab] = useState<'performance' | 'trends'>('performance');
  const [selectedDayStats, setSelectedDayStats] = useState<DailyStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        setUsingRealData(!isDemoMode());
        const [dataMetrics, dataStats] = await Promise.all([
          supabaseService.getMetrics(dateFilter),
          supabaseService.getDailyStats(dateFilter)
        ]);
        setMetrics(dataMetrics);
        setDailyStats(dataStats);
      } catch (err) {
        console.error("Error fetching overview data:", err);
        setUsingRealData(false);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateFilter]);

  if (loading && !metrics) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <SkeletonCard className="h-10 w-48" />
          <div className="flex items-center gap-3">
            <SkeletonCard className="h-10 w-48" />
            <SkeletonCard className="h-10 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard className="h-32" />
          <SkeletonCard className="h-32" />
          <SkeletonCard className="h-32" />
          <SkeletonCard className="h-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SkeletonCard className="h-48" />
            <SkeletonCard className="h-64" />
          </div>
          <SkeletonCard className="h-full" />
        </div>
      </div>
    );
  }

  const COLORS = ['#818cf8', '#a78bfa', '#f472b6'];
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#334155' : '#f1f5f9';
  const axisColor = isDark ? '#94a3b8' : '#94a3b8';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#f1f5f9';
  const tooltipText = isDark ? '#f8fafc' : '#0f172a';

  // Task handlers
  const addTask = (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: newTaskText, completed: false }]);
    setNewTaskText('');
  };

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const filteredTasks = tasks.filter(t => taskFilter === 'active' ? !t.completed : t.completed);

  // Calendar handlers
  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDayClick = (day: number) => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const clickedDate = new Date(year, month, day);
    const dateStr = clickedDate.toISOString().split('T')[0];
    
    const stats = dailyStats.find(s => s.date === dateStr);
    if (stats) {
      setSelectedDayStats(stats);
    } else {
      // If no real stats found, create a dummy one for the demo/UI
      setSelectedDayStats({
        date: dateStr,
        new_users: Math.floor(Math.random() * 20),
        cancellations: Math.floor(Math.random() * 5),
        active_users: Math.floor(Math.random() * 1000) + 500,
        mrr: Math.floor(Math.random() * 5000) + 10000
      });
    }
    setIsModalOpen(true);
  };

  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Previous month padding
    const prevMonthDays = getDaysInMonth(year, month - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(<div key={`prev-${i}`} className="p-1 text-zinc-400 text-xs">{prevMonthDays - i}</div>);
    }

    // Current month days
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isDasDue = DAS_SCHEDULE.some(d => d.due === dateStr);
      const isToday = today.getDate() === i && today.getMonth() === month && today.getFullYear() === year;
      
      days.push(
        <button 
          key={i} 
          onClick={() => handleDayClick(i)}
          className={cn(
            "p-1 text-sm transition-all rounded-md relative group",
            isToday 
              ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold shadow-sm" 
              : isDasDue 
                ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 font-semibold"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
          )}
        >
          {i}
          {isDasDue && !isToday && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-900" />
          )}
        </button>
      );
    }

    return days;
  };

  const now = new Date();
  const timeString = now.toLocaleTimeString('pt-BR', { hour: 'numeric', minute: '2-digit' }).split(':');
  const dateString = now.toLocaleDateString('pt-BR', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Visão Geral</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Acompanhe o resumo do seu negócio</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={dateFilter} onChange={setDateFilter} />
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Hero Section */}
          <div className="bg-zinc-900 dark:bg-zinc-900 rounded-2xl p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center relative overflow-hidden shadow-sm">
             <div className="relative z-10 mb-6 sm:mb-0">
               <h2 className="text-2xl font-bold mb-1">
                 {greeting}, {session?.user?.user_metadata?.full_name?.split(' ')[0] || session?.user?.email?.split('@')[0] || 'Usuário'}
               </h2>
               <p className="text-zinc-400 text-sm mb-6">Pronto para um dia produtivo! 🚀</p>
               <div className="text-4xl font-bold tracking-tight">
                 {timeString[0]}:{timeString[1]}
               </div>
             </div>
             <div className="relative z-10 text-left sm:text-right">
               <div className="flex items-center sm:justify-end gap-2 mb-1">
                 <Cloud className="w-8 h-8 text-white" />
                 <span className="text-4xl font-bold">24°C</span>
               </div>
               <p className="text-zinc-400 text-sm">Parcialmente Nublado</p>
               <p className="text-zinc-400 text-sm">Maringá, BR</p>
               <p className="text-zinc-500 text-xs mt-2 capitalize">{dateString}</p>
             </div>
          </div>

          {/* 4 Small Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium">MRR</span>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold text-zinc-900 dark:text-white">{formatCurrency(metrics?.mrr || 0)}</span>
                <span className="text-xs font-medium text-emerald-500">+12%</span>
              </div>
            </div>
            
            <button 
              onClick={() => onTabChange?.('users', 'active')}
              className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <Users className="w-4 h-4 group-hover:text-blue-500 transition-colors" />
                  <span className="text-xs font-medium">Usuários Ativos</span>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold text-zinc-900 dark:text-white">{metrics?.activeUsers?.toLocaleString() || '0'}</span>
                <span className="text-xs font-medium text-emerald-500">+5%</span>
              </div>
            </button>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs font-medium">Conversão</span>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold text-zinc-900 dark:text-white">{formatPercentage(metrics?.conversionRate || 0)}</span>
                <span className="text-xs font-medium text-emerald-500">+2%</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <Database className="w-4 h-4" />
                  <span className="text-xs font-medium">Total de Usuários</span>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold text-zinc-900 dark:text-white">
                  {metrics?.totalUsers?.toLocaleString() || '0'}
                </span>
                <span className="text-xs font-medium text-zinc-500">Base total</span>
              </div>
            </div>
          </div>

          {/* Quick Tasks & Calendar Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Tasks */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Tarefas Rápidas</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Gerencie suas tarefas diárias</p>
              
              <div className="flex gap-2 mb-4">
                <button 
                  onClick={() => setTaskFilter('active')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-2 transition-colors ${taskFilter === 'active' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                >
                  <Circle className={`w-3 h-3 ${taskFilter === 'active' ? 'fill-current' : ''}`} /> Ativas ({tasks.filter(t => !t.completed).length})
                </button>
                <button 
                  onClick={() => setTaskFilter('completed')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-2 transition-colors ${taskFilter === 'completed' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                >
                  <CheckCircle2 className={`w-3 h-3 ${taskFilter === 'completed' ? 'fill-current' : ''}`} /> Concluídas ({tasks.filter(t => t.completed).length})
                </button>
              </div>

              <form onSubmit={addTask} className="relative mb-4">
                <input 
                  type="text" 
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Adicionar tarefa..." 
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-zinc-200 dark:bg-zinc-700 p-1 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">
                  <Plus className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                </button>
              </form>

              <div className="space-y-3 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredTasks.length > 0 ? filteredTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 group">
                    <button 
                      onClick={() => toggleTask(task.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${task.completed ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-300 dark:border-zinc-600'}`}
                    >
                      {task.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </button>
                    <span className={`text-sm transition-all ${task.completed ? 'text-zinc-400 line-through' : 'text-zinc-700 dark:text-zinc-300'}`}>
                      {task.text}
                    </span>
                  </div>
                )) : (
                  <p className="text-xs text-zinc-400 text-center py-4">Nenhuma tarefa encontrada.</p>
                )}
              </div>
            </div>

            {/* Calendar */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Calendário</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 capitalize">{dateString}</p>
              
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm font-medium capitalize">{calendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                <button onClick={nextMonth} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"><ChevronRight className="w-4 h-4" /></button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                <div className="text-zinc-400">Dom</div>
                <div className="text-zinc-400">Seg</div>
                <div className="text-zinc-400">Ter</div>
                <div className="text-zinc-400">Qua</div>
                <div className="text-zinc-400">Qui</div>
                <div className="text-zinc-400">Sex</div>
                <div className="text-zinc-400">Sáb</div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {renderCalendar()}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Insights */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Insights</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Análise de performance</p>
            
            <div className="flex gap-2 mb-6">
              <button 
                onClick={() => setInsightTab('performance')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-2 transition-colors ${insightTab === 'performance' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
              >
                <Activity className="w-3 h-3" /> Performance
              </button>
              <button 
                onClick={() => setInsightTab('trends')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-2 transition-colors ${insightTab === 'trends' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
              >
                <TrendingUp className="w-3 h-3" /> Tendências
              </button>
            </div>

            {insightTab === 'performance' ? (
              <>
                <div className="h-48 relative flex items-center justify-center mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart 
                      cx="50%" 
                      cy="50%" 
                      innerRadius="60%" 
                      outerRadius="100%" 
                      barSize={10} 
                      data={[
                        { name: 'Conversão', value: metrics?.conversionRate || 0, fill: '#818cf8' },
                        { name: 'Retenção', value: 100 - (metrics?.churnRate || 0), fill: '#34d399' },
                        { name: 'Engajamento', value: 85, fill: '#60a5fa' }
                      ]}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                      <RadialBar
                        background={{ fill: isDark ? '#334155' : '#f1f5f9' }}
                        dataKey="value"
                        cornerRadius={10}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold text-zinc-900 dark:text-white">
                      {Math.round(((metrics?.conversionRate || 0) + (100 - (metrics?.churnRate || 0)) + 85) / 3)}%
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">Conversão</p>
                        <p className="text-xs text-zinc-500">Taxa de leads para pro</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{formatPercentage(metrics?.conversionRate || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">Retenção</p>
                        <p className="text-xs text-zinc-500">Inverso do Churn Rate</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{formatPercentage(100 - (metrics?.churnRate || 0))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">Engajamento</p>
                        <p className="text-xs text-zinc-500">Uso diário da plataforma</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">85%</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="h-48 relative mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyStats.slice(-30)}>
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}
                        itemStyle={{ color: tooltipText }}
                        labelStyle={{ display: 'none' }}
                        formatter={(value: number) => [formatCurrency(value), 'MRR']}
                      />
                      <Area type="monotone" dataKey="mrr" stroke="#818cf8" fill="#818cf8" fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="absolute top-2 left-2">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Crescimento MRR (30d)</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-1">Novos Usuários (Período)</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-zinc-900 dark:text-white">
                        {dailyStats.reduce((acc, curr) => acc + curr.new_users, 0).toLocaleString()}
                      </span>
                      <UserPlus className="w-4 h-4 text-emerald-500" />
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-1">Net New MRR</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-zinc-900 dark:text-white">{formatCurrency(metrics?.netNewMrr || 0)}</span>
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Revenue Analytics */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Receita</h3>
              <span className="text-xs text-zinc-500">Últimos 14 dias</span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Crescimento do MRR</p>
            
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyStats.slice(-14)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}
                    itemStyle={{ color: tooltipText }}
                    labelStyle={{ display: 'none' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="mrr" 
                    stroke="#818cf8" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRev)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Metrics Modal */}
      {isModalOpen && selectedDayStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Métricas do Dia</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {new Date(selectedDayStats.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <Plus className="w-5 h-5 rotate-45 text-zinc-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-1">MRR</p>
                  <p className="text-lg font-bold text-zinc-900 dark:text-white">{formatCurrency(selectedDayStats.mrr)}</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-1">Usuários Ativos</p>
                  <p className="text-lg font-bold text-zinc-900 dark:text-white">{selectedDayStats.active_users.toLocaleString()}</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-1">Novos Usuários</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">{selectedDayStats.new_users}</p>
                    <UserPlus className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-1">Cancelamentos</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">{selectedDayStats.cancellations}</p>
                    <UserMinus className="w-4 h-4 text-rose-500" />
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300">Resumo de Performance</p>
                </div>
                <p className="text-xs text-indigo-700 dark:text-indigo-400 leading-relaxed">
                  Neste dia, o MRR teve um comportamento {selectedDayStats.new_users > selectedDayStats.cancellations ? 'positivo' : 'estável'} com {selectedDayStats.new_users} novas aquisições.
                </p>
              </div>
            </div>

            <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
