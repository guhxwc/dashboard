import { useState, useMemo, ReactNode } from 'react';
import { Customer, DailyLog } from '@/types';
import { ArrowLeft, Info, Target, Droplets, Dumbbell, Flame, Calendar, TrendingUp, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserMetricsViewProps {
  onBack: () => void;
  customer: Customer;
  dailyLogs?: DailyLog[];
  usingRealData?: boolean;
}

const userMetricsDictionary: Record<string, { title: string; meaning: string; importance: string; howToUse: string }> = {
  'Consistência (30d)': {
    title: 'Consistência (30 dias)',
    meaning: 'Porcentagem de dias no último mês em que o aluno registrou pelo menos uma atividade.',
    importance: 'Mostra se o aluno está engajado com o processo ou se está "sumindo".',
    howToUse: 'Se cair abaixo de 50%, mande uma mensagem no WhatsApp perguntando se aconteceu algo e como pode ajudar.'
  },
  'Proteína': {
    title: 'Meta de Proteína',
    meaning: 'Total de dias em que o aluno atingiu a meta de proteína estabelecida.',
    importance: 'A proteína é crucial para saciedade e manutenção muscular. Falhar aqui compromete o resultado estético.',
    howToUse: 'Se estiver baixo, sugira opções mais práticas de lanches proteicos ou suplementação.'
  },
  'Água': {
    title: 'Meta de Água',
    meaning: 'Total de dias em que o aluno atingiu a meta de hidratação.',
    importance: 'A meta mais fácil de bater. Se o aluno falha na água, dificilmente acertará a dieta.',
    howToUse: 'Recomende o uso de garrafas maiores ou configure lembretes no celular do aluno.'
  },
  'Treino': {
    title: 'Dias de Treino',
    meaning: 'Total de dias em que o aluno registrou a conclusão do treino.',
    importance: 'Garante o estímulo necessário para mudança corporal.',
    howToUse: 'Se estiver baixo, investigue se o problema é tempo, motivação ou dificuldade dos exercícios.'
  }
};

export function UserMetricsView({ onBack, customer, dailyLogs = [], usingRealData = false }: UserMetricsViewProps) {
  const [selectedMetricInfo, setSelectedMetricInfo] = useState<{ title: string; meaning: string; importance: string; howToUse: string } | null>(null);

  // Generate historical data for the specific user (real or mock)
  const historicalData = useMemo(() => {
    const data = [];
    const seed = customer.id.length;
    let currentStreak = 0;
    
    // Pré-calcula a ofensiva antes da janela de 30 dias (usando os logs de 90 dias)
    if (usingRealData) {
      const thirtyDaysAgoStr = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const olderLogs = dailyLogs
        .filter(l => l.user_id === customer.id && l.date < thirtyDaysAgoStr)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
      if (olderLogs.length > 0) {
        let expectedDate = format(subDays(new Date(), 31), 'yyyy-MM-dd');
        if (olderLogs[0].date === expectedDate) {
          for (const l of olderLogs) {
            if (l.date === expectedDate) {
              currentStreak++;
              expectedDate = format(subDays(parseISO(expectedDate), 1), 'yyyy-MM-dd');
            } else if (l.date > expectedDate) {
              continue;
            } else {
              break;
            }
          }
        }
      }
    }
    
    for (let i = 30; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'dd/MM', { locale: ptBR });
      const isoDateStr = format(date, 'yyyy-MM-dd');
      
      if (usingRealData) {
        const log = dailyLogs.find(l => l.user_id === customer.id && l.date === isoDateStr);
        
        const protein = log?.protein_met ? 1 : 0;
        const water = log?.water_met ? 1 : 0;
        const workout = log?.workout_met ? 1 : 0;
        
        // Se existe um log para o dia, a ofensiva continua
        if (log) {
          currentStreak++;
        } else {
          // Se for hoje e não tem log, não zera a ofensiva (o dia ainda não acabou)
          if (i !== 0) {
            currentStreak = 0;
          }
        }
        
        data.push({
          date: dateStr,
          protein,
          water,
          workout,
          streak: currentStreak,
          score: (protein + water + workout) * 33.33 // 0, 33, 66, 100
        });
      } else {
        // Deterministic randomness based on user ID and day
        const daySeed = seed + i;
        const isActive = (daySeed % 10) < 6; // 60% chance of being active
        
        const protein = isActive && (daySeed % 10) < 5 ? 1 : 0;
        const water = isActive && (daySeed % 10) < 7 ? 1 : 0;
        const workout = isActive && (daySeed % 10) < 4 ? 1 : 0;
        
        if (isActive) {
          currentStreak++;
        } else {
          currentStreak = 0;
        }
        
        data.push({
          date: dateStr,
          protein,
          water,
          workout,
          streak: currentStreak,
          score: (protein + water + workout) * 33.33 // 0, 33, 66, 100
        });
      }
    }
    return data;
  }, [customer.id, dailyLogs, usingRealData]);

  const totalActiveDays = historicalData.filter(d => d.protein || d.water || d.workout).length;
  const consistency = Math.round((totalActiveDays / 30) * 100);
  
  const proteinDays = historicalData.filter(d => d.protein).length;
  const waterDays = historicalData.filter(d => d.water).length;
  const workoutDays = historicalData.filter(d => d.workout).length;
  const currentStreak = usingRealData ? (customer.current_streak || 0) : (historicalData[historicalData.length - 1]?.streak || 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors self-start shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl shrink-0">
            {customer.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white truncate">{customer.name}</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{customer.email}</p>
              {currentStreak > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                  <Flame className="w-3 h-3" /> {currentStreak} dias
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard title="Consistência (30d)" value={`${consistency}%`} subtitle={`${totalActiveDays} dias ativos`} icon={<Calendar className="w-5 h-5" />} color="blue" onInfoClick={() => setSelectedMetricInfo(userMetricsDictionary['Consistência (30d)'])} />
        <MetricCard title="Ofensiva Atual" value={`${currentStreak}d`} subtitle="Dias seguidos" icon={<Flame className="w-5 h-5" />} color="amber" />
        <MetricCard title="Proteína" value={`${proteinDays}d`} subtitle="Metas batidas" icon={<Target className="w-5 h-5" />} color="rose" onInfoClick={() => setSelectedMetricInfo(userMetricsDictionary['Proteína'])} />
        <MetricCard title="Água" value={`${waterDays}d`} subtitle="Metas batidas" icon={<Droplets className="w-5 h-5" />} color="cyan" onInfoClick={() => setSelectedMetricInfo(userMetricsDictionary['Água'])} />
        <MetricCard title="Treino" value={`${workoutDays}d`} subtitle="Dias de treino" icon={<Dumbbell className="w-5 h-5" />} color="purple" onInfoClick={() => setSelectedMetricInfo(userMetricsDictionary['Treino'])} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Chart */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Evolução de Engajamento (Score Diário)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.2} vertical={false} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', borderRadius: '8px' }}
                  cursor={{ fill: '#3f3f46', opacity: 0.1 }}
                />
                <Bar dataKey="score" name="Score (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Streak Chart */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            Histórico de Ofensiva (Streak)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.2} vertical={false} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', borderRadius: '8px' }}
                />
                <Line type="stepAfter" dataKey="streak" name="Dias Seguidos" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
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
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    cyan: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
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
