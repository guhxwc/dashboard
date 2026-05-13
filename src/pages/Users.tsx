import { useEffect, useState, useMemo } from 'react';
import { supabaseService, isDemoMode } from '@/services/supabaseService';
import { Customer, Affiliate } from '@/types';
import { 
  Users as UsersIcon, Search, Filter, Mail, Calendar, 
  ChevronRight, User as UserIcon,
  CheckCircle2, XCircle, AlertCircle, RefreshCw,
  Award, Zap, Weight, Target, Clock, Star, Download, Database, Shield, Trash2
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import { motion, AnimatePresence } from 'motion/react';

export function UsersPage({ initialStatus = 'all', onTabChange }: { initialStatus?: string; onTabChange?: (tab: string, filter?: string) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Customer['status'] | 'all'>(initialStatus as any);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [usingRealData, setUsingRealData] = useState(false);

  const { theme } = useTheme();
  const itemsPerPage = 20;

  useEffect(() => {
    if (initialStatus) {
      setStatusFilter(initialStatus as any);
    }
  }, [initialStatus]);

  // Modals state
  const [proModal, setProModal] = useState<{ open: boolean; customer: Customer | null; action: 'grant' | 'revoke' }>({ open: false, customer: null, action: 'grant' });
  const [testerModal, setTesterModal] = useState<{ open: boolean; customer: Customer | null; isTester: boolean }>({ open: false, customer: null, isTester: false });
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      setUsingRealData(!isDemoMode());
      const data = await supabaseService.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleManagePro = async () => {
    if (!proModal.customer) return;
    setSubmitting(true);
    try {
      const res = await supabaseService.manageUserPro(proModal.customer.id, proModal.action, reason);
      if (res.success) {
        setProModal({ open: false, customer: null, action: 'grant' });
        setReason('');
        fetchData();
      } else {
        alert('Erro: ' + res.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManageTester = async () => {
    if (!testerModal.customer) return;
    setSubmitting(true);
    try {
      const res = await supabaseService.manageUserTester(testerModal.customer.id, testerModal.isTester);
      if (res.success) {
        setTesterModal({ open: false, customer: null, isTester: false });
        fetchData();
      } else {
        alert('Erro: ' + res.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.id.includes(search);
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  const stats = useMemo(() => {
    const active = customers.filter(c => c.status === 'active').length;
    const testers = customers.filter(c => c.status === 'tester').length;
    return { active, testers, total: customers.length };
  }, [customers]);

  const currentItems = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: Customer['status']) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-bold">Ativo</span>;
      case 'tester':
        return <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs font-bold">Tester</span>;
      case 'canceled':
        return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-xs font-bold">Cancelado</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 text-xs font-bold">Lead</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Gerenciamento de Usuários</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Visualize e controle o acesso de todos os seus usuários.</p>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={fetchData} className="p-2.5 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800">
             <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
           </button>
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
             <input 
               type="text" 
               placeholder="Buscar usuário..."
               className="pl-9 pr-4 py-2 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-800 dark:border-zinc-700 text-sm outline-none"
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { label: 'Total', value: stats.total, icon: UsersIcon, color: 'blue' },
           { label: 'Ativos', value: stats.active, icon: CheckCircle2, color: 'emerald' },
           { label: 'Testers', value: stats.testers, icon: Award, color: 'purple' }
         ].map((s, i) => (
           <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-${s.color}-50 dark:bg-${s.color}-900/10 text-${s.color}-600 dark:text-${s.color}-400`}>
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{s.label}</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{s.value}</p>
              </div>
           </div>
         ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Usuário</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
            {currentItems.map(c => (
              <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer" onClick={() => setSelectedCustomer(c)}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold">{c.name.charAt(0)}</div>
                    <div className="flex flex-col">
                      <span className="font-bold text-zinc-900 dark:text-white">{c.name}</span>
                      <span className="text-xs text-zinc-500">{c.email}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">{getStatusBadge(c.status)}</td>
                <td className="px-6 py-4 text-right"><ChevronRight className="inline-block w-4 h-4 text-zinc-300" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredCustomers.length / itemsPerPage)}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedCustomer(null)} className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-start justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold">{selectedCustomer.name.charAt(0)}</div>
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{selectedCustomer.name}</h2>
                      <p className="text-sm text-zinc-500">{selectedCustomer.email}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><XCircle className="w-5 h-5 text-zinc-400" /></button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Status de Acesso</p>
                    {getStatusBadge(selectedCustomer.status)}
                 </div>
                 <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Assinatura</p>
                    <p className="font-bold text-zinc-900 dark:text-white capitalize">{selectedCustomer.plan || 'Nenhum'}</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 pt-4"><Shield className="w-4 h-4" /> Controles de Admin</h3>
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setProModal({ open: true, customer: selectedCustomer, action: selectedCustomer.status === 'active' ? 'revoke' : 'grant' }); }}
                      className="flex items-center gap-2 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                      <span className="text-xs font-bold">{selectedCustomer.status === 'active' ? 'Revogar Pro' : 'Conceder Pro'}</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setTesterModal({ open: true, customer: selectedCustomer, isTester: selectedCustomer.status !== 'tester' }); }}
                      className="flex items-center gap-2 p-3 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      <Award className="w-4 h-4" />
                      <span className="text-xs font-bold">{selectedCustomer.status === 'tester' ? 'Remover Tester' : 'Marcar Tester'}</span>
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {proModal.open && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setProModal({ ...proModal, open: false })} className="absolute inset-0 bg-black/80" />
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl p-6">
               <h3 className="text-lg font-bold mb-4">{proModal.action === 'grant' ? 'Conceder' : 'Revogar'} Acesso Pro</h3>
               <p className="text-sm text-zinc-500 mb-6">Confirma esta ação para {proModal.customer?.name}?</p>
               <input 
                 className="w-full mb-6 p-3 rounded-lg border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-indigo-500" 
                 placeholder="Motivo (opcional)" 
                 value={reason} 
                 onChange={e => setReason(e.target.value)} 
               />
               <div className="flex gap-2">
                 <button onClick={() => setProModal({ ...proModal, open: false })} className="flex-1 py-2 rounded-lg font-bold text-zinc-500">Voltar</button>
                 <button onClick={handleManagePro} disabled={submitting} className="flex-1 py-2 rounded-lg font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">{submitting ? '...' : 'Confirmar'}</button>
               </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {testerModal.open && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setTesterModal({ ...testerModal, open: false })} className="absolute inset-0 bg-black/80" />
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl p-6">
               <h3 className="text-lg font-bold mb-4">Gerenciar Tester</h3>
               <p className="text-sm text-zinc-500 mb-6">Deseja {testerModal.isTester ? 'marcar' : 'remover'} {testerModal.customer?.name} como tester?</p>
               <div className="flex gap-2">
                 <button onClick={() => setTesterModal({ ...testerModal, open: false })} className="flex-1 py-2 rounded-lg font-bold text-zinc-500">Voltar</button>
                 <button onClick={handleManageTester} disabled={submitting} className="flex-1 py-2 rounded-lg font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">{submitting ? '...' : 'Confirmar'}</button>
               </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}
