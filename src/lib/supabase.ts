import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para as tabelas
export interface Paciente {
  id: number;
  nome: string;
  telefone: string;
  endereco: string;
  data_nascimento: string;
  cpf: string;
  valor_consulta: number;
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
  observacoes: string;
  data_agendamento: string;
  created_at: string;
}

export interface ConsultaComPaciente extends Consulta {
  paciente: Paciente;
}
