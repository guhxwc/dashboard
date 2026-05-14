import React, { useState, useMemo, useEffect } from 'react';
import { Target, Search, Plus, Upload, MoreHorizontal, MessageSquare, CheckCircle, XCircle, X, ExternalLink, Calendar, Users, AlertCircle, AlertTriangle, ThermometerSun, Snowflake, Flame, ChevronRight, Sparkles } from 'lucide-react';
import { Pagination } from '@/components/Pagination';

type Lead = {
  id: string;
  nome: string;
  instagram: string;
  categoria: 'Nutricionista' | 'Usuário GLP-1' | 'Parceria Local';
  cidade: string;
  classificacao: 'quente' | 'morno' | 'frio';
  responsavel: 'gustavo' | 'murilo' | 'lucas';
  status: 'nao_abordado' | 'abordado' | 'em_conversa' | 'nao_quis';
  data_1_contato: string | null;
  data_ult_contato: string | null;
  proximo_followup: string | null;
  observacoes: string;
  interacoes: Interacao[];
};

type Interacao = {
  id: string;
  data: string;
  texto: string;
  registrado_por: string;
  tipo: 'mensagem' | 'fechado' | 'nao_quis';
};

const LEADS_MOCK: Lead[] = [
  {
    id: '1', nome: 'Vinicius Pacheco', instagram: '@nutri_viniciuspacheco', categoria: 'Nutricionista',
    cidade: 'Maringá', classificacao: 'quente', responsavel: 'gustavo', status: 'nao_abordado',
    data_1_contato: null, data_ult_contato: null, proximo_followup: null,
    observacoes: 'Perfil muito forte na região.', interacoes: []
  },
  {
    id: '2', nome: 'Jennifer Prioli', instagram: '@jennyprioli', categoria: 'Usuário GLP-1',
    cidade: 'Brasil', classificacao: 'quente', responsavel: 'murilo', status: 'em_conversa',
    data_1_contato: '2026-05-10', data_ult_contato: '2026-05-12', proximo_followup: '2026-05-15',
    observacoes: '',
    interacoes: [
      { id: 'i1', data: '2026-05-10', texto: 'Abordagem inicial via DM.', registrado_por: 'Murilo', tipo: 'mensagem' },
      { id: 'i2', data: '2026-05-12', texto: 'Respondeu interessada, pediu mais detalhes.', registrado_por: 'Murilo', tipo: 'mensagem' }
    ]
  },
  {
    id: '3', nome: 'Jéssica Brazil', instagram: '@jessicabrazill', categoria: 'Usuário GLP-1',
    cidade: 'Brasil', classificacao: 'quente', responsavel: 'murilo', status: 'nao_quis',
    data_1_contato: '2026-05-09', data_ult_contato: '2026-05-11', proximo_followup: null,
    observacoes: '',
    interacoes: [
      { id: 'i3', data: '2026-05-11', texto: 'Respondeu mas não quis no momento.', registrado_por: 'Murilo', tipo: 'nao_quis' }
    ]
  },
  {
    id: '4', nome: 'Magrass Maringá', instagram: '@magrass.maringa', categoria: 'Parceria Local',
    cidade: 'Maringá', classificacao: 'quente', responsavel: 'gustavo', status: 'nao_abordado',
    data_1_contato: null, data_ult_contato: null, proximo_followup: null,
    observacoes: 'Grande potencial B2B', interacoes: []
  },
  {
    id: '5', nome: 'Academia Top Fit', instagram: '@academiatopfitt', categoria: 'Parceria Local',
    cidade: 'Maringá', classificacao: 'quente', responsavel: 'gustavo', status: 'em_conversa',
    data_1_contato: '2026-05-01', data_ult_contato: '2026-05-08', proximo_followup: null,
    observacoes: '',
    interacoes: [
      { id: 'i4', data: '2026-05-08', texto: 'Parceria assinada com sucesso!', registrado_por: 'Gustavo', tipo: 'fechado' }
    ]
  },
  {
    id: '6', nome: 'Dra. Viviane Bertoncelo', instagram: '@dravivianenutrologa', categoria: 'Nutricionista',
    cidade: 'Maringá', classificacao: 'quente', responsavel: 'gustavo', status: 'abordado',
    data_1_contato: '2026-05-11', data_ult_contato: '2026-05-11', proximo_followup: '2026-05-14',
    observacoes: '',
    interacoes: [
      { id: 'i5', data: '2026-05-11', texto: 'Enviada mensagem inicial de apresentação.', registrado_por: 'Gustavo', tipo: 'mensagem' }
    ]
  },
  {
    id: '7', nome: 'Laura Brasileiro', instagram: '@brasileiro.laura', categoria: 'Usuário GLP-1',
    cidade: 'Uberlândia', classificacao: 'quente', responsavel: 'murilo', status: 'nao_abordado',
    data_1_contato: null, data_ult_contato: null, proximo_followup: null,
    observacoes: 'Perfil muito ativo sobre emagrecimento.', interacoes: []
  },
  {
    id: '8', nome: 'Emagrecentro PR', instagram: '@emagrecentro_pr', categoria: 'Parceria Local',
    cidade: 'Maringá', classificacao: 'quente', responsavel: 'gustavo', status: 'nao_abordado',
    data_1_contato: null, data_ult_contato: null, proximo_followup: null,
    observacoes: '', interacoes: []
  },
  {
    id: '9', nome: 'Raquel Lo Turco', instagram: '@raquelloturco.nutri', categoria: 'Nutricionista',
    cidade: 'Londrina', classificacao: 'quente', responsavel: 'gustavo', status: 'em_conversa',
    data_1_contato: '2026-05-08', data_ult_contato: '2026-05-08', proximo_followup: '2026-05-11',
    observacoes: '',
    interacoes: [
      { id: 'i6', data: '2026-05-08', texto: 'Apresentado produto.', registrado_por: 'Gustavo', tipo: 'mensagem' }
    ]
  },
  {
    id: '10', nome: 'Dr. Lucas Mendes', instagram: '@lucasmendes.med', categoria: 'Nutricionista',
    cidade: 'São Paulo', classificacao: 'morno', responsavel: 'lucas', status: 'abordado',
    data_1_contato: '2026-05-13', data_ult_contato: '2026-05-13', proximo_followup: '2026-05-16',
    observacoes: '',
    interacoes: [
      { id: 'i7', data: '2026-05-13', texto: 'Abordado hoje de manhã.', registrado_por: 'Lucas', tipo: 'mensagem' }
    ]
  },
  {
    id: '11', nome: 'Carla Silva', instagram: '@carlamedidas', categoria: 'Usuário GLP-1',
    cidade: 'Rio de Janeiro', classificacao: 'frio', responsavel: 'murilo', status: 'nao_quis',
    data_1_contato: '2026-05-01', data_ult_contato: '2026-05-05', proximo_followup: null,
    observacoes: '',
    interacoes: [
      { id: 'i8', data: '2026-05-01', texto: 'Mensagem inicial sem resposta', registrado_por: 'Murilo', tipo: 'mensagem' },
      { id: 'i9', data: '2026-05-05', texto: 'Follow-up sem sucesso', registrado_por: 'Murilo', tipo: 'mensagem' }
    ]
  },
  {
    id: '12', nome: 'Clínica Bem Estar', instagram: '@bemestarsaopaulo', categoria: 'Parceria Local',
    cidade: 'São Paulo', classificacao: 'morno', responsavel: 'lucas', status: 'em_conversa',
    data_1_contato: '2026-05-10', data_ult_contato: '2026-05-12', proximo_followup: '2026-05-14',
    observacoes: 'Têm interesse, aguardando aprovação do gestor',
    interacoes: [
      { id: 'i10', data: '2026-05-12', texto: 'Reunião feita, gostaram do formato.', registrado_por: 'Lucas', tipo: 'mensagem' }
    ]
  },
  {
    id: '13', nome: 'João Pedro Fitness', instagram: '@joaofitness.glp1', categoria: 'Usuário GLP-1',
    cidade: 'Curitiba', classificacao: 'quente', responsavel: 'murilo', status: 'em_conversa',
    data_1_contato: '2026-05-05', data_ult_contato: '2026-05-10', proximo_followup: null,
    observacoes: '',
    interacoes: [
      { id: 'i11', data: '2026-05-10', texto: 'Assinou o plano anual!', registrado_por: 'Murilo', tipo: 'fechado' }
    ]
  },
  {
    id: '14', nome: 'Nutri Paula', instagram: '@paulanutrioficial', categoria: 'Nutricionista',
    cidade: 'Florianópolis', classificacao: 'quente', responsavel: 'gustavo', status: 'nao_abordado',
    data_1_contato: null, data_ult_contato: null, proximo_followup: null,
    observacoes: '', interacoes: []
  },
  {
    id: '15', nome: 'Roberto Alves', instagram: '@roberto.emagrece', categoria: 'Usuário GLP-1',
    cidade: 'Belo Horizonte', classificacao: 'morno', responsavel: 'murilo', status: 'abordado',
    data_1_contato: '2026-05-13', data_ult_contato: '2026-05-13', proximo_followup: '2026-05-16',
    observacoes: '',
    interacoes: [
      { id: 'i12', data: '2026-05-13', texto: 'Enviei Dm agora.', registrado_por: 'Murilo', tipo: 'mensagem' }
    ]
  }
];

