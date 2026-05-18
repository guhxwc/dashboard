/**
 * leadsService.ts — CRM de Leads FitMind
 * CRUD completo para leads + interações + importação XLSX
 *
 * FOLLOW-UP AUTOMÁTICO:
 *   D+0 → abordado (proximo_followup = D+3)
 *   D+3 → followup_3 (proximo_followup = D+7)
 *   D+7 → followup_7 (proximo_followup = null)
 *   D+10 em followup_7 → sem_resposta
 *   em_conversa → proximo_followup = data_ult_contato + 2
 *   Status finais NUNCA são sobrescritos automaticamente
 */

import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type LeadStatus =
  | 'nao_abordado' | 'abordado' | 'em_conversa'
  | 'followup_3'   | 'followup_7'
  | 'fechado_assinante' | 'fechado_parceiro'
  | 'nao_quis'     | 'sem_resposta';

export type LeadCategoria    = 'Nutricionista' | 'Usuário GLP-1' | 'Parceria Local';
export type LeadClassificacao = 'quente' | 'morno' | 'frio';
export type LeadResponsavel  = 'gustavo' | 'murilo' | 'lucas' | 'nicolas';

export interface Lead {
  id: string;
  nome: string;
  instagram: string;
  categoria: LeadCategoria;
  cidade: string;
  classificacao: LeadClassificacao;
  responsavel: LeadResponsavel;
  status: LeadStatus;
  data_1_contato:   string | null;
  data_ult_contato: string | null;
  proximo_followup: string | null;
  observacoes: string;
  created_at?: string;
  updated_at?: string;
  interacoes: Interacao[];
}

export interface Interacao {
  id: string;
  lead_id?: string;
  data: string;
  texto: string;
  registrado_por: string;
  tipo: 'mensagem' | 'fechado' | 'nao_quis' | 'followup' | 'status_change';
  created_at?: string;
}

export interface ImportResult {
  total: number; importados: number; duplicados: number; erros: number; mensagens: string[];
}
export interface XLSXPreview {
  total: number; abas: Record<string, number>;
  exemplos: { nome: string; instagram: string; categoria: string }[];
}

// ─── Helpers de data ──────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
function diffDays(d1: string, d2: string): number {
  return Math.floor(
    (new Date(d2 + 'T12:00:00').getTime() - new Date(d1 + 'T12:00:00').getTime()) / 86400000
  );
}

// ─── Recálculo automático de status/followup ──────────────────────────────────

const STATUS_FINAIS: LeadStatus[] = [
  'fechado_assinante', 'fechado_parceiro', 'nao_quis', 'sem_resposta',
];

