// CONFIGURAÇÃO DO SUPABASE
// Para usar este sistema, você precisa:

// 1. Criar uma conta gratuita em: https://supabase.com
// 2. Criar um novo projeto
// 3. Pegar as credenciais do projeto
// 4. Criar um arquivo .env.local na raiz do projeto com:

/*
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
*/

// Por enquanto, vamos usar dados mockados
// Quando você configurar o Supabase, remova este comentário e use as linhas abaixo:

import { createClient } from '@supabase/supabase-js';

// URLs e chaves do projeto (defina no .env.local ou nas variáveis da Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Cliente oficial do Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Flag para sabermos se as credenciais estão presentes
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Em produção recomendamos desativar cache local. Para ativar, defina NEXT_PUBLIC_LOCAL_CACHE=true
export const isLocalCacheEnabled = (process.env.NEXT_PUBLIC_LOCAL_CACHE || '').toLowerCase() === 'true';

// Tipos para as tabelas
export interface Paciente {
  id: number;
  nome: string;
  telefone: string;
  endereco: string;
  data_nascimento: string;
  cpf: string;
  valor_consulta: number;
  modalidade_preferida?: 'presencial_b' | 'presencial_zs' | 'online';
  nome_representante: string;
  telefone_representante: string;
  tem_representante: boolean;
  data_cadastro: string;
  created_at: string;
}

export interface Consulta {
  id: number;
  paciente_id: number;
  data: string;
  horario: string;
  tipo_consulta: string;
  ja_pagou: boolean;
  pagador_nome?: string | null;
  nf_emitida?: boolean | null;
  observacoes: string;
  data_agendamento: string;
  created_at: string;
  // Campos novos e opcionais
  medicacoes?: string; // texto livre (um por linha)
  resumo?: string; // resumo do atendimento
  duration_minutos?: number; // duração da consulta (minutos)
  modalidade?: 'presencial_b' | 'presencial_zs' | 'online';
}

export interface ConsultaComPaciente extends Consulta {
  paciente: Paciente;
}

export type UserRole = 'admin' | 'gestor' | 'medico' | 'contador';

export interface AllowedEmail {
  email: string;
  role: UserRole;
  created_at?: string;
}

// Bloqueios de agenda
export interface Bloqueio {
  id: number;
  data: string; // YYYY-MM-DD
  hora_inicio?: string | null; // HH:MM:SS
  hora_fim?: string | null;    // HH:MM:SS
  motivo?: string | null;
  created_at?: string;
}
