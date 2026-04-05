import { useEffect, useState, useMemo } from 'react';
import { mockService } from '@/services/mockData';
import { supabaseService, isDemoMode } from '@/services/supabaseService';
import { Customer, Affiliate, Transaction } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Search, Filter, UserCheck, UserX, Clock, Database, Download, X, Calendar, CreditCard, Activity, ShieldCheck, ShieldOff, ShieldAlert, MoreHorizontal, FlaskConical, Scale, Target, TrendingDown } from 'lucide-react';
import { subDays, isAfter } from 'date-fns';
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
  }, [searchQuery, statusFilter, dateFilter, planFilter, sourceFilter]);

  const filteredCustomers = customers.filter(c => {
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
                        ? `${(selectedCustomer.current_weight - selectedCustomer.initial_weight).toFixed(1)} kg` 
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
