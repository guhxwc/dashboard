import { useEffect, useState, useMemo } from 'react';
import { supabaseService, isDemoMode } from '@/services/supabaseService';
import { Customer, DailyLog } from '@/types';
import { Search, Activity, Users, Target, Droplets, Dumbbell, Flame, Database, Download, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subDays, isToday, parseISO } from 'date-fns';
import { AppMetricsView } from '@/pages/AppMetricsView';
import { UserMetricsView } from '@/pages/UserMetricsView';

interface UserUsage {
  customer: Customer;
  lastActive: string;
  proteinGoal: boolean;
  waterGoal: boolean;
  workoutCompleted: boolean;
  streak: number;
}

export function AppUsage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [usingRealData, setUsingRealData] = useState(false);
  const [view, setView] = useState<'list' | 'app-metrics' | 'user-metrics'>('list');
  const [selectedUser, setSelectedUser] = useState<Customer | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const isDemo = isDemoMode();
        setUsingRealData(!isDemo);
        
        const customersData = await supabaseService.getCustomers();
        // Only active customers for usage metrics
        setCustomers(customersData.filter(c => c.status === 'active' || c.status === 'tester'));

        if (!isDemo) {
          const today = new Date();
          const thirtyDaysAgo = subDays(today, 30).toISOString().split('T')[0];
          const todayStr = today.toISOString().split('T')[0];
          const logs = await supabaseService.getLogsByDateRange(thirtyDaysAgo, todayStr);
          setDailyLogs(logs as DailyLog[]);
        }
      } catch (err) {
        console.error("Error fetching usage data:", err);
        setUsingRealData(false);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Generate usage data (real or deterministic mock)
  const usageData = useMemo<UserUsage[]>(() => {
    return customers.map((customer, index) => {
      if (usingRealData) {
        // Use real data from Supabase
        const todayStr = new Date().toISOString().split('T')[0];
        const log = dailyLogs.find(l => l.user_id === customer.id && l.date === todayStr);
        
        // If they have a log today, they are active today
        const lastActive = log ? new Date().toISOString() : (customer.last_login || customer.created_at);

        return {
          customer,
          lastActive,
          proteinGoal: log?.protein_met || false,
          waterGoal: log?.water_met || false,
          workoutCompleted: log?.workout_met || false,
          streak: customer.current_streak || 0
        };
      }

      // Mock data logic
      const seed = customer.id.length + index;
      const isDau = (seed % 100) < 45;
      const proteinGoal = isDau && (seed % 10) < 6;
      const waterGoal = isDau && (seed % 10) < 7;
      const workoutCompleted = isDau && (seed % 10) < 4;
      
      let streak = 0;
      if (isDau) {
        streak = (seed % 100) < 35 ? Math.floor((seed % 20) + 3) : Math.floor(seed % 3);
      }

      const lastActive = isDau 
        ? new Date().toISOString() 
        : subDays(new Date(), Math.floor((seed % 14) + 1)).toISOString();

      return {
        customer,
        lastActive,
        proteinGoal,
        waterGoal,
        workoutCompleted,
        streak
      };
    });
  }, [customers, dailyLogs, usingRealData]);

  const filteredData = usageData.filter(u => 
    !searchQuery || 
    u.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = customers.length;
  const dauCount = usageData.filter(u => {
    if (!u.lastActive) return false;
    try {
      return isToday(parseISO(u.lastActive));
    } catch (e) {
      return false;
    }
  }).length;

  const handleExportCSV = () => {
    const headers = ['Nome', 'Email', 'Último Acesso', 'Meta Proteína', 'Meta Água', 'Treino', 'Ofensiva (Dias)'];
    const csvData = filteredData.map(u => [
      u.customer.name,
      u.customer.email,
      new Date(u.lastActive).toLocaleDateString('pt-BR'),
      u.proteinGoal ? 'Sim' : 'Não',
      u.waterGoal ? 'Sim' : 'Não',
      u.workoutCompleted ? 'Sim' : 'Não',
      u.streak.toString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `uso_app_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="flex items-center justify-center h-96 dark:text-zinc-400">Carregando métricas de uso...</div>;

  if (view === 'app-metrics') {
    return (
      <AppMetricsView 
        onBack={() => setView('list')} 
        customers={customers}
        dailyLogs={dailyLogs}
        usingRealData={usingRealData}
      />
    );
  }

  if (view === 'user-metrics' && selectedUser) {
    return (
      <UserMetricsView 
        onBack={() => {
          setView('list');
          setSelectedUser(null);
        }} 
        customer={selectedUser} 
        dailyLogs={dailyLogs}
        usingRealData={usingRealData}
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Uso do App</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-zinc-500 dark:text-zinc-400">Engajamento e adoção dos usuários ativos.</p>
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('app-metrics')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm shadow-blue-600/20 w-full sm:w-auto"
          >
            <BarChart2 className="w-4 h-4" />
            Métricas
          </button>
        </div>
      </div>

      {/* Resumo de Engajamento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-[10px] sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">DAU</h3>
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-3xl font-bold text-zinc-900 dark:text-white">{dauCount}</span>
            <span className="text-[10px] sm:text-sm font-medium text-emerald-500">{activeCount > 0 ? Math.round((dauCount / activeCount) * 100) : 0}%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="p-1.5 sm:p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-[10px] sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Proteína</h3>
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-3xl font-bold text-zinc-900 dark:text-white">{usageData.filter(u => u.proteinGoal).length}</span>
            <span className="text-[10px] sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">hoje</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-[10px] sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Água</h3>
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-3xl font-bold text-zinc-900 dark:text-white">{usageData.filter(u => u.waterGoal).length}</span>
            <span className="text-[10px] sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">hoje</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="p-1.5 sm:p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-[10px] sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Treinos</h3>
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-3xl font-bold text-zinc-900 dark:text-white">{usageData.filter(u => u.workoutCompleted).length}</span>
            <span className="text-[10px] sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">hoje</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Buscar usuário..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-sm font-medium w-full sm:w-auto justify-center"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>

        {/* Table/Cards */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-6 py-3">Usuário</th>
                <th className="px-6 py-3">Último Acesso</th>
                <th className="px-6 py-3 text-center">Proteína</th>
                <th className="px-6 py-3 text-center">Água</th>
                <th className="px-6 py-3 text-center">Treino</th>
                <th className="px-6 py-3 text-center">Ofensiva</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredData.slice(0, 100).map((usage) => { // Limit to 100 for performance in demo
                const isToday = usage.lastActive.startsWith(new Date().toISOString().split('T')[0]);
                return (
                  <tr 
                    key={usage.customer.id} 
                    onClick={() => {
                      setSelectedUser(usage.customer);
                      setView('user-metrics');
                    }}
                    className="bg-white dark:bg-zinc-900 border-b border-zinc-50 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 dark:text-zinc-400 font-bold text-xs">
                          {usage.customer.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-white">{usage.customer.name}</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">{usage.customer.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                        isToday ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400'
                      }`}>
                        {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                        {new Date(usage.lastActive).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {usage.proteinGoal ? (
                        <span className="inline-flex p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                          <Target className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="inline-flex p-1.5 text-zinc-300 dark:text-zinc-700">
                          <Target className="w-4 h-4" />
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {usage.waterGoal ? (
                        <span className="inline-flex p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                          <Droplets className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="inline-flex p-1.5 text-zinc-300 dark:text-zinc-700">
                          <Droplets className="w-4 h-4" />
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {usage.workoutCompleted ? (
                        <span className="inline-flex p-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                          <Dumbbell className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="inline-flex p-1.5 text-zinc-300 dark:text-zinc-700">
                          <Dumbbell className="w-4 h-4" />
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Flame className={`w-4 h-4 ${usage.streak > 0 ? 'text-amber-500' : 'text-zinc-300 dark:text-zinc-700'}`} />
                        <span className={`font-medium ${usage.streak > 0 ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>
                          {usage.streak}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {filteredData.slice(0, 50).map((usage) => {
            const isToday = usage.lastActive.startsWith(new Date().toISOString().split('T')[0]);
            return (
              <div 
                key={usage.customer.id}
                onClick={() => {
                  setSelectedUser(usage.customer);
                  setView('user-metrics');
                }}
                className="p-4 bg-white dark:bg-zinc-900 active:bg-zinc-50 dark:active:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 font-bold text-sm">
                      {usage.customer.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-white">{usage.customer.name}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{usage.customer.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                    <Flame className={cn("w-3.5 h-3.5", usage.streak > 0 ? "text-amber-500" : "text-zinc-300")} />
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">{usage.streak}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight ${
                      isToday ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      {isToday && <span className="w-1 h-1 rounded-full bg-emerald-500"></span>}
                      {new Date(usage.lastActive).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={cn("p-1.5 rounded-lg", usage.proteinGoal ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" : "text-zinc-300")}>
                      <Target className="w-4 h-4" />
                    </div>
                    <div className={cn("p-1.5 rounded-lg", usage.waterGoal ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "text-zinc-300")}>
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div className={cn("p-1.5 rounded-lg", usage.workoutCompleted ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600" : "text-zinc-300")}>
                      <Dumbbell className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredData.length === 0 && (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              Nenhum usuário encontrado.
            </div>
          )}
        </div>
        {filteredData.length > 100 && (
          <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
            Mostrando os primeiros 100 usuários de {filteredData.length}. Use a busca ou exporte para CSV para ver todos.
          </div>
        )}
      </div>
    </div>
  );
}
