import { useEffect, useState, useMemo } from 'react';
import { supabaseService, isDemoMode } from '@/services/supabaseService';
import { DailyLog, Customer } from '@/types';
import { 
  Activity, Users, Trophy, Flame, Calendar, Clock, 
  CheckCircle2, TrendingUp, BarChart, Download, Database, RefreshCw
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as ReTooltip, ResponsiveContainer, Cell
} from 'recharts';
import { motion } from 'motion/react';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AppUsage() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [usingRealData, setUsingRealData] = useState(false);
  const { theme } = useTheme();

  const fetchData = async () => {
    setLoading(true);
    try {
      setUsingRealData(!isDemoMode());
      const [logsData, customersData] = await Promise.all([
        supabaseService.getLogsByDateRange(dateRange.start, dateRange.end),
        supabaseService.getCustomers()
      ]);
      setLogs(logsData);
      setCustomers(customersData);
    } catch (err) {
      console.error("Error fetching usage data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const dau = new Set(logs.filter(l => l.date === today).map(l => l.user_id)).size;
    
    // MAU (Unique active users in last 30 days)
    const mau = new Set(logs.map(l => l.user_id)).size;
    
    // Average goals per active user
    const avgGoals = logs.length > 0 && mau > 0 ? logs.length / mau : 0;
    
    const topStreaks = [...customers]
      .filter(c => c.status !== 'tester')
      .sort((a, b) => (b.current_streak || 0) - (a.current_streak || 0))
      .slice(0, 5);

    return { dau, mau, avgGoals, topStreaks };
  }, [logs, customers]);

  const chartData = useMemo(() => {
    const sortedDays = eachDayOfInterval({
      start: new Date(dateRange.start),
      end: new Date(dateRange.end)
    });

    return sortedDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayLogs = logs.filter(l => l.date === dateStr);
      const activeUsers = new Set(dayLogs.map(l => l.user_id)).size;
      const totalGoals = dayLogs.length;

      return {
        date: format(day, 'dd/MM'),
        activeUsers,
        totalGoals
      };
    });
  }, [logs, dateRange]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Engajamento no App</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-zinc-500 dark:text-zinc-400">Como os usuários estão atingindo seus objetivos.</p>
            {usingRealData ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold tracking-tight">REAL</span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold tracking-tight">DEMO</span>
            )}
          </div>
        </div>
        <button onClick={fetchData} className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
           <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Hoje (DAU)', value: stats.dau, icon: Users, color: 'blue' },
          { label: '30 Dias (MAU)', value: stats.mau, icon: Activity, color: 'emerald' },
          { label: 'Metas/User', value: stats.avgGoals.toFixed(1), icon: Trophy, color: 'amber' },
          { label: 'Taxa Ativa', value: customers.length > 0 ? ((stats.mau / customers.length) * 100).toFixed(1) + '%' : '0%', icon: TrendingUp, color: 'indigo' }
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
             <div className={`p-2 w-10 h-10 rounded-xl bg-${s.color}-50 dark:bg-${s.color}-900/10 text-${s.color}-600 dark:text-${s.color}-400 mb-4 flex items-center justify-center`}>
               <s.icon className="w-6 h-6" />
             </div>
             <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">{s.label}</p>
             <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{s.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-8">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold">Usuários Ativos por Dia</h3>
              <div className="flex gap-2">
                 <button onClick={() => setDateRange({ start: format(subDays(new Date(), 7), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd')})} className="text-[10px] font-bold px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800">7D</button>
                 <button onClick={() => setDateRange({ start: format(subDays(new Date(), 30), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd')})} className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-600 text-white">30D</button>
              </div>
           </div>
           <div className="h-72">
             <ResponsiveContainer width="100%" height="100%">
               <ReBarChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#27272a' : '#f4f4f5'} />
                 <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                 <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                 <ReTooltip 
                    contentStyle={{ backgroundColor: theme === 'dark' ? '#18181b' : '#fff', borderColor: theme === 'dark' ? '#27272a' : '#f4f4f5', borderRadius: '12px' }}
                 />
                 <Bar dataKey="activeUsers" fill="#6366f1" radius={[4, 4, 0, 0]} />
               </ReBarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-8">
           <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /> Maiores Streaks</h3>
           <div className="space-y-6">
              {stats.topStreaks.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold">{i+1}</div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold truncate w-24">{c.name}</span>
                        <span className="text-[10px] text-zinc-500">@{c.id.slice(0, 5)}</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-1 px-3 py-1 bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 rounded-full font-bold text-sm">
                      <Flame className="w-4 h-4 fill-current" />
                      {c.current_streak}
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
