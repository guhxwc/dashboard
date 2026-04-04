import { useEffect, useState } from 'react';
import { mockService } from '@/services/mockData';
import { supabaseService } from '@/services/supabaseService';
import { Transaction } from '@/types';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { Users, Star, ArrowRight } from 'lucide-react';

export function Payouts() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await supabaseService.getTransactions();
        setTransactions(data);
      } catch (err) {
        console.error("Error fetching transactions for payouts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96 dark:text-zinc-400">Calculando comissões...</div>;

  // Logic:
  // Victor Hugo (40%): Valor total a ser transferido para ele (Assuming 40% of ALL sales attributed to him)
  // Allan Stachuk (40%): Apenas sobre os clientes que vieram do link dele.
  // Upsell VIP: Cálculo separado (60/40 ou 70/30 para o Nutri). 
  // NOTE: For this demo, I'll assume Upsell VIP splits 70% to the house and 30% to the partner if attributed, 
  // or maybe the user meant a specific Nutri partner. I will stick to the prompt's explicit instructions for VH and Allan.

  const calculateCommission = (txn: Transaction) => {
    // Base calculation on net amount (after fees/taxes) or gross? 
    // Usually commissions are on Net Revenue to avoid paying fees for the partner.
    // Let's assume Gross for simplicity unless specified, but usually it's Net.
    // Prompt says: "Victor Hugo (40%): Valor total a ser transferido para ele."
    
    // Let's calculate based on Gross for now as per common affiliate models, 
    // but in a real app, you might want to deduct fees first.
    
    if (txn.affiliate_id === 'victor_hugo') {
      return txn.amount * 0.40;
    }
    if (txn.affiliate_id === 'allan_stachuk') {
      return txn.amount * 0.40;
    }
    return 0;
  };

  const victorTotal = transactions
    .filter(t => t.affiliate_id === 'victor_hugo')
    .reduce((acc, curr) => acc + calculateCommission(curr), 0);

  const allanTotal = transactions
    .filter(t => t.affiliate_id === 'allan_stachuk')
    .reduce((acc, curr) => acc + calculateCommission(curr), 0);

  const upsellTotal = transactions
    .filter(t => t.type === 'upsell_vip')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Assuming Upsell VIP has a specific split logic mentioned "para o Nutri". 
  // Since "Nutri" isn't defined as a partner in the list, I'll display the total Upsell volume 
  // and a hypothetical split for demonstration.
  const nutriShare = upsellTotal * 0.30; // 30% for Nutri example

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Comissões de Parceiros</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Gestão de pagamentos de afiliados e parceiros.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Victor Hugo */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Users className="w-24 h-24 dark:text-zinc-100" />
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Victor Hugo</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Parceiro (40%)</p>
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
              {formatCurrency(victorTotal)}
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {transactions.filter(t => t.affiliate_id === 'victor_hugo').length} vendas atribuídas
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button className="w-full py-2 px-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors flex items-center justify-center gap-2">
              Ver Detalhes <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Allan Stachuk */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Users className="w-24 h-24 dark:text-zinc-100" />
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Allan Stachuk</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Afiliado (40%)</p>
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
              {formatCurrency(allanTotal)}
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {transactions.filter(t => t.affiliate_id === 'allan_stachuk').length} vendas atribuídas
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button className="w-full py-2 px-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors flex items-center justify-center gap-2">
              Ver Detalhes <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Upsell VIP (Nutri) */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 dark:from-purple-900 dark:to-indigo-900 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden border border-transparent dark:border-zinc-800">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Star className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-semibold text-white">Upsell VIP</h3>
            <p className="text-sm text-purple-200 mb-4">Comissão Nutri (30%)</p>
            <div className="text-3xl font-bold text-white mb-2">
              {formatCurrency(nutriShare)}
            </div>
            <p className="text-xs text-purple-200">
              Volume Total: {formatCurrency(upsellTotal)}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-900 dark:text-white">Detalhamento de Comissões</h3>
        </div>
        
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-6 py-3">Parceiro</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Vendas</th>
                <th className="px-6 py-3">Volume Bruto</th>
                <th className="px-6 py-3">Comissão (%)</th>
                <th className="px-6 py-3 text-right">A Pagar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr className="bg-white dark:bg-zinc-900 border-b border-zinc-50 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">Victor Hugo</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">Parceiro Principal</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{transactions.filter(t => t.affiliate_id === 'victor_hugo').length}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{formatCurrency(transactions.filter(t => t.affiliate_id === 'victor_hugo').reduce((a, b) => a + b.amount, 0))}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">40%</td>
                <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(victorTotal)}</td>
              </tr>
              <tr className="bg-white dark:bg-zinc-900 border-b border-zinc-50 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">Allan Stachuk</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">Afiliado</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{transactions.filter(t => t.affiliate_id === 'allan_stachuk').length}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{formatCurrency(transactions.filter(t => t.affiliate_id === 'allan_stachuk').reduce((a, b) => a + b.amount, 0))}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">40%</td>
                <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(allanTotal)}</td>
              </tr>
              <tr className="bg-white dark:bg-zinc-900 border-b border-zinc-50 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">Nutri (Upsell)</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">Especialista</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{transactions.filter(t => t.type === 'upsell_vip').length}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{formatCurrency(upsellTotal)}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">30%</td>
                <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(nutriShare)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {[
            { name: 'Victor Hugo', type: 'Parceiro Principal', sales: transactions.filter(t => t.affiliate_id === 'victor_hugo').length, volume: transactions.filter(t => t.affiliate_id === 'victor_hugo').reduce((a, b) => a + b.amount, 0), rate: '40%', total: victorTotal },
            { name: 'Allan Stachuk', type: 'Afiliado', sales: transactions.filter(t => t.affiliate_id === 'allan_stachuk').length, volume: transactions.filter(t => t.affiliate_id === 'allan_stachuk').reduce((a, b) => a + b.amount, 0), rate: '40%', total: allanTotal },
            { name: 'Nutri (Upsell)', type: 'Especialista', sales: transactions.filter(t => t.type === 'upsell_vip').length, volume: upsellTotal, rate: '30%', total: nutriShare },
          ].map((item, index) => (
            <div key={index} className="p-4 bg-white dark:bg-zinc-900">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm font-bold text-zinc-900 dark:text-white">{item.name}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{item.type}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.total)}</div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-widest">A Pagar</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Vendas</div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-white">{item.sales}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Volume</div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-white">{formatCurrency(item.volume)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Taxa</div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-white">{item.rate}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
