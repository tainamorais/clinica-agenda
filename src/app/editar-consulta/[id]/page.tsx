'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured, isLocalCacheEnabled } from '../../../config/supabase-config';

interface Paciente { id: number; nome: string; telefone: string; }

export default function EditarConsulta({ params }: { params: { id: string } }) {
  const consultaId = Number(params.id);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState<'sucesso' | 'erro'>('sucesso');
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
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

  useEffect(() => {
    carregar();
  }, [params.id]);

  const carregar = async () => {
    setCarregando(true);
    try {
      if (isSupabaseConfigured) {
        const [{ data: cons, error: e1 }, { data: pacs, error: e2 }] = await Promise.all([
          supabase.from('consultas').select('*').eq('id', consultaId).maybeSingle(),
          supabase.from('pacientes').select('id, nome, telefone').order('nome', { ascending: true }),
        ]);
        if (e1 || e2) throw e1 || e2;
        if (pacs) setPacientes(pacs as any);
        if (cons) {
          setFormData({
            pacienteId: String(cons.paciente_id),
            data: cons.data,
            horario: cons.horario,
            tipoConsulta: cons.tipo_consulta,
            jaPagou: Boolean(cons.ja_pagou),
            observacoes: cons.observacoes || '',
            medicacoes: (cons as any).medicacoes || '',
            resumo: (cons as any).resumo || ''
          });
        }
        setCarregando(false);
        return;
      }
      // local
      const pacsLocal = isLocalCacheEnabled ? JSON.parse(localStorage.getItem('pacientes') || '[]') : [];
      setPacientes(pacsLocal);
      const consLocal = JSON.parse(localStorage.getItem('consultas') || '[]').find((c: any) => c.id === consultaId);
      if (consLocal) {
        setFormData({
          pacienteId: String(consLocal.pacienteId),
          data: consLocal.data,
          horario: consLocal.horario,
          tipoConsulta: consLocal.tipoConsulta,
          jaPagou: Boolean(consLocal.jaPagou),
          observacoes: consLocal.observacoes || '',
          medicacoes: consLocal.medicacoes || '',
          resumo: consLocal.resumo || '',
        });
      }
    } catch (e) {
      console.error(e);
      setMensagem('Erro ao carregar consulta.');
      setTipoMensagem('erro');
    } finally {
      setCarregando(false);
    }
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    try {
      // Impeditivo: mesma data e horário
      if (isSupabaseConfigured) {
        const { data: conflito, error: errSel } = await supabase
          .from('consultas')
          .select('id')
          .eq('data', formData.data)
          .eq('horario', formData.horario)
          .neq('id', consultaId)
          .limit(1);
        if (!errSel && conflito && conflito.length > 0) {
          throw new Error('Horário já ocupado para esta data.');
        }
        const { error } = await supabase
          .from('consultas')
          .update({
            paciente_id: Number(formData.pacienteId),
            data: formData.data,
            horario: formData.horario,
            tipo_consulta: formData.tipoConsulta,
            ja_pagou: formData.jaPagou,
            observacoes: formData.observacoes,
            medicacoes: (formData as any).medicacoes || null,
            resumo: (formData as any).resumo || null,
          })
          .eq('id', consultaId);
        if (error) throw error;
      } else {
        const consLocal: any[] = isLocalCacheEnabled ? JSON.parse(localStorage.getItem('consultas') || '[]') : [];
        const conflito = consLocal.some((c) => c.data === formData.data && c.horario === formData.horario && c.id !== consultaId);
        if (conflito) throw new Error('Horário já ocupado para esta data.');
        const atualizadas = consLocal.map((c) => (c.id === consultaId ? {
          ...c,
          pacienteId: Number(formData.pacienteId),
          data: formData.data,
          horario: formData.horario,
          tipoConsulta: formData.tipoConsulta,
          jaPagou: formData.jaPagou,
          observacoes: formData.observacoes,
          medicacoes: formData.medicacoes,
          resumo: formData.resumo,
        } : c));
        if (isLocalCacheEnabled) localStorage.setItem('consultas', JSON.stringify(atualizadas));
      }
      setMensagem('Consulta atualizada com sucesso!');
      setTipoMensagem('sucesso');
    } catch (e: any) {
      console.error(e);
      setMensagem(e?.message || 'Erro ao atualizar consulta.');
      setTipoMensagem('erro');
    } finally {
      setCarregando(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500";

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Link href="/" className="text-blue-600 text-xl">←</Link>
            <h1 className="text-xl font-bold text-gray-800">Editar Consulta</h1>
          </div>
        </div>

        {mensagem && (
          <div className={`mb-6 p-4 rounded-lg ${tipoMensagem === 'sucesso' ? 'bg-green-100 border border-green-400 text-green-700' : 'bg-red-100 border border-red-400 text-red-700'}`}>
            {mensagem}
          </div>
        )}

        {carregando ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">Carregando...</div>
        ) : (
          <form onSubmit={salvar} className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Paciente *</label>
              <select name="pacienteId" value={formData.pacienteId} onChange={(e) => setFormData(prev => ({ ...prev, pacienteId: e.target.value }))} className={inputClass} required>
                <option value="">Escolha um paciente</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome} - {p.telefone}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data *</label>
              <input type="date" name="data" value={formData.data} onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Horário *</label>
              <input type="time" name="horario" value={formData.horario} onChange={(e) => setFormData(prev => ({ ...prev, horario: e.target.value }))} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
              <select name="tipoConsulta" value={formData.tipoConsulta} onChange={(e) => setFormData(prev => ({ ...prev, tipoConsulta: e.target.value }))} className={inputClass} required>
                <option value="primeira">Primeira Vez</option>
                <option value="retorno">Retorno</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" name="jaPagou" checked={formData.jaPagou} onChange={(e) => setFormData(prev => ({ ...prev, jaPagou: (e.target as HTMLInputElement).checked }))} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <label className="text-sm font-medium text-gray-700">Consulta já foi paga</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
              <input name="observacoes" value={formData.observacoes} onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remédios em uso (um por linha)</label>
              <textarea name="medicacoes" value={(formData as any).medicacoes} onChange={(e) => setFormData(prev => ({ ...prev, medicacoes: (e.target as HTMLTextAreaElement).value }))} rows={3} className={inputClass} placeholder="Ex.: Losartana 50mg 1x/dia\nMetformina 850mg 2x/dia" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resumo do atendimento</label>
              <textarea name="resumo" value={(formData as any).resumo} onChange={(e) => setFormData(prev => ({ ...prev, resumo: (e.target as HTMLTextAreaElement).value }))} rows={4} className={inputClass} placeholder="Anamnese, conduta, orientações..." />
            </div>
            <div className="flex space-x-3 pt-2">
              <Link href="/consultas" className="flex-1 px-4 py-2 text-center text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">Cancelar</Link>
              <button type="submit" disabled={carregando} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400">Salvar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


