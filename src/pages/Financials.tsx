import { useEffect, useState, useMemo } from 'react';
import { mockService } from '@/services/mockData';
import { supabaseService, isDemoMode } from '@/services/supabaseService';
import { Transaction } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Wallet, CreditCard, Landmark, PiggyBank, Settings, AlertCircle, Database, Calendar, Bell, ChevronRight, Check, X } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import { cn } from '@/lib/utils';

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

export function Financials() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDasSchedule, setShowDasSchedule] = useState(false);
  const [paidDas, setPaidDas] = useState<string[]>(() => {
    const saved = localStorage.getItem('fin_paid_das');
    return saved ? JSON.parse(saved) : [];
  });

  // Persisted Settings
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
  const [draftTaxRate, setDraftTaxRate] = useState(taxRate);
  const [draftTaxType, setDraftTaxType] = useState(taxType);
  const [draftFixedTaxValue, setDraftFixedTaxValue] = useState(fixedTaxValue);
  const [isSaving, setIsSaving] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [usingRealData, setUsingRealData] = useState(false);

  // Save paid status to localStorage
  useEffect(() => {
    localStorage.setItem('fin_paid_das', JSON.stringify(paidDas));
  }, [paidDas]);

  // Get next DAS
  const nextDas = useMemo(() => {
    const now = new Date();
    // Find first unpaid DAS that is due today or in the future
    return DAS_SCHEDULE.find(d => !paidDas.includes(d.due) && new Date(d.due) >= now) 
      || DAS_SCHEDULE.find(d => !paidDas.includes(d.due)) // Or just the first unpaid one
      || DAS_SCHEDULE[0];
  }, [paidDas]);

  const togglePaid = (due: string) => {
    setPaidDas(prev => 
      prev.includes(due) ? prev.filter(d => d !== due) : [...prev, due]
    );
  };

  const isDasClose = useMemo(() => {
    if (!nextDas || paidDas.includes(nextDas.due)) return false;
    const now = new Date();
    const dueDate = new Date(nextDas.due);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 5 && diffDays >= 0;
  }, [nextDas, paidDas]);

  // Update drafts when settings open
  useEffect(() => {
    if (showSettings) {
      setDraftTaxRate(taxRate);
      setDraftTaxType(taxType);
      setDraftFixedTaxValue(fixedTaxValue);
    }
  }, [showSettings, taxRate, taxType, fixedTaxValue]);

  const handleSaveSettings = () => {
    setIsSaving(true);
    setTaxRate(draftTaxRate);
    setTaxType(draftTaxType);
    setFixedTaxValue(draftFixedTaxValue);
    
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
        setUsingRealData(!isDemoMode());
        const [txData, customersData] = await Promise.all([
          supabaseService.getTransactions(),
          supabaseService.getCustomers()
        ]);
        
        // Exclude testers
        const filteredTx = txData.filter(tx => {
          const customer = customersData.find(c => c.id === tx.customer_id);
          return !(customer && customer.status === 'tester');
        });
        
        setTransactions(filteredTx);
      } catch (err) {
        console.error("Erro ao carregar financeiro:", err);
        setUsingRealData(false);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const financials = useMemo(() => {
    if (!transactions.length) return { gross: 0, fees: 0, taxes: 0, net: 0 };

    const gross = transactions.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    
    // Stripe Fees: 3.99% + R$ 0.39 (Standard Brazil pricing often varies, using user's prompt: ~3.9% + 0.39)
    const fees = transactions.reduce((acc, curr) => {
      return acc + ((curr.amount || 0) * 0.039) + 0.39;
    }, 0);

    // Taxes (DAS/Simples)
    const taxes = taxType === 'percentage' 
      ? gross * (taxRate / 100)
      : fixedTaxValue;

    const net = gross - fees - taxes;

    return { gross, fees, taxes, net };
  }, [transactions, taxRate, taxType, fixedTaxValue]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (error) return (
    <div className="flex flex-col items-center justify-center h-96 text-rose-500 gap-2">
      <AlertCircle className="w-8 h-8" />
      <p>{error}</p>
      <button 
        onClick={() => window.location.reload()} 
        className="text-sm text-zinc-500 dark:text-zinc-400 underline hover:text-zinc-700 dark:hover:text-zinc-200"
      >
        Tentar novamente
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Financeiro "O Cofre"</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-zinc-500 dark:text-zinc-400">Controle rigoroso de entradas, taxas e impostos.</p>
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
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-blue-600 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          title="Configurar Impostos"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {showSettings && (
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Configurações de Impostos</h3>
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
          
          <div className="flex flex-col gap-6">
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider font-bold">Tipo de Cálculo</label>
              <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg w-fit">
                <button
                  onClick={() => setDraftTaxType('percentage')}
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                    draftTaxType === 'percentage' 
                      ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-white shadow-sm" 
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  Porcentagem (%)
                </button>
                <button
                  onClick={() => setDraftTaxType('fixed')}
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                    draftTaxType === 'fixed' 
                      ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-white shadow-sm" 
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  Valor Fixo (R$)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {draftTaxType === 'percentage' ? (
                <div>
                  <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Alíquota Simples/MEI (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={draftTaxRate}
                      onChange={(e) => setDraftTaxRate(Number(e.target.value))}
                      className="w-32 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.1"
                      min="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-xs">%</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Valor Fixo de Imposto (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-xs">R$</span>
                    <input
                      type="number"
                      value={draftFixedTaxValue}
                      onChange={(e) => setDraftFixedTaxValue(Number(e.target.value))}
                      className="w-40 pl-8 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              )}
              <div className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs pt-4">
                {draftTaxType === 'percentage' 
                  ? "Ajuste a porcentagem para calcular a provisão mensal do DAS baseada no faturamento bruto."
                  : "Defina um valor fixo mensal de impostos (ex: guia do MEI ou valor acordado)."}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Faturamento Bruto"
          value={formatCurrency(financials.gross)}
          icon={Wallet}
          description="Total processado pelo Stripe"
          className="border-l-4 border-l-blue-500 dark:border-l-zinc-500"
        />
        <MetricCard
          title="Taxas Stripe"
          value={formatCurrency(financials.fees)}
          icon={CreditCard}
          description="~3.9% + R$ 0,39 por venda"
          className="border-l-4 border-l-orange-500 dark:border-l-orange-500"
        />
        <MetricCard
          title="Impostos (Provisão)"
          value={formatCurrency(financials.taxes)}
          icon={Landmark}
          description={
            <div className="flex flex-col gap-1">
              <span>{taxType === 'percentage' ? `Baseado em alíquota de ${taxRate}%` : `Valor fixo de ${formatCurrency(fixedTaxValue)}`}</span>
              <button 
                onClick={() => setShowDasSchedule(true)}
                className={cn(
                  "flex items-center gap-1 text-[10px] font-bold uppercase tracking-tight transition-colors w-fit",
                  isDasClose ? "text-rose-500 animate-pulse" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                )}
              >
                <Calendar className="w-3 h-3" />
                Venc. DAS: {new Date(nextDas.due).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          }
          className="border-l-4 border-l-red-500 dark:border-l-red-500"
        />

        {/* DAS Schedule Modal */}
        {showDasSchedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div 
              className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold text-zinc-900 dark:text-white">Calendário DAS 2026</h3>
                </div>
                <button 
                  onClick={() => setShowDasSchedule(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1"
                >
                  <Settings className="w-5 h-5 rotate-45" />
                </button>
              </div>
              <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                {isDasClose && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-start gap-3 mb-4">
                    <Bell className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-rose-700 dark:text-rose-400">Atenção ao Vencimento!</p>
                      <p className="text-xs text-rose-600 dark:text-rose-500">O DAS de {nextDas.month} vence em breve ({new Date(nextDas.due).toLocaleDateString('pt-BR')}).</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2">
                  <span>Período</span>
                  <span className="text-right">Vencimento</span>
                </div>
                <div className="space-y-1">
                  {DAS_SCHEDULE.map((item) => {
                    const isNext = item.due === nextDas.due;
                    const isPaid = paidDas.includes(item.due);
                    return (
                      <div 
                        key={item.due} 
                        className={cn(
                          "flex justify-between items-center p-3 rounded-xl border transition-all",
                          isPaid 
                            ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 opacity-75"
                            : isNext 
                              ? "bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20 ring-1 ring-rose-500/20" 
                              : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => togglePaid(item.due)}
                            className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center transition-all border",
                              isPaid 
                                ? "bg-emerald-500 border-emerald-500 text-white" 
                                : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-transparent hover:border-emerald-500"
                            )}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <div className="flex flex-col">
                            <span className={cn(
                              "text-sm font-semibold", 
                              isPaid ? "text-emerald-700 dark:text-emerald-400 line-through" : isNext ? "text-rose-700 dark:text-rose-400" : "text-zinc-700 dark:text-zinc-300"
                            )}>
                              {item.month}
                            </span>
                            <span className="text-[10px] text-zinc-400">Valor: {formatCurrency(item.amount)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "text-sm font-mono font-bold", 
                            isPaid 
                              ? "text-emerald-600/50 dark:text-emerald-400/50" 
                              : "text-rose-400 dark:text-rose-400/80"
                          )}>
                            {new Date(item.due).toLocaleDateString('pt-BR')}
                          </span>
                          {isNext && !isPaid && <span className="block text-[10px] font-bold text-rose-500 uppercase tracking-tighter">Próximo</span>}
                          {isPaid && <span className="block text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Pago</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800">
                <button 
                  onClick={() => setShowDasSchedule(false)}
                  className="w-full py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
        <MetricCard
          title="Lucro Bruto"
          value={formatCurrency(financials.net)}
          icon={PiggyBank}
          description="Faturamento - Taxas - Impostos"
          className="border-l-4 border-l-emerald-500 dark:border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10"
        />
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="font-semibold text-zinc-900 dark:text-white">Últimas Transações</h3>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">Mostrando as 10 mais recentes</span>
        </div>
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Origem</th>
                <th className="px-6 py-3 text-right">Valor</th>
                <th className="px-6 py-3 text-right">Taxa (Est.)</th>
                <th className="px-6 py-3 text-right">Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {transactions.slice(0, 10).map((txn) => {
                const fee = (txn.amount * 0.039) + 0.39;
                return (
                   <tr key={txn.id} className="bg-white dark:bg-zinc-900 border-b border-zinc-50 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-zinc-500 dark:text-zinc-400">{txn.id}</td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                      {new Date(txn.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1",
                        txn.type === 'upsell_vip' ? "bg-cyan-100 dark:bg-zinc-800 text-cyan-700 dark:text-zinc-300" : "bg-blue-100 dark:bg-zinc-800 text-blue-700 dark:text-white"
                      )}>
                        {txn.type === 'upsell_vip' ? 'VIP Upsell' : 'Assinatura'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                      {txn.affiliate_id ? (
                        <span className="capitalize px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 rounded text-xs font-medium text-zinc-600 dark:text-zinc-300">
                          {txn.affiliate_id.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-500 italic text-xs">Direto</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-zinc-900 dark:text-white">
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="px-6 py-4 text-right text-rose-600 dark:text-rose-400 text-xs">
                      -{formatCurrency(fee)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(txn.amount - fee)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {transactions.slice(0, 10).map((txn) => {
            const fee = (txn.amount * 0.039) + 0.39;
            return (
              <div key={txn.id} className="p-4 bg-white dark:bg-zinc-900">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-mono text-[10px] text-zinc-400 mb-1 uppercase tracking-tighter">{txn.id}</div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-white">
                      {new Date(txn.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight",
                    txn.type === 'upsell_vip' ? "bg-cyan-100 text-cyan-700 dark:bg-zinc-800 dark:text-cyan-400" : "bg-blue-100 text-blue-700 dark:bg-zinc-800 dark:text-blue-400"
                  )}>
                    {txn.type === 'upsell_vip' ? 'VIP Upsell' : 'Assinatura'}
                  </span>
                </div>
                
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Origem</span>
                    {txn.affiliate_id ? (
                      <span className="capitalize px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        {txn.affiliate_id.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-500 italic text-xs">Direto</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-zinc-900 dark:text-white">{formatCurrency(txn.amount)}</div>
                    <div className="text-[10px] text-rose-500">-{formatCurrency(fee)} taxa</div>
                    <div className="text-xs font-bold text-emerald-500 mt-1">{formatCurrency(txn.amount - fee)} líq.</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
