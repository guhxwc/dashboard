import { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, CreditCard, DollarSign, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabaseService } from '@/services/supabaseService';
import { Transaction, Customer } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';

export function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'succeeded' | 'pending' | 'failed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'subscription' | 'upsell_vip'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txData, customersData] = await Promise.all([
        supabaseService.getTransactions(),
        supabaseService.getCustomers()
      ]);
      
      // Sort transactions by date descending
      const sortedTx = txData.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setTransactions(sortedTx);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCustomerInfo = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer || { name: 'Usuário Desconhecido', email: 'N/A' };
  };

  const filteredTransactions = transactions.filter(tx => {
    const customer = getCustomerInfo(tx.customer_id);
    
    // Search filter
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchQuery.toLowerCase());
      
    // Status filter
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    
    // Type filter
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Aprovado</span>;
      case 'pending':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Pendente</span>;
      case 'failed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800">Recusado</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">{status}</span>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'subscription': return 'Assinatura';
      case 'upsell_vip': return 'Upsell VIP';
      default: return type;
    }
  };

  // Calculate metrics
  const totalVolume = filteredTransactions
    .filter(tx => tx.status === 'succeeded')
    .reduce((acc, tx) => acc + tx.amount, 0);
    
  const successRate = filteredTransactions.length > 0
    ? (filteredTransactions.filter(tx => tx.status === 'succeeded').length / filteredTransactions.length) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600 dark:text-white" />
            Transações
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Acompanhe todos os pagamentos em tempo real.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-zinc-800 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-white" />
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Volume Aprovado</p>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">{formatCurrency(totalVolume)}</h3>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Taxa de Aprovação</p>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">{successRate.toFixed(1)}%</h3>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Falhas / Recusados</p>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {filteredTransactions.filter(tx => tx.status === 'failed').length}
          </h3>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total de Transações</p>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">{filteredTransactions.length}</h3>
        </div>
      </div>

      {/* Filters and Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou ID da transação..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl whitespace-nowrap">
              <Filter className="w-4 h-4 text-zinc-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-sm font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os Status</option>
                <option value="succeeded">Aprovados</option>
                <option value="pending">Pendentes</option>
                <option value="failed">Recusados</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl whitespace-nowrap">
              <Filter className="w-4 h-4 text-zinc-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-transparent text-sm font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os Tipos</option>
                <option value="subscription">Assinatura</option>
                <option value="upsell_vip">Upsell VIP</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-medium border-b border-zinc-100 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4 text-right">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span>Carregando transações...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                    Nenhuma transação encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const customer = getCustomerInfo(tx.customer_id);
                  return (
                    <tr key={tx.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-medium text-xs">
                            {customer.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-zinc-900 dark:text-white">{customer.name}</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">{customer.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-zinc-900 dark:text-white">
                          {formatCurrency(tx.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {getStatusBadge(tx.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-zinc-600 dark:text-zinc-300">
                          {getTypeLabel(tx.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-zinc-600 dark:text-zinc-300">
                          {format(new Date(tx.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {format(new Date(tx.created_at), "HH:mm")}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded">
                          {tx.id.substring(0, 8)}...
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