export function recalcularLeadStatus(lead: Lead): Lead {
  if (STATUS_FINAIS.includes(lead.status)) return lead;
  if (!lead.data_1_contato) return lead;

  const hoje = new Date().toISOString().split('T')[0];
  const d1   = lead.data_1_contato;
  const ult  = lead.data_ult_contato ?? d1;
  const dias = diffDays(d1, hoje);

  if (lead.status === 'em_conversa') {
    return { ...lead, proximo_followup: addDays(ult, 2) };
  }
  if (dias < 3) {
    return { ...lead, status: 'abordado',    proximo_followup: addDays(d1, 3) };
  }
  if (dias >= 3 && dias < 7) {
    return { ...lead, status: 'followup_3',  proximo_followup: addDays(d1, 7) };
  }
  if (dias >= 7 && dias < 10) {
    return { ...lead, status: 'followup_7',  proximo_followup: null };
  }
  if (dias >= 10 && lead.status === 'followup_7') {
    return { ...lead, status: 'sem_resposta', proximo_followup: null };
  }
  return lead;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const leadsService = {

  async list(): Promise<Lead[]> {
    const [lr, ir] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('lead_interacoes').select('*').order('data', { ascending: true }),
    ]);
    if (lr.error) { console.error('leads.list:', lr.error); return []; }

    const map = new Map<string, Interacao[]>();
    for (const i of (ir.data ?? [])) {
      if (!map.has(i.lead_id)) map.set(i.lead_id, []);
      map.get(i.lead_id)!.push(i as Interacao);
    }
    return (lr.data ?? []).map(l => ({ ...l, interacoes: map.get(l.id) ?? [] })) as Lead[];
  },

  async create(lead: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'interacoes'>): Promise<Lead> {
    const ig = lead.instagram.startsWith('@') ? lead.instagram : `@${lead.instagram}`;
    const { data, error } = await supabase.from('leads')
      .insert([{ ...lead, instagram: ig }]).select().single();
    if (error) throw error;
    return { ...(data as any), interacoes: [] };
  },

  async update(id: string, patch: Partial<Lead>): Promise<void> {
    const { interacoes: _, created_at: __, updated_at: ___, id: ____, ...rest } = patch as any;
    const { error } = await supabase.from('leads').update(rest).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
  },

  async addInteracao(leadId: string, inter: Omit<Interacao, 'id' | 'lead_id' | 'created_at'>): Promise<Interacao> {
    const { data, error } = await supabase.from('lead_interacoes')
      .insert([{ lead_id: leadId, ...inter }]).select().single();
    if (error) throw error;
    return data as Interacao;
  },

  // ── Importação de XLSX ────────────────────────────────────────────────────

  async previewXLSX(file: File): Promise<XLSXPreview> {
    const buf = await file.arrayBuffer();
    const wb  = XLSX.read(buf, { type: 'array' });
    const mapa: Record<string, LeadCategoria> = {
      'Nutricionistas': 'Nutricionista',
      'Usuários GLP-1': 'Usuário GLP-1',
      'Usuarios GLP-1': 'Usuário GLP-1',
      'Parcerias Locais': 'Parceria Local',
    };
    const abas: Record<string, number> = {};
    let total = 0;
    const exemplos: XLSXPreview['exemplos'] = [];

    for (const sh of wb.SheetNames) {
      const cat = mapa[sh]; if (!cat) continue;
      const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[sh], { defval: '' });
      const valid = rows.filter(r => {
        const n = (r['Nome'] || r['nome'] || '').toString().trim();
        const i = (r['@ Instagram'] || r['@ Instagram/TikTok'] || r['Instagram'] || '').toString().trim();
        return n && i;
      });
      abas[sh] = valid.length;
      total += valid.length;
      if (exemplos.length < 3) {
        for (const r of valid.slice(0, 3 - exemplos.length)) {
          exemplos.push({
            nome:      (r['Nome'] || '').toString().trim(),
            instagram: (r['@ Instagram'] || r['@ Instagram/TikTok'] || r['Instagram'] || '').toString().trim(),
            categoria: cat,
          });
        }
      }
    }
    return { total, abas, exemplos };
  },

  async importFromXLSX(file: File, defaultResponsavel: LeadResponsavel = 'gustavo'): Promise<ImportResult> {
    const buf = await file.arrayBuffer();
    const wb  = XLSX.read(buf, { type: 'array' });
    const mapa: Record<string, LeadCategoria> = {
      'Nutricionistas': 'Nutricionista',
      'Usuários GLP-1': 'Usuário GLP-1',
      'Usuarios GLP-1': 'Usuário GLP-1',
      'Parcerias Locais': 'Parceria Local',
    };

    const todos: Array<Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'interacoes'>> = [];

    for (const sh of wb.SheetNames) {
      const cat = mapa[sh]; if (!cat) continue;
      const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[sh], { defval: '' });
      for (const r of rows) {
        const nome = (r['Nome'] || r['nome'] || '').toString().trim();
        const ig   = (r['@ Instagram'] || r['@ Instagram/TikTok'] || r['Instagram'] || '').toString().trim();
        if (!nome || !ig) continue;

        const cidade   = (r['Cidade'] || r['cidade'] || '').toString().trim();
        const obs      = (r['Observações'] || r['Observacoes'] || r['observacoes'] || '').toString().trim();
        const classifR = (r['Classificação'] || r['classificacao'] || '').toString().trim();
        const respR    = (r['Responsável'] || r['Responsavel'] || '').toString().toLowerCase().trim();

        let classificacao: LeadClassificacao = 'morno';
        if (classifR.includes('🔥') || classifR.toLowerCase().includes('quente')) classificacao = 'quente';
        else if (classifR.includes('❄️') || classifR.toLowerCase().includes('frio'))  classificacao = 'frio';

        const responsavel: LeadResponsavel =
          (['gustavo','murilo','lucas','nicolas'] as LeadResponsavel[]).includes(respR as any)
            ? (respR as LeadResponsavel) : defaultResponsavel;

        todos.push({
          nome, instagram: ig.startsWith('@') ? ig : `@${ig}`,
          categoria: cat, cidade, classificacao, responsavel,
          status: 'nao_abordado', data_1_contato: null,
          data_ult_contato: null, proximo_followup: null, observacoes: obs,
        });
      }
    }

    if (todos.length === 0) {
      return { total: 0, importados: 0, duplicados: 0, erros: 0, mensagens: ['Nenhum lead válido encontrado.'] };
    }

    // Busca existentes para detectar duplicatas pelo @ Instagram
    const { data: exist } = await supabase.from('leads').select('instagram');
    const existSet = new Set((exist ?? []).map((e: any) => (e.instagram || '').toLowerCase()));
    const novos     = todos.filter(l => !existSet.has(l.instagram.toLowerCase()));
    const duplicados = todos.length - novos.length;

    let importados = 0, erros = 0;
    const mensagens: string[] = [];

    for (let i = 0; i < novos.length; i += 100) {
      const batch = novos.slice(i, i + 100);
      const { error, count } = await supabase.from('leads').insert(batch, { count: 'exact' });
      if (error) { erros += batch.length; mensagens.push(error.message); }
      else        { importados += count ?? batch.length; }
    }

    return { total: todos.length, importados, duplicados, erros, mensagens };
  },
};