const HOJE_STR = '2026-05-13';

function formatDataCurta(dateStr: string | null) {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${parts[2]} ${meses[parseInt(parts[1], 10) - 1]}`;
}

function getClassificacaoProps(c: string) {
  if (c === 'quente') return { label: 'Quente', classes: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' };
  if (c === 'morno') return { label: 'Morno', classes: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' };
  if (c === 'frio') return { label: 'Frio', classes: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' };
  return { label: c, classes: '' };
}

function getResponsavelProps(r: string) {
  if (r === 'gustavo') return { inicial: 'G', cor: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' };
  if (r === 'murilo') return { inicial: 'M', cor: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' };
  return { inicial: 'L', cor: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' };
}

function getCategoriaClasses(c: string) {
  if (c === 'Nutricionista') return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300';
  if (c === 'Usuário GLP-1') return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300';
  return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300';
}

function getStatusProps(s: string) {
  switch (s) {
    case 'nao_abordado': return { label: 'Não abordado', classes: 'bg-zinc-50 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/50' };
    case 'abordado': return { label: 'Abordado', classes: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20' };
    case 'em_conversa': return { label: 'Em conversa', classes: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20' };
    case 'nao_quis': return { label: 'Não quis', classes: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20' };
    default: return { label: s, classes: 'bg-zinc-50 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/50' };
  }
}

export function LeadsPanel() {
  const [leads, setLeads] = useState<Lead[]>(LEADS_MOCK);
  
  // Filters
  const [search, setSearch] = useState('');
  const [fCategoria, setFCategoria] = useState('');
  const [activeTab, setActiveTab] = useState<'todos' | 'sem_contato' | 'ativos' | 'perdidos'>('todos');

  // Modals/Drawers
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // New Interaction State
  const [newInteractionText, setNewInteractionText] = useState('');

  // Agenda / Prioridades
  const dataDiffDays = (d1: string, d2: string) => {
    return (new Date(d2).getTime() - new Date(d1).getTime()) / (1000 * 3600 * 24);
  };

  const followupsAtrasadosCount = leads.filter(l => l.proximo_followup && l.proximo_followup < HOJE_STR && (l.status === 'abordado' || l.status === 'em_conversa')).length;
  const followupsHojeCount = leads.filter(l => l.proximo_followup === HOJE_STR && (l.status === 'abordado' || l.status === 'em_conversa')).length;

  const prioridades = useMemo(() => {
    return leads
      .filter(l => l.status === 'abordado' || l.status === 'em_conversa')
      .map(l => {
        let pontuacao = 0;
        let razao = '';
        if (l.proximo_followup) {
          if (l.proximo_followup < HOJE_STR) {
            pontuacao = 100 + dataDiffDays(l.proximo_followup, HOJE_STR);
            razao = `Follow-up atrasado (venceu ${formatDataCurta(l.proximo_followup)})`;
          } else if (l.proximo_followup === HOJE_STR) {
            pontuacao = 80;
            razao = 'Follow-up vence hoje';
          }
        }
        if (!l.proximo_followup && l.data_ult_contato) {
          const diff = dataDiffDays(l.data_ult_contato, HOJE_STR);
          if (diff > 3) {
            pontuacao = 50 + diff;
            razao = `Sem contato há ${Math.floor(diff)} dias`;
          }
        }
        return { lead: l, pontuacao, razao };
      })
      .filter(item => item.pontuacao > 0)
      .sort((a, b) => b.pontuacao - a.pontuacao)
      .slice(0, 4);
  }, [leads]);

  useEffect(() => {
    setLeads(prev => {
      let modified = false;
      const updated = prev.map(l => {
        if (l.proximo_followup && l.proximo_followup < HOJE_STR && (l.status === 'abordado' || l.status === 'em_conversa')) {
          const diff = dataDiffDays(l.proximo_followup, HOJE_STR);
          if (diff > 5) { // Só muda sozinho se passar de 5 dias
            modified = true;
            return { ...l, status: 'nao_quis' as const };
          }
        }
        return l;
      });
      return modified ? updated : prev;
    });
  }, []);

  const filteredLeads = useMemo(() => {
    let result = leads.filter(l => {
      const matchSearch = search === '' || 
        l.nome.toLowerCase().includes(search.toLowerCase()) || 
        l.instagram.toLowerCase().includes(search.toLowerCase()) || 
        l.cidade.toLowerCase().includes(search.toLowerCase());
      
      const matchTab = 
        activeTab === 'todos' ? true :
        activeTab === 'sem_contato' ? l.status === 'nao_abordado' :
        activeTab === 'ativos' ? (l.status === 'abordado' || l.status === 'em_conversa') :
        activeTab === 'perdidos' ? l.status === 'nao_quis' : true;

      const matchCat = fCategoria === '' || l.categoria === fCategoria;

      return matchSearch && matchTab && matchCat;
    });

    const peso = { quente: 3, morno: 2, frio: 1 };
    result.sort((a, b) => peso[b.classificacao] - peso[a.classificacao]);

    return result;
  }, [leads, search, activeTab, fCategoria]);

  // Metrics
  const totalLeads = leads.length;
  const quentes = leads.filter(l => l.classificacao === 'quente').length;
  const emConversa = leads.filter(l => l.status === 'em_conversa').length;
  const fechados = leads.filter(l => l.status === 'em_conversa').length; // Changed logic conceptually as true 'fechado' wasn't requested

  const abordagensHoje = leads.filter(l => l.data_1_contato === HOJE_STR).length;
  const metaAbordagens = 5;
  const pbWidth = Math.min((abordagensHoje / metaAbordagens) * 100, 100);
  const pbColor = abordagensHoje >= 5 ? 'bg-emerald-500' : abordagensHoje >= 3 ? 'bg-yellow-500' : 'bg-red-500';

  const handleStatusChange = (leadId: string, newStatus: Lead['status']) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const updated = { ...l, status: newStatus };
        if (selectedLead?.id === leadId) setSelectedLead(updated);
        return updated;
      }
      return l;
    }));
  };

  const handleDateChange = (type: 'data_1_contato' | 'data_ult_contato' | 'proximo_followup', value: string) => {
    if (!selectedLead) return;
    
    setLeads(prev => prev.map(l => {
      if (l.id === selectedLead.id) {
        const updated = { ...l, [type]: value || null };
        
        if (type === 'data_ult_contato' && value) {
          const ud = new Date(value + 'T12:00:00');
          ud.setDate(ud.getDate() + 3);
          updated.proximo_followup = ud.toISOString().split('T')[0];
        }

        setSelectedLead(updated);
        return updated;
      }
      return l;
    }));
  };

  const handleAddInteraction = () => {
    if (!selectedLead || !newInteractionText.trim()) return;
    
    const newInteraction: Interacao = {
      id: Date.now().toString(),
      data: HOJE_STR,
      texto: newInteractionText,
      registrado_por: 'Admin',
      tipo: 'mensagem'
    };

    setLeads(prev => prev.map(l => {
      if (l.id === selectedLead.id) {
        const updated = { ...l, interacoes: [...l.interacoes, newInteraction] };
        setSelectedLead(updated);
        return updated;
      }
      return l;
    }));
    
    setNewInteractionText('');
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
            <Target className="w-6 h-6 text-blue-600" />
            CRM — Leads
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Gerencie os contatos e acompanhe o progresso das abordagens.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setIsImportOpen(true)}
            className="w-full sm:w-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg px-4 py-2.5 sm:py-2 text-sm font-medium flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Importar planilha
          </button>
          <button 
            onClick={() => setIsNewLeadOpen(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 sm:py-2 text-sm font-medium flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Lead
          </button>
        </div>
      </div>

      {/* MAIN WRAPPER: Lado Esquerdo + Lado Direito */}
      <div className="flex flex-col xl:flex-row gap-6 mb-8 items-start">
        
        {/* LADO ESQUERDO: Greeting + Cards + Filters + Table */}
        <div className="flex-1 flex flex-col space-y-6 min-w-0">
          <div className="px-1">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Sua Agenda — Hoje
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              Bom dia, Murilo.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 content-start">
            {/* Card 1 */}
            <div className="bg-white dark:bg-[#121214] p-5 rounded-[20px] shadow-sm border border-zinc-100 dark:border-zinc-800/80 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex shrink-0 items-center justify-center bg-violet-50 dark:bg-violet-500/10">
                <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">Total de Leads</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight mt-0.5">{totalLeads}</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white dark:bg-[#121214] p-5 rounded-[20px] shadow-sm border border-zinc-100 dark:border-zinc-800/80 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex shrink-0 items-center justify-center bg-blue-50 dark:bg-blue-500/10">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">Em conversa</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight mt-0.5">{emConversa}</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white dark:bg-[#121214] p-5 rounded-[20px] shadow-sm border border-zinc-100 dark:border-zinc-800/80 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex shrink-0 items-center justify-center bg-orange-50 dark:bg-orange-500/10">
                <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">Follow-ups hoje</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight mt-0.5">{followupsHojeCount}</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white dark:bg-[#121214] p-5 rounded-[20px] shadow-sm border border-zinc-100 dark:border-zinc-800/80 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex shrink-0 items-center justify-center bg-emerald-50 dark:bg-emerald-500/10">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">Parcerias fechadas</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight mt-0.5">{fechados}</span>
              </div>
            </div>
          </div>



      {/* FILTERS & GOAL BAR */}
      <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800/80">
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
          <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-lg w-full xl:w-auto overflow-x-auto hide-scrollbar">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'sem_contato', label: 'Sem Contato' },
              { id: 'ativos', label: 'Ativos' },
              { id: 'perdidos', label: 'Perdidos / Não Quis' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 sm:py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap flex-1 sm:flex-none ${
                  activeTab === tab.id 
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar por nome, @ ou cidade..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-900 rounded-lg px-3 py-2.5 sm:py-1.5 text-sm focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none text-zinc-900 dark:text-white transition-all shadow-sm"
              />
            </div>
            
            <select 
              value={fCategoria} onChange={e => setFCategoria(e.target.value)}
              className="w-full sm:w-auto border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2.5 sm:py-1.5 text-sm outline-none text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all shadow-sm shrink-0"
            >
              <option value="">Todas Categorias</option>
              <option value="Nutricionista">Nutricionista</option>
              <option value="Usuário GLP-1">Usuário GLP-1</option>
              <option value="Parceria Local">Parceria Local</option>
            </select>
          </div>
        </div>
      </div>

      {/* LISTA / TABLE */}
      {/* Mobile Card View */}
      <div className="block lg:hidden space-y-3">
        {filteredLeads.map(lead => {
          const rProps = getResponsavelProps(lead.responsavel);
          const sProps = getStatusProps(lead.status);
          const isDelayed = lead.proximo_followup && lead.proximo_followup < HOJE_STR && (lead.status === 'abordado' || lead.status === 'em_conversa' || lead.status.includes('followup'));
          
          return (
            <div 
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 shadow-sm relative overflow-hidden touch-manipulation"
            >
               {isDelayed && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />}
               <div className="flex justify-between items-start mb-3">
                 <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getCategoriaClasses(lead.categoria)}`}>
                     {lead.nome.charAt(0).toUpperCase()}
                   </div>
                   <div>
                     <p className="font-bold text-[15px] leading-tight text-zinc-900 dark:text-white">{lead.nome}</p>
                     <p className="text-xs text-zinc-500 mt-0.5">{lead.instagram} • {lead.cidade}</p>
                   </div>
                 </div>
                 <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${sProps.classes}`}>
                      {sProps.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${getClassificacaoProps(lead.classificacao).classes}`}>
                      {getClassificacaoProps(lead.classificacao).label}
                    </span>
                 </div>
               </div>
               
               <div className="flex justify-between items-center text-xs pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-1">
                 <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${rProps.cor}`}>
                      {rProps.inicial}
                    </div>
                    {lead.proximo_followup ? (
                      <span className={isDelayed ? 'text-red-500 font-semibold' : ''}>
                        Fup: {formatDataCurta(lead.proximo_followup)}
                      </span>
                    ) : (
                      <span>1º Ct: {formatDataCurta(lead.data_1_contato)}</span>
                    )}
                 </div>
                 <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                   Detalhes <ChevronRight className="w-3 h-3" />
                 </span>
               </div>
            </div>
          );
        })}
        {filteredLeads.length === 0 && (
          <div className="text-center p-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-zinc-500 text-sm">
            Nenhum lead encontrado.
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Rede Social</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium text-center">Classificação</th>
                <th className="px-4 py-3 font-medium text-center">Resp.</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">1º Contato</th>
                <th className="px-4 py-3 font-medium">Follow-up</th>
                <th className="px-4 py-3 font-medium">Observação Rápida</th>
                <th className="px-4 py-3 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredLeads.map(lead => {
                const rProps = getResponsavelProps(lead.responsavel);
                const sProps = getStatusProps(lead.status);
                const isDelayed = lead.proximo_followup && lead.proximo_followup < HOJE_STR && (lead.status === 'abordado' || lead.status === 'em_conversa' || lead.status.includes('followup'));
                
                const obsRapida = lead.interacoes.length > 0 
                  ? lead.interacoes[lead.interacoes.length - 1].texto 
                  : lead.observacoes;
                const obsTruncada = obsRapida ? (obsRapida.length > 40 ? obsRapida.substring(0, 40) + '...' : obsRapida) : '—';

                return (
                  <tr 
                    key={lead.id} 
                    className={`bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer ${isDelayed ? 'border-l-2 border-l-red-500' : ''}`}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getCategoriaClasses(lead.categoria)}`}>
                          {lead.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-zinc-900 dark:text-white">{lead.nome}</p>
                          <p className="text-xs text-zinc-500">{lead.cidade}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <a 
                        href={`https://instagram.com/${lead.instagram.replace('@', '')}`}
                        target="_blank" rel="noreferrer"
                        className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1 group"
                        onClick={e => e.stopPropagation()}
                      >
                        {lead.instagram} <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap ${getCategoriaClasses(lead.categoria)}`}>
                        {lead.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap ${getClassificacaoProps(lead.classificacao).classes}`}>
                        {getClassificacaoProps(lead.classificacao).label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center font-bold text-xs ${rProps.cor}`} title={lead.responsavel}>
                        {rProps.inicial}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap ${sProps.classes}`}>
                        {sProps.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDataCurta(lead.data_1_contato)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {lead.proximo_followup ? (
                        <div className="flex items-center gap-1">
                          <span className={isDelayed ? 'text-red-500 font-medium' : 'text-zinc-500 dark:text-zinc-400'}>
                            {formatDataCurta(lead.proximo_followup)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500" title={obsRapida}>
                      {obsTruncada}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400"
                        onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-zinc-500">Nenhum lead encontrado com os filtros atuais.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
          <Pagination
            currentPage={1}
            totalPages={Math.ceil(totalLeads / 25)}
            onPageChange={() => {}}
          />
        </div>
      </div>
      
      {/* Pagination for Mobile (outside table container) */}
      <div className="block lg:hidden w-full flex justify-center py-2">
         <Pagination
            currentPage={1}
            totalPages={Math.ceil(totalLeads / 25)}
            onPageChange={() => {}}
          />
      </div>
      
      </div> {/* FECHA O LADO ESQUERDO AQUI */}

      {/* Lado Direito: Prioridades e Meta (agora rola junto com o conteúdo) */}
      <div className="xl:w-[380px] shrink-0 flex flex-col h-full">
         <div className="bg-white dark:bg-[#121214] rounded-[24px] shadow-sm border border-zinc-100 dark:border-zinc-800/80 p-6 flex-1 flex flex-col">
           <div className="flex items-center gap-2 mb-6 shrink-0">
             <AlertTriangle className="w-5 h-5 text-amber-500" />
             <h3 className="font-semibold text-zinc-900 dark:text-white tracking-tight">Atenções & Prioridades</h3>
           </div>

           <div className="mb-6 bg-zinc-50 dark:bg-zinc-800/30 p-5 rounded-[20px] border border-zinc-100 dark:border-zinc-800/50 shrink-0">
             <div className="flex justify-between items-end mb-2">
               <span className="text-sm font-semibold tracking-tight text-zinc-700 dark:text-zinc-300">Meta diária de abordagens</span>
               <span className="text-sm font-bold text-zinc-900 dark:text-white">{abordagensHoje} / {metaAbordagens}</span>
             </div>
             <div className="w-full h-2.5 bg-zinc-200 dark:bg-zinc-700/50 rounded-full overflow-hidden mt-3">
               <div className={`h-full ${pbColor} transition-all`} style={{ width: `${pbWidth}%` }} />
             </div>
             {abordagensHoje < metaAbordagens ? (
               <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-3">
                 Faltam <span className="text-zinc-700 dark:text-zinc-300 font-bold">{metaAbordagens - abordagensHoje} abordagens</span> para bater a meta.
               </p>
             ) : (
               <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-3">
                 Meta do dia atingida! Parabéns!
               </p>
             )}
           </div>

           {followupsAtrasadosCount > 0 && (
             <div className="mb-6 flex items-center justify-between p-4 bg-red-50 dark:bg-red-500/10 rounded-[20px] border border-red-100 dark:border-red-500/20 shrink-0">
               <div className="flex items-center gap-3">
                 <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                 <span className="text-sm font-semibold tracking-tight text-red-900 dark:text-red-300">Follow-ups atrasados</span>
               </div>
               <span className="text-xl font-bold text-red-600 dark:text-red-400">{followupsAtrasadosCount}</span>
             </div>
           )}

           <div className="flex-1 flex flex-col space-y-3 mb-6">
             <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1 ml-1.5">Resolver Hoje</h4>
             {prioridades.map(p => (
               <div 
                 key={p.lead.id} 
                 onClick={() => setSelectedLead(p.lead)} 
                 className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-800/20 rounded-[16px] border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 cursor-pointer transition-colors group shadow-sm dark:shadow-none shrink-0"
               >
                 <div className="flex items-center gap-3.5">
                   <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${getCategoriaClasses(p.lead.categoria)}`}>
                     {p.lead.nome.charAt(0).toUpperCase()}
                   </div>
                   <div className="min-w-0">
                     <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-none mb-1.5 truncate">{p.lead.nome}</p>
                     <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 leading-none truncate">{p.razao}</p>
                   </div>
                 </div>
                 <ChevronRight className="w-4 h-4 shrink-0 text-zinc-300 group-hover:text-zinc-500 transition-colors ml-2" />
               </div>
             ))}
             {prioridades.length === 0 && (
               <div className="text-sm text-zinc-500 text-center py-6 shrink-0">
                 Tudo em dia!
               </div>
             )}
           </div>

           <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 mt-auto">
             <div className="bg-zinc-50 dark:bg-zinc-800/20 rounded-xl p-4 flex items-center justify-between">
                <div>
                   <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 mb-0.5">Status Geral</p>
                   <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Fila organizada</p>
                </div>
                <Sparkles className="w-5 h-5 text-blue-500" />
             </div>
             <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center mt-4">
               Atualizado em tempo real • CRM V0
             </p>
           </div>
         </div>
      </div>
    </div>

      {/* MODAL DETALHES */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setSelectedLead(null)} />
          <div className="relative w-full h-full sm:h-auto sm:max-w-3xl bg-white dark:bg-zinc-900 sm:shadow-2xl sm:rounded-2xl flex flex-col sm:max-h-[85vh] border-0 sm:border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-6 sm:px-6 sm:py-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 pt-8 sm:pt-5 transition-all">
              <button 
                onClick={() => setSelectedLead(null)}
                className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex gap-4 items-center pr-12">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl ${getCategoriaClasses(selectedLead.categoria)}`}>
                  {selectedLead.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{selectedLead.nome}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-zinc-500">
                    <a href={`https://instagram.com/${selectedLead.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1 group">
                      {selectedLead.instagram}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <span>•</span>
                    <span>{selectedLead.cidade}</span>
                    <span>•</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${getCategoriaClasses(selectedLead.categoria)}`}>
                      {selectedLead.categoria}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${getClassificacaoProps(selectedLead.classificacao).classes}`}>
                      {getClassificacaoProps(selectedLead.classificacao).label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Scroll */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col md:flex-row gap-6 sm:gap-8 pb-8 sm:pb-6">
              
              {/* Infos Sidebar */}
              <div className="w-full md:w-64 space-y-4 sm:space-y-5 shrink-0">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Status do Lead</label>
                  <select 
                    value={selectedLead.status}
                    onChange={(e) => handleStatusChange(selectedLead.id, e.target.value as Lead['status'])}
                    className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-shadow"
                  >
                    <option value="nao_abordado">Não abordado</option>
                    <option value="abordado">Abordado</option>
                    <option value="em_conversa">Em conversa</option>
                    <option value="nao_quis">Não quis</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Responsável</label>
                  <div className="w-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 capitalize flex items-center gap-2 cursor-not-allowed">
                     {selectedLead.responsavel}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">1º Contato</label>
                    <input 
                      type="date" 
                      value={selectedLead.data_1_contato || ''}
                      onChange={e => handleDateChange('data_1_contato', e.target.value)}
                      className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Último Contato</label>
                    <input 
                      type="date" 
                      value={selectedLead.data_ult_contato || ''}
                      onChange={e => handleDateChange('data_ult_contato', e.target.value)}
                      className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Próx. Follow-up</label>
                    <input 
                      type="date" 
                      value={selectedLead.proximo_followup || ''}
                      onChange={e => handleDateChange('proximo_followup', e.target.value)}
                      className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-shadow"
                    />
                  </div>
                </div>
              </div>

              {/* Histórico */}
              <div className="flex-1 min-w-0 border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-800 pt-8 md:pt-0 md:pl-8">
                <h3 className="font-semibold text-lg text-zinc-900 dark:text-white mb-6">Histórico de Interações</h3>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-[2px] before:bg-zinc-100 dark:before:bg-zinc-800">
                  {selectedLead.interacoes.length === 0 ? (
                    <p className="text-sm text-zinc-500 pl-14 pb-4">Nenhuma interação registrada.</p>
                  ) : (
                    selectedLead.interacoes.map(int => (
                      <div key={int.id} className="relative flex items-start gap-4">
                         <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                            {int.tipo === 'fechado' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : 
                             int.tipo === 'nao_quis' ? <XCircle className="w-4 h-4 text-rose-500" /> : 
                             <MessageSquare className="w-4 h-4" />}
                         </div>
                         <div className="flex-1 pt-1 border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                               <span className="text-sm font-semibold text-zinc-900 dark:text-white">{int.registrado_por}</span>
                               <span className="text-xs font-medium text-zinc-400">{formatDataCurta(int.data)}</span>
                            </div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
                                {int.texto}
                            </div>
                         </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Add Interaction */}
            <div className="p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/50">
               <textarea 
                  value={newInteractionText}
                  onChange={e => setNewInteractionText(e.target.value)}
                  placeholder="Registrar nova interação com este lead..."
                  className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none text-zinc-900 dark:text-white resize-none h-24 mb-3 transition-shadow"
               />
               <div className="flex justify-end pr-1">
                  <button onClick={handleAddInteraction} className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={!newInteractionText.trim()}>
                     Salvar Interação
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO LEAD */}
      {isNewLeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 pb-0 h-[100dvh]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsNewLeadOpen(false)} />
          <div className="relative w-full sm:max-w-lg bg-white dark:bg-zinc-900 shadow-2xl rounded-t-[32px] sm:rounded-2xl p-6 pb-8 border border-zinc-200 dark:border-zinc-800 mt-auto sm:mt-0 max-h-[90dvh] overflow-y-auto animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
             <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-6 sm:hidden" />
             <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Adicionar Lead</h2>
             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nome*</label>
                   <input type="text" className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Instagram*</label>
                   <input type="text" placeholder="@handle" className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Categoria*</label>
                      <select className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none">
                         <option>Nutricionista</option><option>Usuário GLP-1</option><option>Parceria Local</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Cidade</label>
                      <input type="text" className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Classificação*</label>
                      <select className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none">
                         <option>🔥 Quente</option><option>🌡️ Morno</option><option>❄️ Frio</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Responsável*</label>
                      <select className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none">
                         <option>Gustavo</option><option>Murilo</option><option>Lucas</option>
                      </select>
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Observação inicial</label>
                   <textarea className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none resize-none h-16" />
                </div>
             </div>
             <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setIsNewLeadOpen(false)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg px-4 py-2 text-sm font-medium">
                   Cancelar
                </button>
                <button onClick={() => setIsNewLeadOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium">
                   Adicionar Lead
                </button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAR */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 h-[100dvh]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsImportOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-white dark:bg-zinc-900 shadow-2xl rounded-t-[32px] sm:rounded-2xl p-6 pb-8 border border-zinc-200 dark:border-zinc-800 mt-auto sm:mt-0 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
             <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-6 sm:hidden" />
             <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Importar Leads</h2>
             
             <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <div className="bg-blue-50 dark:bg-blue-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                   <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">Arraste o arquivo .xlsx aqui ou clique para selecionar</p>
                <p className="text-xs text-zinc-500 mt-1">Aceita .xlsx e .csv</p>
             </div>

             <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setIsImportOpen(false)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg px-4 py-2 text-sm font-medium">
                   Cancelar
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
