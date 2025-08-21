'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '../../config/supabase-config';
import { formatISOToBR } from '../../lib/date';

interface Paciente {
  id: number;
  nome: string;
  telefone: string;
  endereco: string;
  dataNascimento?: string;
  data_nascimento?: string;
  cpf: string;
  valorConsulta?: number;
  valor_consulta?: number;
}

interface Consulta {
  id: number;
  pacienteId: number;
  paciente: Paciente;
  data: string; // yyyy-mm-dd
  horario: string; // HH:mm
  tipoConsulta: string; // 'primeira' | 'retorno'
  jaPagou: boolean;
  observacoes: string;
  dataAgendamento: string;
}

const getValorConsulta = (p: Paciente) => {
  const bruto = (p as any)?.valor_consulta ?? (p as any)?.valorConsulta ?? 0;
  return Number(bruto) || 0;
};

export default function ConsultasPorData() {
  const [dataSelecionada, setDataSelecionada] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [consultas, setConsultas] = useState<Consulta[]>([]);

  useEffect(() => {
    carregarConsultas();
  }, [dataSelecionada]);

  const carregarConsultas = async () => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('consultas')
          .select('*, pacientes(*)')
          .eq('data', dataSelecionada)
          .order('horario', { ascending: true });
        if (!error && data) {
          const mapeadas: Consulta[] = (data as any[]).map((row) => ({
            id: row.id,
            pacienteId: row.paciente_id,
            paciente: {
              id: row.pacientes?.id,
              nome: row.pacientes?.nome,
              telefone: row.pacientes?.telefone,
              endereco: row.pacientes?.endereco,
              cpf: row.pacientes?.cpf,
              data_nascimento: row.pacientes?.data_nascimento,
              valor_consulta: row.pacientes?.valor_consulta,
            },
            data: row.data,
            horario: row.horario,
            tipoConsulta: row.tipo_consulta,
            jaPagou: row.ja_pagou,
            observacoes: row.observacoes || '',
            dataAgendamento: row.data_agendamento,
          }));
          setConsultas(mapeadas);
          return;
        }
      }
      const consultasSalvas = localStorage.getItem('consultas');
      if (consultasSalvas) {
        const todas: Consulta[] = JSON.parse(consultasSalvas);
        const doDia = todas.filter(c => c.data === dataSelecionada);
        setConsultas(doDia);
      } else {
        setConsultas([]);
      }
    } catch (e) {
      console.error(e);
      setConsultas([]);
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
      const consultasSalvas: Consulta[] = JSON.parse(localStorage.getItem('consultas') || '[]');
      const atualizadas = consultasSalvas.map(c => (c.id === consultaId ? { ...c, jaPagou: true } : c));
      localStorage.setItem('consultas', JSON.stringify(atualizadas));
      await carregarConsultas();
    } catch (e) {
      console.error(e);
    }
  };

  const cancelarConsulta = async (consultaId: number) => {
    if (!confirm('Tem certeza que deseja cancelar esta consulta?')) return;
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
      const consultasSalvas: Consulta[] = JSON.parse(localStorage.getItem('consultas') || '[]');
      const atualizadas = consultasSalvas.filter(c => c.id !== consultaId);
      localStorage.setItem('consultas', JSON.stringify(atualizadas));
      await carregarConsultas();
    } catch (e) {
      console.error(e);
    }
  };

  const consultasOrdenadas = [...consultas].sort((a, b) => a.horario.localeCompare(b.horario));
  const formatarDataBR = (iso: string) => formatISOToBR(iso);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Cabeçalho */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <div className="flex items-center space-x-3 mb-4">
            <Link href="/" className="text-blue-600 text-xl">←</Link>
            <h1 className="text-xl font-bold text-gray-800">Consultas por Data</h1>
          </div>

          {/* Seletor de Data */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">Escolha a data:</label>
            <input
              type="date"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            />
            <span className="text-sm text-gray-500">{formatarDataBR(dataSelecionada)}</span>
          </div>
        </div>

        {/* Estatísticas */}
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

        {/* Lista */}
        <div className="space-y-4">
          {consultasOrdenadas.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500 text-lg">Nenhuma consulta nesta data</p>
              <Link href="/agendar-consulta" className="text-blue-600 hover:underline text-sm mt-2 inline-block">Agendar</Link>
            </div>
          ) : (
            consultasOrdenadas.map(consulta => (
              <div key={consulta.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-lg">{consulta.paciente.nome}</h3>
                    <p className="text-sm text-gray-600">{consulta.paciente.telefone}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-blue-600">{consulta.horario}</span>
                    <div className="text-xs text-gray-500 mt-1">{consulta.tipoConsulta === 'primeira' ? 'Primeira Vez' : 'Retorno'}</div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Valor:</span>
                    <span className="font-medium">R$ {getValorConsulta(consulta.paciente).toFixed(2)}</span>
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

        {/* Voltar */}
        <div className="mt-6">
          <Link href="/" className="block w-full px-4 py-3 text-center text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">Voltar ao Menu</Link>
        </div>
      </div>
    </div>
  );
}
