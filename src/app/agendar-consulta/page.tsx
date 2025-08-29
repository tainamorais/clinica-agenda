'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase, isSupabaseConfigured, isLocalCacheEnabled } from '../../config/supabase-config';

interface Paciente {
  id: number;
  nome: string;
  telefone: string;
  endereco: string;
  dataNascimento: string;
  cpf: string;
  valorConsulta?: number;
  valor_consulta?: number;
  nomeRepresentante: string;
  telefoneRepresentante: string;
  temRepresentante: boolean;
  dataCadastro: string;
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
  medicacoes?: string;
  resumo?: string;
}

function AgendarConsultaInner() {
  const searchParams = useSearchParams();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [formData, setFormData] = useState({
    pacienteId: '',
    data: '',
    horario: '',
    tipoConsulta: 'primeira',
    modalidade: 'presencial_b',
    jaPagou: false,
    observacoes: ''
  });
  const [durationMinutos, setDurationMinutos] = useState<number>(60);
  const [consultasDoDia, setConsultasDoDia] = useState<Array<{horario: string; duration_minutos?: number}>>([]);
  const [bloqueiosDoDia, setBloqueiosDoDia] = useState<Array<{hora_inicio: string|null; hora_fim: string|null}>>([]);
  const [slotsDisponiveis, setSlotsDisponiveis] = useState<string[]>([]);
  const [weekendOverride, setWeekendOverride] = useState<boolean>(false);

  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState<'sucesso' | 'erro'>('sucesso');

  const getValorConsulta = (p: Paciente | null) => {
    if (!p) return 0;
    const bruto = (p as any).valor_consulta ?? (p as any).valorConsulta ?? 0;
    return Number(bruto) || 0;
  };

  const normalizar = (texto: string) =>
    (texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const pacientesFiltrados = pacientes.filter((p) => {
    if (!termoBusca.trim()) return true;
    const t = normalizar(termoBusca);
    return (
      normalizar(p.nome).includes(t) ||
      (p.telefone || '').includes(termoBusca) ||
      (p.cpf || '').includes(termoBusca)
    );
  });

  useEffect(() => {
    const carregar = async () => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('pacientes').select('*').order('nome', { ascending: true });
        if (!error && data && data.length > 0) {
          setPacientes(data as any);
          // Pré-seleciona via querystring ?pacienteId=
          const preId = searchParams.get('pacienteId');
          if (preId) {
            const p = (data as any).find((x: any) => String(x.id) === String(preId));
            if (p) {
              const preferida = (p as any)?.modalidade_preferida || (p as any)?.modalidadePreferida;
              setFormData(prev => ({ ...prev, pacienteId: String(p.id), modalidade: preferida || prev.modalidade }));
              setPacienteSelecionado(p as any);
            }
          }
        } else {
          const pacientesSalvos = isLocalCacheEnabled ? localStorage.getItem('pacientes') : null;
          if (pacientesSalvos) setPacientes(JSON.parse(pacientesSalvos));
        }
      } else {
        if (isLocalCacheEnabled) {
          const pacientesSalvos = localStorage.getItem('pacientes');
          if (pacientesSalvos) setPacientes(JSON.parse(pacientesSalvos));
        }
      }
    };
    carregar();
  }, [searchParams]);

  // (Removido) Prefill de medicação não aparece no agendamento; será editado depois

  // Helpers para checar sobreposição de horários
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map((x) => parseInt(x || '0', 10));
    return h * 60 + m;
  };
  const overlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

  // Carrega consultas/bloqueios da data escolhida
  useEffect(() => {
    const carregarDia = async () => {
      if (!formData.data) {
        setConsultasDoDia([]);
        setBloqueiosDoDia([]);
        setWeekendOverride(false);
        return;
      }
      // weekend override
      try {
        const key = `weekend_unlocked_${formData.data}`;
        const v = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        setWeekendOverride(v === 'true');
      } catch {}
      try {
        if (isSupabaseConfigured) {
          const [{ data: cons }, { data: blq }] = await Promise.all([
            supabase.from('consultas').select('horario, duration_minutos').eq('data', formData.data),
            supabase.from('bloqueios').select('hora_inicio, hora_fim').eq('data', formData.data),
          ]);
          setConsultasDoDia((cons as any[]) || []);
          setBloqueiosDoDia((blq as any[]) || []);
        } else {
          const consAll = isLocalCacheEnabled ? JSON.parse(localStorage.getItem('consultas') || '[]') : [];
          setConsultasDoDia((consAll as any[]).filter(c => c.data === formData.data).map((c:any)=>({ horario: c.horario, duration_minutos: c.duration_minutos })));
          const blqAll = isLocalCacheEnabled ? JSON.parse(localStorage.getItem('bloqueios') || '[]') : [];
          setBloqueiosDoDia((blqAll as any[]).filter(b => b.data === formData.data));
        }
      } catch (e) {
        setConsultasDoDia([]);
        setBloqueiosDoDia([]);
      }
    };
    carregarDia();
  }, [formData.data]);

  // Recalcula slots disponíveis quando data/duração/dia muda
  useEffect(() => {
    const toMin = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map((x) => parseInt(x || '0', 10));
      return h * 60 + m;
    };
    const toHHMM = (m: number) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
    const DAY_START = 8 * 60;
    const DAY_END = 21 * 60; // limite de término

    // Dia bloqueado?
    const isWeekend = (() => {
      if (!formData.data) return false;
      const d = new Date(`${formData.data}T00:00:00`);
      const wd = d.getDay();
      return wd === 0 || wd === 6;
    })();
    const diaBloqueado = bloqueiosDoDia.some(b => b.hora_inicio == null && b.hora_fim == null) || (isWeekend && !weekendOverride);
    if (!formData.data || diaBloqueado) {
      setSlotsDisponiveis([]);
      return;
    }

    const consultasRanges = consultasDoDia.map(c => [toMin(c.horario), toMin(c.horario) + (Number(c.duration_minutos) || 60)] as [number, number]);
    const bloqueiosRanges = bloqueiosDoDia
      .filter(b => b.hora_inicio && b.hora_fim)
      .map(b => [toMin(b.hora_inicio as string), toMin(b.hora_fim as string)] as [number, number]);

    const candidatos: number[] = [];
    if (durationMinutos === 60) {
      for (let h = 8; h <= 20; h++) candidatos.push(h * 60);
    } else if (durationMinutos === 120) {
      for (let h = 8; h <= 19; h++) candidatos.push(h * 60);
    } else if (durationMinutos === 30) {
      for (let m = DAY_START; m <= DAY_END - 30; m += 30) candidatos.push(m);
    }

    const livres: string[] = [];
    for (const start of candidatos) {
      const end = start + durationMinutos;
      if (end > DAY_END) continue;
      let ocupado = consultasRanges.some(([a,b]) => overlap(start, end, a, b));
      if (!ocupado) ocupado = bloqueiosRanges.some(([a,b]) => overlap(start, end, a, b));
      if (!ocupado) livres.push(toHHMM(start));
    }
    setSlotsDisponiveis(livres);
    // Se horário selecionado não está mais disponível, limpa
    if (formData.horario && !livres.includes(formData.horario)) {
      setFormData(prev => ({ ...prev, horario: '' }));
    }
  }, [consultasDoDia, bloqueiosDoDia, durationMinutos, formData.data]);

  const salvarConsulta = async (consulta: Omit<Consulta, 'id' | 'dataAgendamento' | 'paciente'>) => {
    if (isSupabaseConfigured) {
      // Impeditivo: conflito considerando duração
      const { data: existentes, error: errSel } = await supabase
        .from('consultas')
        .select('id, horario, duration_minutos')
        .eq('data', consulta.data);
      if (errSel) throw errSel;
      const newStart = toMinutes(consulta.horario);
      const newEnd = newStart + (durationMinutos || 60);
      const temConflito = (existentes || []).some((c: any) => {
        const cStart = toMinutes(c.horario);
        const cEnd = cStart + (Number(c.duration_minutos) || 60);
        return overlap(newStart, newEnd, cStart, cEnd);
      });
      if (temConflito) throw new Error('Conflito de horário: já existe consulta nesse intervalo.');
      const payload = {
        paciente_id: consulta.pacienteId,
        data: consulta.data,
        horario: consulta.horario,
        tipo_consulta: consulta.tipoConsulta,
        ja_pagou: consulta.jaPagou,
        observacoes: consulta.observacoes,
        duration_minutos: durationMinutos,
      };
      const { data, error } = await supabase.from('consultas').insert([payload]).select().single();
      if (error) throw error;
      // Espelha localmente para fallback das telas
      try {
        if (isLocalCacheEnabled) {
          const consultasExistentes = JSON.parse(localStorage.getItem('consultas') || '[]');
          const novaConsulta: any = {
            id: data?.id || Date.now(),
            pacienteId: consulta.pacienteId,
            paciente: pacienteSelecionado,
            data: consulta.data,
            horario: consulta.horario,
            tipoConsulta: consulta.tipoConsulta,
            jaPagou: consulta.jaPagou,
            observacoes: consulta.observacoes,
            duration_minutos: durationMinutos,
            modalidade: (formData as any).modalidade,
            dataAgendamento: data?.data_agendamento || new Date().toISOString(),
          };
          consultasExistentes.push(novaConsulta);
          localStorage.setItem('consultas', JSON.stringify(consultasExistentes));
        }
      } catch (_) {}
      return true;
    }
    // Fallback local
    // Impeditivo local: mesma data e hora
    const consultasExistentesLocal: Consulta[] = isLocalCacheEnabled ? JSON.parse(localStorage.getItem('consultas') || '[]') : [];
    const conflitoLocal = consultasExistentesLocal.some((c) => c.data === consulta.data && c.horario === consulta.horario);
    if (conflitoLocal) throw new Error('Horário já ocupado para esta data.');
    const consultasExistentes = isLocalCacheEnabled ? JSON.parse(localStorage.getItem('consultas') || '[]') : [];
    const novoId = consultasExistentes.length > 0 ? Math.max(...consultasExistentes.map((c: Consulta) => c.id)) + 1 : 1;
    const novaConsulta: any = { ...consulta, id: novoId, dataAgendamento: new Date().toISOString(), paciente: pacienteSelecionado };
    consultasExistentes.push(novaConsulta);
    if (isLocalCacheEnabled) localStorage.setItem('consultas', JSON.stringify(consultasExistentes));
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteSelecionado) return mostrarMensagem('Selecione um paciente primeiro!', 'erro');
    if (!formData.data) return mostrarMensagem('Selecione uma data!', 'erro');
    if (!formData.horario) return mostrarMensagem('Selecione um horário!', 'erro');

    const base = {
      pacienteId: pacienteSelecionado.id,
      data: formData.data,
      horario: formData.horario,
      tipoConsulta: formData.tipoConsulta,
      jaPagou: formData.jaPagou,
      observacoes: formData.observacoes.trim(),
    };

    try {
      await salvarConsulta(base);
      mostrarMensagem('Consulta agendada com sucesso!', 'sucesso');
      limparFormulario();
    } catch (err: any) {
      console.error(err);
      mostrarMensagem(err?.message || 'Erro ao agendar consulta. Verifique o banco de dados.', 'erro');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    else setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePacienteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pacienteId = e.target.value;
    setFormData(prev => ({ ...prev, pacienteId }));
    const paciente = pacientes.find(p => p.id === parseInt(pacienteId));
    setPacienteSelecionado(paciente || null);
    // Prefill modalidade conforme cadastro (se houver)
    try {
      const preferida = (paciente as any)?.modalidade_preferida || (paciente as any)?.modalidadePreferida;
      if (preferida) setFormData(prev => ({ ...prev, modalidade: preferida }));
    } catch {}
  };

  const limparFormulario = () => {
    setFormData({ pacienteId: '', data: '', horario: '', tipoConsulta: 'primeira', modalidade: 'presencial_b', jaPagou: false, observacoes: '' });
    setPacienteSelecionado(null);
  };

  const mostrarMensagem = (texto: string, tipo: 'sucesso' | 'erro') => {
    setMensagem(texto);
    setTipoMensagem(tipo);
    setTimeout(() => setMensagem(''), 4000);
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500";
  const selectClass = inputClass;
  const textAreaClass = inputClass;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Link href="/" className="text-blue-600 text-xl">←</Link>
            <h1 className="text-xl font-bold text-gray-800">Agendar Consulta</h1>
          </div>
        </div>

        {mensagem && (
          <div className={`mb-6 p-4 rounded-lg ${tipoMensagem === 'sucesso' ? 'bg-green-100 border border-green-400 text-green-700' : 'bg-red-100 border border-red-400 text-red-700'}`}>{mensagem}</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Selecionar Paciente *</label>
            {pacientes.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                <p className="text-yellow-800 text-sm">Nenhum paciente cadastrado ainda.</p>
                <Link href="/cadastrar-paciente" className="text-blue-600 hover:underline text-sm mt-2 inline-block">Cadastrar primeiro paciente</Link>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  placeholder="Digite nome, sobrenome, CPF ou telefone"
                  className={inputClass}
                />
                <select name="pacienteId" value={formData.pacienteId} onChange={handlePacienteChange} required className={selectClass}>
                  <option value="">Escolha um paciente</option>
                  {pacientesFiltrados.map(paciente => (
                    <option key={paciente.id} value={paciente.id}>{paciente.nome} - {paciente.telefone}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {pacienteSelecionado && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-800 mb-2">Paciente Selecionado:</h3>
              <p className="text-sm text-blue-700"><strong>Nome:</strong> {pacienteSelecionado.nome}</p>
              <p className="text-sm text-blue-700"><strong>Telefone:</strong> {pacienteSelecionado.telefone}</p>
              <p className="text-sm text-blue-700"><strong>Valor da Consulta:</strong> R$ {getValorConsulta(pacienteSelecionado).toFixed(2)}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data da Consulta *</label>
            <input type="date" name="data" value={formData.data} onChange={handleInputChange} required min={new Date().toISOString().split('T')[0]} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Horário da Consulta *</label>
            {!formData.data ? (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">Selecione a data para ver os horários disponíveis.</div>
            ) : slotsDisponiveis.length === 0 ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">Nenhum horário disponível para esta data e duração.</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slotsDisponiveis.map(h => (
                  <button
                    type="button"
                    key={h}
                    onClick={() => setFormData(prev => ({ ...prev, horario: h }))}
                    className={`px-2 py-2 rounded border text-sm ${formData.horario===h ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-300 hover:bg-blue-50'}`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}
            {/* input oculto para validação nativa do form */}
            <input type="hidden" name="horario" value={formData.horario} required readOnly />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duração</label>
            <select value={durationMinutos} onChange={(e) => setDurationMinutos(parseInt(e.target.value, 10))} className={selectClass}>
              <option value={60}>1 hora (padrão)</option>
              <option value={120}>2 horas</option>
              <option value={30}>30 minutos (exceção)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Modalidade da Consulta</label>
            <select name="modalidade" value={formData.modalidade} onChange={handleInputChange} className={selectClass}>
              <option value="presencial_b">Presencial Barra</option>
              <option value="presencial_zs">Presencial Botafogo</option>
              <option value="online">Online</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Consulta *</label>
            <select name="tipoConsulta" value={formData.tipoConsulta} onChange={handleInputChange} required className={selectClass}>
              <option value="primeira">Primeira Vez</option>
              <option value="retorno">Retorno</option>
            </select>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-4">
              <input type="checkbox" name="jaPagou" checked={formData.jaPagou} onChange={handleInputChange} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <label className="text-sm font-medium text-gray-700">Paciente já pagou esta consulta</label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
            <textarea name="observacoes" value={formData.observacoes} onChange={handleInputChange} rows={3} className={textAreaClass} placeholder="Observações sobre a consulta..."></textarea>
          </div>

          {/* Campos de medicação e resumo foram movidos para a edição pós-consulta */}

          <div className="flex space-x-3 pt-4">
            <Link href="/" className="flex-1 px-4 py-2 text-center text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">Cancelar</Link>
            <button type="submit" disabled={!pacienteSelecionado || pacientes.length === 0} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">Agendar Consulta</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AgendarConsulta() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100 p-4">Carregando...</div>}>
      <AgendarConsultaInner />
    </Suspense>
  );
}
