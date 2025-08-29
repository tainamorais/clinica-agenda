'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured, isLocalCacheEnabled } from '../../config/supabase-config';
import { formatISOToBR } from '../../lib/date';

interface Paciente {
  id: number;
  nome: string;
  nome_social?: string;
  telefone: string;
  endereco: string;
  dataNascimento?: string;
  data_nascimento?: string;
  cpf: string;
  valorConsulta?: number;
  valor_consulta?: number;
  modalidade_preferida?: string;
  nomeRepresentante?: string;
  telefoneRepresentante?: string;
  temRepresentante?: boolean;
  dataCadastro?: string;
  data_cadastro?: string;
}

interface Consulta {
  id: number;
  pacienteId: number;
  paciente: Paciente;
  data: string;
  horario: string;
  tipoConsulta: string;
  jaPagou: boolean;
  observacoes: string;
  dataAgendamento: string;
  modalidade?: string;
}

const getValorConsulta = (p: Paciente) => {
  const bruto = (p as any)?.valor_consulta ?? (p as any)?.valorConsulta ?? 0;
  return Number(bruto) || 0;
};

const getNomePreferencial = (p: Paciente) => {
  return p.nome_social?.trim() || p.nome;
};

const getModalidadeLabel = (modalidade?: string) => {
  if (!modalidade) return '';
  switch (modalidade) {
    case 'presencial_b': return 'Presencial Barra';
    case 'presencial_zs': return 'Presencial Botafogo';
    case 'online': return 'Online';
    default: return modalidade;
  }
};

