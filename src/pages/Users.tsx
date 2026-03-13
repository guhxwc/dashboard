import { useEffect, useState } from 'react';
import { mockService } from '@/services/mockData';
import { supabaseService, isDemoMode } from '@/services/supabaseService';
import { Customer, Affiliate, Transaction } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Search, Filter, UserCheck, UserX, Clock, Database, Download, X, Calendar, CreditCard, Activity } from 'lucide-react';
import { subDays, isAfter } from 'date-fns';

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
  
  const [usingRealData, setUsingRealData] = useState(false);

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

  if (loading) return <div className="flex items-center justify-center h-96 dark:text-zinc-400">Carregando base de usuários...</div>;

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
          <div className="flex items-center gap-2 mt-1">
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
        <div className="flex gap-2">
          <button 
            onClick={() => onTabChange?.('app-usage')}
            className="px-4 py-2 rounded-lg border shadow-sm flex items-center gap-2 transition-all bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium dark:text-zinc-200">Uso do App</span>
          </button>
          <button 
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-2 rounded-lg border shadow-sm flex items-center gap-2 transition-all ${statusFilter === 'active' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 ring-2 ring-emerald-500/20' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
          >
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium dark:text-zinc-200">{activeCount} Ativos</span>
          </button>
          <button 
            onClick={() => setStatusFilter('canceled')}
            className={`px-4 py-2 rounded-lg border shadow-sm flex items-center gap-2 transition-all ${statusFilter === 'canceled' ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 ring-2 ring-zinc-500/20' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
          >
            <UserX className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-medium dark:text-zinc-200">{churnRate.toFixed(1)}% Churn</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col gap-4 bg-zinc-50/50 dark:bg-zinc-800/50">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar usuário..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            </div>
          </div>
          
          {/* Advanced Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Filtros:</span>
            </div>
            
            <select 
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 min-w-[140px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Status: Todos</option>
              <option value="active">Status: Ativos</option>
              <option value="canceled">Status: Cancelados</option>
              <option value="past_due">Status: Pendentes</option>
            </select>

            <select 
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 min-w-[140px]"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">Data: Todo o período</option>
              <option value="7days">Data: Últimos 7 dias</option>
              <option value="30days">Data: Últimos 30 dias</option>
            </select>

            <select 
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 min-w-[140px]"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
            >
              <option value="all">Plano: Todos</option>
              <option value="monthly">Plano: Mensal</option>
              <option value="annual">Plano: Anual</option>
            </select>

            <select 
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 min-w-[140px]"
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-6 py-3">Usuário</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Origem</th>
                <th className="px-6 py-3">Entrou em</th>
                <th className="px-6 py-3 text-right">LTV (Gasto Total)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredCustomers.map((customer) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                        selectedCustomer.status === 'canceled' ? 'bg-zinc-400' : 'bg-amber-500'
                      }`}></span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white capitalize">
                        {selectedCustomer.status === 'active' ? 'Ativo' : selectedCustomer.status === 'canceled' ? 'Cancelado' : 'Pendente'}
                      </span>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
