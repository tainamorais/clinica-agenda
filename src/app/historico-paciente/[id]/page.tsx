'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '../../../config/supabase-config';
import { formatISOToBR } from '../../../lib/date';

interface Paciente {
  id: number;
  nome: string;
  telefone: string;
  endereco: string;
  cpf: string;
  dataNascimento?: string;
  data_nascimento?: string;
  valorConsulta?: number;
  valor_consulta?: number;
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

const getValorConsulta = (p: Paciente) => {
  const bruto = (p as any)?.valor_consulta ?? (p as any)?.valorConsulta ?? 0;
  return Number(bruto) || 0;
};

const getDataNasc = (p: Paciente) => p.dataNascimento || (p as any).data_nascimento || '';

export default function HistoricoPaciente({ params }: { params: { id: string } }) {
  const pacienteIdNum = Number(params.id);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState<'sucesso' | 'erro'>('sucesso');

  useEffect(() => {
    carregar();
  }, [params.id]);

  const carregar = async () => {
    setCarregando(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('consultas')
          .select('*, pacientes(*)')
          .eq('paciente_id', pacienteIdNum)
          .order('data', { ascending: false })
          .order('horario', { ascending: false });

        if (!error && data) {
          const firstPatient = (data as any[])[0]?.pacientes || null;
          if (firstPatient) {
            setPaciente({
              id: firstPatient.id,
              nome: firstPatient.nome,
              telefone: firstPatient.telefone,
              endereco: firstPatient.endereco,
              cpf: firstPatient.cpf,
              data_nascimento: firstPatient.data_nascimento,
              valor_consulta: firstPatient.valor_consulta,
            });
          } else {
            // Se não achou via consultas, tenta buscar direto a tabela de pacientes
            const { data: pData } = await supabase
              .from('pacientes')
              .select('*')
              .eq('id', pacienteIdNum)
              .limit(1)
              .maybeSingle();
            if (pData) setPaciente(pData as any);
          }

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
          setCarregando(false);
          return;
        }
      }

      // Fallback local
      const pacientesSalvos = JSON.parse(localStorage.getItem('pacientes') || '[]');
      const pacienteLocal = pacientesSalvos.find((p: Paciente) => p.id === pacienteIdNum) || null;
      setPaciente(pacienteLocal);
      const consultasSalvas: Consulta[] = JSON.parse(localStorage.getItem('consultas') || '[]');
      setConsultas(consultasSalvas.filter(c => c.pacienteId === pacienteIdNum));
    } catch (e) {
      console.error(e);
      setMensagem('Erro ao carregar histórico.');
      setTipoMensagem('erro');
    } finally {
      setCarregando(false);
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
        await carregar();
        setMensagem('Consulta marcada como paga.');
        setTipoMensagem('sucesso');
        setTimeout(() => setMensagem(''), 3000);
        return;
      }
      // Local
      const consultasSalvas: Consulta[] = JSON.parse(localStorage.getItem('consultas') || '[]');
      const atualizadas = consultasSalvas.map(c => (c.id === consultaId ? { ...c, jaPagou: true } : c));
      localStorage.setItem('consultas', JSON.stringify(atualizadas));
      await carregar();
      setMensagem('Consulta marcada como paga.');
      setTipoMensagem('sucesso');
      setTimeout(() => setMensagem(''), 3000);
    } catch (e) {
      console.error(e);
      setMensagem('Erro ao marcar como paga.');
      setTipoMensagem('erro');
      setTimeout(() => setMensagem(''), 3000);
    }
  };

  const formatarData = (data: string) => formatISOToBR(data);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Link href="/" className="text-blue-600 text-xl">←</Link>
            <h1 className="text-xl font-bold text-gray-800">Ficha do Paciente</h1>
          </div>
        </div>

        {mensagem && (
          <div className={`mb-6 p-4 rounded-lg ${tipoMensagem === 'sucesso' ? 'bg-green-100 border border-green-400 text-green-700' : 'bg-red-100 border border-red-400 text-red-700'}`}>
            {mensagem}
          </div>
        )}

        {carregando ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">Carregando...</div>
        ) : !paciente ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">Paciente não encontrado.</div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">{paciente.nome}</h2>
              <p className="text-sm text-gray-600">Telefone: {paciente.telefone}</p>
              <p className="text-sm text-gray-600">CPF: {paciente.cpf}</p>
              <p className="text-sm text-gray-600">Endereço: {paciente.endereco}</p>
              <p className="text-sm text-gray-600">Nascimento: {formatarData(getDataNasc(paciente))}</p>
              <p className="text-sm text-gray-600">Valor da Consulta: R$ {getValorConsulta(paciente).toFixed(2)}</p>
            </div>

            <div className="flex space-x-2">
              <Link href={`/editar-paciente/${paciente.id}`} className="flex-1 px-3 py-2 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600 transition-colors text-center">Editar Paciente</Link>
              <button
                onClick={async () => {
                  if (!confirm('Tem certeza que deseja apagar este paciente e suas consultas?')) return;
                  try {
                    if (isSupabaseConfigured) {
                      const { error } = await supabase.from('pacientes').delete().eq('id', paciente.id);
                      if (error) throw error;
                    }
                    // local
                    try {
                      const pacientesLocal = JSON.parse(localStorage.getItem('pacientes') || '[]');
                      const consultasLocal = JSON.parse(localStorage.getItem('consultas') || '[]');
                      localStorage.setItem('pacientes', JSON.stringify(pacientesLocal.filter((p: any) => p.id !== paciente.id)));
                      localStorage.setItem('consultas', JSON.stringify(consultasLocal.filter((c: any) => c.pacienteId !== paciente.id)));
                    } catch (_) {}
                    window.location.href = '/buscar-paciente';
                  } catch (e) {
                    console.error(e);
                    setMensagem('Erro ao apagar paciente.');
                    setTipoMensagem('erro');
                  }
                }}
                className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
              >Apagar Paciente</button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Consultas</h3>
              {consultas.length === 0 ? (
                <p className="text-gray-500">Nenhuma consulta registrada.</p>
              ) : (
                <div className="space-y-3">
                  {consultas.map((c) => (
                    <div key={c.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <p className="font-medium text-gray-800">{formatarData(c.data)} às {c.horario}</p>
                          <p className="text-sm text-gray-600">{c.tipoConsulta === 'primeira' ? 'Primeira Vez' : 'Retorno'} - R$ {getValorConsulta(c.paciente).toFixed(2)}</p>
                        </div>
                        <div className={`text-sm font-medium ${c.jaPagou ? 'text-green-600' : 'text-red-600'}`}>{c.jaPagou ? '✅ Pago' : '❌ Pendente'}</div>
                      </div>
                      {c.observacoes && <p className="text-sm text-gray-600"><strong>Obs:</strong> {c.observacoes}</p>}
                      {!c.jaPagou && (
                        <button onClick={() => marcarComoPaga(c.id)} className="mt-2 w-full px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors">Marcar como Paga</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Link href="/" className="block w-full px-4 py-3 text-center text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">Voltar ao Menu</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


