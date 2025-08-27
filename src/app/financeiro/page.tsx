'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured, isLocalCacheEnabled } from '../../config/supabase-config';
import { formatISOToBR } from '../../lib/date';

interface Paciente {
  id: number;
  nome: string;
  telefone?: string;
  valor_consulta?: number;
  valorConsulta?: number;
}

interface ConsultaRow {
  id: number;
  data: string; // yyyy-mm-dd
  horario: string; // HH:mm
  tipo_consulta: string;
  ja_pagou: boolean;
  pacientes: Paciente;
}

type StatusFiltro = 'todas' | 'pagas' | 'pendentes';

const getValorConsulta = (p?: Paciente) => {
  if (!p) return 0;
  const bruto = (p as any)?.valor_consulta ?? (p as any)?.valorConsulta ?? 0;
  return Number(bruto) || 0;
};

export default function FinanceiroPage() {
  const hoje = new Date();
  const primeiroDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const ultimoDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  const [inicio, setInicio] = useState<string>(primeiroDoMes);
  const [fim, setFim] = useState<string>(ultimoDoMes);
  const [pacienteId, setPacienteId] = useState<string>('');
  const [status, setStatus] = useState<StatusFiltro>('todas');

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [consultas, setConsultas] = useState<ConsultaRow[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string>('');

  useEffect(() => {
    const carregarPacientes = async () => {
      try {
        if (isSupabaseConfigured) {
          const { data } = await supabase.from('pacientes').select('id, nome, telefone, valor_consulta').order('nome', { ascending: true });
          setPacientes((data as any[]) || []);
        } else if (isLocalCacheEnabled) {
          const local = JSON.parse(localStorage.getItem('pacientes') || '[]');
          setPacientes(local || []);
        } else {
          setPacientes([]);
        }
      } catch (e) {
        setPacientes([]);
      }
    };
    carregarPacientes();
  }, []);

  const carregarConsultas = async () => {
    setCarregando(true);
    setErro('');
    try {
      if (isSupabaseConfigured) {
        let query = supabase
          .from('consultas')
          .select('id, data, horario, tipo_consulta, ja_pagou, pacientes(*)')
          .gte('data', inicio)
          .lte('data', fim)
          .order('data', { ascending: true })
          .order('horario', { ascending: true });
        if (pacienteId) query = query.eq('paciente_id', Number(pacienteId));
        if (status === 'pagas') query = query.eq('ja_pagou', true);
        if (status === 'pendentes') query = query.eq('ja_pagou', false);
        const { data, error } = await query;
        if (error) throw error;
        setConsultas((data as any[]) || []);
      } else if (isLocalCacheEnabled) {
        const todas = JSON.parse(localStorage.getItem('consultas') || '[]');
        const filtradas = (todas as any[])
          .filter(c => c.data >= inicio && c.data <= fim)
          .filter(c => (pacienteId ? String(c.pacienteId || c.paciente_id) === String(pacienteId) : true))
          .filter(c => (status === 'pagas' ? c.jaPagou : status === 'pendentes' ? !c.jaPagou : true))
          .map(c => ({
            id: c.id,
            data: c.data,
            horario: c.horario,
            tipo_consulta: c.tipoConsulta || c.tipo_consulta,
            ja_pagou: c.jaPagou ?? c.ja_pagou,
            pacientes: c.paciente,
          }));
        setConsultas(filtradas);
      } else {
        setConsultas([]);
      }
    } catch (e: any) {
      console.error(e);
      setErro(e?.message || 'Erro ao carregar consultas.');
      setConsultas([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarConsultas();
  }, [inicio, fim, pacienteId, status]);

  const resumo = useMemo(() => {
    const linhas = consultas.map(c => ({
      valor: getValorConsulta(c.pacientes),
      paga: Boolean(c.ja_pagou),
    }));
    const totalEsperado = linhas.reduce((s, l) => s + l.valor, 0);
    const totalRecebido = linhas.filter(l => l.paga).reduce((s, l) => s + l.valor, 0);
    const totalPendente = totalEsperado - totalRecebido;
    const qtd = linhas.length;
    const qtdPagas = linhas.filter(l => l.paga).length;
    const qtdPendentes = qtd - qtdPagas;
    return { totalEsperado, totalRecebido, totalPendente, qtd, qtdPagas, qtdPendentes };
  }, [consultas]);

  const porPaciente = useMemo(() => {
    const map = new Map<number, { paciente: Paciente; esperado: number; recebido: number; pendente: number; qtd: number; pagas: number; pendentes: number }>();
    for (const c of consultas) {
      const p = c.pacientes;
      if (!p) continue;
      const atual = map.get(p.id) || { paciente: p, esperado: 0, recebido: 0, pendente: 0, qtd: 0, pagas: 0, pendentes: 0 };
      const valor = getValorConsulta(p);
      atual.esperado += valor;
      atual.qtd += 1;
      if (c.ja_pagou) {
        atual.recebido += valor;
        atual.pagas += 1;
      } else {
        atual.pendente += valor;
        atual.pendentes += 1;
      }
      map.set(p.id, atual);
    }
    return Array.from(map.values()).sort((a, b) => a.paciente.nome.localeCompare(b.paciente.nome));
  }, [consultas]);

  const marcarPago = async (id: number, novo: boolean) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('consultas').update({ ja_pagou: novo }).eq('id', id);
        if (error) throw error;
      } else if (isLocalCacheEnabled) {
        const todas = JSON.parse(localStorage.getItem('consultas') || '[]');
        const atual = (todas as any[]).map(c => c.id === id ? { ...c, jaPagou: novo } : c);
        localStorage.setItem('consultas', JSON.stringify(atual));
      }
      await carregarConsultas();
    } catch (e) {
      console.error(e);
    }
  };

  const inputClass = "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900";

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <div className="flex items-center space-x-3 mb-4">
            <Link href="/" className="text-blue-600 text-xl">←</Link>
            <h1 className="text-xl font-bold text-gray-800">Financeiro</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-sm text-gray-700">Início</label>
              <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-sm text-gray-700">Fim</label>
              <input type="date" value={fim} onChange={e => setFim(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-sm text-gray-700">Paciente</label>
              <select value={pacienteId} onChange={e => setPacienteId(e.target.value)} className={inputClass}>
                <option value="">Todos</option>
                {pacientes.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-700">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as StatusFiltro)} className={inputClass}>
                <option value="todas">Todas</option>
                <option value="pagas">Pagas</option>
                <option value="pendentes">Pendentes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Resumos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-sm text-gray-500">Total Esperado</p>
            <p className="text-2xl font-bold text-gray-900">R$ {resumo.totalEsperado.toFixed(2)}</p>
            <p className="text-xs text-gray-500">{resumo.qtd} consultas</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-sm text-gray-500">Recebido</p>
            <p className="text-2xl font-bold text-green-700">R$ {resumo.totalRecebido.toFixed(2)}</p>
            <p className="text-xs text-gray-500">{resumo.qtdPagas} pagas</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-sm text-gray-500">Pendente</p>
            <p className="text-2xl font-bold text-red-700">R$ {resumo.totalPendente.toFixed(2)}</p>
            <p className="text-xs text-gray-500">{resumo.qtdPendentes} pendentes</p>
          </div>
        </div>

        {erro && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded">{erro}</div>
        )}

        {/* Lista de consultas */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Por consulta</h2>
          {carregando ? (
            <div className="text-sm text-gray-600">Carregando...</div>
          ) : consultas.length === 0 ? (
            <div className="text-sm text-gray-600">Nenhuma consulta no período.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-4">Data</th>
                    <th className="py-2 pr-4">Horário</th>
                    <th className="py-2 pr-4">Paciente</th>
                    <th className="py-2 pr-4">Valor</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {consultas.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="py-2 pr-4">{formatISOToBR(c.data)}</td>
                      <td className="py-2 pr-4">{c.horario}</td>
                      <td className="py-2 pr-4">{c.pacientes?.nome}</td>
                      <td className="py-2 pr-4">R$ {getValorConsulta(c.pacientes).toFixed(2)}</td>
                      <td className="py-2 pr-4">{c.ja_pagou ? <span className="text-green-700 font-medium">Pago</span> : <span className="text-red-700 font-medium">Pendente</span>}</td>
                      <td className="py-2 pr-4 text-right">
                        {c.ja_pagou ? (
                          <button onClick={() => marcarPago(c.id, false)} className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-800 hover:bg-gray-300">Marcar como Não Pago</button>
                        ) : (
                          <button onClick={() => marcarPago(c.id, true)} className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700">Marcar como Pago</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resumo por paciente */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-10">
          <h2 className="font-semibold text-gray-800 mb-3">Por paciente (resumo)</h2>
          {porPaciente.length === 0 ? (
            <div className="text-sm text-gray-600">Sem dados no período.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-4">Paciente</th>
                    <th className="py-2 pr-4">Consultas</th>
                    <th className="py-2 pr-4">Pagas</th>
                    <th className="py-2 pr-4">Pendentes</th>
                    <th className="py-2 pr-4">Esperado</th>
                    <th className="py-2 pr-4">Recebido</th>
                    <th className="py-2 pr-4">Em aberto</th>
                  </tr>
                </thead>
                <tbody>
                  {porPaciente.map((r) => (
                    <tr key={r.paciente.id} className="border-t">
                      <td className="py-2 pr-4">{r.paciente.nome}</td>
                      <td className="py-2 pr-4">{r.qtd}</td>
                      <td className="py-2 pr-4 text-green-700">{r.pagas}</td>
                      <td className="py-2 pr-4 text-red-700">{r.pendentes}</td>
                      <td className="py-2 pr-4">R$ {r.esperado.toFixed(2)}</td>
                      <td className="py-2 pr-4 text-green-700">R$ {r.recebido.toFixed(2)}</td>
                      <td className="py-2 pr-4 text-red-700">R$ {r.pendente.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


