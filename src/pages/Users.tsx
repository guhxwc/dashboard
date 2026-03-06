import { useEffect, useState } from 'react';
import { mockService } from '@/services/mockData';
import { supabaseService, isDemoMode } from '@/services/supabaseService';
import { Customer } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Search, Filter, UserCheck, UserX, Clock, Database } from 'lucide-react';

export function UsersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [usingRealData, setUsingRealData] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setUsingRealData(!isDemoMode());
        const data = await supabaseService.getCustomers();
        setCustomers(data);
      } catch (err) {
        console.error("Error fetching users:", err);
        const mockData = await mockService.getCustomers();
        setCustomers(mockData);
        setUsingRealData(false);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96 dark:text-slate-400">Carregando base de usuários...</div>;

  const filteredCustomers = customers.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const activeCount = customers.filter(c => c.status === 'active').length;
  const churnCount = customers.filter(c => c.status === 'canceled').length;
  const churnRate = customers.length > 0 ? (churnCount / customers.length) * 100 : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Base de Usuários</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500 dark:text-slate-400">Gerencie e analise seus clientes.</p>
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
        <div className="flex gap-2">
          <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium dark:text-slate-200">{activeCount} Ativos</span>
          </div>
          <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
            <UserX className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-medium dark:text-slate-200">{churnRate.toFixed(1)}% Churn</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar usuário..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="canceled">Cancelados</option>
              <option value="past_due">Pagamento Pendente</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3">Usuário</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Origem</th>
                <th className="px-6 py-3">Entrou em</th>
                <th className="px-6 py-3 text-right">LTV (Gasto Total)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-xs">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">{customer.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{customer.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1
                      ${customer.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 
                        customer.status === 'canceled' ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' : 
                        'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                      {customer.status === 'active' && <UserCheck className="w-3 h-3" />}
                      {customer.status === 'canceled' && <UserX className="w-3 h-3" />}
                      {customer.status === 'past_due' && <Clock className="w-3 h-3" />}
                      <span className="capitalize">{
                        customer.status === 'active' ? 'Ativo' :
                        customer.status === 'canceled' ? 'Cancelado' : 'Pendente'
                      }</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                    {customer.source === 'direct' ? 'Tráfego Direto' : 
                     customer.source === 'victor_hugo' ? 'Victor Hugo' : 'Allan Stachuk'}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                    {new Date(customer.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">
                    {formatCurrency(customer.ltv)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
