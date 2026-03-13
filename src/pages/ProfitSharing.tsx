import { useEffect, useState } from 'react';
import { mockService } from '@/services/mockData';
import { supabaseService } from '@/services/supabaseService';
import { Transaction } from '@/types';
import { formatCurrency, formatPercentage, cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Crown, Shield, Zap, User, Settings } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function ProfitSharing() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Persisted Settings
  const [serverCosts, setServerCosts] = useState(() => {
    const saved = localStorage.getItem('fin_server_costs');
    return saved ? Number(saved) : 150.00;
  });
  const [taxRate, setTaxRate] = useState(() => {
    const saved = localStorage.getItem('fin_tax_rate');
    return saved ? Number(saved) : 6.0;
  });
  const [taxType, setTaxType] = useState<'percentage' | 'fixed'>(() => {
    const saved = localStorage.getItem('fin_tax_type');
    return (saved as 'percentage' | 'fixed') || 'percentage';
  });
  const [fixedTaxValue, setFixedTaxValue] = useState(() => {
    const saved = localStorage.getItem('fin_tax_fixed');
    return saved ? Number(saved) : 0;
  });

  // Draft state for inputs
  const [draftServerCosts, setDraftServerCosts] = useState(serverCosts);
  const [draftTaxRate, setDraftTaxRate] = useState(taxRate);
  const [draftTaxType, setDraftTaxType] = useState(taxType);
  const [draftFixedTaxValue, setDraftFixedTaxValue] = useState(fixedTaxValue);
  const [isSaving, setIsSaving] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const { theme } = useTheme();

  // Update drafts when settings open
  useEffect(() => {
    if (showSettings) {
      setDraftServerCosts(serverCosts);
      setDraftTaxRate(taxRate);
      setDraftTaxType(taxType);
      setDraftFixedTaxValue(fixedTaxValue);
    }
  }, [showSettings, serverCosts, taxRate, taxType, fixedTaxValue]);

  const handleSaveSettings = () => {
    setIsSaving(true);
    setServerCosts(draftServerCosts);
    setTaxRate(draftTaxRate);
    setTaxType(draftTaxType);
    setFixedTaxValue(draftFixedTaxValue);
    
    localStorage.setItem('fin_server_costs', String(draftServerCosts));
    localStorage.setItem('fin_tax_rate', String(draftTaxRate));
    localStorage.setItem('fin_tax_type', draftTaxType);
    localStorage.setItem('fin_tax_fixed', String(draftFixedTaxValue));
    
    setTimeout(() => {
      setIsSaving(false);
      setShowSettings(false);
    }, 500);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await supabaseService.getTransactions();
        setTransactions(data);
      } catch (err) {
        console.error("Error fetching transactions for profit sharing:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96 dark:text-zinc-400">Calculando divisão de lucros...</div>;

  // 1. Calculate Gross Revenue
  const grossRevenue = transactions.reduce((acc, curr) => acc + curr.amount, 0);

  // 2. Deduct Fees & Taxes
  const paymentFees = transactions.reduce((acc, curr) => acc + (curr.amount * 0.039) + 0.39, 0);
  
  const taxes = taxType === 'percentage' 
    ? grossRevenue * (taxRate / 100)
    : fixedTaxValue;

  // 3. Deduct Partner Commissions (Payouts)
  const calculateCommission = (txn: Transaction) => {
    if (txn.affiliate_id === 'victor_hugo') return txn.amount * 0.40;
    if (txn.affiliate_id === 'allan_stachuk') return txn.amount * 0.40;
    if (txn.type === 'upsell_vip') return txn.amount * 0.30; // Nutri share
    return 0;
  };
  const totalCommissions = transactions.reduce((acc, curr) => acc + calculateCommission(curr), 0);

  // 4. Net Distributable Profit
  const netDistributable = grossRevenue - paymentFees - taxes - totalCommissions - serverCosts;

  // 6. Split
  const partners = [
    { name: 'Gustavo', share: 27.5, icon: Crown, color: '#818cf8' },
    { name: 'Nicolas', share: 27.5, icon: Shield, color: '#a78bfa' },
    { name: 'Yulian', share: 17.5, icon: Zap, color: '#f472b6' },
    { name: 'Lucas', share: 17.5, icon: Zap, color: '#fb7185' },
    { name: 'Murilo', share: 10.0, icon: User, color: '#34d399' },
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Divisão de Sócios</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Distribuição automática do lucro líquido.</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-blue-600 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          title="Configurar Custos"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {showSettings && (
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Configurações de Custos e Impostos</h3>
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                isSaving 
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
              )}
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 mb-4 uppercase tracking-widest">Custos Fixos</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Custos Mensais (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-xs">R$</span>
                    <input
                      type="number"
                      value={draftServerCosts}
                      onChange={(e) => setDraftServerCosts(Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  Valor deduzido antes da divisão entre os sócios.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 mb-4 uppercase tracking-widest">Impostos</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider font-bold">Tipo de Cálculo</label>
                  <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg w-fit">
                    <button
                      onClick={() => setDraftTaxType('percentage')}
                      className={cn(
                        "px-3 py-1 text-[10px] font-medium rounded transition-all",
                        draftTaxType === 'percentage' 
                          ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-white shadow-sm" 
                          : "text-zinc-500"
                      )}
                    >
                      %
                    </button>
                    <button
                      onClick={() => setDraftTaxType('fixed')}
                      className={cn(
                        "px-3 py-1 text-[10px] font-medium rounded transition-all",
                        draftTaxType === 'fixed' 
                          ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-white shadow-sm" 
                          : "text-zinc-500"
                      )}
                    >
                      R$
                    </button>
                  </div>
                </div>

                {draftTaxType === 'percentage' ? (
                  <div>
                    <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Alíquota (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={draftTaxRate}
                        onChange={(e) => setDraftTaxRate(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        step="0.1"
                        min="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-xs">%</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Valor Fixo (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-xs">R$</span>
                      <input
                        type="number"
                        value={draftFixedTaxValue}
                        onChange={(e) => setDraftFixedTaxValue(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-zinc-900 dark:bg-zinc-900 rounded-2xl p-8 text-white shadow-xl border border-zinc-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div>
            <p className="text-zinc-400 font-medium mb-1">Lucro Líquido Distribuível</p>
            <h2 className="text-4xl font-bold text-white">{formatCurrency(netDistributable)}</h2>
            <p className="text-sm text-zinc-500 mt-2">
              Após taxas, impostos, comissões e custos.
            </p>
          </div>
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
            <div className="p-3 bg-zinc-800 dark:bg-zinc-900 rounded-lg border border-zinc-700 dark:border-zinc-800">
              <span className="block text-zinc-400 text-xs">Faturamento</span>
              <span className="font-medium">{formatCurrency(grossRevenue)}</span>
            </div>
            <div className="p-3 bg-zinc-800 dark:bg-zinc-900 rounded-lg border border-zinc-700 dark:border-zinc-800">
              <span className="block text-zinc-400 text-xs">Comissões</span>
              <span className="font-medium text-rose-400">-{formatCurrency(totalCommissions)}</span>
            </div>
            <div className="p-3 bg-zinc-800 dark:bg-zinc-900 rounded-lg border border-zinc-700 dark:border-zinc-800">
              <span className="block text-zinc-400 text-xs">Taxas Stripe</span>
              <span className="font-medium text-rose-400">-{formatCurrency(paymentFees)}</span>
            </div>
            <div className="p-3 bg-zinc-800 dark:bg-zinc-900 rounded-lg border border-zinc-700 dark:border-zinc-800">
              <span className="block text-zinc-400 text-xs">Impostos</span>
              <span className="font-medium text-rose-400">-{formatCurrency(taxes)}</span>
            </div>
            <div className="p-3 bg-zinc-800 dark:bg-zinc-900 rounded-lg border border-zinc-700 dark:border-zinc-800">
              <span className="block text-zinc-400 text-xs">Custos Fixos</span>
              <span className="font-medium text-rose-400">-{formatCurrency(serverCosts)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">Distribuição</h3>
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
              <div key={partner.name} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${partner.color}20` }}>
                    <Icon className="w-6 h-6" style={{ color: partner.color }} />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-white">{partner.name}</h4>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300">
                      {partner.share}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-zinc-900 dark:text-white">{formatCurrency(partner.value)}</div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">A receber</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
