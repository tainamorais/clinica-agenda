'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured, isLocalCacheEnabled, Bloqueio } from '../../config/supabase-config';
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
  duration_minutos?: number;
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
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);

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
            duration_minutos: row.duration_minutos ?? 60,
          }));
          setConsultas(mapeadas);
          // Bloqueios do dia
          const { data: blq } = await supabase.from('bloqueios').select('*').eq('data', dataSelecionada);
          setBloqueios((blq as any) || []);
          return;
        }
      }
      const consultasSalvas = isLocalCacheEnabled ? localStorage.getItem('consultas') : null;
      if (consultasSalvas) {
        const todas: Consulta[] = JSON.parse(consultasSalvas);
        const doDia = todas.filter(c => c.data === dataSelecionada);
        setConsultas(doDia);
      } else {
        setConsultas([]);
      }
      // Local: bloqueios não persistidos se cache desabilitado
      if (isLocalCacheEnabled) {
        const blq = JSON.parse(localStorage.getItem('bloqueios') || '[]') as Bloqueio[];
        setBloqueios(blq.filter(b => b.data === dataSelecionada));
      } else {
        setBloqueios([]);
      }
    } catch (e) {
      console.error(e);
      setConsultas([]);
    }
  };

  const marcarComoPaga = async (consultaId: number) => {
    const nomePagador = prompt('Quem efetuou o pagamento? (nome completo)') || '';
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('consultas')
          .update({ ja_pagou: true, pagador_nome: nomePagador || null } as any)
          .eq('id', consultaId);
        if (error) throw error;
        await carregarConsultas();
        return;
      }
      const consultasSalvas: Consulta[] = isLocalCacheEnabled ? JSON.parse(localStorage.getItem('consultas') || '[]') : [];
      const atualizadas = consultasSalvas.map(c => (c.id === consultaId ? { ...c, jaPagou: true, pagador_nome: nomePagador || null } as any : c));
      if (isLocalCacheEnabled) localStorage.setItem('consultas', JSON.stringify(atualizadas));
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
      const consultasSalvas: Consulta[] = isLocalCacheEnabled ? JSON.parse(localStorage.getItem('consultas') || '[]') : [];
      const atualizadas = consultasSalvas.filter(c => c.id !== consultaId);
      if (isLocalCacheEnabled) localStorage.setItem('consultas', JSON.stringify(atualizadas));
      await carregarConsultas();
    } catch (e) {
      console.error(e);
    }
  };

  const consultasOrdenadas = [...consultas].sort((a, b) => a.horario.localeCompare(b.horario));
  const formatarDataBR = (iso: string) => formatISOToBR(iso);

  const getNomePreferencial = (paciente: Paciente) => {
    return paciente.nome_social?.trim() || paciente.nome;
  };

  // Grade (somente leitura)
  const [weekendOverride, setWeekendOverride] = useState<boolean>(false);
  useEffect(() => {
    try {
      const key = `weekend_unlocked_${dataSelecionada}`;
      const v = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      setWeekendOverride(v === 'true');
    } catch {}
  }, [dataSelecionada]);
  const isWeekendDay = (() => {
    const d = new Date(`${dataSelecionada}T00:00:00`);
    const wd = d.getDay();
    return wd === 0 || wd === 6; // domingo(0) ou sábado(6)
  })();
  const gerarSlots = () => {
    const slots: { label: string; startMin: number }[] = [];
    for (let h = 8; h <= 20; h++) {
      const hh = String(h).padStart(2, '0');
      slots.push({ label: `${hh}:00`, startMin: h * 60 });
    }
    return slots;
  };
  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(n => parseInt(n || '0', 10));
    return h * 60 + m;
  };
  const overlap = (a1: number, a2: number, b1: number, b2: number) => a1 < b2 && b1 < a2;
  const temBloqueioDia = bloqueios.some(b => !b.hora_inicio && !b.hora_fim);
  const diaBloqueado = temBloqueioDia || (isWeekendDay && !weekendOverride);
  const slots = gerarSlots().map(s => {
    const start = s.startMin;
    const end = start + 60;
    let status: 'livre'|'agendado'|'bloqueado' = 'livre';
    let texto: string | null = null;
    let telefone: string | null = null;
    let horarioConsulta: string | null = null;
    if (diaBloqueado) { status = 'bloqueado'; }
    // bloqueio por faixa
    if (status === 'livre') {
      const blq = bloqueios.find(b => b.hora_inicio && b.hora_fim && overlap(start, end, toMin(b.hora_inicio!), toMin(b.hora_fim!)));
      if (blq) status = 'bloqueado';
    }
    // agendamento
    if (status === 'livre') {
      const cons = consultas.find(c => overlap(start, end, toMin(c.horario), toMin(c.horario) + (c.duration_minutos || 60)));
      if (cons) {
        status = 'agendado';
        texto = cons.paciente ? getNomePreferencial(cons.paciente) : null;
        telefone = cons.paciente?.telefone || null;
        horarioConsulta = cons.horario;
      }
    }
    return { ...s, status, texto, telefone, horarioConsulta };
  });

  // Cálculo extra: slots de 30min livres criados por consultas de 30min
  const extraMeiaHoraLivres = (() => {
    if (diaBloqueado) return 0;
    const DAY_START = 8 * 60;
    const DAY_END = 21 * 60;
    const consultasRanges = consultas.map(c => [toMin(c.horario), toMin(c.horario) + (c.duration_minutos || 60)] as [number, number]);
    const bloqueiosRanges = bloqueios
      .filter(b => b.hora_inicio && b.hora_fim)
      .map(b => [toMin(b.hora_inicio!), toMin(b.hora_fim!)] as [number, number]);
    const extras = new Set<number>(); // chave pelo início do slot extra
    for (const c of consultas) {
      if ((c.duration_minutos || 60) !== 30) continue;
      const start = toMin(c.horario);
      const rem = start % 60;
      let r0 = 0, r1 = 0;
      if (rem === 0) { r0 = start + 30; r1 = start + 60; }
      else if (rem === 30) { r0 = start - 30; r1 = start; }
      else continue;
      if (r0 < DAY_START || r1 > DAY_END) continue;
      // ocupado por outra consulta?
      let ocupado = consultasRanges.some(([a,b]) => overlap(r0, r1, a, b));
      // ocupado por bloqueio?
      if (!ocupado) ocupado = bloqueiosRanges.some(([a,b]) => overlap(r0, r1, a, b));
      if (!ocupado) extras.add(r0);
    }
    return extras.size;
  })();

  // Total de meias-horas válidas (conta mesmo se já agendado)
  const extraMeiaHoraTotal = (() => {
    if (diaBloqueado) return 0;
    const DAY_START = 8 * 60;
    const DAY_END = 21 * 60;
    const bloqueiosRanges = bloqueios
      .filter(b => b.hora_inicio && b.hora_fim)
      .map(b => [toMin(b.hora_inicio!), toMin(b.hora_fim!)] as [number, number]);
    const extras = new Set<number>();
    for (const c of consultas) {
      if ((c.duration_minutos || 60) !== 30) continue;
      const start = toMin(c.horario);
      const rem = start % 60;
      let r0 = 0, r1 = 0;
      if (rem === 0) { r0 = start + 30; r1 = start + 60; }
      else if (rem === 30) { r0 = start - 30; r1 = start; }
      else continue;
      if (r0 < DAY_START || r1 > DAY_END) continue;
      // não conta se estiver bloqueado
      const bloqueado = bloqueiosRanges.some(([a,b]) => overlap(r0, r1, a, b));
      if (!bloqueado) extras.add(r0);
    }
    return extras.size;
  })();

  // Ações: bloquear/desbloquear slot (1h)
  const toHHMM = (minutes: number) => `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;

  const bloquearSlot = async (startMin: number) => {
    const hora_inicio = toHHMM(startMin);
    const hora_fim = toHHMM(startMin + 60);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('bloqueios').insert([{ data: dataSelecionada, hora_inicio, hora_fim }]);
        if (error) throw error;
      } else if (isLocalCacheEnabled) {
        const blq = JSON.parse(localStorage.getItem('bloqueios') || '[]');
        const novo = { id: Date.now(), data: dataSelecionada, hora_inicio, hora_fim };
        blq.push(novo);
        localStorage.setItem('bloqueios', JSON.stringify(blq));
      }
      await carregarConsultas();
    } catch (e) {
      console.error(e);
    }
  };

  const desbloquearSlot = async (startMin: number) => {
    const hora_inicio = toHHMM(startMin);
    const hora_fim = toHHMM(startMin + 60);
    try {
      if (isSupabaseConfigured) {
        // apaga qualquer bloqueio que sobreponha o slot
        const { data } = await supabase.from('bloqueios').select('id, hora_inicio, hora_fim').eq('data', dataSelecionada);
        const alvo = (data as any[]|null)?.find(b => b.hora_inicio && b.hora_fim && overlap(toMin(hora_inicio), toMin(hora_fim), toMin(b.hora_inicio), toMin(b.hora_fim)));
        if (alvo) {
          const { error } = await supabase.from('bloqueios').delete().eq('id', alvo.id);
          if (error) throw error;
        }
      } else if (isLocalCacheEnabled) {
        const blq = JSON.parse(localStorage.getItem('bloqueios') || '[]') as any[];
        const filtrado = blq.filter(b => !(b.data===dataSelecionada && b.hora_inicio && b.hora_fim && overlap(toMin(hora_inicio), toMin(hora_fim), toMin(b.hora_inicio), toMin(b.hora_fim))));
        localStorage.setItem('bloqueios', JSON.stringify(filtrado));
      }
      await carregarConsultas();
    } catch (e) {
      console.error(e);
    }
  };

  // Ações: bloquear/desbloquear dia inteiro
  const bloquearDia = async () => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('bloqueios').insert([{ data: dataSelecionada, hora_inicio: null, hora_fim: null }]);
        if (error) throw error;
      } else if (isLocalCacheEnabled) {
        const blq = JSON.parse(localStorage.getItem('bloqueios') || '[]');
        const novo = { id: Date.now(), data: dataSelecionada, hora_inicio: null, hora_fim: null };
        blq.push(novo);
        localStorage.setItem('bloqueios', JSON.stringify(blq));
      }
      await carregarConsultas();
    } catch (e) {
      console.error(e);
    }
  };

  const desbloquearDia = async () => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('bloqueios')
          .delete()
          .eq('data', dataSelecionada)
          .is('hora_inicio', null)
          .is('hora_fim', null);
        if (error) throw error;
      } else if (isLocalCacheEnabled) {
        const blq = JSON.parse(localStorage.getItem('bloqueios') || '[]') as any[];
        const filtrado = blq.filter(b => !(b.data===dataSelecionada && (b.hora_inicio==null) && (b.hora_fim==null)));
        localStorage.setItem('bloqueios', JSON.stringify(filtrado));
      }
      await carregarConsultas();
    } catch (e) {
      console.error(e);
    }
  };

  // Ações de UI que consideram fim de semana sem duplicidade de botões
  const desbloquearDiaUI = async () => {
    // Se for fim de semana bloqueado por padrão (sem registro em tabela), apenas ativa override local
    if (isWeekendDay && !temBloqueioDia && !weekendOverride) {
      try {
        const key = `weekend_unlocked_${dataSelecionada}`;
        localStorage.setItem(key, 'true');
        setWeekendOverride(true);
        await carregarConsultas();
        return;
      } catch {}
    }
    await desbloquearDia();
  };

  const bloquearDiaUI = async () => {
    // Se for fim de semana liberado por override, reativa o bloqueio padrão
    if (isWeekendDay && weekendOverride && !temBloqueioDia) {
      try {
        const key = `weekend_unlocked_${dataSelecionada}`;
        localStorage.removeItem(key);
        setWeekendOverride(false);
        await carregarConsultas();
        return;
      } catch {}
    }
    await bloquearDia();
  };

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

        {/* Estatísticas + Resumo do dia */}
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

          {/* Resumo X livres de Y (total considera apenas slots não bloqueados) */}
          <div className="mt-4 p-3 rounded border bg-gray-50 text-center">
            {(() => {
              // Base: 13 slots. Total considera livres + agendados (exclui bloqueados)
              const baseNaoBloqueados = slots.filter(s => s.status !== 'bloqueado').length;
              const baseLivres = slots.filter(s => s.status === 'livre').length;
              // Extras de meia-hora: total conta os válidos; livres conta os que estão livres
              const total = baseNaoBloqueados + extraMeiaHoraTotal;
              const livres = baseLivres + extraMeiaHoraLivres;
              return <span className="text-sm text-gray-700"><strong>{livres}</strong> livres de <strong>{total}</strong></span>;
            })()}
          </div>

          {/* Ações de dia inteiro (sem duplicidade em fins de semana) */}
          <div className="mt-4 flex items-center justify-center gap-3">
            {isWeekendDay && !weekendOverride && (
              <span className="px-3 py-2 text-sm bg-yellow-100 text-yellow-800 rounded border border-yellow-300">Fim de semana (bloqueado por padrão)</span>
            )}
            {(temBloqueioDia || (isWeekendDay && !weekendOverride)) ? (
              <button onClick={desbloquearDiaUI} className="px-3 py-2 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Desbloquear dia inteiro</button>
            ) : (
              <button onClick={bloquearDiaUI} className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">Bloquear dia inteiro</button>
            )}
          </div>
        </div>

        {/* Grade do dia 08:00–20:00 (somente leitura) */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Agenda do dia</h3>
          <div className="space-y-2">
            {slots.map(s => (
              <div key={s.label} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0 rounded border px-3 py-2 ${s.status==='agendado' ? 'bg-blue-50 border-blue-200' : s.status==='bloqueado' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="text-sm font-medium text-gray-800 sm:w-20">{s.label}</div>
                <div className="flex-1 text-sm text-gray-700 w-full sm:ml-2">
                  {s.status === 'agendado' && (
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-600 text-white mr-2">Agendado</span>
                      <span className="flex-1">
                        {s.texto && (<span className="block text-blue-700 font-medium break-words leading-snug">{s.texto}</span>)}
                        {s.horarioConsulta && (<span className="block text-xs text-gray-600">{s.horarioConsulta}</span>)}
                      </span>
                      {s.telefone && (
                        <a
                          href={`https://wa.me/${(s.telefone||'').replace(/\D/g,'').replace(/^55/,'') ? ((s.telefone||'').replace(/\D/g,'').startsWith('55') ? (s.telefone||'').replace(/\D/g,'') : '55'+(s.telefone||'').replace(/\D/g,'')) : ''}?text=${encodeURIComponent('Olá, ' + (s.texto?.split(' ')[0]||'') + '! Aqui é do consultório da Dra. Cida. Confirmando sua consulta em ' + formatarDataBR(dataSelecionada) + ', às ' + (s.horarioConsulta||'') + '. Pode, por favor, confirmar presença respondendo esta mensagem? Obrigada!')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center text-green-600 hover:text-green-700 ml-2"
                          title="Confirmar via WhatsApp"
                          onClick={(e)=>e.stopPropagation()}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.031-.967-.273-.099-.472-.149-.672.15-.198.297-.768.966-.941 1.164-.173.199-.347.224-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.607.134-.133.298-.347.446-.52.149-.173.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.672-1.614-.92-2.207-.242-.58-.487-.502-.672-.511l-.571-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.71.306 1.265.489 1.697.626.713.227 1.362.195 1.877.118.572-.085 1.758-.718 2.006-1.412.248-.694.248-1.289.173-1.412-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.237-.374A9.86 9.86 0 012.29 12.02c0-5.45 4.436-9.885 9.887-9.885 2.64 0 5.122 1.03 6.988 2.897a9.825 9.825 0 012.894 6.994c-.003 5.45-4.438 9.885-9.888 9.885M20.13 3.893A11.815 11.815 0 0012.178.003C5.574.003.29 5.288.292 11.89c0 2.096.547 4.142 1.588 5.94L.057 24l6.334-1.665a11.87 11.87 0 005.79 1.475h.005c6.601 0 11.89-5.287 11.893-11.89a11.82 11.82 0 00-3.949-8.027"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  )}
                  {s.status === 'bloqueado' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-600 text-white">Bloqueado</span>
                  )}
                  {s.status === 'livre' && (
                    <span className="text-green-700 font-medium">Livre</span>
                  )}
                </div>
                <div className="ml-auto w-auto sm:text-right">
                  {s.status === 'livre' && (
                    <button
                      aria-label="Bloquear"
                      title="Bloquear"
                      onClick={() => bloquearSlot(s.startMin)}
                      className="inline-flex items-center justify-center text-red-600 hover:text-red-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path d="M17 8h-1V6a4 4 0 10-8 0v2H7a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2v-8a2 2 0 00-2-2zm-6 0V6a2 2 0 114 0v2h-4z" />
                      </svg>
                    </button>
                  )}
                  {s.status === 'bloqueado' && !diaBloqueado && (
                    <button
                      aria-label="Desbloquear"
                      title="Desbloquear"
                      onClick={() => desbloquearSlot(s.startMin)}
                      className="inline-flex items-center justify-center text-green-600 hover:text-green-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path d="M17 8h-6V6a4 4 0 118 0v1a1 1 0 11-2 0V6a2 2 0 10-4 0v2h4a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8a2 2 0 012-2h10z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
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
