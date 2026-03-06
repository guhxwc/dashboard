import { useEffect, useState, useMemo } from 'react';
import { mockService } from '@/services/mockData';
import { supabaseService, isDemoMode } from '@/services/supabaseService';
import { Transaction } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Wallet, CreditCard, Landmark, PiggyBank, Settings, AlertCircle, Database } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { cn } from '@/lib/utils';

export function Financials() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState(6.0); // Default 6% for Simples Nacional
  const [showSettings, setShowSettings] = useState(false);
  const [usingRealData, setUsingRealData] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setUsingRealData(!isDemoMode());
        const data = await supabaseService.getTransactions();
        setTransactions(data);
      } catch (err) {
        console.error("Erro ao carregar financeiro:", err);
        // Fallback to mock on error
        const mockData = await mockService.getTransactions();
        setTransactions(mockData);
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
    const taxes = gross * (taxRate / 100);

    const net = gross - fees - taxes;

    return { gross, fees, taxes, net };
  }, [transactions, taxRate]);

  if (loading) return (
    <div className="flex items-center justify-center h-96 text-slate-500 dark:text-slate-400 animate-pulse">
      Calculando finanças...
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-96 text-rose-500 gap-2">
      <AlertCircle className="w-8 h-8" />
      <p>{error}</p>
      <button 
        onClick={() => window.location.reload()} 
        className="text-sm text-slate-500 dark:text-slate-400 underline hover:text-slate-700 dark:hover:text-slate-200"
      >
        Tentar novamente
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Financeiro "O Cofre"</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500 dark:text-slate-400">Controle rigoroso de entradas, taxas e impostos.</p>
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
          className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
          title="Configurar Impostos"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {showSettings && (
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Configurações de Impostos</h3>
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Alíquota Simples/MEI (%)</label>
              <div className="relative">
                <input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-24 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  step="0.1"
                  min="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xs">%</span>
              </div>
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 max-w-xs pt-4">
              Ajuste a porcentagem para calcular a provisão mensal do DAS corretamente.
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
          className="border-l-4 border-l-blue-500 dark:border-l-blue-500"
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
          description={`Baseado em alíquota de ${taxRate}%`}
          className="border-l-4 border-l-red-500 dark:border-l-red-500"
        />
        <MetricCard
          title="Lucro Bruto"
          value={formatCurrency(financials.net)}
          icon={PiggyBank}
          description="Faturamento - Taxas - Impostos"
          className="border-l-4 border-l-emerald-500 dark:border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-semibold text-slate-900 dark:text-white">Últimas Transações</h3>
          <span className="text-xs text-slate-400 dark:text-slate-500">Mostrando as 10 mais recentes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.slice(0, 10).map((txn) => {
                const fee = (txn.amount * 0.039) + 0.39;
                return (
                  <tr key={txn.id} className="bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">{txn.id}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {new Date(txn.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1",
                        txn.type === 'upsell_vip' ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      )}>
                        {txn.type === 'upsell_vip' ? 'VIP Upsell' : 'Assinatura'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {txn.affiliate_id ? (
                        <span className="capitalize px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-medium text-slate-600 dark:text-slate-300">
                          {txn.affiliate_id.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic text-xs">Direto</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">
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
      </div>
    </div>
  );
}
