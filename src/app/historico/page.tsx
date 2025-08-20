'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '../../config/supabase-config';

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
}

interface PacienteComHistorico {
  paciente: Paciente;
  consultas: Consulta[];
}

const getValorConsulta = (p: Paciente) => {
  const bruto = (p as any)?.valor_consulta ?? (p as any)?.valorConsulta ?? 0;
  return Number(bruto) || 0;
};

const getDataNasc = (p: Paciente) => p.dataNascimento || (p as any).data_nascimento || '';

export default function Historico() {
  const [pacientesComHistorico, setPacientesComHistorico] = useState<PacienteComHistorico[]>([]);
  const [pacienteExpandido, setPacienteExpandido] = useState<number | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('consultas')
          .select('*, pacientes(*)')
          .order('data', { ascending: false })
          .order('horario', { ascending: false });
        if (!error && data) {
          // Agrupar por paciente
          const mapa: Record<number, PacienteComHistorico> = {};
          (data as any[]).forEach((row) => {
            const pacienteRow = row.pacientes;
            if (!pacienteRow) return;
            const paciente: Paciente = {
              id: pacienteRow.id,
              nome: pacienteRow.nome,
              telefone: pacienteRow.telefone,
              endereco: pacienteRow.endereco,
              cpf: pacienteRow.cpf,
              data_nascimento: pacienteRow.data_nascimento,
              valor_consulta: pacienteRow.valor_consulta,
            };
            if (!mapa[paciente.id]) {
              mapa[paciente.id] = { paciente, consultas: [] };
            }
            mapa[paciente.id].consultas.push({
              id: row.id,
              pacienteId: row.paciente_id,
              paciente,
              data: row.data,
              horario: row.horario,
              tipoConsulta: row.tipo_consulta,
              jaPagou: row.ja_pagou,
              observacoes: row.observacoes || '',
              dataAgendamento: row.data_agendamento,
            });
          });
          setPacientesComHistorico(Object.values(mapa));
          return;
        }
      }
      const pacientesSalvos = localStorage.getItem('pacientes');
      const consultasSalvas = localStorage.getItem('consultas');
      if (pacientesSalvos && consultasSalvas) {
        const pacientes: Paciente[] = JSON.parse(pacientesSalvos);
        const consultas: Consulta[] = JSON.parse(consultasSalvas);
        const agrupado = pacientes.map(paciente => ({
          paciente,
          consultas: consultas.filter(c => c.pacienteId === paciente.id)
        }));
        setPacientesComHistorico(agrupado);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const togglePaciente = (pacienteId: number) => setPacienteExpandido(pacienteId === pacienteExpandido ? null : pacienteId);

  const marcarComoPaga = async (_pacienteId: number, consultaId: number) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('consultas')
          .update({ ja_pagou: true })
          .eq('id', consultaId);
        if (error) throw error;
        await carregarDados();
        return;
      }
      const consultasSalvas = JSON.parse(localStorage.getItem('consultas') || '[]');
      const consultasAtualizadas = consultasSalvas.map((consulta: Consulta) =>
        consulta.id === consultaId ? { ...consulta, jaPagou: true } : consulta
      );
      localStorage.setItem('consultas', JSON.stringify(consultasAtualizadas));
      await carregarDados();
    } catch (error) {
      console.error('Erro ao marcar como paga:', error);
    }
  };

  const excluirConsulta = async (consultaId: number) => {
    if (!confirm('Tem certeza que deseja cancelar esta consulta?')) return;
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('consultas')
          .delete()
          .eq('id', consultaId);
        if (error) throw error;
        await carregarDados();
        return;
      }
      const consultasSalvas = JSON.parse(localStorage.getItem('consultas') || '[]');
      const atualizadas = consultasSalvas.filter((c: Consulta) => c.id !== consultaId);
      localStorage.setItem('consultas', JSON.stringify(atualizadas));
      await carregarDados();
    } catch (error) {
      console.error('Erro ao cancelar consulta:', error);
    }
  };

  const calcularTotalDevido = (consultas: Consulta[]) => consultas.filter(c => !c.jaPagou).reduce((total, c) => total + getValorConsulta(c.paciente), 0);

  const formatarData = (data: string) => new Date(data).toLocaleDateString('pt-BR');
  const formatarDataCompleta = (data: string, horario: string) => `${formatarData(data)} às ${horario}`;

  const calcularIdade = (p: Paciente) => {
    const dn = getDataNasc(p);
    if (!dn) return '';
    const hoje = new Date();
    const nascimento = new Date(dn);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) idade--;
    return `${idade} anos`;
  };

  const pacientesComConsultas = pacientesComHistorico.filter(p => p.consultas.length > 0);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Link href="/" className="text-blue-600 text-xl">←</Link>
            <h1 className="text-xl font-bold text-gray-800">Histórico de Consultas</h1>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{pacientesComConsultas.reduce((t, p) => t + p.consultas.length, 0)}</p>
              <p className="text-sm text-gray-600">Total de Consultas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">R$ {pacientesComConsultas.reduce((t, p) => t + calcularTotalDevido(p.consultas), 0).toFixed(2)}</p>
              <p className="text-sm text-gray-600">Total em Aberto</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {pacientesComConsultas.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500 text-lg">Nenhuma consulta registrada ainda</p>
              <Link href="/agendar-consulta" className="text-blue-600 hover:underline text-sm mt-2 inline-block">Agendar primeira consulta</Link>
            </div>
          ) : (
            pacientesComConsultas.map(({ paciente, consultas }) => {
              const totalDevido = calcularTotalDevido(consultas);
              const consultasPagas = consultas.filter(c => c.jaPagou).length;
              const totalConsultas = consultas.length;
              return (
                <div key={paciente.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => togglePaciente(paciente.id)}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 text-lg">{paciente.nome}</h3>
                        <p className="text-sm text-gray-600">{paciente.telefone}</p>
                        <p className="text-xs text-gray-500">{calcularIdade(paciente)} • CPF: {paciente.cpf}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">{consultasPagas}/{totalConsultas} pagas</div>
                        <div className={`text-lg font-bold ${totalDevido > 0 ? 'text-red-600' : 'text-green-600'}`}>{totalDevido > 0 ? `R$ ${totalDevido.toFixed(2)}` : '✅ Quitado'}</div>
                      </div>
                    </div>
                    <div className="text-center mt-2"><span className={`text-gray-400 transition-transform ${pacienteExpandido === paciente.id ? 'rotate-180' : ''}`}>▼</span></div>
                  </div>

                  {pacienteExpandido === paciente.id && (
                    <div className="border-t border-gray-200">
                      <div className="p-4 space-y-3">
                        {consultas.map(consulta => (
                          <div key={consulta.id} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium text-gray-800">{formatarDataCompleta(consulta.data, consulta.horario)}</p>
                                <p className="text-sm text-gray-600">{consulta.tipoConsulta === 'primeira' ? 'Primeira Vez' : 'Retorno'} - R$ {getValorConsulta(paciente).toFixed(2)}</p>
                              </div>
                              <div className={`text-sm font-medium ${consulta.jaPagou ? 'text-green-600' : 'text-red-600'}`}>{consulta.jaPagou ? '✅ Pago' : '❌ Pendente'}</div>
                            </div>
                            {consulta.observacoes && (<p className="text-sm text-gray-600 mb-2"><strong>Obs:</strong> {consulta.observacoes}</p>)}
                            <div className="flex space-x-2">
                              {!consulta.jaPagou && (
                                <button onClick={() => marcarComoPaga(paciente.id, consulta.id)} className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors">Marcar como Paga</button>
                              )}
                              <Link href={`/editar-consulta/${consulta.id}`} className="flex-1 px-3 py-2 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600 transition-colors text-center">Editar</Link>
                              <button onClick={() => excluirConsulta(consulta.id)} className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors">Cancelar</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6">
          <Link href="/" className="block w-full px-4 py-3 text-center text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">Voltar ao Menu</Link>
        </div>
      </div>
    </div>
  );
}
