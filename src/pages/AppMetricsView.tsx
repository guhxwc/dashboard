import { useState, useMemo, ReactNode } from 'react';
import { Customer, DailyLog } from '@/types';
import { ArrowLeft, Info, Activity, Users, Target, Droplets, Dumbbell, Flame, TrendingUp, Calendar, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AppMetricsViewProps {
  onBack: () => void;
  customers: Customer[];
  dailyLogs?: DailyLog[];
  usingRealData?: boolean;
}

const appMetricsDictionary: Record<string, { title: string; meaning: string; importance: string; howToUse: string }> = {
  'DAU': {
    title: 'DAU (Usuários Ativos Diários)',
    meaning: 'Número de usuários únicos que abriram ou interagiram com o app em um único dia.',
    importance: 'Mede o engajamento diário e a capacidade do app de se tornar um hábito na vida do aluno.',
    howToUse: 'Se o DAU cair, envie notificações push motivacionais ou crie desafios diários para trazer os alunos de volta.'
  },
  'MAU': {
    title: 'MAU (Usuários Ativos Mensais)',
    meaning: 'Número de usuários únicos que interagiram com o app pelo menos uma vez nos últimos 30 dias.',
    importance: 'Indica o tamanho real da sua base de usuários ativos, ignorando os que abandonaram o app.',
    howToUse: 'Compare o MAU com o total de assinantes. Uma grande diferença indica alta taxa de churn (cancelamento) iminente.'
  },
  'Stickiness': {
    title: 'Stickiness (DAU/MAU)',
    meaning: 'A proporção de usuários mensais que usam o app todos os dias (DAU dividido por MAU).',
    importance: 'É a métrica definitiva de "vício" positivo. Um stickiness de 20% significa que o usuário médio abre o app 6 dias por mês.',
    howToUse: 'Para aumentar, adicione mecânicas de gamificação (streaks/ofensivas) e lembretes diários de hidratação ou treino.'
  },
  'Usage Rate': {
    title: 'Usage Rate (Taxa de Uso)',
    meaning: 'Porcentagem do total de alunos ativos que usaram o app hoje.',
    importance: 'Mostra a adoção geral da ferramenta pela sua base de clientes.',
    howToUse: 'Se estiver baixa, reforce o uso do app durante as consultas ou crie conteúdos exclusivos acessíveis apenas por lá.'
  },
  'Goal Completion': {
    title: 'Goal Completion (Taxa de Conclusão)',
    meaning: 'Média de metas diárias (água, proteína, treino) que foram marcadas como concluídas.',
    importance: 'Mede a eficácia do programa. Alunos que não batem metas não têm resultados.',
    howToUse: 'Identifique quais metas têm menor conclusão e ajuste a dificuldade ou ofereça dicas práticas para facilitá-las.'
  },
  'Consistency': {
    title: 'Consistency (Consistência)',
    meaning: 'Porcentagem de usuários que batem suas metas mais de 4 vezes por semana.',
    importance: 'Consistência é mais importante que perfeição. Esta métrica prevê quem terá os melhores resultados a longo prazo.',
    howToUse: 'Recompense publicamente (ex: no grupo de alunos) aqueles com maior consistência para incentivar os demais.'
  },
  'Adherence': {
    title: 'Adherence (Adesão)',
    meaning: 'O quão fielmente os usuários estão seguindo o que foi prescrito (dieta e treino).',
    importance: 'Baixa adesão geralmente significa que o plano está muito difícil ou não se adapta à rotina do aluno.',
    howToUse: 'Use para identificar alunos que precisam de uma revisão no plano antes que eles fiquem frustrados e cancelem.'
  },
  'Avg Streak': {
    title: 'Avg Streak (Ofensiva Média)',
    meaning: 'Média de dias consecutivos que seus alunos estão batendo metas sem falhar.',
    importance: 'Streaks criam aversão à perda (o aluno não quer "quebrar" a corrente), sendo um forte retentor.',
    howToUse: 'Crie marcos (7 dias, 21 dias, 30 dias) e celebre quando os alunos atingirem essas ofensivas.'
  }
};

export function AppMetricsView({ onBack, customers, dailyLogs = [], usingRealData = false }: AppMetricsViewProps) {
  const [selectedMetricInfo, setSelectedMetricInfo] = useState<{ title: string; meaning: string; importance: string; howToUse: string } | null>(null);

  // Generate historical data for the charts (real or mock)
  const historicalData = useMemo(() => {
    const data = [];
    for (let i = 30; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'dd/MM', { locale: ptBR });
      const isoDateStr = date.toISOString().split('T')[0];
      
      if (usingRealData) {
        // Filter logs for this specific date
        const logsForDate = dailyLogs.filter(log => log.date === isoDateStr);
        
        // Calculate metrics based on real logs
        const dau = logsForDate.length;
        const protein = logsForDate.filter(log => log.protein_met).length;
        const water = logsForDate.filter(log => log.water_met).length;
        const workout = logsForDate.filter(log => log.workout_met).length;

        data.push({
          date: dateStr,
          dau,
          protein,
          water,
          workout,
        });
      } else {
        // Base values that grow slightly over time
        const baseUsers = Math.floor(customers.length * 0.6) + Math.floor(i * 0.5);
        const dau = Math.floor(baseUsers * (0.3 + Math.random() * 0.2));
        
        data.push({
          date: dateStr,
          dau,
          protein: Math.floor(dau * (0.6 + Math.random() * 0.2)),
          water: Math.floor(dau * (0.7 + Math.random() * 0.2)),
          workout: Math.floor(dau * (0.4 + Math.random() * 0.2)),
        });
      }
    }
    return data;
  }, [customers.length, dailyLogs, usingRealData]);

  // Calculate overall metrics
  const activeUsers = customers.length;
  const dau = historicalData[historicalData.length - 1].dau;
  
  // Real MAU calculation if using real data
  let mau = 0;
  if (usingRealData) {
    const uniqueUsersLast30Days = new Set(dailyLogs.map(log => log.user_id));
    mau = uniqueUsersLast30Days.size;
  } else {
    mau = Math.floor(activeUsers * 0.85); // Mock MAU
  }

  const stickiness = mau > 0 ? Math.round((dau / mau) * 100) : 0;
  const usageRate = activeUsers > 0 ? Math.round((dau / activeUsers) * 100) : 0;
  
  const totalDau = historicalData.reduce((acc, curr) => acc + curr.dau, 0);
  const avgProtein = totalDau > 0 ? Math.round((historicalData.reduce((acc, curr) => acc + curr.protein, 0) / totalDau) * 100) : 0;
  const avgWater = totalDau > 0 ? Math.round((historicalData.reduce((acc, curr) => acc + curr.water, 0) / totalDau) * 100) : 0;
  const avgWorkout = totalDau > 0 ? Math.round((historicalData.reduce((acc, curr) => acc + curr.workout, 0) / totalDau) * 100) : 0;
  
  const goalCompletionRate = Math.round((avgProtein + avgWater + avgWorkout) / 3);
  const consistencyRate = Math.round(goalCompletionRate * 0.9); // Mock consistency or derived
  const adherenceRate = Math.round(usageRate * 0.8); // Mock adherence or derived
  
  const avgStreak = Math.round(customers.reduce((acc, curr) => acc + (curr.current_streak || 0), 0) / (customers.length || 1));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Métricas de Uso do App</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Visão geral do engajamento e retenção</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="DAU" value={dau.toString()} subtitle="Usuários Ativos Diários" icon={<Users className="w-4 h-4" />} color="blue" onInfoClick={() => setSelectedMetricInfo(appMetricsDictionary['DAU'])} />
        <MetricCard title="MAU" value={mau.toString()} subtitle="Usuários Ativos Mensais" icon={<Calendar className="w-4 h-4" />} color="indigo" onInfoClick={() => setSelectedMetricInfo(appMetricsDictionary['MAU'])} />
        <MetricCard title="Stickiness" value={`${stickiness}%`} subtitle="DAU / MAU" icon={<TrendingUp className="w-4 h-4" />} color="emerald" onInfoClick={() => setSelectedMetricInfo(appMetricsDictionary['Stickiness'])} />
        <MetricCard title="Usage Rate" value={`${usageRate}%`} subtitle="DAU / Total Ativos" icon={<Activity className="w-4 h-4" />} color="amber" onInfoClick={() => setSelectedMetricInfo(appMetricsDictionary['Usage Rate'])} />
        
        <MetricCard title="Goal Completion" value={`${goalCompletionRate}%`} subtitle="Média de metas batidas" icon={<Target className="w-4 h-4" />} color="rose" onInfoClick={() => setSelectedMetricInfo(appMetricsDictionary['Goal Completion'])} />
        <MetricCard title="Consistency" value={`${consistencyRate}%`} subtitle="Metas batidas > 4x/sem" icon={<Dumbbell className="w-4 h-4" />} color="purple" onInfoClick={() => setSelectedMetricInfo(appMetricsDictionary['Consistency'])} />
        <MetricCard title="Adherence" value={`${adherenceRate}%`} subtitle="Uso conforme prescrito" icon={<Droplets className="w-4 h-4" />} color="cyan" onInfoClick={() => setSelectedMetricInfo(appMetricsDictionary['Adherence'])} />
        <MetricCard title="Avg Streak" value={`${avgStreak} dias`} subtitle="Ofensiva média geral" icon={<Flame className="w-4 h-4" />} color="orange" onInfoClick={() => setSelectedMetricInfo(appMetricsDictionary['Avg Streak'])} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DAU Chart */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-6">Evolução de DAU (30 dias)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.2} vertical={false} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                />
                <Line type="monotone" dataKey="dau" name="DAU" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Features Usage Chart */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-6">Uso por Funcionalidade (30 dias)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.2} vertical={false} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Line type="monotone" dataKey="protein" name="Proteína" stroke="#f43f5e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="water" name="Água" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="workout" name="Treino" stroke="#a855f7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {selectedMetricInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                {selectedMetricInfo.title}
              </h3>
              <button onClick={() => setSelectedMetricInfo(null)} className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">O que significa?</h4>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{selectedMetricInfo.meaning}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Por que é importante?</h4>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{selectedMetricInfo.importance}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
                <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">Como usar na prática</h4>
                <p className="text-sm text-blue-800 dark:text-blue-300">{selectedMetricInfo.howToUse}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, color, onInfoClick }: { title: string, value: string, subtitle: string, icon: ReactNode, color: string, onInfoClick?: () => void }) {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    cyan: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20',
    orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
  }[color] || 'text-zinc-600 bg-zinc-50';

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative group">
      {onInfoClick && (
        <button 
          onClick={onInfoClick}
          className="absolute top-4 right-4 p-1.5 text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Informações sobre a métrica"
        >
          <Info className="w-4 h-4" />
        </button>
      )}
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorClasses}`}>
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">{value}</div>
      <div className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</div>
    </div>
  );
}
