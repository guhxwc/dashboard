import { useEffect, useState, FormEvent } from 'react';
import { mockService } from '@/services/mockData';
import { supabaseService, isDemoMode } from '@/services/supabaseService';
import { Customer, Affiliate } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  Users, ArrowUpRight, Link as LinkIcon, Database, Plus, X, Copy, Check,
  AlertCircle, ExternalLink, TrendingUp, ShoppingCart, Trash2
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';

// URL base do app Fitmind — lida da env ou usa o padrão
const FITMIND_URL =
  (import.meta as any).env?.VITE_FITMIND_URL?.replace(/\/$/, '') ||
  'https://fitmindhealth.com.br';

export function AffiliatesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  // BUG FIX: era 'string | null', agora é sempre 'string | "all"'
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | 'all'>('all');
  const [usingRealData, setUsingRealData] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showIntegration, setShowIntegration] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [newAffiliate, setNewAffiliate] = useState<Partial<Affiliate>>({
    name: '',
    email: '',
    code: '',
    discount_rate: 0.10,
    commission_rate: 0.40,
    status: 'active',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setUsingRealData(!isDemoMode());
      const [customersData, affiliatesData] = await Promise.all([
        supabaseService.getCustomers(),
        supabaseService.getAffiliates(),
      ]);
      setCustomers(customersData);
      setAffiliates(affiliatesData);
    } catch (err) {
      console.error('Error fetching affiliates data:', err);
      setUsingRealData(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAffiliate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!newAffiliate.name || !newAffiliate.code || !newAffiliate.email) return;

    // Verifica se código já existe
    const duplicate = affiliates.find(
      (a) => a.code.toUpperCase() === (newAffiliate.code || '').toUpperCase()
    );
    if (duplicate) {
      setFormError(`Código "${newAffiliate.code}" já está em uso por ${duplicate.name}.`);
      return;
    }

    try {
      const created = await supabaseService.createAffiliate({
        ...(newAffiliate as Omit<Affiliate, 'id' | 'created_at'>),
        code: newAffiliate.code!.toUpperCase(),
      });
      setIsModalOpen(false);
      setNewAffiliate({
        name: '',
        email: '',
        code: '',
        discount_rate: 0.10,
        commission_rate: 0.40,
        status: 'active',
      });
      await fetchData();
      // Seleciona o afiliado recém criado automaticamente
      setSelectedAffiliateId(created.id);
    } catch (error: any) {
      console.error('Error creating affiliate:', error);
      setFormError(error.message || 'Erro ao criar afiliado. Verifique o console.');
    }
  };

  const handleDeleteAffiliate = async (id: string) => {
    try {
      await supabaseService.deleteAffiliate(id);
      // BUG FIX: era setSelectedAffiliateId(null) que quebrava o tipo
      setSelectedAffiliateId('all');
      await fetchData();
    } catch (error) {
      console.error('Error deleting affiliate:', error);
      alert('Erro ao excluir afiliado. Verifique o console.');
    }
  };

  const handleMarkAsPaid = async (id: string, amount: number) => {
    try {
      // In a real app, this would call an API to record the payout transaction
      // and update the affiliate's total_paid balance.
      // For now, we'll just update the local state to simulate it.
      
      setAffiliates(prev => prev.map(aff => {
        if (aff.id === id) {
          return {
            ...aff,
            total_paid: (aff.total_paid || 0) + amount
          };
        }
        return aff;
      }));
      
      alert(`Pagamento de ${formatCurrency(amount)} registrado com sucesso!`);
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Erro ao registrar pagamento. Verifique o console.');
    }
  };

  const copyToClipboard = (text: string, key?: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key || text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  /**
   * BUG FIX PRINCIPAL:
   * Antes cruzava customer.source com affiliate.id (UUID) — nunca dava match.
   * Agora cruza customer.source com affiliate.code (ex: "JOAO10"),
   * que é exatamente o que é salvo em referrals.affiliate_ref no Fitmind.
   */
  const getAffiliateData = (affiliate: Affiliate) => {
    const affiliateCode = affiliate.code.toUpperCase();

    const affiliateCustomers = customers.filter((c) => {
      const src = (c.source || '').toUpperCase();
      return (
        src === affiliateCode ||
        // Suporte a legados com underscore (ex: 'victor_hugo')
        src === affiliateCode.replace(/\s+/g, '_') ||
        src === affiliate.id
      );
    });

    const totalSales = affiliateCustomers.reduce((acc, c) => acc + (c.ltv || 0), 0);
    const commission = totalSales * affiliate.commission_rate;
    const totalReferrals = affiliateCustomers.length;
    const proSubscribers = affiliateCustomers.filter(
      (c) => c.status === 'active' && (c.ltv || 0) > 0
    ).length;
    const freeLeads = totalReferrals - proSubscribers;
    const conversionRate =
      totalReferrals > 0 ? (proSubscribers / totalReferrals) * 100 : 0;

    return {
      count: totalReferrals,
      proCount: proSubscribers,
      freeCount: freeLeads,
      conversionRate,
      totalSales,
      commission,
      customers: affiliateCustomers,
    };
  };

  const affiliateLink = (code: string) =>
    `${FITMIND_URL}/?ref=${encodeURIComponent(code)}`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-zinc-500 dark:text-zinc-400 text-sm">Carregando afiliados...</span>
      </div>
    );
  }

  const selectedAffiliate = affiliates.find((a) => a.id === selectedAffiliateId);
  const selectedAffiliateData = selectedAffiliate
    ? getAffiliateData(selectedAffiliate)
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Área de Afiliados</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-zinc-500 dark:text-zinc-400">Gestão de parceiros e links de referência.</p>
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
        <div className="flex gap-3">
          <button
            onClick={() => setShowIntegration(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors font-medium shadow-sm text-sm"
          >
            <LinkIcon className="w-4 h-4" />
            Instruções de Integração
          </button>
          <button
            onClick={() => { setIsModalOpen(true); setFormError(null); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Afiliado
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-fit">
        <button
          onClick={() => setSelectedAffiliateId('all')}
          className={clsx(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            selectedAffiliateId === 'all'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          )}
        >
          Visão Geral
        </button>
        {affiliates.map((aff) => (
          <button
            key={aff.id}
            onClick={() => setSelectedAffiliateId(aff.id)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              selectedAffiliateId === aff.id
                ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            )}
          >
            {aff.name}
          </button>
        ))}
      </div>

      {/* Overview: cards de todos os afiliados */}
      {selectedAffiliateId === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {affiliates.map((aff) => {
            const data = getAffiliateData(aff);
            const link = affiliateLink(aff.code);
            return (
              <div
                key={aff.id}
                onClick={() => setSelectedAffiliateId(aff.id)}
                className="group bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 cursor-pointer hover:border-blue-200 dark:hover:border-zinc-700 transition-all hover:shadow-md relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-zinc-800 flex items-center justify-center text-blue-600 dark:text-white font-bold text-lg uppercase">
                    {aff.name.substring(0, 2)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Excluir o afiliado ${aff.name}?`)) {
                          handleDeleteAffiliate(aff.id);
                        }
                      }}
                      title="Excluir afiliado"
                      className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/30 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-zinc-800 transition-colors">
                      <ArrowUpRight className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:text-blue-600 dark:group-hover:text-white" />
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-zinc-900 dark:text-white truncate">{aff.name}</h3>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded text-zinc-600 dark:text-zinc-300">
                    {aff.code}
                  </span>
                  {aff.discount_rate > 0 && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      {(aff.discount_rate * 100).toFixed(0)}% OFF
                    </span>
                  )}
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Leads (cadastros)
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-white">{data.count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                      <ShoppingCart className="w-3.5 h-3.5" /> Assinantes Pro
                    </span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {data.proCount} ({data.conversionRate.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500 dark:text-zinc-400">Comissão Gerada</span>
                    <span className="font-bold text-blue-600 dark:text-white">{formatCurrency(data.commission)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Card: Adicionar novo */}
          <div
            onClick={() => { setIsModalOpen(true); setFormError(null); }}
            className="group bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 cursor-pointer hover:border-blue-300 dark:hover:border-zinc-600 hover:bg-blue-50/30 dark:hover:bg-zinc-800\/50 transition-all flex flex-col items-center justify-center text-center min-h-[240px]"
          >
            <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-4 group-hover:border-blue-300 dark:group-hover:border-zinc-600">
              <Plus className="w-6 h-6 text-zinc-400 dark:text-zinc-500 group-hover:text-blue-600 dark:group-hover:text-white" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Criar Novo Afiliado</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Adicione um novo parceiro</p>
          </div>
        </div>
      )}

      {/* Detalhe de um afiliado */}
      {selectedAffiliate && selectedAffiliateData && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1">Leads (cadastros)</p>
              <div className="text-3xl font-bold text-zinc-900 dark:text-white">{selectedAffiliateData.count}</div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                {selectedAffiliateData.freeCount} free · {selectedAffiliateData.proCount} pro
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1">Conversão Pro</p>
              <div className="flex items-baseline gap-1">
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{selectedAffiliateData.proCount}</div>
                <div className="text-sm text-zinc-400 dark:text-zinc-500">({selectedAffiliateData.conversionRate.toFixed(1)}%)</div>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1">Comissão Total ({(selectedAffiliate.commission_rate * 100).toFixed(0)}%)</p>
              <div className="text-3xl font-bold text-zinc-900 dark:text-white">{formatCurrency(selectedAffiliateData.commission)}</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1">Total Pago</p>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedAffiliate.total_paid || 0)}</div>
            </div>
            <div className="p-5 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase mb-1">
                  Saldo Pendente
                </p>
                <div className="text-3xl font-bold text-amber-900 dark:text-amber-300">
                  {formatCurrency(Math.max(0, selectedAffiliateData.commission - (selectedAffiliate.total_paid || 0)))}
                </div>
              </div>
              <button
                onClick={() => {
                  const pending = Math.max(0, selectedAffiliateData.commission - (selectedAffiliate.total_paid || 0));
                  if (pending <= 0) {
                    alert('Não há saldo pendente para pagar.');
                    return;
                  }
                  const amount = prompt(`Qual valor você deseja marcar como pago para ${selectedAffiliate.name}?\n\nSaldo Pendente: ${formatCurrency(pending)}\n\nDigite o valor (ex: 150.50):`, pending.toFixed(2));
                  if (amount) {
                    const parsedAmount = parseFloat(amount.replace(',', '.'));
                    if (!isNaN(parsedAmount) && parsedAmount > 0) {
                      handleMarkAsPaid(selectedAffiliate.id, parsedAmount);
                    } else {
                      alert('Valor inválido.');
                    }
                  }
                }}
                disabled={Math.max(0, selectedAffiliateData.commission - (selectedAffiliate.total_paid || 0)) <= 0}
                className="mt-3 w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Marcar como Pago
              </button>
            </div>
          </div>

          {/* Info do afiliado + link */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-white text-base">Detalhes do Parceiro</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Informações de cadastro e link de afiliado</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Badge do código */}
                <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase">Código:</span>
                  <code className="font-mono text-sm font-semibold text-blue-600 dark:text-white">{selectedAffiliate.code}</code>
                  <button
                    onClick={() => copyToClipboard(selectedAffiliate.code, `code-${selectedAffiliate.id}`)}
                    title="Copiar código"
                    className="ml-1 text-zinc-400 hover:text-blue-600 dark:hover:text-white"
                  >
                    {copiedCode === `code-${selectedAffiliate.id}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Badge do link completo */}
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-zinc-700">
                  <span className="text-xs text-blue-600 dark:text-white font-bold uppercase">Link:</span>
                  <code className="font-mono text-xs font-medium text-blue-700 dark:text-zinc-300 truncate max-w-[200px]">
                    {FITMIND_URL}/?ref={selectedAffiliate.code}
                  </code>
                  <button
                    onClick={() => copyToClipboard(affiliateLink(selectedAffiliate.code), `link-${selectedAffiliate.id}`)}
                    title="Copiar link"
                    className="ml-1 text-blue-400 hover:text-blue-700 dark:hover:text-zinc-300"
                  >
                    {copiedCode === `link-${selectedAffiliate.id}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a
                    href={affiliateLink(selectedAffiliate.code)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Testar link"
                    className="text-blue-400 hover:text-blue-700 dark:hover:text-zinc-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Nome</label>
                <p className="text-zinc-900 dark:text-white font-medium mt-0.5">{selectedAffiliate.name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Email</label>
                <p className="text-zinc-900 dark:text-white mt-0.5">{selectedAffiliate.email || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Chave PIX</label>
                <p className="text-zinc-900 dark:text-white font-mono mt-0.5">{selectedAffiliate.pix_key || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Desconto</label>
                <p className="text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                  {selectedAffiliate.discount_rate > 0 ? `${(selectedAffiliate.discount_rate * 100).toFixed(0)}% OFF` : 'Sem desconto'}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button
                onClick={() => {
                  if (window.confirm(`Excluir o afiliado ${selectedAffiliate.name}?`)) {
                    handleDeleteAffiliate(selectedAffiliate.id);
                  }
                }}
                className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Excluir Afiliado
              </button>
            </div>
          </div>

          {/* Tabela de usuários indicados */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 dark:text-white">Usuários Indicados</h3>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-full">
                {selectedAffiliateData.count} total
              </span>
            </div>

            {selectedAffiliateData.count === 0 ? (
              <div className="px-6 py-12 flex flex-col items-center text-center gap-2">
                <TrendingUp className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">Nenhum usuário indicado ainda.</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  Compartilhe o link <code className="font-mono bg-zinc-100 dark:bg-zinc-900 px-1 rounded">?ref={selectedAffiliate.code}</code> para começar a rastrear.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50">
                    <tr>
                      <th className="px-6 py-3">Usuário</th>
                      <th className="px-6 py-3">Data de Entrada</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Valor Gerado</th>
                      <th className="px-6 py-3 text-right">Comissão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {selectedAffiliateData.customers.map((c: Customer) => (
                      <tr key={c.id} className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-zinc-900 dark:text-white">{c.name}</div>
                          {c.email && <div className="text-xs text-zinc-400 dark:text-zinc-500">{c.email}</div>}
                        </td>
                        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                          {new Date(c.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                          <span className={clsx(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            c.status === 'active' && (c.ltv || 0) > 0
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : c.status === 'active'
                              ? 'bg-blue-100 dark:bg-zinc-800 text-blue-700 dark:text-white'
                              : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                          )}>
                            {c.status === 'active' && (c.ltv || 0) > 0
                              ? '✓ Pro'
                              : c.status === 'active'
                              ? 'Free'
                              : 'Cancelado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-zinc-900 dark:text-white">{formatCurrency(c.ltv || 0)}</td>
                        <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {formatCurrency((c.ltv || 0) * selectedAffiliate.commission_rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Criar Afiliado ───────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-xl border border-zinc-200 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Novo Afiliado</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" />
              </button>
            </div>

            <form onSubmit={handleCreateAffiliate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nome do Parceiro</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="João Silva"
                  value={newAffiliate.name}
                  onChange={(e) => setNewAffiliate({ ...newAffiliate, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="joao@email.com"
                  value={newAffiliate.email}
                  onChange={(e) => setNewAffiliate({ ...newAffiliate, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Código de Referência
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono"
                  placeholder="JOAO10"
                  value={newAffiliate.code}
                  onChange={(e) => setNewAffiliate({ ...newAffiliate, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Link:{' '}
                  <span className="font-mono text-blue-600 dark:text-white">
                    {FITMIND_URL}/?ref={newAffiliate.code || 'CODIGO'}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Desconto (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={(newAffiliate.discount_rate || 0) * 100}
                    onChange={(e) => setNewAffiliate({ ...newAffiliate, discount_rate: Number(e.target.value) / 100 })}
                  />
                  <p className="text-xs text-zinc-400 mt-0.5">Desconto para o cliente</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Comissão (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={(newAffiliate.commission_rate || 0) * 100}
                    onChange={(e) => setNewAffiliate({ ...newAffiliate, commission_rate: Number(e.target.value) / 100 })}
                  />
                  <p className="text-xs text-zinc-400 mt-0.5">% para o afiliado</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Chave PIX (opcional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="CPF, Email ou Chave Aleatória"
                  value={newAffiliate.pix_key || ''}
                  onChange={(e) => setNewAffiliate({ ...newAffiliate, pix_key: e.target.value })}
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                >
                  Criar Afiliado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Instruções de Integração ────────────────────────── */}
      {showIntegration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 my-8">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-900 rounded-t-2xl z-10">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Fluxo Completo do Link de Afiliado</h3>
              <button onClick={() => setShowIntegration(false)}>
                <X className="w-5 h-5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-sm text-zinc-600 dark:text-zinc-300">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 text-emerald-800 dark:text-emerald-200">
                <p className="font-semibold">✅ Já implementado no Fitmind:</p>
                <p className="mt-1">O <code className="bg-white/50 dark:bg-black/30 px-1 rounded">index.html</code> já captura <code>?ref=CODIGO</code> e salva no localStorage. O <code>App.tsx</code> e o <code>Auth.tsx</code> já salvam na tabela <code>referrals</code> no login/cadastro.</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-zinc-900 dark:text-white text-base">Fluxo completo</h4>
                <ol className="space-y-2 pl-4 list-decimal">
                  <li>Afiliado compartilha: <code className="bg-zinc-100 dark:bg-zinc-900 px-1 rounded font-mono">{FITMIND_URL}/?ref=CODIGO</code></li>
                  <li>O <code>index.html</code> captura o <code>?ref</code> e salva em <code>localStorage('affiliate_ref')</code></li>
                  <li>Usuário faz login/cadastro → <code>App.tsx</code> e <code>Auth.tsx</code> salvam em <code>referrals</code> no Supabase</li>
                  <li>Na hora do checkout, o <code>create-checkout-session</code> busca o <code>affiliate_ref</code> da tabela <code>referrals</code> e passa nos metadados do Stripe</li>
                  <li>O <code>stripe-webhook</code> atualiza <code>is_pro=true</code> no perfil e registra a comissão</li>
                </ol>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-zinc-900 dark:text-white text-base">SQL da tabela <code>referrals</code> (se não existir)</h4>
                <div className="bg-zinc-900 dark:bg-black text-zinc-50 p-4 rounded-lg font-mono text-xs overflow-x-auto border border-zinc-800">
                  <pre>{`create table public.referrals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  affiliate_ref text not null,  -- código do afiliado (ex: "JOAO10")
  status text default 'pending', -- 'pending' | 'completed'
  created_at timestamptz default now()
);

alter table public.referrals enable row level security;

-- Permite que usuários autenticados insiram sua própria indicação
create policy "Users can insert own referral"
  on public.referrals for insert
  with check (auth.uid() = user_id);

-- Dashboard (service role) lê tudo
create policy "Service role can read all referrals"
  on public.referrals for select
  using (true);`}</pre>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-zinc-900 dark:text-white text-base">Variável de ambiente</h4>
                <p>No <code>.env</code> do dashboard, configure a URL base do Fitmind:</p>
                <div className="bg-zinc-900 dark:bg-black text-zinc-50 p-3 rounded-lg font-mono text-xs border border-zinc-800">
                  <pre>VITE_FITMIND_URL=https://fitmindhealth.com.br</pre>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button
                onClick={() => setShowIntegration(false)}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}