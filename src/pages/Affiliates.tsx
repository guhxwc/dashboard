import { useEffect, useState, FormEvent } from 'react';
import { supabaseService, isDemoMode } from '@/services/supabaseService';
import { Customer, Affiliate } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  Users, ArrowUpRight, Link as LinkIcon, Database, Plus, X, Copy, Check,
  AlertCircle, ExternalLink, TrendingUp, ShoppingCart, Trash2, Pencil
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';
import { AdminReferralsView } from './AdminReferralsView';

const FITMIND_URL =
  (import.meta as any).env?.VITE_FITMIND_URL?.replace(/\/$/, '') ||
  'https://fitmindhealth.com.br';

type ModalMode = 'create' | 'edit' | null;

const EMPTY_FORM: Partial<Affiliate> = {
  name: '', email: '', code: '',
  discount_rate: 0.10, commission_rate: 0.40,
  pix_key: '', status: 'active',
};

export function AffiliatesPage() {
  const [customers, setCustomers]               = useState<Customer[]>([]);
  const [affiliates, setAffiliates]             = useState<Affiliate[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | 'all' | 'referrals'>('all');
  const [usingRealData, setUsingRealData]       = useState(false);
  const [modalMode, setModalMode]               = useState<ModalMode>(null);
  const [showIntegration, setShowIntegration]   = useState(false);
  const [copiedCode, setCopiedCode]             = useState<string | null>(null);
  const [formError, setFormError]               = useState<string | null>(null);
  const [formSaving, setFormSaving]             = useState(false);
  const [form, setForm]                         = useState<Partial<Affiliate>>(EMPTY_FORM);
  // Confirmação de exclusão inline (sem alert nativo)
  const [confirmDeleteId, setConfirmDeleteId]   = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading]       = useState(false);
  const [toast, setToast]                       = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setUsingRealData(!isDemoMode());
      const [cust, affs] = await Promise.all([
        supabaseService.getCustomers(),
        supabaseService.getAffiliates(),
      ]);
      setCustomers(cust);
      setAffiliates(affs);
    } catch (err) {
      console.error('fetchData:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Abrir modal criar ──────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalMode('create');
  };

  // ── Abrir modal editar ─────────────────────────────────────────────────────
  const openEdit = (aff: Affiliate) => {
    setForm({ ...aff });
    setFormError(null);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setFormError(null);
    setForm(EMPTY_FORM);
  };

  // ── Criar afiliado ─────────────────────────────────────────────────────────
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name || !form.code || !form.email) return;

    const dup = affiliates.find(
      a => a.code.toUpperCase() === (form.code || '').toUpperCase()
    );
    if (dup) {
      setFormError(`Código "${form.code}" já está em uso por ${dup.name}.`);
      return;
    }

    setFormSaving(true);
    try {
      const created = await supabaseService.createAffiliate({
        ...(form as Omit<Affiliate, 'id' | 'created_at'>),
        code: form.code!.toUpperCase(),
      });
      closeModal();
      await fetchData();
      setSelectedAffiliateId(created.id);
      setToast({ msg: 'Afiliado criado com sucesso!', type: 'ok' });
    } catch (err: any) {
      setFormError(err.message || 'Erro ao criar afiliado.');
    } finally {
      setFormSaving(false);
    }
  };

  // ── Editar afiliado ────────────────────────────────────────────────────────
  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.id || !form.name || !form.code || !form.email) return;

    // Verifica duplicata de código (ignora o próprio afiliado)
    const dup = affiliates.find(
      a => a.code.toUpperCase() === (form.code || '').toUpperCase() && a.id !== form.id
    );
    if (dup) {
      setFormError(`Código "${form.code}" já está em uso por ${dup.name}.`);
      return;
    }

    setFormSaving(true);
    try {
      await supabaseService.updateAffiliate(form.id, {
        name:            form.name,
        email:           form.email,
        code:            form.code!.toUpperCase(),
        discount_rate:   form.discount_rate,
        commission_rate: form.commission_rate,
        pix_key:         form.pix_key || null,
        status:          form.status,
      });
      closeModal();
      await fetchData();
      setToast({ msg: 'Afiliado atualizado com sucesso!', type: 'ok' });
    } catch (err: any) {
      setFormError(err.message || 'Erro ao atualizar afiliado.');
    } finally {
      setFormSaving(false);
    }
  };

  // ── Excluir afiliado ───────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      await supabaseService.deleteAffiliate(id);
      setConfirmDeleteId(null);
      if (selectedAffiliateId === id) setSelectedAffiliateId('all');
      await fetchData();
      setToast({ msg: 'Afiliado excluído.', type: 'ok' });
    } catch (err: any) {
      setToast({ msg: err.message || 'Erro ao excluir afiliado.', type: 'err' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleMarkAsPaid = async (id: string, amount: number) => {
    setAffiliates(prev => prev.map(a =>
      a.id === id ? { ...a, total_paid: (a.total_paid || 0) + amount } : a
    ));
    setToast({ msg: `Pagamento de ${formatCurrency(amount)} registrado!`, type: 'ok' });
  };

  const copyToClipboard = (text: string, key?: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key || text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getAffiliateData = (affiliate: Affiliate) => {
    const code = affiliate.code.toUpperCase();
    const affilCustomers = customers.filter(c => {
      const src = (c.source || '').toUpperCase();
      return src === code || src === code.replace(/\s+/g, '_') || src === affiliate.id;
    });
    const totalSales    = affilCustomers.reduce((s, c) => s + (c.ltv || 0), 0);
    const commission    = totalSales * affiliate.commission_rate;
    const proCount      = affilCustomers.filter(c => c.status === 'active' && (c.ltv || 0) > 0).length;
    const freeCount     = affilCustomers.length - proCount;
    const conversionRate = affilCustomers.length > 0 ? (proCount / affilCustomers.length) * 100 : 0;
    return { count: affilCustomers.length, proCount, freeCount, conversionRate, totalSales, commission, customers: affilCustomers };
  };

  const affiliateLink = (code: string) => `${FITMIND_URL}/?ref=${encodeURIComponent(code)}`;

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-3">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-zinc-500 dark:text-zinc-400 text-sm">Carregando afiliados...</span>
    </div>
  );

  const selectedAffiliate     = affiliates.find(a => a.id === selectedAffiliateId);
  const selectedAffiliateData = selectedAffiliate ? getAffiliateData(selectedAffiliate) : null;

  // ── Form compartilhado (criar / editar) ────────────────────────────────────
  const AffiliateForm = ({ onSubmit, submitLabel }: { onSubmit: (e: FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nome do Parceiro</label>
        <input
          type="text" required
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="João Silva"
          value={form.name || ''}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
        <input
          type="email" required
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="joao@email.com"
          value={form.email || ''}
          onChange={e => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Cupom / Código de Referência</label>
        <input
          type="text" required
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono"
          placeholder="JOAO10"
          value={form.code || ''}
          onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Link: <span className="font-mono text-blue-600 dark:text-blue-400">{FITMIND_URL}/?ref={form.code || 'CUPOM'}</span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Desconto (%)</label>
          <input
            type="number" min="0" max="100"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={Math.round((form.discount_rate || 0) * 100)}
            onChange={e => setForm({ ...form, discount_rate: Number(e.target.value) / 100 })}
          />
          <p className="text-xs text-zinc-400 mt-0.5">Desconto para o cliente</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Comissão (%)</label>
          <input
            type="number" min="0" max="100"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={Math.round((form.commission_rate || 0) * 100)}
            onChange={e => setForm({ ...form, commission_rate: Number(e.target.value) / 100 })}
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
          value={form.pix_key || ''}
          onChange={e => setForm({ ...form, pix_key: e.target.value })}
        />
      </div>

      {formError && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
        </div>
      )}

      <div className="pt-2 flex justify-end gap-3">
        <button type="button" onClick={closeModal}
          className="px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-medium transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={formSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm disabled:opacity-60">
          {formSaving ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-8">

      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-bottom-4',
          toast.type === 'ok'
            ? 'bg-emerald-600 text-white'
            : 'bg-rose-600 text-white'
        )}>
          {toast.type === 'ok' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Área de Afiliados</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
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
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => setShowIntegration(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors font-medium shadow-sm text-sm">
            <LinkIcon className="w-4 h-4" /> Instruções de Integração
          </button>
          <button onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm text-sm">
            <Plus className="w-4 h-4" /> Novo Afiliado
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full overflow-x-auto scrollbar-hide">
        {(['all', 'referrals'] as const).map(tab => (
          <button key={tab} onClick={() => setSelectedAffiliateId(tab)}
            className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              selectedAffiliateId === tab
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white')}>
            {tab === 'all' ? 'Visão Geral' : 'Indicações (Referrals)'}
          </button>
        ))}
        {affiliates.map(aff => (
          <button key={aff.id} onClick={() => setSelectedAffiliateId(aff.id)}
            className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              selectedAffiliateId === aff.id
                ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white')}>
            {aff.name}
          </button>
        ))}
      </div>

      {/* Referrals View */}
      {selectedAffiliateId === 'referrals' && <AdminReferralsView />}

      {/* Overview: cards */}
      {selectedAffiliateId === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {affiliates.map(aff => {
            const data = getAffiliateData(aff);
            const isConfirming = confirmDeleteId === aff.id;
            return (
              <div key={aff.id}
                onClick={() => !isConfirming && setSelectedAffiliateId(aff.id)}
                className="group bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 cursor-pointer hover:border-blue-200 dark:hover:border-zinc-700 transition-all hover:shadow-md relative overflow-hidden">

                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-zinc-800 flex items-center justify-center text-blue-600 dark:text-white font-bold text-lg uppercase">
                    {aff.name.substring(0, 2)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Editar */}
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(aff); }}
                      title="Editar afiliado"
                      className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Excluir / confirmação inline */}
                    {isConfirming ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleDelete(aff.id)} disabled={deleteLoading}
                          className="px-2 py-1 text-xs bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium disabled:opacity-60">
                          {deleteLoading ? '...' : 'Confirmar'}
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-300">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(aff.id); }}
                        title="Excluir afiliado"
                        className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/30 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-zinc-700 transition-colors">
                      <ArrowUpRight className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:text-blue-600 dark:group-hover:text-white" />
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-zinc-900 dark:text-white truncate">{aff.name}</h3>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-300">{aff.code}</span>
                  {aff.discount_rate > 0 && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{(aff.discount_rate * 100).toFixed(0)}% OFF</span>
                  )}
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Leads</span>
                    <span className="font-medium text-zinc-900 dark:text-white">{data.count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1"><ShoppingCart className="w-3.5 h-3.5" /> Assinantes Pro</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{data.proCount} ({data.conversionRate.toFixed(1)}%)</span>
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
          <div onClick={openCreate}
            className="group bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/30 dark:hover:bg-zinc-800 transition-all flex flex-col items-center justify-center text-center min-h-[240px]">
            <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mb-4 group-hover:border-blue-300">
              <Plus className="w-6 h-6 text-zinc-400 dark:text-zinc-500 group-hover:text-blue-600" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1">Leads</p>
              <div className="text-3xl font-bold text-zinc-900 dark:text-white">{selectedAffiliateData.count}</div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{selectedAffiliateData.freeCount} free · {selectedAffiliateData.proCount} pro</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1">Conversão Pro</p>
              <div className="flex items-baseline gap-1">
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{selectedAffiliateData.proCount}</div>
                <div className="text-sm text-zinc-400">({selectedAffiliateData.conversionRate.toFixed(1)}%)</div>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1">Comissão ({(selectedAffiliate.commission_rate * 100).toFixed(0)}%)</p>
              <div className="text-3xl font-bold text-zinc-900 dark:text-white">{formatCurrency(selectedAffiliateData.commission)}</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1">Total Pago</p>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedAffiliate.total_paid || 0)}</div>
            </div>
            <div className="p-5 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 flex flex-col justify-between col-span-1 sm:col-span-2 lg:col-span-1">
              <div>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase mb-1">Saldo Pendente</p>
                <div className="text-3xl font-bold text-amber-900 dark:text-amber-300">
                  {formatCurrency(Math.max(0, selectedAffiliateData.commission - (selectedAffiliate.total_paid || 0)))}
                </div>
              </div>
              <button
                onClick={() => {
                  const pending = Math.max(0, selectedAffiliateData.commission - (selectedAffiliate.total_paid || 0));
                  if (pending <= 0) { setToast({ msg: 'Sem saldo pendente.', type: 'err' }); return; }
                  const raw = prompt(`Valor a pagar para ${selectedAffiliate.name}\nPendente: ${formatCurrency(pending)}\n\nDigite o valor:`, pending.toFixed(2));
                  if (!raw) return;
                  const val = parseFloat(raw.replace(',', '.'));
                  if (isNaN(val) || val <= 0) { setToast({ msg: 'Valor inválido.', type: 'err' }); return; }
                  handleMarkAsPaid(selectedAffiliate.id, val);
                }}
                disabled={Math.max(0, selectedAffiliateData.commission - (selectedAffiliate.total_paid || 0)) <= 0}
                className="mt-3 w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Marcar como Pago
              </button>
            </div>
          </div>

          {/* Info + Link */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-white text-base">Detalhes do Parceiro</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Informações de cadastro e link de afiliado</p>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2">
                <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <span className="text-xs text-zinc-500 font-bold uppercase">Cupom:</span>
                  <code className="font-mono text-sm font-semibold text-blue-600 dark:text-white">{selectedAffiliate.code}</code>
                  <button onClick={() => copyToClipboard(selectedAffiliate.code, `code-${selectedAffiliate.id}`)} className="ml-1 text-zinc-400 hover:text-blue-600">
                    {copiedCode === `code-${selectedAffiliate.id}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-zinc-700">
                  <span className="text-xs text-blue-600 font-bold uppercase">Link:</span>
                  <code className="font-mono text-xs font-medium text-blue-700 dark:text-zinc-300 truncate max-w-[200px]">
                    {FITMIND_URL}/?ref={selectedAffiliate.code}
                  </code>
                  <button onClick={() => copyToClipboard(affiliateLink(selectedAffiliate.code), `link-${selectedAffiliate.id}`)} className="ml-1 text-blue-400 hover:text-blue-700">
                    {copiedCode === `link-${selectedAffiliate.id}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a href={affiliateLink(selectedAffiliate.code)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-blue-400 hover:text-blue-700">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div><label className="text-xs font-medium text-zinc-500 uppercase">Nome</label><p className="text-zinc-900 dark:text-white font-medium mt-0.5">{selectedAffiliate.name}</p></div>
              <div><label className="text-xs font-medium text-zinc-500 uppercase">Email</label><p className="text-zinc-900 dark:text-white mt-0.5 truncate">{selectedAffiliate.email || '—'}</p></div>
              <div><label className="text-xs font-medium text-zinc-500 uppercase">Chave PIX</label><p className="text-zinc-900 dark:text-white font-mono mt-0.5 truncate">{selectedAffiliate.pix_key || '—'}</p></div>
              <div><label className="text-xs font-medium text-zinc-500 uppercase">Desconto</label><p className="text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">{selectedAffiliate.discount_rate > 0 ? `${(selectedAffiliate.discount_rate * 100).toFixed(0)}% OFF` : 'Sem desconto'}</p></div>
            </div>

            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
              <button onClick={() => openEdit(selectedAffiliate)}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Editar Afiliado
              </button>
              {confirmDeleteId === selectedAffiliate.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Confirmar exclusão?</span>
                  <button onClick={() => handleDelete(selectedAffiliate.id)} disabled={deleteLoading}
                    className="text-xs font-medium px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-60">
                    {deleteLoading ? '...' : 'Excluir'}
                  </button>
                  <button onClick={() => setConfirmDeleteId(null)}
                    className="text-xs font-medium px-3 py-1.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg">
                    Cancelar
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteId(selectedAffiliate.id)}
                  className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-blue-900/20 transition-colors">
                  <X className="w-3.5 h-3.5" /> Excluir Afiliado
                </button>
              )}
            </div>
          </div>

          {/* Tabela usuários indicados */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 dark:text-white">Usuários Indicados</h3>
              <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">{selectedAffiliateData.count} total</span>
            </div>

            {selectedAffiliateData.count === 0 ? (
              <div className="px-6 py-12 flex flex-col items-center text-center gap-2">
                <TrendingUp className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">Nenhum usuário indicado ainda.</p>
                <p className="text-xs text-zinc-400">Link: <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">?ref={selectedAffiliate.code}</code></p>
              </div>
            ) : (
              <>
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50">
                      <tr>
                        <th className="px-6 py-3">Usuário</th>
                        <th className="px-6 py-3">Data de Entrada</th>
                        <th className="px-6 py-3">Cupom Usado</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Valor Gerado</th>
                        <th className="px-6 py-3 text-right">Comissão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {selectedAffiliateData.customers.map((c: Customer) => (
                        <tr key={c.id} className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-zinc-900 dark:text-white">{c.name || 'Usuário'}</div>
                            {c.email && <div className="text-xs text-zinc-400">{c.email}</div>}
                          </td>
                          <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                          <td className="px-6 py-4"><span className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-300">{c.source}</span></td>
                          <td className="px-6 py-4">
                            <span className={clsx('px-2 py-1 rounded-full text-xs font-medium',
                              c.status === 'active' && (c.ltv || 0) > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : c.status === 'tester' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                              : c.status === 'active' ? 'bg-blue-100 dark:bg-zinc-800 text-blue-700 dark:text-white'
                              : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400')}>
                              {c.status === 'active' && (c.ltv || 0) > 0 ? '✓ Pro' : c.status === 'tester' ? 'Tester' : c.status === 'active' ? 'Free' : 'Cancelado'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-zinc-900 dark:text-white">{formatCurrency(c.ltv || 0)}</td>
                          <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency((c.ltv || 0) * selectedAffiliate.commission_rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="lg:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                  {selectedAffiliateData.customers.map((c: Customer) => (
                    <div key={c.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-white">{c.name}</div>
                          <div className="text-xs text-zinc-500">{new Date(c.created_at).toLocaleDateString('pt-BR')}</div>
                        </div>
                        <span className={clsx('px-2 py-1 rounded-full text-[10px] font-bold uppercase',
                          c.status === 'active' && (c.ltv || 0) > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : c.status === 'tester' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                          : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400')}>
                          {c.status === 'active' && (c.ltv || 0) > 0 ? 'Pro' : c.status === 'tester' ? 'Tester' : 'Free'}
                        </span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="text-xs text-zinc-500">Gasto: <span className="font-medium text-zinc-900 dark:text-white">{formatCurrency(c.ltv || 0)}</span></div>
                        <div className="text-right">
                          <div className="text-[10px] text-zinc-400 uppercase font-bold">Comissão</div>
                          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency((c.ltv || 0) * selectedAffiliate.commission_rate)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Criar / Editar ─────────────────────────────────────────────── */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-xl border border-zinc-200 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white">
                {modalMode === 'create' ? 'Novo Afiliado' : `Editar: ${form.name}`}
              </h3>
              <button onClick={closeModal}><X className="w-5 h-5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" /></button>
            </div>
            <AffiliateForm
              onSubmit={modalMode === 'create' ? handleCreate : handleEdit}
              submitLabel={modalMode === 'create' ? 'Criar Afiliado' : 'Salvar Alterações'}
            />
          </div>
        </div>
      )}

      {/* ── Modal Instruções ─────────────────────────────────────────────────── */}
      {showIntegration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 my-8">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-900 rounded-t-2xl z-10">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Fluxo do Link de Afiliado</h3>
              <button onClick={() => setShowIntegration(false)}><X className="w-5 h-5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" /></button>
            </div>
            <div className="p-6 space-y-6 text-sm text-zinc-600 dark:text-zinc-300">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 text-emerald-800 dark:text-emerald-200">
                <p className="font-semibold">✅ Já implementado no Fitmind</p>
                <p className="mt-1">O <code className="bg-white/50 dark:bg-black/30 px-1 rounded">index.html</code> captura <code>?ref=CODIGO</code> e salva no localStorage. O <code>App.tsx</code> e <code>Auth.tsx</code> salvam na tabela <code>referrals</code>.</p>
              </div>
              <ol className="space-y-2 pl-4 list-decimal">
                <li>Afiliado compartilha: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded font-mono">{FITMIND_URL}/?ref=CODIGO</code></li>
                <li>Usuário visita → <code>?ref</code> salvo em <code>localStorage</code></li>
                <li>Login/cadastro → salvo em <code>referrals</code> no Supabase</li>
                <li>Checkout → Stripe recebe <code>affiliate_ref</code> nos metadados</li>
                <li>Webhook → registra comissão e ativa PRO</li>
              </ol>
            </div>
            <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button onClick={() => setShowIntegration(false)}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 font-medium">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
