import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, RefreshCw, CreditCard, DollarSign, AlertCircle, CheckCircle2, Clock, Users, Activity, ArrowRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabaseService } from '@/services/supabaseService';
import { Transaction, Customer } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';

export function Transactions() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'subscriptions'>('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'succeeded' | 'pending' | 'failed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'subscription' | 'upsell_vip'>('all');
  const [subStatusFilter, setSubStatusFilter] = useState<'all' | 'active' | 'canceled' | 'past_due'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

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

      // Extract subscriptions from customers
      const subs = customersData
        .filter(c => c.subscription)
        .map(c => ({
          ...c.subscription,
          customer_name: c.name,
          customer_email: c.email,
          customer_id: c.id,
          is_tester: c.status === 'tester'
        }))
        .filter(s => !s.is_tester);
      
      setSubscriptions(subs);
    } catch (error) {
      console.error('Error fetching data:', error);
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
    
    // Exclude testers
    if (customer && (customer as any).status === 'tester') return false;
    
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

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = 
      sub.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.stripe_subscription_id || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = subStatusFilter === 'all' || sub.status === subStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil((activeTab === 'transactions' ? filteredTransactions.length : filteredSubscriptions.length) / itemsPerPage);
  
  const paginatedData = useMemo(() => {
    const data = activeTab === 'transactions' ? filteredTransactions : filteredSubscriptions;
    return data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredTransactions, filteredSubscriptions, activeTab, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, subStatusFilter, activeTab]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
      case 'active':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Aprovado</span>;
      case 'pending':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Pendente</span>;
      case 'failed':
      case 'canceled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800">Recusado</span>;
      case 'past_due':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800">Atrasado</span>;
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
  const totalVolume = transactions
    .filter(tx => tx.status === 'succeeded')
    .reduce((acc, tx) => acc + tx.amount, 0);
    
  const activeSubsCount = subscriptions.filter(s => s.status === 'active').length;
  const mrr = subscriptions
    .filter(s => s.status === 'active')
    .reduce((acc, s) => acc + (Number(s.plan_amount) || 49.90), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600 dark:text-white" />
            Cobranças & Transações
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Acompanhe pagamentos e assinaturas em tempo real.
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
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Assinaturas Ativas</p>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">{activeSubsCount}</h3>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">MRR Atual</p>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">{formatCurrency(mrr)}</h3>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total de Transações</p>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">{transactions.length}</h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('transactions')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === 'transactions' 
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" 
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          )}
        >
          Transações
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === 'subscriptions' 
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" 
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          )}
        >
          Assinaturas
        </button>
      </div>

      {/* Filters and Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder={activeTab === 'transactions' ? "Buscar por nome, email ou ID..." : "Buscar assinante ou Stripe ID..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {activeTab === 'transactions' ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl whitespace-nowrap">
                  <Filter className="w-4 h-4 text-zinc-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-transparent text-sm font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todos Status</option>
                    <option value="succeeded">Aprovado</option>
                    <option value="pending">Pendente</option>
                    <option value="failed">Recusado</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl whitespace-nowrap">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="bg-transparent text-sm font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todos Tipos</option>
                    <option value="subscription">Assinatura</option>
                    <option value="upsell_vip">Upsell VIP</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl whitespace-nowrap">
                <Filter className="w-4 h-4 text-zinc-400" />
                <select
                  value={subStatusFilter}
                  onChange={(e) => setSubStatusFilter(e.target.value as any)}
                  className="bg-transparent text-sm font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">Todos Status</option>
                  <option value="active">Ativa</option>
                  <option value="canceled">Cancelada</option>
                  <option value="past_due">Atrasada</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-800/30">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Cliente</th>
                {activeTab === 'transactions' ? (
                  <>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Valor</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Plano</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Início</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Stripe ID</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span>Carregando dados...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                    Nenhum registro encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => {
                  const isTx = activeTab === 'transactions';
                  const customer = isTx ? getCustomerInfo(item.customer_id) : { name: item.customer_name, email: item.customer_email };
                  
                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">{customer.name}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{customer.email}</p>
                          </div>
                        </div>
                      </td>
                      
                      {isTx ? (
                        <>
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{formatCurrency(item.amount)}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">{getTypeLabel(item.type)}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {format(new Date(item.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(item.status)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{formatCurrency(Number(item.plan_amount) || 49.90)}</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Mensal</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {format(new Date(item.created_at), "dd/MM/yyyy")}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(item.status)}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[10px] font-mono text-zinc-400 truncate max-w-[120px]">
                              {item.stripe_subscription_id || 'N/A'}
                            </p>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
