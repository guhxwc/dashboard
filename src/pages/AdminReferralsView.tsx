import React, { useEffect, useState, useMemo } from 'react';
import { supabaseService, isDemoMode } from '@/services/supabaseService';
import { Users, Search, ArrowUpDown, Calendar, Link as LinkIcon, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Referral {
  id: string;
  user_id: string;
  affiliate_ref: string;
  status: string;
  created_at: string;
  affiliate_name?: string | null;
  user: {
    name: string;
    email: string;
  } | null;
}

interface GroupedReferral {
  affiliate_ref: string;
  affiliate_name?: string | null;
  total: number;
  active: number;
  pending: number;
  referrals: Referral[];
}

export function AdminReferralsView() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedRef, setExpandedRef] = useState<string | null>(null);

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        setLoading(true);
        const [data, affiliatesData] = await Promise.all([
          supabaseService.getAdminReferrals(),
          supabaseService.getAffiliates()
        ]);
        
        // Map affiliate codes to names
        const affiliateMap = new Map<string, string>();
        affiliatesData.forEach(aff => {
          if (aff.code) {
            affiliateMap.set(aff.code.toUpperCase(), aff.name);
          }
        });

        // Attach affiliate name to referrals
        const enrichedData = data.map(ref => ({
          ...ref,
          affiliate_name: affiliateMap.get(ref.affiliate_ref?.toUpperCase() || '') || null
        }));

        setReferrals(enrichedData);
      } catch (error) {
        console.error("Error fetching referrals:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReferrals();
  }, []);

  const groupedReferrals = useMemo(() => {
    const groups = new Map<string, GroupedReferral>();

    referrals.forEach(ref => {
      const code = ref.affiliate_ref?.toUpperCase() || 'DESCONHECIDO';
      if (!groups.has(code)) {
        groups.set(code, {
          affiliate_ref: code,
          affiliate_name: ref.affiliate_name,
          total: 0,
          active: 0,
          pending: 0,
          referrals: []
        });
      }
      
      const group = groups.get(code)!;
      group.total += 1;
      if (ref.status === 'active') group.active += 1;
      else group.pending += 1;
      group.referrals.push(ref);
    });

    let result = Array.from(groups.values());

    // Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(g => 
        g.affiliate_ref.toLowerCase().includes(query) ||
        g.referrals.some(r => r.user?.name?.toLowerCase().includes(query) || r.user?.email?.toLowerCase().includes(query))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortOrder === 'desc') return b.total - a.total;
      return a.total - b.total;
    });

    return result;
  }, [referrals, searchQuery, sortOrder]);

  const toggleSort = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-amber-500" />;
      default: return <XCircle className="w-4 h-4 text-rose-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'pending': return 'Pendente';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Indicações (Referrals)</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Acompanhe quem está indicando novos usuários.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Buscar código ou usuário..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-64 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
            />
          </div>
          <button 
            onClick={toggleSort}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            title="Ordenar por quantidade"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-medium">Código de Indicação</th>
                <th className="px-6 py-4 font-medium text-center">Total de Indicações</th>
                <th className="px-6 py-4 font-medium text-center">Ativos</th>
                <th className="px-6 py-4 font-medium text-center">Pendentes</th>
                <th className="px-6 py-4 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {groupedReferrals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    Nenhuma indicação encontrada.
                  </td>
                </tr>
              ) : (
                groupedReferrals.map((group) => (
                  <React.Fragment key={group.affiliate_ref}>
                    <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                            <LinkIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-900 dark:text-white block">{group.affiliate_ref}</span>
                            {group.affiliate_name && (
                              <span className="text-xs text-zinc-500 dark:text-zinc-400">{group.affiliate_name}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                          {group.total}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium">
                          {group.active}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium">
                          {group.pending}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setExpandedRef(expandedRef === group.affiliate_ref ? null : group.affiliate_ref)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm transition-colors"
                        >
                          {expandedRef === group.affiliate_ref ? 'Ocultar Detalhes' : 'Ver Detalhes'}
                        </button>
                      </td>
                    </tr>
                    {expandedRef === group.affiliate_ref && (
                      <tr>
                        <td colSpan={5} className="px-0 py-0 bg-zinc-50/30 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800">
                          <div className="px-6 py-4">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Usuários Indicados</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {group.referrals.map(ref => (
                                <div key={ref.id} className="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                                    <Users className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                      {ref.user?.name || 'Usuário Desconhecido'}
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                      {ref.user?.email || 'Sem email'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(ref.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                                      </div>
                                      <div className="flex items-center gap-1 text-[10px] font-medium">
                                        {getStatusIcon(ref.status)}
                                        <span className={ref.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                                          {getStatusText(ref.status)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
