import { useEffect, useState, useMemo } from 'react';
import { mockService } from '@/services/mockData';
import { supabaseService, isDemoMode } from '@/services/supabaseService';
import { Customer, Affiliate, Transaction } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Search, Filter, UserCheck, UserX, Clock, Database, Download, X, Calendar, CreditCard, Activity, ShieldCheck, ShieldOff, ShieldAlert, MoreHorizontal, FlaskConical, Scale, Target, TrendingDown } from 'lucide-react';
import { subDays, isAfter, differenceInDays } from 'date-fns';
import { Pagination } from '@/components/Pagination';
import { SkeletonCard } from '@/components/SkeletonCard';

export function UsersPage({ initialStatus = 'all', onTabChange }: { initialStatus?: string, onTabChange?: (tab: string) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [dateFilter, setDateFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  
  // Modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'all' | 'waitlist' | 'manual_pro'>('all');

  // Pro Management State
  const [proAction, setProAction] = useState<{ userId: string; action: 'grant' | 'revoke'; name: string; stripeId?: string } | null>(null);
  const [testerAction, setTesterAction] = useState<{ userId: string; isTester: boolean; name: string } | null>(null);
  const [proReason, setProReason] = useState('');
  const [proLoading, setProLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  const [usingRealData, setUsingRealData] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const getSubscriptionProgress = (customer: Customer) => {
    if (customer.status !== 'active' && customer.status !== 'tester') return null;

    const startDate = new Date(customer.trial_start_date || customer.created_at);
    const endDate = customer.subscription_end_date || customer.trial_ends_at 
      ? new Date(customer.subscription_end_date || customer.trial_ends_at!) 
      : null;

    let totalDays = 14; // Default trial
    if (customer.plan === 'monthly') totalDays = 30;
    if (customer.plan === 'annual') totalDays = 365;

    // If we have a real end date, use it to calculate total days
    if (endDate) {
      totalDays = Math.max(differenceInDays(endDate, startDate), 1);
    }

    const currentDay = Math.min(Math.max(differenceInDays(new Date(), startDate) + 1, 1), totalDays);

    return {
      current: currentDay,
      total: totalDays,
      percent: (currentDay / totalDays) * 100
    };
  };

  useEffect(() => {
    setStatusFilter(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setUsingRealData(!isDemoMode());
        const [customersData, affiliatesData, transactionsData] = await Promise.all([
          supabaseService.getCustomers(),
          supabaseService.getAffiliates(),
          supabaseService.getTransactions()
        ]);
        setCustomers(customersData);
        setAffiliates(affiliatesData);
        setTransactions(transactionsData);
      } catch (err) {
        console.error("Error fetching users:", err);
        setUsingRealData(false);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleManagePro = async () => {
    if (!proAction) return;
    
    setProLoading(true);
    try {
      const result = await supabaseService.manageUserPro(proAction.userId, proAction.action, proReason);
      
      if (result.success) {
        setToast({ message: result.message, type: 'success' });
        setProAction(null);
        setProReason('');
        
        // Reload data to reflect changes
        const [customersData, affiliatesData, transactionsData] = await Promise.all([
          supabaseService.getCustomers(),
          supabaseService.getAffiliates(),
          supabaseService.getTransactions()
        ]);
        setCustomers(customersData);
        setAffiliates(affiliatesData);
        setTransactions(transactionsData);
        
        // Update selected customer if modal is open
        if (selectedCustomer && selectedCustomer.id === proAction.userId) {
          const updated = customersData.find(c => c.id === proAction.userId);
          if (updated) setSelectedCustomer(updated);
        }
      } else {
        setToast({ message: result.message, type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Erro inesperado ao processar Pro', type: 'error' });
    } finally {
      setProLoading(false);
    }
  };

  const handleManageTester = async () => {
    if (!testerAction) return;
    
    setProLoading(true);
    try {
      const result = await supabaseService.manageUserTester(testerAction.userId, testerAction.isTester);
      
      if (result.success) {
        setToast({ message: result.message, type: 'success' });
        setTesterAction(null);
        
        // Reload data to reflect changes
        const [customersData, affiliatesData, transactionsData] = await Promise.all([
          supabaseService.getCustomers(),
          supabaseService.getAffiliates(),
          supabaseService.getTransactions()
        ]);
        setCustomers(customersData);
        setAffiliates(affiliatesData);
        setTransactions(transactionsData);
        
        // Update selected customer if modal is open
        if (selectedCustomer && selectedCustomer.id === testerAction.userId) {
          const updated = customersData.find(c => c.id === testerAction.userId);
          if (updated) setSelectedCustomer(updated);
        }
      } else {
        setToast({ message: result.message, type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Erro inesperado ao processar Tester', type: 'error' });
    } finally {
      setProLoading(false);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter, planFilter, sourceFilter, activeTab]);

  const filteredCustomers = customers.filter(c => {
    // Tab filter
    if (activeTab === 'waitlist') {
      return c.in_waitlist;
    }
    if (activeTab === 'manual_pro') {
      return c.is_manual_pro;
    }

    // Search filter
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !c.email.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Status filter
    if (statusFilter !== 'all' && c.status !== statusFilter) {
      return false;
    }
    
    // Plan filter
    if (planFilter !== 'all' && c.plan !== planFilter) {
      return false;
    }
    
    // Source filter
    if (sourceFilter !== 'all' && c.source !== sourceFilter) {
      return false;
    }
    
    // Date filter
    if (dateFilter !== 'all') {
      const date = new Date(c.created_at);
      if (dateFilter === '7days' && !isAfter(date, subDays(new Date(), 7))) return false;
      if (dateFilter === '30days' && !isAfter(date, subDays(new Date(), 30))) return false;
    }
    
    return true;
  });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  
  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredCustomers, currentPage]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} className="h-32" />
        ))}
      </div>
    );
  }

  const activeCount = customers.filter(c => c.status === 'active').length;
  const churnCount = customers.filter(c => c.status === 'canceled').length;
  const churnRate = customers.length > 0 ? (churnCount / customers.length) * 100 : 0;

  const handleExportCSV = () => {
    const headers = ['Nome', 'Email', 'Status', 'Plano', 'Origem', 'Data de Cadastro', 'LTV', 'Último Login'];
    const csvData = filteredCustomers.map(c => [
      c.name,
      c.email,
      c.status,
      c.plan || 'N/A',
      c.source,
      new Date(c.created_at).toLocaleDateString('pt-BR'),
      c.ltv.toString(),
      c.last_login ? new Date(c.last_login).toLocaleDateString('pt-BR') : 'N/A'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Base de Usuários</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-zinc-500 dark:text-zinc-400">Gerencie e analise seus clientes.</p>
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
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => onTabChange?.('app-usage')}
            className="flex-1 sm:flex-none px-4 py-2 rounded-lg border shadow-sm flex items-center justify-center gap-2 transition-all bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium dark:text-zinc-200">Uso do App</span>
          </button>
          <button 
            onClick={() => setStatusFilter('active')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg border shadow-sm flex items-center justify-center gap-2 transition-all ${statusFilter === 'active' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 ring-2 ring-emerald-500/20' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
          >
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium dark:text-zinc-200">{activeCount} Ativos</span>
          </button>
          <button 
            onClick={() => setStatusFilter('canceled')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg border shadow-sm flex items-center justify-center gap-2 transition-all ${statusFilter === 'canceled' ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 ring-2 ring-zinc-500/20' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
          >
            <UserX className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-medium dark:text-zinc-200">{churnRate.toFixed(1)}% Churn</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 sm:flex-none px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            }`}
          >
            Todos os Usuários
          </button>
          <button
            onClick={() => setActiveTab('waitlist')}
            className={`flex-1 sm:flex-none px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'waitlist'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            }`}
          >
            Lista de Espera (Pós-Teste)
          </button>
          <button
            onClick={() => setActiveTab('manual_pro')}
            className={`flex-1 sm:flex-none px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'manual_pro'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            }`}
          >
            Acessos Manuais (Pro)
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col gap-4 bg-zinc-50/50 dark:bg-zinc-800/50">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
            <div className="relative w-full lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar usuário..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <button
                onClick={handleExportCSV}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            </div>
          </div>
          
          {/* Advanced Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-hide">
            <div className="flex items-center gap-2 shrink-0">
              <Filter className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Filtros:</span>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-hide w-full">
              <select 
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 min-w-[140px] shrink-0"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Status: Todos</option>
                <option value="active">Status: Ativos</option>
                <option value="canceled">Status: Cancelados</option>
                <option value="past_due">Status: Atrasados (Past Due)</option>
                <option value="pending">Status: Pendentes</option>
                <option value="tester">Status: Testers</option>
              </select>

              <select 
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 min-w-[140px] shrink-0"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">Data: Todo o período</option>
                <option value="7days">Data: Últimos 7 dias</option>
                <option value="30days">Data: Últimos 30 dias</option>
              </select>

              <select 
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 min-w-[140px] shrink-0"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
              >
                <option value="all">Plano: Todos</option>
                <option value="monthly">Plano: Mensal</option>
                <option value="annual">Plano: Anual</option>
              </select>

              <select 
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 min-w-[140px] shrink-0"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                <option value="all">Origem: Todas</option>
                <option value="direct">Origem: Direto</option>
                {affiliates.map(aff => (
                  <option key={aff.id} value={aff.code.toLowerCase()}>Origem: {aff.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {activeTab === 'waitlist' ? (
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedCustomers.length === 0 ? (
              <div className="col-span-full p-8 text-center text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                Nenhum usuário na lista de espera encontrado.
              </div>
            ) : (
              paginatedCustomers.map((customer) => (
                <div 
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">{customer.name}</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">{customer.email}</p>
                      </div>
                    </div>
                    {customer.waitlist_date && (
                      <span className="text-[10px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                        {new Date(customer.waitlist_date).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="text-center">
                      <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Inicial</div>
                      <div className="font-bold text-zinc-900 dark:text-white">
                        {customer.initial_weight ? `${customer.initial_weight}kg` : '--'}
                      </div>
                    </div>
                    <div className="text-center border-l border-zinc-100 dark:border-zinc-800">
                      <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Atual</div>
                      <div className="font-bold text-blue-600 dark:text-blue-400">
                        {customer.current_weight ? `${customer.current_weight}kg` : '--'}
                      </div>
                    </div>
                    <div className="text-center border-l border-zinc-100 dark:border-zinc-800">
                      <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Perdido</div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                        {customer.initial_weight && customer.current_weight 
                          ? `${(customer.initial_weight - customer.current_weight).toFixed(1)}kg` 
                          : '--'}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'manual_pro' ? (
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedCustomers.length === 0 ? (
              <div className="col-span-full p-8 text-center text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                Nenhum usuário com acesso Pro manual encontrado.
              </div>
            ) : (
              paginatedCustomers.map((customer) => {
                const daysInApp = customer.pro_granted_at ? differenceInDays(new Date(), new Date(customer.pro_granted_at)) : 0;
                return (
                  <div 
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-5 hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full -z-10"></div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">{customer.name}</h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">{customer.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <div>
                        <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Data da Concessão
                        </div>
                        <div className="font-medium text-zinc-900 dark:text-white text-sm">
                          {customer.pro_granted_at ? new Date(customer.pro_granted_at).toLocaleDateString('pt-BR') : 'Desconhecida'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" /> Tempo de Uso
                        </div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {daysInApp} {daysInApp === 1 ? 'dia' : 'dias'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <>
            {/* Mobile View: Card List */}
            <div className="lg:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {paginatedCustomers.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              Nenhum usuário encontrado com os filtros atuais.
            </div>
          ) : (
            paginatedCustomers.map((customer) => (
              <div 
                key={customer.id} 
                onClick={() => setSelectedCustomer(customer)}
                className="p-4 space-y-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 font-bold text-sm">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-white">{customer.name}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{customer.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === customer.id ? null : customer.id);
                    }}
                    className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-start gap-1">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium inline-flex items-center gap-1
                      ${customer.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 
                        customer.status === 'canceled' ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400' : 
                        customer.status === 'past_due' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' :
                        customer.status === 'tester' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                        'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                      <span className="capitalize">{
                        customer.status === 'active' ? 'Ativo' :
                        customer.status === 'canceled' ? 'Cancelado' : 
                        customer.status === 'past_due' ? 'Atrasado' : 
                        customer.status === 'tester' ? 'Tester' : 'Pendente'
                      }</span>
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    {(() => {
                      const progress = getSubscriptionProgress(customer);
                      if (!progress) return null;
                      
                      return (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                            {progress.current.toString().padStart(2, '0')}/{progress.total.toString().padStart(2, '0')} dias
                          </div>
                          <div className="h-1 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                progress.percent > 90 ? 'bg-rose-500' : 
                                progress.percent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                  <div className="text-right">
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">LTV</div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-white">{formatCurrency(customer.ltv)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-6 py-3">Usuário</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Assinatura</th>
                <th className="px-6 py-3">Origem</th>
                <th className="px-6 py-3">Entrou em</th>
                <th className="px-6 py-3 text-right">LTV (Gasto Total)</th>
                <th className="px-6 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {paginatedCustomers.map((customer) => (
                <tr 
                  key={customer.id} 
                  onClick={() => setSelectedCustomer(customer)}
                  className="bg-white dark:bg-zinc-900 border-b border-zinc-50 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 dark:text-zinc-400 font-bold text-xs">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-white">{customer.name}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{customer.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1
                        ${customer.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 
                          customer.status === 'canceled' ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400' : 
                          customer.status === 'past_due' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' :
                          customer.status === 'tester' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                          'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                        {customer.status === 'active' && <UserCheck className="w-3 h-3" />}
                        {customer.status === 'canceled' && <UserX className="w-3 h-3" />}
                        {customer.status === 'past_due' && <Clock className="w-3 h-3" />}
                        {customer.status === 'pending' && <Clock className="w-3 h-3" />}
                        {customer.status === 'tester' && <FlaskConical className="w-3 h-3" />}
                        <span className="capitalize">{
                          customer.status === 'active' ? 'Ativo' :
                          customer.status === 'canceled' ? 'Cancelado' : 
                          customer.status === 'past_due' ? 'Atrasado' : 
                          customer.status === 'tester' ? 'Tester' : 'Pendente'
                        }</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const progress = getSubscriptionProgress(customer);
                      if (!progress) return <span className="text-zinc-400 text-xs">-</span>;
                      
                      return (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900 dark:text-white">
                              {progress.current.toString().padStart(2, '0')}/{progress.total.toString().padStart(2, '0')}
                            </span>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">dias pro</span>
                          </div>
                          <div className="h-1 w-24 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                progress.percent > 90 ? 'bg-rose-500' : 
                                progress.percent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                    {(() => {
                      if (!customer.source || customer.source === 'direct') {
                        return 'Tráfego Direto';
                      }
                      
                      const affiliate = affiliates.find(
                        a => a.code.toUpperCase() === customer.source?.toUpperCase() || 
                             a.id === customer.source ||
                             a.code.toUpperCase().replace(/\s+/g, '_') === customer.source?.toUpperCase()
                      );
                      
                      return affiliate ? affiliate.name : 'Tráfego Direto';
                    })()}
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                    {new Date(customer.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-zinc-900 dark:text-white">
                    {formatCurrency(customer.ltv)}
                  </td>
                  <td className="px-6 py-4 text-center relative">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === customer.id ? null : customer.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      
                      {activeMenuId === customer.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                            }}
                          />
                          <div className="absolute right-6 top-12 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-800 z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            {customer.status !== 'active' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProAction({ userId: customer.id, action: 'grant', name: customer.name, stripeId: customer.stripe_customer_id });
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 transition-colors"
                              >
                                <ShieldCheck className="w-4 h-4" />
                                Conceder Pro
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProAction({ userId: customer.id, action: 'revoke', name: customer.name, stripeId: customer.stripe_customer_id });
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 transition-colors"
                              >
                                <ShieldOff className="w-4 h-4" />
                                Revogar Pro
                              </button>
                            )}
                            {customer.status !== 'tester' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTesterAction({ userId: customer.id, isTester: true, name: customer.name });
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 transition-colors"
                              >
                                <FlaskConical className="w-4 h-4" />
                                Marcar como Tester
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTesterAction({ userId: customer.id, isTester: false, name: customer.name });
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/20 text-zinc-600 dark:text-zinc-400 transition-colors"
                              >
                                <X className="w-4 h-4" />
                                Remover de Tester
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomer(customer);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
                            >
                              <Search className="w-4 h-4" />
                              Ver Detalhes
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
        />
      </div>

      {/* User Profile Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 dark:text-zinc-400 font-bold text-lg">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{selectedCustomer.name}</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{selectedCustomer.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">Detalhes do Cliente</h3>
                  
                  <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2"><Calendar className="w-4 h-4" /> Cadastrado em</span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">{new Date(selectedCustomer.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2"><Activity className="w-4 h-4" /> Último Login</span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">
                      {selectedCustomer.last_login ? new Date(selectedCustomer.last_login).toLocaleDateString('pt-BR') : 'Desconhecido'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Plano</span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-white capitalize">
                      {selectedCustomer.plan === 'annual' ? 'Anual' : selectedCustomer.plan === 'monthly' ? 'Mensal' : 'Desconhecido'}
                    </span>
                  </div>

                  {(() => {
                    if (selectedCustomer.is_manual_pro && selectedCustomer.pro_granted_at) {
                      const daysInApp = differenceInDays(new Date(), new Date(selectedCustomer.pro_granted_at));
                      return (
                        <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                          <span className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Acesso Pro Manual</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-800/30">
                            {daysInApp} {daysInApp === 1 ? 'dia' : 'dias'} de uso
                          </span>
                        </div>
                      );
                    }

                    const progress = getSubscriptionProgress(selectedCustomer);
                    if (progress) {
                      return (
                        <div className="py-3 border-b border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2"><Clock className="w-4 h-4" /> Progresso da Assinatura</span>
                            <span className="text-sm font-bold text-zinc-900 dark:text-white">
                              Dia {progress.current} de {progress.total}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                progress.percent > 90 ? 'bg-rose-500' : 
                                progress.percent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">Métricas</h3>
                  
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">LTV (Gasto Total)</div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-white">{formatCurrency(selectedCustomer.ltv)}</div>
                  </div>
                  
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Status Atual</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        selectedCustomer.status === 'active' ? 'bg-emerald-500' : 
                        selectedCustomer.status === 'canceled' ? 'bg-zinc-400' : 
                        selectedCustomer.status === 'past_due' ? 'bg-rose-500' : 
                        selectedCustomer.status === 'tester' ? 'bg-purple-500' : 'bg-amber-500'
                      }`}></span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white capitalize">
                        {selectedCustomer.status === 'active' ? 'Ativo' : 
                         selectedCustomer.status === 'canceled' ? 'Cancelado' : 
                         selectedCustomer.status === 'past_due' ? 'Atrasado' : 
                         selectedCustomer.status === 'tester' ? 'Tester' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weight Evolution Section */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-wider mb-4">Evolução de Peso</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
                      <Scale className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Inicial</span>
                    </div>
                    <div className="text-lg font-bold text-zinc-900 dark:text-white">
                      {selectedCustomer.initial_weight ? `${selectedCustomer.initial_weight} kg` : '--'}
                    </div>
                    {selectedCustomer.start_weight_date && (
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                        {selectedCustomer.start_weight_date}
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center gap-2 text-blue-500 mb-1">
                      <Activity className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Atual</span>
                    </div>
                    <div className="text-lg font-bold text-zinc-900 dark:text-white">
                      {selectedCustomer.current_weight ? `${selectedCustomer.current_weight} kg` : '--'}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center gap-2 text-emerald-500 mb-1">
                      <Target className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Meta</span>
                    </div>
                    <div className="text-lg font-bold text-zinc-900 dark:text-white">
                      {selectedCustomer.goal_weight ? `${selectedCustomer.goal_weight} kg` : '--'}
                    </div>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Eliminado</span>
                    </div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedCustomer.initial_weight && selectedCustomer.current_weight 
                        ? `${(selectedCustomer.initial_weight - selectedCustomer.current_weight).toFixed(1)} kg` 
                        : '--'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-wider mb-4">Histórico de Pagamentos</h3>
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50">
                      <tr>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {transactions
                        .filter(t => t.customer_id === selectedCustomer.id)
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map(tx => (
                          <tr key={tx.id} className="bg-white dark:bg-zinc-900">
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                              {new Date(tx.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-4 py-3 text-zinc-900 dark:text-white">
                              {tx.type === 'subscription' ? 'Assinatura' : 'Upsell VIP'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                tx.status === 'succeeded' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 
                                tx.status === 'failed' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' : 
                                'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                              }`}>
                                {tx.status === 'succeeded' ? 'Pago' : tx.status === 'failed' ? 'Falhou' : 'Pendente'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-white">
                              {formatCurrency(tx.amount)}
                            </td>
                          </tr>
                        ))}
                      {transactions.filter(t => t.customer_id === selectedCustomer.id).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                            Nenhum pagamento encontrado para este usuário.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pro Management Actions in Profile */}
              <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-wider mb-4">Gerenciamento de Acesso</h3>
                <div className="flex flex-wrap gap-3">
                  {selectedCustomer.status !== 'active' ? (
                    <button
                      onClick={() => setProAction({ userId: selectedCustomer.id, action: 'grant', name: selectedCustomer.name, stripeId: selectedCustomer.stripe_customer_id })}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Conceder Acesso Pro
                    </button>
                  ) : (
                    <button
                      onClick={() => setProAction({ userId: selectedCustomer.id, action: 'revoke', name: selectedCustomer.name, stripeId: selectedCustomer.stripe_customer_id })}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      <ShieldOff className="w-4 h-4" />
                      Revogar Acesso Pro
                    </button>
                  )}
                  {selectedCustomer.status !== 'tester' ? (
                    <button
                      onClick={() => setTesterAction({ userId: selectedCustomer.id, isTester: true, name: selectedCustomer.name })}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      <FlaskConical className="w-4 h-4" />
                      Marcar como Tester
                    </button>
                  ) : (
                    <button
                      onClick={() => setTesterAction({ userId: selectedCustomer.id, isTester: false, name: selectedCustomer.name })}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      <X className="w-4 h-4" />
                      Remover de Tester
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pro Action Confirmation Modal */}
      {proAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${proAction.action === 'grant' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {proAction.action === 'grant' ? <ShieldCheck className="w-6 h-6" /> : <ShieldOff className="w-6 h-6" />}
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {proAction.action === 'grant' ? 'Conceder Acesso Pro' : 'Revogar Acesso Pro'}
                </h3>
              </div>
              
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                Você está prestes a {proAction.action === 'grant' ? 'conceder' : 'revogar'} o acesso Pro para <strong>{proAction.name}</strong>.
              </p>

              {proAction.stripeId && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>Atenção:</strong> Este usuário possui um ID do Stripe ({proAction.stripeId}). 
                    {proAction.action === 'revoke' 
                      ? ' A revogação cancelará a assinatura no Stripe imediatamente.' 
                      : ' O acesso será concedido manualmente, ignorando o fluxo normal do Stripe.'}
                  </p>
                </div>
              )}

              <div className="space-y-2 mb-6">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Motivo (Opcional)</label>
                <textarea
                  value={proReason}
                  onChange={(e) => setProReason(e.target.value)}
                  placeholder="Ex: Cortesia, Erro no sistema, Cancelamento manual..."
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setProAction(null);
                    setProReason('');
                  }}
                  disabled={proLoading}
                  className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleManagePro}
                  disabled={proLoading}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2 ${
                    proAction.action === 'grant' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  } disabled:opacity-50`}
                >
                  {proLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    proAction.action === 'grant' ? 'Confirmar Concessão' : 'Confirmar Revogação'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tester Action Confirmation Modal */}
      {testerAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${testerAction.isTester ? 'bg-purple-100 text-purple-600' : 'bg-zinc-100 text-zinc-600'}`}>
                  {testerAction.isTester ? <FlaskConical className="w-6 h-6" /> : <X className="w-6 h-6" />}
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {testerAction.isTester ? 'Marcar como Tester' : 'Remover de Tester'}
                </h3>
              </div>
              
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                Você está prestes a {testerAction.isTester ? 'marcar' : 'remover'} <strong>{testerAction.name}</strong> {testerAction.isTester ? 'como' : 'de'} tester.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setTesterAction(null)}
                  disabled={proLoading}
                  className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleManageTester}
                  disabled={proLoading}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2 ${
                    testerAction.isTester ? 'bg-purple-600 hover:bg-purple-700' : 'bg-zinc-600 hover:bg-zinc-700'
                  } disabled:opacity-50`}
                >
                  {proLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    testerAction.isTester ? 'Confirmar' : 'Remover'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[70] px-6 py-3 rounded-xl shadow-lg border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {toast.type === 'success' ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 p-1 hover:bg-black/5 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
