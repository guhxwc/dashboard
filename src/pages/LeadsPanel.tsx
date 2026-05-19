import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Target, Search, Plus, Upload, MoreHorizontal, MessageSquare, CheckCircle, XCircle, X, ExternalLink, Calendar, Users, AlertCircle, AlertTriangle, ThermometerSun, Snowflake, Flame, ChevronRight, Sparkles, Loader2, Check, Download, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Pagination } from '@/components/Pagination';
import {
  leadsService, recalcularLeadStatus,
  type Lead, type Interacao, type ImportResult, type XLSXPreview,
  type LeadCategoria, type LeadClassificacao, type LeadResponsavel, type LeadStatus
} from '@/services/leadsService';

const HOJE_STR = new Date().toISOString().split('T')[0];

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

export function LeadsPanel({ session }: { session?: any } = {}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Default category filter based on user email
  const defaultCategory = useMemo(() => {
    const email = session?.user?.email?.toLowerCase() || '';
    if (email === 'murilobarbosaguimaraes345@gmail.com') return 'Usuário GLP-1';
    if (email === 'lucascauan2007@gmail.com' || email === 'gustavo.500fyz@gmail.com') return 'Nutricionista';
    return '';
  }, [session]);

  // Filters
  const [search, setSearch] = useState('');
  const [fCategoria, setFCategoria] = useState(defaultCategory);
  const [activeTab, setActiveTab] = useState<'todos' | 'sem_contato' | 'ativos' | 'perdidos'>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals/Drawers
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  // Export modal
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportType, setExportType] = useState<'hoje' | 'semana' | 'tudo' | 'data'>('hoje');
  const [exportDate, setExportDate] = useState<string>(HOJE_STR);
  const [exportResp, setExportResp] = useState<string>('todos');
  const [exportCat, setExportCat] = useState<string>('todas');

  // Default responsavel
  const defaultResponsavel = useMemo(() => {
    const email = session?.user?.email?.toLowerCase() || '';
    if (email === 'murilobarbosaguimaraes345@gmail.com') return 'murilo';
    if (email === 'lucascauan2007@gmail.com') return 'lucas';
    return 'gustavo';
  }, [session]) as LeadResponsavel;

  // New Interaction
  const [newInteractionText, setNewInteractionText] = useState('');

  // New Lead form
  const [newLeadForm, setNewLeadForm] = useState({
    nome: '', instagram: '', categoria: defaultCategory || 'Nutricionista',
    cidade: '', classificacao: 'quente' as LeadClassificacao,
    responsavel: defaultResponsavel, observacoes: '',
  });

  // Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<XLSXPreview | null>(null);
  const [importResponsavel, setImportResponsavel] = useState<LeadResponsavel>(defaultResponsavel);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Carregar leads do banco ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await leadsService.list();
        if (!mounted) return;
        const recalc = data.map(recalcularLeadStatus);
        setLeads(recalc);
        // Persiste mudanças automáticas de status no banco
        for (let i = 0; i < data.length; i++) {
          if (data[i].status !== recalc[i].status || data[i].proximo_followup !== recalc[i].proximo_followup) {
            leadsService.update(recalc[i].id, {
              status: recalc[i].status,
              proximo_followup: recalc[i].proximo_followup,
            }).catch(() => {});
          }
        }
      } catch (e: any) {
        if (mounted) setToast({ msg: 'Erro ao carregar leads', type: 'err' });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

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
          if (diff > 3) { pontuacao = 50 + diff; razao = `Sem contato há ${Math.floor(diff)} dias`; }
        }
        return { lead: l, pontuacao, razao };
      })
      .filter(item => item.pontuacao > 0)
      .sort((a, b) => b.pontuacao - a.pontuacao)
      .slice(0, 4);
  }, [leads]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, fCategoria, activeTab]);

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
        activeTab === 'perdidos' ? (l.status === 'nao_quis' || l.status === 'sem_resposta') : true;
      const matchCat = fCategoria === '' || l.categoria === fCategoria;
      return matchSearch && matchTab && matchCat;
    });
    const peso: Record<string, number> = { quente: 3, morno: 2, frio: 1 };
    result.sort((a, b) => peso[b.classificacao] - peso[a.classificacao]);
    return result;
  }, [leads, search, activeTab, fCategoria]);

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Metrics
  const totalLeads = leads.length;
  const quentes = leads.filter(l => l.classificacao === 'quente').length;
  const emConversa = leads.filter(l => l.status === 'em_conversa').length;
  const fechados = leads.filter(l => l.status === 'fechado_assinante' || l.status === 'fechado_parceiro').length;

  const abordagensHoje = leads.filter(l => l.data_1_contato === HOJE_STR).length;
  const metaAbordagens = 5;
  const pbWidth = Math.min((abordagensHoje / metaAbordagens) * 100, 100);
  const pbColor = abordagensHoje >= 5 ? 'bg-emerald-500' : abordagensHoje >= 3 ? 'bg-yellow-500' : 'bg-red-500';
  // ── Handlers integrados com o banco ─────────────────────────────────────

  const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    // Optimistic update
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      const updated = { ...l, status: newStatus };
      if (selectedLead?.id === leadId) setSelectedLead(updated);
      return updated;
    }));
    try {
      await leadsService.update(leadId, { status: newStatus });
      // Auto-interação de mudança de status
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        await leadsService.addInteracao(leadId, {
          data: HOJE_STR, tipo: 'status_change',
          texto: `Status alterado para "${getStatusProps(newStatus).label}"`,
          registrado_por: 'Admin',
        });
        const interacoes = await leadsService.list().then(ls => ls.find(l => l.id === leadId)?.interacoes ?? []);
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, interacoes } : l));
        if (selectedLead?.id === leadId) setSelectedLead(s => s ? { ...s, interacoes } : s);
      }
    } catch {
      setToast({ msg: 'Erro ao atualizar status', type: 'err' });
    }
  };

  const handleResponsavelChange = async (leadId: string, newResponsavel: LeadResponsavel) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      const updated = { ...l, responsavel: newResponsavel };
      if (selectedLead?.id === leadId) setSelectedLead(updated);
      return updated;
    }));
    try {
      await leadsService.update(leadId, { responsavel: newResponsavel });
    } catch {
      setToast({ msg: 'Erro ao atualizar responsável', type: 'err' });
    }
  };

  const handleResetLead = async () => {
    if (!selectedLead) return;
    
    if (!window.confirm('Tem certeza que deseja redefinir o lead para o estado inicial? Isso apagará as datas e voltará o status para "Não Abordado".')) return;

    const patch: Partial<Lead> = {
      status: 'nao_abordado',
      data_1_contato: null,
      data_ult_contato: null,
      proximo_followup: null,
    };
    
    const updated = { ...selectedLead, ...patch };
    setSelectedLead(updated);
    setLeads(prev => prev.map(l => l.id === selectedLead.id ? updated : l));
    
    try { 
      await leadsService.update(selectedLead.id, patch);
      setToast({ msg: 'Lead redefinido com sucesso.', type: 'ok' });
    }
    catch { 
      setToast({ msg: 'Erro ao redefinir lead', type: 'err' }); 
    }
  };

  const handleDateChange = async (type: 'data_1_contato' | 'data_ult_contato' | 'proximo_followup', value: string) => {
    if (!selectedLead) return;
    const patch: Partial<Lead> = { [type]: value || null };

    if (type === 'data_1_contato' && value === HOJE_STR && selectedLead.status === 'nao_abordado') {
      patch.status = 'abordado';
    }
    if (type === 'data_ult_contato' && value) {
      const ud = new Date(value + 'T12:00:00');
      ud.setDate(ud.getDate() + 3);
      patch.proximo_followup = ud.toISOString().split('T')[0];
    }

    const updated = { ...selectedLead, ...patch };
    setSelectedLead(updated);
    setLeads(prev => prev.map(l => l.id === selectedLead.id ? updated : l));
    try { await leadsService.update(selectedLead.id, patch); }
    catch { setToast({ msg: 'Erro ao salvar data', type: 'err' }); }
  };

  const handleObservacoesChange = (value: string) => {
    if (!selectedLead) return;
    const updated = { ...selectedLead, observacoes: value };
    setSelectedLead(updated);
    setLeads(prev => prev.map(l => l.id === selectedLead.id ? updated : l));
  };

  const handleObservacoesBlur = async () => {
    if (!selectedLead) return;
    try { await leadsService.update(selectedLead.id, { observacoes: selectedLead.observacoes }); }
    catch { setToast({ msg: 'Erro ao salvar observações', type: 'err' }); }
  };

  const handleAddInteraction = async () => {
    if (!selectedLead || !newInteractionText.trim()) return;
    setSaving(true);
    try {
      const saved = await leadsService.addInteracao(selectedLead.id, {
        data: HOJE_STR, texto: newInteractionText.trim(),
        registrado_por: 'Admin', tipo: 'mensagem',
      });
      const updated = { ...selectedLead, interacoes: [...selectedLead.interacoes, saved] };
      setSelectedLead(updated);
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? updated : l));
      setNewInteractionText('');
      setToast({ msg: 'Interação salva!', type: 'ok' });
    } catch {
      setToast({ msg: 'Erro ao salvar interação', type: 'err' });
    } finally { setSaving(false); }
  };

  const handleCreateLead = async () => {
    if (!newLeadForm.nome || !newLeadForm.instagram) return;
    setSaving(true);
    try {
      const created = await leadsService.create({ ...newLeadForm, categoria: newLeadForm.categoria as LeadCategoria, status: 'nao_abordado', data_1_contato: null, data_ult_contato: null, proximo_followup: null });
      setLeads(prev => [created, ...prev]);
      setIsNewLeadOpen(false);
      setNewLeadForm({ nome: '', instagram: '', categoria: defaultCategory as LeadCategoria || 'Nutricionista', cidade: '', classificacao: 'quente', responsavel: defaultResponsavel, observacoes: '' });
      setToast({ msg: 'Lead criado com sucesso!', type: 'ok' });
    } catch (e: any) {
      setToast({ msg: e.message?.includes('unique') ? 'Instagram já cadastrado.' : 'Erro ao criar lead.', type: 'err' });
    } finally { setSaving(false); }
  };

  const handleFileSelect = async (file: File) => {
    setImportFile(file);
    setImportResult(null);
    try {
      const preview = await leadsService.previewXLSX(file);
      setImportPreview(preview);
    } catch { setToast({ msg: 'Erro ao ler arquivo', type: 'err' }); }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const result = await leadsService.importFromXLSX(importFile, importResponsavel);
      setImportResult(result);
      if (result.importados > 0) {
        const freshLeads = await leadsService.list();
        setLeads(freshLeads.map(recalcularLeadStatus));
      }
      setToast({ msg: `${result.importados} leads importados! ${result.duplicados} duplicados ignorados.`, type: result.erros > 0 ? 'err' : 'ok' });
    } catch { setToast({ msg: 'Erro ao importar', type: 'err' }); }
    finally { setImporting(false); }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const hoje = new Date();
    const hojeStr = HOJE_STR;
    
    // Calcula datas do período
    let inicioData = '';
    let fimData = '';
    
    if (exportType === 'hoje') {
      inicioData = hojeStr;
      fimData = hojeStr;
    } else if (exportType === 'data') {
      inicioData = exportDate;
      fimData = exportDate;
    } else if (exportType === 'semana') {
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - hoje.getDay()); // Domingo
      inicioData = inicio.toISOString().split('T')[0];
      const fim = new Date(inicio);
      fim.setDate(inicio.getDate() + 6); // Sábado
      fimData = fim.toISOString().split('T')[0];
    }
    
    // Filtrar os leads pelo filtro "responsavel" e "categoria"
    let leadsBase = leads;
    if (exportResp !== 'todos') leadsBase = leadsBase.filter(l => l.responsavel === exportResp);
    if (exportCat !== 'todas') leadsBase = leadsBase.filter(l => l.categoria === exportCat);

    // Calcular estatísticas com base no período
    let leadsConsiderados = [...leadsBase];
    let abordagensNoPeriodo = 0;
    let interacoesNoPeriodo = 0;
    let fechamentosNoPeriodo = 0;

    if (exportType !== 'tudo') {
      // Filtrar apenas leads que tiveram alguma atividade no período
      leadsConsiderados = leadsBase.filter(l => {
        const abordadoNoPeriodo = l.data_1_contato && l.data_1_contato >= inicioData && l.data_1_contato <= fimData;
        const interagiuNoPeriodo = l.interacoes.some(i => i.data >= inicioData && i.data <= fimData);
        return abordadoNoPeriodo || interagiuNoPeriodo;
      });
      
      // Contagens
      abordagensNoPeriodo = leadsBase.filter(l => l.data_1_contato && l.data_1_contato >= inicioData && l.data_1_contato <= fimData).length;
      interacoesNoPeriodo = leadsBase.reduce((acc, l) => acc + l.interacoes.filter(i => i.data >= inicioData && i.data <= fimData).length, 0);
      fechamentosNoPeriodo = leadsBase.reduce((acc, l) => acc + l.interacoes.filter(i => (i.tipo === 'fechado' || l.status.startsWith('fechado')) && i.data >= inicioData && i.data <= fimData).length, 0);
    } else {
      abordagensNoPeriodo = leadsBase.filter(l => l.data_1_contato).length;
      interacoesNoPeriodo = leadsBase.reduce((acc, l) => acc + l.interacoes.length, 0);
      fechamentosNoPeriodo = leadsBase.filter(l => l.status.startsWith('fechado')).length;
    }

    const tableData = leadsConsiderados.map(l => [
      l.nome,
      l.instagram,
      l.categoria,
      l.responsavel.charAt(0).toUpperCase() + l.responsavel.slice(1),
      getStatusProps(l.status).label,
      formatDataCurta(l.data_1_contato),
      formatDataCurta(l.proximo_followup)
    ]);

    let title = "Relatório de Desempenho - Leads";
    if (exportType === 'hoje') title += " (Diário)";
    if (exportType === 'data') title += ` (${formatDataCurta(exportDate)})`;
    if (exportType === 'semana') title += " (Semanal)";
    if (exportType === 'tudo') title += " (Geral)";

    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(title, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const dataSub = exportType === 'tudo' ? 'Período: Completo' : (exportType === 'hoje' ? `Data: ${formatDataCurta(hojeStr)}` : exportType === 'data' ? `Data: ${formatDataCurta(exportDate)}` : `Período: ${formatDataCurta(inicioData)} a ${formatDataCurta(fimData)}`);
    const respSub = `Responsável: ${exportResp === 'todos' ? 'Todos' : exportResp.charAt(0).toUpperCase() + exportResp.slice(1)}`;
    const catSub = `Categoria: ${exportCat === 'todas' ? 'Todas' : exportCat}`;
    
    doc.text(dataSub, 14, 28);
    doc.text(`${respSub}  |  ${catSub}`, 14, 34);

    // Caixas de métricas 
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 40, 55, 20, 2, 2, 'FD');
    doc.roundedRect(74, 40, 55, 20, 2, 2, 'FD');
    doc.roundedRect(134, 40, 55, 20, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Novas Abordagens", 19, 47);
    doc.text("Total Interações", 79, 47);
    doc.text("Fechamentos", 139, 47);

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(String(abordagensNoPeriodo), 19, 56);
    doc.text(String(interacoesNoPeriodo), 79, 56);
    doc.text(String(fechamentosNoPeriodo), 139, 56);

    autoTable(doc, {
      startY: 70,
      head: [['Lead', 'Rede Social', 'Categoria', 'Resp.', 'Status', '1º Contato', 'Próx. Follow-up']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`relatorio-leads-${exportType}.pdf`);
    setIsExportOpen(false);
    setToast({ msg: 'PDF gerado com sucesso!', type: 'ok' });
  };

  // Loading state
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <span className="text-sm text-zinc-500 dark:text-zinc-400">Carregando leads...</span>
    </div>
  );

  return (
    <div className="space-y-6 max-w-full">
      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-bottom-4 ${toast.type === 'ok' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          {toast.type === 'ok' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
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
            onClick={() => setIsExportOpen(true)}
            className="w-full sm:w-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg px-4 py-2.5 sm:py-2 text-sm font-medium flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
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
      <div className="flex flex-col xl:flex-row gap-6 mb-8 items-start w-full">
        
        {/* LADO ESQUERDO: Greeting + Cards + Filters + Table */}
        <div className="flex-1 flex flex-col space-y-6 min-w-0 w-full">


          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 content-start">
            {/* Card 1 */}
            <div className="bg-white dark:bg-[#121214] p-5 rounded-[20px] shadow-sm border border-zinc-100 dark:border-zinc-800/80 flex items-center gap-4 w-full">
              <div className="w-12 h-12 rounded-full flex shrink-0 items-center justify-center bg-violet-50 dark:bg-violet-500/10">
                <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate">Total de Leads</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight mt-0.5">{totalLeads}</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white dark:bg-[#121214] p-5 rounded-[20px] shadow-sm border border-zinc-100 dark:border-zinc-800/80 flex items-center gap-4 w-full">
              <div className="w-12 h-12 rounded-full flex shrink-0 items-center justify-center bg-blue-50 dark:bg-blue-500/10">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate">Em conversa</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight mt-0.5">{emConversa}</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white dark:bg-[#121214] p-5 rounded-[20px] shadow-sm border border-zinc-100 dark:border-zinc-800/80 flex items-center gap-4 w-full">
              <div className="w-12 h-12 rounded-full flex shrink-0 items-center justify-center bg-orange-50 dark:bg-orange-500/10">
                <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate">Follow-ups hoje</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight mt-0.5">{followupsHojeCount}</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white dark:bg-[#121214] p-5 rounded-[20px] shadow-sm border border-zinc-100 dark:border-zinc-800/80 flex items-center gap-4 w-full">
              <div className="w-12 h-12 rounded-full flex shrink-0 items-center justify-center bg-emerald-50 dark:bg-emerald-500/10">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate">Parcerias fechadas</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight mt-0.5">{fechados}</span>
              </div>
            </div>
          </div>



      {/* FILTERS & GOAL BAR */}
      <div className="bg-white dark:bg-[#121214] p-3 sm:p-5 rounded-[24px] shadow-md border border-zinc-100 dark:border-zinc-800/80 w-full overflow-hidden">
        <div className="flex flex-col xl:flex-row gap-5 justify-between items-start xl:items-center w-full">
          <div className="flex bg-zinc-100 dark:bg-zinc-800/40 p-1.5 rounded-xl w-full xl:w-auto overflow-x-auto hide-scrollbar scroll-smooth">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'sem_contato', label: 'Sem Contato' },
              { id: 'ativos', label: 'Ativos' },
              { id: 'perdidos', label: 'Perdidos / Não Quis' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2 sm:py-1.5 text-sm font-bold rounded-lg transition-all whitespace-nowrap flex-1 sm:flex-none ${
                  activeTab === tab.id 
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="relative w-full sm:w-80 shrink-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar por nome, @ ou cidade..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 rounded-xl px-3 py-3 sm:py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none text-zinc-900 dark:text-white transition-all shadow-inner"
              />
            </div>
            
            <select 
              value={fCategoria} onChange={e => setFCategoria(e.target.value)}
              className="w-full sm:w-auto border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl px-4 py-3 sm:py-2 text-sm outline-none text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all shadow-inner cursor-pointer"
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
      <div className="block lg:hidden space-y-4">
        <AnimatePresence mode="popLayout">
          {paginatedLeads.map((lead, index) => {
            const rProps = getResponsavelProps(lead.responsavel);
            const sProps = getStatusProps(lead.status);
            const isDelayed = lead.proximo_followup && lead.proximo_followup < HOJE_STR && (lead.status === 'abordado' || lead.status === 'em_conversa' || lead.status.includes('followup'));
            const classificacao = getClassificacaoProps(lead.classificacao);
            
            return (
              <motion.div 
                key={lead.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedLead(lead)}
                className="bg-white dark:bg-[#121214] border border-zinc-100 dark:border-zinc-800 rounded-[28px] p-4 sm:p-5 shadow-sm active:scale-[0.98] transition-transform relative overflow-hidden touch-manipulation mx-0.5"
              >
                 {isDelayed && (
                   <div className="absolute top-0 right-0 p-1.5 bg-red-500 text-white rounded-bl-xl">
                     <AlertCircle className="w-3.5 h-3.5" />
                   </div>
                 )}
                 
                 <div className="flex items-start justify-between gap-4">
                   <div className="flex items-center gap-4">
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-sm ${getCategoriaClasses(lead.categoria)}`}>
                       {lead.nome.charAt(0).toUpperCase()}
                     </div>
                     <div className="min-w-0">
                       <h3 className="font-bold text-lg leading-tight text-zinc-900 dark:text-white truncate pr-2">{lead.nome}</h3>
                       <div className="flex items-center gap-2 mt-1">
                          <span className="text-zinc-500 text-sm truncate">{lead.instagram}</span>
                          <span className="text-zinc-300 dark:text-zinc-700">•</span>
                          <span className="text-zinc-500 text-sm truncate">{lead.cidade}</span>
                       </div>
                     </div>
                   </div>
                 </div>

                 <div className="flex flex-wrap gap-2 mt-5">
                   <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase flex items-center gap-1.5 shadow-sm ${sProps.classes}`}>
                     <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                     {sProps.label}
                   </span>
                   <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase flex items-center gap-1.5 shadow-sm ${classificacao.classes}`}>
                      {classificacao.label === 'Quente' && <Flame className="w-3 h-3" />}
                      {classificacao.label === 'Morno' && <ThermometerSun className="w-3 h-3" />}
                      {classificacao.label === 'Frio' && <Snowflake className="w-3 h-3" />}
                      {classificacao.label}
                   </span>
                 </div>

                 <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-zinc-50 dark:border-zinc-800/50">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] lowercase text-zinc-400 font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Responsável</span>
                      <div className="flex items-center gap-2">
                         <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm ${rProps.cor}`}>
                          {rProps.inicial}
                         </div>
                         <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{lead.responsavel.charAt(0).toUpperCase() + lead.responsavel.slice(1)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end text-right">
                      <span className="text-[10px] lowercase text-zinc-400 font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        {lead.proximo_followup ? 'Próximo Follow-up' : '1º Contato'}
                      </span>
                      <span className={`text-sm font-bold ${isDelayed ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                         {lead.proximo_followup ? formatDataCurta(lead.proximo_followup) : formatDataCurta(lead.data_1_contato)}
                      </span>
                    </div>
                 </div>
                 
                 <div className="mt-5 flex items-center justify-center py-2 bg-zinc-50 dark:bg-zinc-800/20 rounded-xl">
                    <span className="text-zinc-500 dark:text-zinc-400 text-xs font-bold flex items-center gap-2">
                      Tocar para abrir detalhes <ChevronRight className="w-4 h-4 opacity-50" />
                    </span>
                 </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filteredLeads.length === 0 && (
          <div className="text-center p-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-zinc-500 text-sm">
            Nenhum lead encontrado.
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
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
                <th className="px-4 py-3 font-medium max-w-[250px]">Obs.</th>
                <th className="px-4 py-3 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {paginatedLeads.map(lead => {
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
                    <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 max-w-[250px] truncate" title={obsRapida}>
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
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
      
      {/* Pagination for Mobile (outside table container) */}
      <div className="block lg:hidden w-full flex justify-center py-2">
         <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
      </div>
      
      </div> {/* FECHA O LADO ESQUERDO AQUI */}
      {/* Lado Direito: Prioridades e Meta (agora rola junto com o conteúdo) */}
      <div className="w-full xl:w-[380px] shrink-0 flex flex-col h-full">
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

      {/* Floating Action Button for Mobile */}
      <div className="lg:hidden fixed bottom-20 right-6 z-40">
        <motion.button
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsNewLeadOpen(true)}
          className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-[0_8px_30px_rgb(37,99,235,0.4)] flex items-center justify-center"
        >
          <Plus className="w-8 h-8" />
        </motion.button>
      </div>
      {/* MODAL DETALHES */}
      {selectedLead && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 h-[100dvh]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedLead(null)} />
          <div className="relative w-full h-[92dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-4xl bg-white dark:bg-zinc-900 sm:shadow-2xl rounded-t-[32px] sm:rounded-2xl flex flex-col border-t sm:border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
            <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
            
            {/* Modal Header */}
            <div className="px-5 pb-4 pt-1 sm:pt-5 sm:px-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 flex-shrink-0 relative">
              <button 
                onClick={() => setSelectedLead(null)}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
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
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 sm:p-6 flex flex-col md:flex-row gap-6 sm:gap-8 pb-8 sm:pb-6">
              
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
                  <select 
                    value={selectedLead.responsavel}
                    onChange={(e) => handleResponsavelChange(selectedLead.id, e.target.value as LeadResponsavel)}
                    className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none text-zinc-900 dark:text-white capitalize focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-shadow"
                  >
                     <option value="gustavo">Gustavo</option>
                     <option value="murilo">Murilo</option>
                     <option value="lucas">Lucas</option>
                     <option value="nicolas">Nicolas</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">1º Contato</label>
                      {selectedLead.data_1_contato && (
                        <button onClick={() => handleDateChange('data_1_contato', '')} className="text-zinc-400 hover:text-rose-500 transition-colors" title="Limpar data">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input 
                      type="date" 
                      value={selectedLead.data_1_contato || ''}
                      onChange={e => handleDateChange('data_1_contato', e.target.value)}
                      className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-shadow"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Último Contato</label>
                      {selectedLead.data_ult_contato && (
                        <button onClick={() => handleDateChange('data_ult_contato', '')} className="text-zinc-400 hover:text-rose-500 transition-colors" title="Limpar data">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input 
                      type="date" 
                      value={selectedLead.data_ult_contato || ''}
                      onChange={e => handleDateChange('data_ult_contato', e.target.value)}
                      className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-shadow"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Próx. Follow-up</label>
                      {selectedLead.proximo_followup && (
                        <button onClick={() => handleDateChange('proximo_followup', '')} className="text-zinc-400 hover:text-rose-500 transition-colors" title="Limpar data">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input 
                      type="date" 
                      value={selectedLead.proximo_followup || ''}
                      onChange={e => handleDateChange('proximo_followup', e.target.value)}
                      className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-shadow"
                    />
                  </div>
                </div>
                
                <div className="pt-6 mt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button 
                    onClick={handleResetLead} 
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-rose-600 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg transition-colors border border-rose-200 dark:border-rose-500/20"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Redefinir Lead
                  </button>
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

                {/* Observações Gerais */}
                <div className="pt-6 mt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <h3 className="font-semibold text-lg text-zinc-900 dark:text-white mb-3">Observações Gerais</h3>
                  <textarea 
                    value={selectedLead.observacoes || ''}
                    onChange={e => handleObservacoesChange(e.target.value)}
                    onBlur={handleObservacoesBlur}
                    placeholder="Ex: toma ozempic, usa ativamente..."
                    className="w-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none text-zinc-900 dark:text-white resize-y min-h-[120px] transition-shadow shadow-sm"
                  />
                  <p className="text-xs text-zinc-500 mt-2">As observações são salvas automaticamente ao sair do campo.</p>
                </div>
              </div>

            </div>

            {/* Add Interaction */}
            <div className="p-4 sm:p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/50 pb-8 sm:pb-5 flex-shrink-0">
               <textarea 
                  value={newInteractionText}
                  onChange={e => setNewInteractionText(e.target.value)}
                  placeholder="Registrar nova interação com este lead..."
                  className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none text-zinc-900 dark:text-white resize-none h-20 sm:h-24 mb-3 transition-shadow"
               />
               <div className="flex justify-end pr-1">
                  <button onClick={handleAddInteraction} disabled={!newInteractionText.trim() || saving} className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-white rounded-lg px-5 py-2 sm:py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                     {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                     Salvar Interação
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL NOVO LEAD */}
      {isNewLeadOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 h-[100dvh]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsNewLeadOpen(false)} />
          <div className="relative w-full sm:max-w-lg bg-white dark:bg-zinc-900 shadow-2xl rounded-t-[32px] sm:rounded-2xl p-6 pb-8 border-t sm:border border-zinc-200 dark:border-zinc-800 mt-auto sm:mt-0 max-h-[90dvh] overflow-y-auto animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
             <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-6 sm:hidden shrink-0" />
             <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Adicionar Lead</h2>
             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nome*</label>
                   <input type="text" value={newLeadForm.nome} onChange={e => setNewLeadForm(f => ({ ...f, nome: e.target.value }))} className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-white" placeholder="Nome do lead" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Instagram*</label>
                   <input type="text" value={newLeadForm.instagram} onChange={e => setNewLeadForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@handle" className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Categoria*</label>
                      <select value={newLeadForm.categoria} onChange={e => setNewLeadForm(f => ({ ...f, categoria: e.target.value as LeadCategoria }))} className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none text-zinc-900 dark:text-white">
                         <option>Nutricionista</option><option>Usuário GLP-1</option><option>Parceria Local</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Cidade</label>
                      <input type="text" value={newLeadForm.cidade} onChange={e => setNewLeadForm(f => ({ ...f, cidade: e.target.value }))} className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-white" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Classificação*</label>
                      <select value={newLeadForm.classificacao} onChange={e => setNewLeadForm(f => ({ ...f, classificacao: e.target.value as LeadClassificacao }))} className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none text-zinc-900 dark:text-white">
                         <option value="quente">🔥 Quente</option><option value="morno">🌡️ Morno</option><option value="frio">❄️ Frio</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Responsável*</label>
                      <select value={newLeadForm.responsavel} onChange={e => setNewLeadForm(f => ({ ...f, responsavel: e.target.value as LeadResponsavel }))} className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none text-zinc-900 dark:text-white">
                         <option value="gustavo">Gustavo</option><option value="murilo">Murilo</option><option value="lucas">Lucas</option><option value="nicolas">Nicolas</option>
                      </select>
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Observação inicial</label>
                   <textarea value={newLeadForm.observacoes} onChange={e => setNewLeadForm(f => ({ ...f, observacoes: e.target.value }))} className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none resize-none h-16 text-zinc-900 dark:text-white" />
                </div>
             </div>
             <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setIsNewLeadOpen(false)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg px-4 py-2 text-sm font-medium">
                   Cancelar
                </button>
                <button onClick={handleCreateLead} disabled={!newLeadForm.nome || !newLeadForm.instagram || saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2">
                   {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                   Adicionar Lead
                </button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAR */}
      {isImportOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 h-[100dvh]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => { if (!importing) { setIsImportOpen(false); setImportFile(null); setImportPreview(null); setImportResult(null); }}} />
          <div className="relative w-full sm:max-w-md bg-white dark:bg-zinc-900 shadow-2xl rounded-t-[32px] sm:rounded-2xl p-6 pb-8 border-t sm:border border-zinc-200 dark:border-zinc-800 mt-auto sm:mt-0 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 max-h-[90dvh] overflow-y-auto">
             <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-6 sm:hidden shrink-0" />
             <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Importar Leads</h2>
             <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">Planilha com abas: <strong>Nutricionistas</strong>, <strong>Usuários GLP-1</strong>, <strong>Parcerias Locais</strong></p>

             {/* Resultado da importação */}
             {importResult ? (
               <div className={`rounded-xl p-4 mb-5 border ${importResult.erros > 0 ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'}`}>
                 <div className="flex items-center gap-2 mb-2">
                   <Check className={`w-5 h-5 ${importResult.erros > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
                   <span className="font-semibold text-zinc-900 dark:text-white">Importação concluída</span>
                 </div>
                 <div className="text-sm space-y-1 text-zinc-700 dark:text-zinc-300">
                   <p>✅ <strong>{importResult.importados}</strong> leads importados</p>
                   <p>⚠️ <strong>{importResult.duplicados}</strong> duplicados ignorados</p>
                   {importResult.erros > 0 && <p>❌ <strong>{importResult.erros}</strong> erros</p>}
                 </div>
               </div>
             ) : (
               <>
                 {/* Drop area */}
                 <div
                   className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${importFile ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                   onClick={() => fileInputRef.current?.click()}
                   onDragOver={e => e.preventDefault()}
                   onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                 >
                   <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                     onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                   <div className="bg-blue-50 dark:bg-blue-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                     <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                   </div>
                   {importFile ? (
                     <div>
                       <p className="text-sm font-medium text-zinc-900 dark:text-white">{importFile.name}</p>
                       {importPreview && (
                         <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
                           <p className="font-semibold text-blue-600 dark:text-blue-400">{importPreview.total} leads encontrados</p>
                           {Object.entries(importPreview.abas).map(([aba, qtd]) => (
                             <p key={aba}>• {aba}: {qtd}</p>
                           ))}
                         </div>
                       )}
                     </div>
                   ) : (
                     <>
                       <p className="text-sm font-medium text-zinc-900 dark:text-white">Arraste o arquivo .xlsx aqui ou clique</p>
                       <p className="text-xs text-zinc-500 mt-1">Aceita .xlsx e .csv</p>
                     </>
                   )}
                 </div>

                 {/* Pré-visualização */}
                 {importPreview && importPreview.exemplos.length > 0 && (
                   <div className="mb-4">
                     <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-2">Pré-visualização</p>
                     <div className="space-y-1">
                       {importPreview.exemplos.map((e, i) => (
                         <div key={i} className="flex items-center gap-2 text-xs bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2">
                           <span className="font-medium text-zinc-900 dark:text-white truncate">{e.nome}</span>
                           <span className="text-zinc-400 shrink-0">{e.instagram}</span>
                           <span className="ml-auto text-zinc-500 shrink-0">{e.categoria}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Responsável padrão */}
                 {importFile && (
                   <div className="mb-4">
                     <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Responsável padrão (para quem não tiver na planilha)</label>
                     <select value={importResponsavel} onChange={e => setImportResponsavel(e.target.value as LeadResponsavel)}
                       className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none text-zinc-900 dark:text-white">
                       <option value="gustavo">Gustavo</option>
                       <option value="murilo">Murilo</option>
                       <option value="lucas">Lucas</option>
                       <option value="nicolas">Nicolas</option>
                     </select>
                   </div>
                 )}
               </>
             )}

             <div className="flex justify-end gap-3">
                <button onClick={() => { setIsImportOpen(false); setImportFile(null); setImportPreview(null); setImportResult(null); }}
                  disabled={importing}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
                   {importResult ? 'Fechar' : 'Cancelar'}
                </button>
                {!importResult && (
                  <button onClick={handleImport} disabled={!importFile || importing}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2">
                     {importing ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</> : `Importar ${importPreview?.total ?? ''} leads`}
                  </button>
                )}
             </div>
          </div>
        </div>
      )}

      {/* MODAL EXPORTAR PDF */}
      {isExportOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 h-[100dvh]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsExportOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-white dark:bg-zinc-900 shadow-2xl rounded-t-[32px] sm:rounded-2xl p-6 pb-8 border-t sm:border border-zinc-200 dark:border-zinc-800 mt-auto sm:mt-0 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
             <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mt-[-8px] mb-6 sm:hidden shrink-0" />
             <div className="flex items-center gap-2 mb-2">
               <div className="bg-blue-50 dark:bg-blue-900/30 w-10 h-10 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                 <Download className="w-5 h-5" />
               </div>
               <h2 className="text-xl font-bold text-zinc-900 dark:text-white ml-2">Exportar Relatório</h2>
             </div>
             <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Gere um PDF detalhado com o desempenho das abordagens.</p>

             <div className="space-y-5">
               <div>
                 <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Período do Relatório</label>
                 <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1.5 rounded-xl flex-wrap gap-1">
                    <button 
                      onClick={() => setExportType('hoje')} 
                      className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${exportType === 'hoje' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      Hoje
                    </button>
                    <button 
                      onClick={() => setExportType('semana')} 
                      className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${exportType === 'semana' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      Semana
                    </button>
                    <button 
                      onClick={() => setExportType('tudo')} 
                      className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${exportType === 'tudo' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      Geral
                    </button>
                    <button 
                      onClick={() => setExportType('data')} 
                      className={`flex-none px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center ${exportType === 'data' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700'}`}
                      title="Selecionar Data"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                 </div>
                 {exportType === 'data' && (
                   <div className="mt-3">
                     <input 
                       type="date"
                       value={exportDate}
                       onChange={e => setExportDate(e.target.value)}
                       max={HOJE_STR}
                       className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2.5 text-sm outline-none text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                     />
                   </div>
                 )}
               </div>

               <div>
                 <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Filtrar por Responsável</label>
                 <select 
                   value={exportResp} 
                   onChange={e => setExportResp(e.target.value)}
                   className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2.5 text-sm outline-none text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                 >
                   <option value="todos">Todos os Responsáveis</option>
                   <option value="gustavo">Gustavo</option>
                   <option value="murilo">Murilo</option>
                   <option value="lucas">Lucas</option>
                   <option value="nicolas">Nicolas</option>
                 </select>
               </div>

               <div>
                 <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Filtrar por Categoria</label>
                 <select 
                   value={exportCat} 
                   onChange={e => setExportCat(e.target.value)}
                   className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2.5 text-sm outline-none text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                 >
                   <option value="todas">Todas as Categorias</option>
                   <option value="Nutricionista">Nutricionistas</option>
                   <option value="Usuário GLP-1">Usuários GLP-1</option>
                   <option value="Parceria Local">Parcerias Locais</option>
                 </select>
               </div>
             </div>

             <div className="mt-8 flex justify-end gap-3">
                <button onClick={() => setIsExportOpen(false)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                   Cancelar
                </button>
                <button onClick={handleExportPDF} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors">
                   Baixar PDF
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
