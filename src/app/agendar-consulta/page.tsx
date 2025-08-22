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
    jaPagou: false,
    observacoes: '',
    medicacoes: '',
    resumo: ''
  });

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
              setFormData(prev => ({ ...prev, pacienteId: String(p.id) }));
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

  // Prefill da última medicação do paciente selecionado
  useEffect(() => {
    const pid = parseInt(formData.pacienteId || '');
    if (!pid) return;
    const prefill = async () => {
      try {
        if (isSupabaseConfigured) {
          const { data } = await supabase
            .from('consultas')
            .select('medicacoes, data, horario')
            .eq('paciente_id', pid)
            .order('data', { ascending: false })
            .order('horario', { ascending: false })
            .limit(1);
          const last = (data || [])[0];
          if (last?.medicacoes) setFormData(prev => ({ ...prev, medicacoes: last.medicacoes }));
        } else if (isLocalCacheEnabled) {
          const consultas: any[] = JSON.parse(localStorage.getItem('consultas') || '[]');
          const last = consultas
            .filter(c => c.pacienteId === pid)
            .sort((a, b) => (b.data + b.horario).localeCompare(a.data + a.horario))[0];
          if (last?.medicacoes) setFormData(prev => ({ ...prev, medicacoes: last.medicacoes }));
        }
      } catch (_) {}
    };
    prefill();
  }, [formData.pacienteId]);

  const salvarConsulta = async (consulta: Omit<Consulta, 'id' | 'dataAgendamento' | 'paciente'>) => {
    if (isSupabaseConfigured) {
      // Impeditivo: mesma data e hora
      const { data: conflito, error: errSel } = await supabase
        .from('consultas')
        .select('id')
        .eq('data', consulta.data)
        .eq('horario', consulta.horario)
        .limit(1);
      if (!errSel && conflito && conflito.length > 0) {
        throw new Error('Horário já ocupado para esta data.');
      }
      const payload = {
        paciente_id: consulta.pacienteId,
        data: consulta.data,
        horario: consulta.horario,
        tipo_consulta: consulta.tipoConsulta,
        ja_pagou: consulta.jaPagou,
        observacoes: consulta.observacoes,
        medicacoes: (formData as any).medicacoes || null,
        resumo: (formData as any).resumo || null,
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
            medicacoes: (formData as any).medicacoes || '',
            resumo: (formData as any).resumo || '',
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
  };

  const limparFormulario = () => {
    setFormData({ pacienteId: '', data: '', horario: '', tipoConsulta: 'primeira', jaPagou: false, observacoes: '', medicacoes: '', resumo: '' });
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
            <input type="time" name="horario" value={formData.horario} onChange={handleInputChange} required className={inputClass} />
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Remédios em uso (um por linha)</label>
            <textarea name="medicacoes" value={(formData as any).medicacoes} onChange={handleInputChange} rows={3} className={textAreaClass} placeholder="Ex.: Losartana 50mg 1x/dia\nMetformina 850mg 2x/dia"></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Resumo do atendimento</label>
            <textarea name="resumo" value={(formData as any).resumo} onChange={handleInputChange} rows={4} className={textAreaClass} placeholder="Anamnese, conduta, orientações..."></textarea>
          </div>

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