const getModalidadeColor = (modalidade?: string) => {
  if (!modalidade) return 'bg-gray-100 text-gray-800';
  switch (modalidade) {
    case 'presencial_b': return 'bg-pink-100 text-pink-800';
    case 'presencial_zs': return 'bg-pink-500 text-white';
    case 'online': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function ConsultasHoje() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [dataHoje] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    carregarConsultas();
  }, []);

  const carregarConsultas = async () => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('consultas')
          .select(`
            *,
            pacientes(*)
          `)
          .eq('data', dataHoje)
          .order('horario', { ascending: true });
        if (!error && data) {
          const mapeadas: Consulta[] = (data as any[]).map((row) => ({
            id: row.id,
            pacienteId: row.paciente_id,
            paciente: {
              id: row.pacientes?.id,
              nome: row.pacientes?.nome,
              nome_social: row.pacientes?.nome_social,
              telefone: row.pacientes?.telefone,
              endereco: row.pacientes?.endereco,
              cpf: row.pacientes?.cpf,
              data_nascimento: row.pacientes?.data_nascimento,
              valor_consulta: row.pacientes?.valor_consulta,
              modalidade_preferida: row.pacientes?.modalidade_preferida,
            },
            data: row.data,
            horario: row.horario,
            tipoConsulta: row.tipo_consulta,
            jaPagou: row.ja_pagou,
            observacoes: row.observacoes || '',
            dataAgendamento: row.data_agendamento,
            modalidade: row.modalidade,
          }));
          setConsultas(mapeadas);
          return;
        }
      }
      const consultasSalvas = isLocalCacheEnabled ? localStorage.getItem('consultas') : null;
      if (consultasSalvas) {
        const todasConsultas: Consulta[] = JSON.parse(consultasSalvas);
        const consultasHoje = todasConsultas.filter(consulta => consulta.data === dataHoje);
        setConsultas(consultasHoje);
      }
    } catch (error) {
      console.error('Erro ao carregar consultas:', error);
    }
  };

  const marcarComoPaga = async (consultaId: number) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('consultas')
          .update({ ja_pagou: true })
          .eq('id', consultaId);
        if (error) throw error;
        await carregarConsultas();
        return;
      }
      const consultasSalvas = isLocalCacheEnabled ? JSON.parse(localStorage.getItem('consultas') || '[]') : [];
      const consultasAtualizadas = consultasSalvas.map((consulta: Consulta) =>
        consulta.id === consultaId ? { ...consulta, jaPagou: true } : consulta
      );
      if (isLocalCacheEnabled) localStorage.setItem('consultas', JSON.stringify(consultasAtualizadas));
      await carregarConsultas();
    } catch (error) {
      console.error('Erro ao marcar como paga:', error);
    }
  };

  const cancelarConsulta = async (consultaId: number) => {
    if (confirm('Tem certeza que deseja cancelar esta consulta?')) {
      try {
        if (isSupabaseConfigured) {
          const { error } = await supabase
            .from('consultas')
            .delete()
            .eq('id', consultaId);
          if (error) throw error;
          await carregarConsultas();
          return;
        }
        const consultasSalvas = isLocalCacheEnabled ? JSON.parse(localStorage.getItem('consultas') || '[]') : [];
        const consultasAtualizadas = consultasSalvas.filter((consulta: Consulta) => consulta.id !== consultaId);
        if (isLocalCacheEnabled) localStorage.setItem('consultas', JSON.stringify(consultasAtualizadas));
        await carregarConsultas();
      } catch (error) {
        console.error('Erro ao cancelar consulta:', error);
      }
    }
  };

  const consultasOrdenadas = [...consultas].sort((a, b) => a.horario.localeCompare(b.horario));

  const formatarData = (data: string) => formatISOToBR(data);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Link href="/" className="text-blue-600 text-xl">←</Link>
            <h1 className="text-xl font-bold text-gray-800">Consultas de Hoje</h1>
          </div>
          <p className="text-center text-lg font-medium text-blue-600">{formatarData(dataHoje)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{consultas.length}</p>
              <p className="text-sm text-gray-600">Total de Consultas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{consultas.filter(c => c.jaPagou).length}</p>
              <p className="text-sm text-gray-600">Já Pagas</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {consultasOrdenadas.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500 text-lg">Nenhuma consulta agendada para hoje</p>
              <Link href="/agendar-consulta" className="text-blue-600 hover:underline text-sm mt-2 inline-block">Agendar primeira consulta</Link>
            </div>
          ) : (
            consultasOrdenadas.map(consulta => (
              <div key={consulta.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-lg">{getNomePreferencial(consulta.paciente)}</h3>
                    {consulta.paciente.nome_social && (
                      <p className="text-xs text-gray-500 italic">Nome civil: {consulta.paciente.nome}</p>
                    )}
                    <p className="text-sm text-gray-600">{consulta.paciente.telefone}</p>
                    {(consulta.modalidade || consulta.paciente.modalidade_preferida) && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold mt-1 ${getModalidadeColor(consulta.modalidade || consulta.paciente.modalidade_preferida)}`}>
                        {getModalidadeLabel(consulta.modalidade || consulta.paciente.modalidade_preferida)}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-blue-600">{consulta.horario}</span>
                    <div className="text-xs text-gray-500 mt-1">{consulta.tipoConsulta === 'primeira' ? 'Primeira Vez' : 'Retorno'}</div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Valor:</span>
                    <span className="font-semibold text-gray-800">R$ {getValorConsulta(consulta.paciente).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${consulta.jaPagou ? 'text-green-600' : 'text-red-600'}`}>{consulta.jaPagou ? '✅ Pago' : '❌ Pendente'}</span>
                  </div>

                  {consulta.observacoes && (
                    <div className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded"><strong>Obs:</strong> {consulta.observacoes}</div>
                  )}
                </div>

                <div className="flex space-x-2">
                  {!consulta.jaPagou && (
                    <button onClick={() => marcarComoPaga(consulta.id)} className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors">Marcar como Paga</button>
                  )}
                  <Link href={`/editar-consulta/${consulta.id}`} className="flex-1 px-3 py-2 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600 transition-colors text-center">Editar</Link>
                  <button onClick={() => cancelarConsulta(consulta.id)} className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors">Cancelar</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6">
          <Link href="/" className="block w-full px-4 py-3 text-center text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">Voltar ao Menu</Link>
        </div>
      </div>
    </div>
  );
}
