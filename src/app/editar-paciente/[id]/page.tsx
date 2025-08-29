'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured, isLocalCacheEnabled } from '../../../config/supabase-config';

export default function EditarPaciente({ params }: { params: { id: string } }) {
  const pacienteId = Number(params.id);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState<'sucesso' | 'erro'>('sucesso');
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    endereco: '',
    dataNascimento: '',
    cpf: '',
    valorConsulta: '',
    modalidadePreferida: 'presencial_b',
    nomeRepresentante: '',
    telefoneRepresentante: '',
    temRepresentante: false,
  });

  useEffect(() => {
    carregar();
  }, [params.id]);

  const carregar = async () => {
    setCarregando(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('pacientes')
          .select('*')
          .eq('id', pacienteId)
          .maybeSingle();
        if (!error && data) {
          setFormData({
            nome: data.nome || '',
            telefone: data.telefone || '',
            endereco: data.endereco || '',
            dataNascimento: data.data_nascimento || '',
            cpf: data.cpf || '',
            valorConsulta: String(data.valor_consulta ?? ''),
            modalidadePreferida: data.modalidade_preferida || 'presencial_b',
            nomeRepresentante: data.nome_representante || '',
            telefoneRepresentante: data.telefone_representante || '',
            temRepresentante: Boolean(data.tem_representante),
          });
          setCarregando(false);
          return;
        }
      }
      const pacientesLocal = isLocalCacheEnabled ? JSON.parse(localStorage.getItem('pacientes') || '[]') : [];
      const p = pacientesLocal.find((x: any) => x.id === pacienteId);
      if (p) {
        setFormData({
          nome: p.nome || '',
          telefone: p.telefone || '',
          endereco: p.endereco || '',
          dataNascimento: p.dataNascimento || p.data_nascimento || '',
          cpf: p.cpf || '',
          valorConsulta: String(p.valorConsulta ?? p.valor_consulta ?? ''),
          modalidadePreferida: p.modalidadePreferida || p.modalidade_preferida || 'presencial_b',
          nomeRepresentante: p.nomeRepresentante || p.nome_representante || '',
          telefoneRepresentante: p.telefoneRepresentante || p.telefone_representante || '',
          temRepresentante: Boolean(p.temRepresentante ?? p.tem_representante),
        });
      }
    } catch (e) {
      console.error(e);
      setMensagem('Erro ao carregar paciente.');
      setTipoMensagem('erro');
    } finally {
      setCarregando(false);
    }
  };

  const mostrarMensagem = (texto: string, tipo: 'sucesso' | 'erro') => {
    setMensagem(texto);
    setTipoMensagem(tipo);
    setTimeout(() => setMensagem(''), 4000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    try {
      const pacienteData = {
        nome: formData.nome.trim(),
        telefone: formData.telefone.trim(),
        endereco: formData.endereco.trim(),
        data_nascimento: formData.dataNascimento,
        cpf: formData.cpf.trim(),
        valor_consulta: Number(formData.valorConsulta),
        modalidade_preferida: formData.modalidadePreferida as any,
        nome_representante: formData.nomeRepresentante.trim(),
        telefone_representante: formData.telefoneRepresentante.trim(),
        tem_representante: formData.temRepresentante,
      };

      // Verifica CPF duplicado (excluindo o próprio)
      if (isSupabaseConfigured) {
        const { data: outros, error } = await supabase
          .from('pacientes')
          .select('id')
          .eq('cpf', pacienteData.cpf);
        if (!error && outros) {
          const existeOutro = outros.some((o: any) => o.id !== pacienteId);
          if (existeOutro) {
            mostrarMensagem('Já existe um paciente com este CPF.', 'erro');
            setCarregando(false);
            return;
          }
        }
        const { error: updErr } = await supabase
          .from('pacientes')
          .update(pacienteData)
          .eq('id', pacienteId);
        if (updErr) throw updErr;
      } else if (isLocalCacheEnabled) {
        const pacientesLocal = JSON.parse(localStorage.getItem('pacientes') || '[]');
        const existeOutro = pacientesLocal.some((p: any) => (p.cpf || '').trim() === pacienteData.cpf && p.id !== pacienteId);
        if (existeOutro) {
          mostrarMensagem('Já existe um paciente com este CPF.', 'erro');
          setCarregando(false);
          return;
        }
        const atualizados = pacientesLocal.map((p: any) => (p.id === pacienteId ? { ...p, ...pacienteData } : p));
        localStorage.setItem('pacientes', JSON.stringify(atualizados));
      }

      // Espelha local
      try {
        if (isLocalCacheEnabled) {
          const pacientesLocal = JSON.parse(localStorage.getItem('pacientes') || '[]');
          const atualizados = pacientesLocal.map((p: any) => (p.id === pacienteId ? { ...p, ...pacienteData } : p));
          localStorage.setItem('pacientes', JSON.stringify(atualizados));
        }
      } catch (_) {}

      mostrarMensagem('Paciente atualizado com sucesso!', 'sucesso');
    } catch (e) {
      console.error(e);
      mostrarMensagem('Erro ao atualizar paciente.', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500";
  const selectClass = inputClass;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Link href="/" className="text-blue-600 text-xl">←</Link>
            <h1 className="text-xl font-bold text-gray-800">Editar Paciente</h1>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
              <input name="nome" value={formData.nome} onChange={handleInputChange} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Telefone *</label>
              <input name="telefone" value={formData.telefone} onChange={handleInputChange} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Endereço *</label>
              <input name="endereco" value={formData.endereco} onChange={handleInputChange} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data de Nascimento *</label>
              <input type="date" name="dataNascimento" value={formData.dataNascimento} onChange={handleInputChange} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CPF *</label>
              <input name="cpf" value={formData.cpf} onChange={handleInputChange} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor da Consulta *</label>
              <input type="number" step="0.01" min="0" name="valorConsulta" value={formData.valorConsulta} onChange={handleInputChange} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Modalidade Preferida *</label>
              <select
                value={formData.modalidadePreferida}
                onChange={(e) => setFormData(prev => ({ ...prev, modalidadePreferida: e.target.value }))}
                className={selectClass}
              >
                <option value="presencial_b">Presencial Barra</option>
                <option value="presencial_zs">Presencial Botafogo</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center space-x-2 mb-4">
                <input type="checkbox" name="temRepresentante" checked={formData.temRepresentante} onChange={handleInputChange} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <label className="text-sm font-medium text-gray-700">Tem representante</label>
              </div>
              {formData.temRepresentante && (
                <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Representante</label>
                    <input name="nomeRepresentante" value={formData.nomeRepresentante} onChange={handleInputChange} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefone do Representante</label>
                    <input name="telefoneRepresentante" value={formData.telefoneRepresentante} onChange={handleInputChange} className={inputClass} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex space-x-3 pt-2">
              <Link href="/" className="flex-1 px-4 py-2 text-center text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">Cancelar</Link>
              <button type="submit" disabled={carregando} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400">Salvar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


