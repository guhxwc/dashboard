import { useEffect, useState, FormEvent } from 'react';
import { mockService } from '@/services/mockData';
import { supabaseService, isDemoMode } from '@/services/supabaseService';
import { Customer, Affiliate } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Users, ArrowUpRight, Link as LinkIcon, Database, Plus, X, Copy, Check } from 'lucide-react';
import { clsx } from 'clsx';

import { supabase } from '@/lib/supabase';

export function AffiliatesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | 'all'>('all');
  const [usingRealData, setUsingRealData] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAffiliate, setNewAffiliate] = useState<Partial<Affiliate>>({
    name: '',
    email: '',
    code: '',
    discount_rate: 0.10,
    commission_rate: 0.40,
    status: 'active'
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [showIntegration, setShowIntegration] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      setLoading(true);
      setUsingRealData(!isDemoMode());
      const [customersData, affiliatesData] = await Promise.all([
        supabaseService.getCustomers(),
        supabaseService.getAffiliates()
      ]);
      setCustomers(customersData);
      setAffiliates(affiliatesData);
    } catch (err) {
      console.error("Error fetching affiliates data:", err);
      // Fallback to mock
      const [mockCustomers, mockAffiliates] = await Promise.all([
        mockService.getCustomers(),
        mockService.getAffiliates()
      ]);
      setCustomers(mockCustomers);
      setAffiliates(mockAffiliates);
      setUsingRealData(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAffiliate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (!newAffiliate.name || !newAffiliate.code || !newAffiliate.email) return;

      // Save directly to Supabase (or mock) without Stripe interaction
      await supabaseService.createAffiliate({
        ...(newAffiliate as Omit<Affiliate, 'id' | 'created_at'>),
      });

      setIsModalOpen(false);
      setNewAffiliate({
        name: '',
        email: '',
        code: '',
        discount_rate: 0.10,
        commission_rate: 0.40,
        status: 'active'
      });
      fetchData(); // Refresh list
    } catch (error) {
      console.error("Error creating affiliate:", error);
      alert("Erro ao criar afiliado. Verifique o console.");
    }
  };

  const handleDeleteAffiliate = async (id: string) => {
    try {
      await supabaseService.deleteAffiliate(id);
      setSelectedAffiliateId(null);
      fetchData(); // Refresh list
    } catch (error) {
      console.error("Error deleting affiliate:", error);
      alert("Erro ao excluir afiliado. Verifique o console.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getAffiliateData = (affiliate: Affiliate) => {
    // Match customer source to affiliate code or id (checking both for robustness)
    const affiliateCustomers = customers.filter(c => 
      c.source === affiliate.id || 
      c.source === affiliate.code ||
      // Legacy/Mock data matching
      (affiliate.code === 'VICTORHUGO' && c.source === 'victor_hugo') ||
      (affiliate.code === 'ALLANSTACHUK' && c.source === 'allan_stachuk')
    );
    
    const totalSales = affiliateCustomers.reduce((acc, curr) => acc + curr.ltv, 0);
    const commission = totalSales * affiliate.commission_rate;
    
    // Calculate conversion metrics
    const totalReferrals = affiliateCustomers.length;
    const proSubscribers = affiliateCustomers.filter(c => c.status === 'active' && c.ltv > 0).length;
    const conversionRate = totalReferrals > 0 ? (proSubscribers / totalReferrals) * 100 : 0;

    return {
      count: totalReferrals,
      proCount: proSubscribers,
      conversionRate,
      totalSales,
      commission,
      customers: affiliateCustomers
    };
  };

  if (loading) return <div className="flex items-center justify-center h-96 dark:text-slate-400">Carregando afiliados...</div>;

  const selectedAffiliate = affiliates.find(a => a.id === selectedAffiliateId);
  const selectedAffiliateData = selectedAffiliate ? getAffiliateData(selectedAffiliate) : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Área de Afiliados</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500 dark:text-slate-400">Gestão de parceiros e links de referência.</p>
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium shadow-sm"
          >
            <LinkIcon className="w-4 h-4" />
            Instruções de Integração
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Afiliado
          </button>
        </div>
      </div>

      {/* Integration Instructions Modal */}
      {showIntegration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-xl animate-in fade-in zoom-in-95 duration-200 my-8 border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl z-10">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Instruções de Integração (Frontend Externo)</h3>
              <button onClick={() => setShowIntegration(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 text-sm text-slate-600 dark:text-slate-300">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-amber-800 dark:text-amber-200">
                <p className="font-medium">Importante:</p>
                <p>Estas instruções devem ser aplicadas no código do seu <strong>site principal</strong> (Landing Page / App), não neste dashboard.</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-base">1. Capturar o parâmetro `ref` da URL</h4>
                <p>Adicione este script na página inicial (ou em todas as páginas) do seu site para salvar o código do afiliado quando o usuário chegar pelo link.</p>
                <div className="bg-slate-900 dark:bg-slate-950 text-slate-50 p-4 rounded-lg font-mono text-xs overflow-x-auto border border-slate-800">
                  <pre>{`// No seu arquivo principal (ex: fitmindhealth.com.br)

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  
  if (ref) {
    // Salva no localStorage para persistir até o cadastro
    localStorage.setItem('affiliate_ref', ref);
    console.log('Afiliado detectado:', ref);
  }
}, []);`}</pre>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-base">2. Salvar no Supabase ao criar conta</h4>
                <p>Quando o usuário fizer o cadastro (Sign Up), recupere o valor do `localStorage` e salve na tabela de usuários ou perfil.</p>
                <div className="bg-slate-900 dark:bg-slate-950 text-slate-50 p-4 rounded-lg font-mono text-xs overflow-x-auto border border-slate-800">
                  <pre>{`// Na função de cadastro (SignUp)

const handleSignUp = async (email, password) => {
  // 1. Cria o usuário no Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError) throw authError;

  // 2. Recupera o código do afiliado
  const affiliateRef = localStorage.getItem('affiliate_ref');

  if (affiliateRef && authData.user) {
    // 3. Salva a referência na tabela de perfis ou referrals
    const { error: refError } = await supabase
      .from('referrals') // Ou 'profiles' se preferir adicionar uma coluna lá
      .insert({
        user_id: authData.user.id,
        affiliate_ref: affiliateRef,
        created_at: new Date().toISOString(),
        status: 'pending' // Opcional
      });

    if (refError) console.error('Erro ao salvar afiliado:', refError);
  }
};`}</pre>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-base">3. Estrutura da Tabela no Supabase</h4>
                <p>Crie uma tabela chamada `referrals` no seu Supabase com as seguintes colunas:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>`id`: uuid (primary key, default: uuid_generate_v4())</li>
                  <li>`user_id`: uuid (foreign key para auth.users)</li>
                  <li>`affiliate_ref`: text (o código do afiliado)</li>
                  <li>`created_at`: timestamp (default: now())</li>
                  <li>`status`: text (ex: 'pending', 'paid') - opcional</li>
                </ul>
                <div className="bg-slate-900 dark:bg-slate-950 text-slate-50 p-4 rounded-lg font-mono text-xs overflow-x-auto mt-2 border border-slate-800">
                  <pre>{`-- SQL para criar a tabela
create table public.referrals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  affiliate_ref text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text default 'pending'
);

-- Habilita RLS (Row Level Security)
alter table public.referrals enable row level security;

-- Política para permitir inserção pública (se necessário) ou autenticada
create policy "Enable insert for authenticated users only" 
on public.referrals for insert 
with check (auth.uid() = user_id);`}</pre>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowIntegration(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs / Filter */}
      <div className="flex flex-wrap gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setSelectedAffiliateId('all')}
          className={clsx(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            selectedAffiliateId === 'all' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          Visão Geral
        </button>
        {affiliates.map(aff => (
          <button
            key={aff.id}
            onClick={() => setSelectedAffiliateId(aff.id)}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              selectedAffiliateId === aff.id ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            {aff.name}
          </button>
        ))}
      </div>

      {selectedAffiliateId === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {affiliates.map(aff => {
            const data = getAffiliateData(aff);
            return (
              <div 
                key={aff.id}
                onClick={() => setSelectedAffiliateId(aff.id)}
                className="group bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-800 transition-all hover:shadow-md relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg uppercase">
                    {aff.name.substring(0, 2)}
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                    <ArrowUpRight className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{aff.name}</h3>
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                    {aff.code}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {(aff.discount_rate * 100).toFixed(0)}% OFF
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Logins (Leads)</span>
                    <span className="font-medium text-slate-900 dark:text-white">{data.count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Assinantes Pro</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{data.proCount} ({data.conversionRate.toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Comissão Pendente</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(data.commission)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Add New Card */}
          <div 
            onClick={() => setIsModalOpen(true)}
            className="group bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all flex flex-col items-center justify-center text-center min-h-[240px]"
          >
            <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4 group-hover:border-indigo-300 dark:group-hover:border-indigo-700 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              <Plus className="w-6 h-6 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Criar Novo Afiliado</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Adicione um novo parceiro</p>
          </div>
        </div>
      )}

      {selectedAffiliate && selectedAffiliateData && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total de Logins (Leads)</p>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{selectedAffiliateData.count}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Assinantes Pro</p>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{selectedAffiliateData.proCount}</div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">({selectedAffiliateData.conversionRate.toFixed(1)}% conv.)</div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Volume de Vendas</p>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(selectedAffiliateData.totalSales)}</div>
            </div>
            <div className="p-6 rounded-2xl shadow-sm border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
              <p className="text-sm font-medium opacity-80 mb-1 text-indigo-900 dark:text-indigo-300">Comissão a Pagar ({(selectedAffiliate.commission_rate * 100).toFixed(0)}%)</p>
              <div className="text-3xl font-bold text-indigo-900 dark:text-indigo-300">{formatCurrency(selectedAffiliateData.commission)}</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden mb-8">
            <div className="px-6 py-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-lg">Detalhes do Parceiro</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Informações de cadastro e pagamento</p>
              </div>
              <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Ref:</span>
                  <code className="font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-400">{selectedAffiliate.code}</code>
                  <button 
                    onClick={() => copyToClipboard(selectedAffiliate.code)}
                    className="ml-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                    title="Copiar código"
                  >
                    {copiedCode === selectedAffiliate.code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Link:</span>
                  <code className="font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[150px]">fitmindhealth.com.br/?ref={selectedAffiliate.code}</code>
                  <button 
                    onClick={() => copyToClipboard(`https://fitmindhealth.com.br/?ref=${selectedAffiliate.code}`)}
                    className="ml-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                    title="Copiar link"
                  >
                    {copiedCode === `https://fitmindhealth.com.br/?ref=${selectedAffiliate.code}` ? <Check className="w-4 h-4 text-emerald-500" /> : <LinkIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Nome</label>
                <p className="text-slate-900 dark:text-white font-medium">{selectedAffiliate.name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Email</label>
                <p className="text-slate-900 dark:text-white">{selectedAffiliate.email}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Chave PIX</label>
                <p className="text-slate-900 dark:text-white font-mono">{selectedAffiliate.pix_key || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Desconto (Ref)</label>
                <p className="text-emerald-600 dark:text-emerald-400 font-medium">{(selectedAffiliate.discount_rate * 100).toFixed(0)}%</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => {
                  if (window.confirm(`Tem certeza que deseja excluir o afiliado ${selectedAffiliate.name}? Esta ação não pode ser desfeita.`)) {
                    handleDeleteAffiliate(selectedAffiliate.id);
                  }
                }}
                className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Excluir Afiliado
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 dark:text-white">Usuários Indicados</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-6 py-3">Usuário</th>
                    <th className="px-6 py-3">Data Entrada</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Valor Gerado</th>
                    <th className="px-6 py-3 text-right">Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedAffiliateData.customers.length > 0 ? (
                    selectedAffiliateData.customers.map((c: Customer) => (
                      <tr key={c.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{c.name}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4">
                          <span className={clsx(
                            "px-2 py-1 rounded-full text-xs font-medium capitalize",
                            c.status === 'active' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          )}>
                            {c.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-900 dark:text-white">{formatCurrency(c.ltv)}</td>
                        <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(c.ltv * selectedAffiliate.commission_rate)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                        Nenhum usuário indicado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar Afiliado */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Novo Afiliado</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAffiliate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Parceiro</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Ex: João Silva"
                  value={newAffiliate.name}
                  onChange={e => setNewAffiliate({...newAffiliate, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="joao@exemplo.com"
                  value={newAffiliate.email}
                  onChange={e => setNewAffiliate({...newAffiliate, email: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código de Referência (Ref)</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all uppercase font-mono"
                  placeholder="JOAO10"
                  value={newAffiliate.code}
                  onChange={e => setNewAffiliate({...newAffiliate, code: e.target.value.toUpperCase()})}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Link gerado: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-medium">fitmindhealth.com.br/?ref={newAffiliate.code || 'CODIGO'}</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Desconto (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    value={(newAffiliate.discount_rate || 0) * 100}
                    onChange={e => setNewAffiliate({...newAffiliate, discount_rate: Number(e.target.value) / 100})}
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Opcional</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Comissão (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    value={(newAffiliate.commission_rate || 0) * 100}
                    onChange={e => setNewAffiliate({...newAffiliate, commission_rate: Number(e.target.value) / 100})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chave PIX (Opcional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="CPF, Email ou Aleatória"
                  value={newAffiliate.pix_key || ''}
                  onChange={e => setNewAffiliate({...newAffiliate, pix_key: e.target.value})}
                />
              </div>
              
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
                >
                  Criar Afiliado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
