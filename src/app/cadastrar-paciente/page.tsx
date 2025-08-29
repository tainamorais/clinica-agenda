'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase, Paciente, isSupabaseConfigured, isLocalCacheEnabled } from '../../config/supabase-config';

export default function CadastrarPaciente() {
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    endereco: '',
    dataNascimento: '',
    cpf: '',
    valorConsulta: '',
    modalidadePreferida: 'presencial_b',
    naturalidade: '',
    sexo: '',
    estadoCivil: '',
    religiao: '',
    raca: '',
    escolaridade: '',
    profissao: '',
    encaminhadoPor: '',
    nomeRepresentante: '',
    telefoneRepresentante: '',
    temRepresentante: false
  });

  const [mensagem, setMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState<'sucesso' | 'erro'>('sucesso');
  const [carregando, setCarregando] = useState(false);

  // Função para salvar no Supabase ou localStorage se não configurado
  const salvarPaciente = async (paciente: Omit<Paciente, 'id' | 'data_cadastro' | 'created_at'>) => {
    if (!isSupabaseConfigured && isLocalCacheEnabled) {
      try {
        const existentes = JSON.parse(localStorage.getItem('pacientes') || '[]');
        const novo = {
          ...paciente,
          id: existentes.length > 0 ? Math.max(...existentes.map((p: any) => p.id || 0)) + 1 : 1,
          data_cadastro: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        existentes.push(novo);
        localStorage.setItem('pacientes', JSON.stringify(existentes));
        return true;
      } catch (e) {
        console.error(e);
        return false;
      }
    }

    // Supabase
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .insert([paciente])
        .select()
        .single();

      if (error) {
        console.error('Erro ao salvar paciente:', error);
        return false;
      }

      // Espelha localmente para fallback das telas (caso a leitura no Supabase falhe por políticas)
      try {
        const existentes = JSON.parse(localStorage.getItem('pacientes') || '[]');
        const normalizado = {
          ...data,
          data_cadastro: data?.data_cadastro || new Date().toISOString(),
          created_at: data?.created_at || new Date().toISOString(),
        };
        existentes.push(normalizado);
        localStorage.setItem('pacientes', JSON.stringify(existentes));
      } catch (_) {
        // ignora erros de localStorage em ambientes sem window
      }

      return true;
    } catch (error) {
      console.error('Erro ao salvar paciente:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);

    if (!formData.nome.trim()) {
      mostrarMensagem('Nome é obrigatório', 'erro');
      setCarregando(false);
      return;
    }
    if (!formData.telefone.trim()) {
      mostrarMensagem('Telefone é obrigatório', 'erro');
      setCarregando(false);
      return;
    }
    if (!formData.valorConsulta || parseFloat(formData.valorConsulta) <= 0) {
      mostrarMensagem('Valor da consulta deve ser maior que zero', 'erro');
      setCarregando(false);
      return;
    }

    const pacienteData = {
      nome: formData.nome.trim(),
      telefone: formData.telefone.trim(),
      endereco: formData.endereco.trim(),
      data_nascimento: formData.dataNascimento,
      cpf: formData.cpf.trim(),
      valor_consulta: parseFloat(formData.valorConsulta),
      modalidade_preferida: formData.modalidadePreferida as any,
      naturalidade: formData.naturalidade.trim() || null,
      sexo: formData.sexo || null,
      estado_civil: formData.estadoCivil || null,
      religiao: formData.religiao.trim() || null,
      raca: formData.raca || null,
      escolaridade: formData.escolaridade || null,
      profissao: formData.profissao.trim() || null,
      encaminhado_por: formData.encaminhadoPor.trim() || null,
      nome_representante: formData.nomeRepresentante.trim(),
      telefone_representante: formData.telefoneRepresentante.trim(),
      tem_representante: formData.temRepresentante
    };

    // Verifica CPF duplicado
    try {
      if (isSupabaseConfigured) {
        const { data: existentes, error } = await supabase
          .from('pacientes')
          .select('id')
          .eq('cpf', pacienteData.cpf)
          .limit(1);
        if (!error && existentes && existentes.length > 0) {
          mostrarMensagem('Já existe um paciente com este CPF.', 'erro');
          setCarregando(false);
          return;
        }
      } else {
        const existentesLocal = JSON.parse(localStorage.getItem('pacientes') || '[]');
        const dup = existentesLocal.some((p: any) => (p.cpf || '').trim() === pacienteData.cpf);
        if (dup) {
          mostrarMensagem('Já existe um paciente com este CPF.', 'erro');
          setCarregando(false);
          return;
        }
      }
    } catch (_) {}

    const payloadForSave = isSupabaseConfigured ? (({ modalidade_preferida, ...rest }: any) => rest)(pacienteData) : pacienteData;
    if (await salvarPaciente(payloadForSave as any)) {
      mostrarMensagem(isSupabaseConfigured ? 'Paciente cadastrado na nuvem!' : 'Paciente salvo neste dispositivo para teste!', 'sucesso');
      limparFormulario();
    } else {
      mostrarMensagem('Erro ao cadastrar paciente.', 'erro');
    }

    setCarregando(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const limparFormulario = () => {
    setFormData({
      nome: '',
      telefone: '',
      endereco: '',
      dataNascimento: '',
      cpf: '',
      valorConsulta: '',
      modalidadePreferida: 'presencial_b',
      naturalidade: '',
      sexo: '',
      estadoCivil: '',
      religiao: '',
      raca: '',
      escolaridade: '',
      profissao: '',
      encaminhadoPor: '',
      nomeRepresentante: '',
      telefoneRepresentante: '',
      temRepresentante: false
    });
  };

  const mostrarMensagem = (texto: string, tipo: 'sucesso' | 'erro') => {
    setMensagem(texto);
    setTipoMensagem(tipo);
    setTimeout(() => setMensagem(''), 5000);
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500";
  const selectClass = inputClass;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Link href="/" className="text-blue-600 text-xl">←</Link>
            <h1 className="text-xl font-bold text-gray-800">Cadastrar Paciente</h1>
          </div>
        </div>

        {mensagem && (
          <div className={`mb-6 p-4 rounded-lg ${tipoMensagem === 'sucesso' ? 'bg-green-100 border border-green-400 text-green-700' : 'bg-red-100 border border-red-400 text-red-700'}`}>
            {mensagem}
          </div>
        )}

        {!isSupabaseConfigured && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-800">
            Supabase ainda não configurado. Salvando localmente só para testes. Veja o arquivo SUPABASE-SETUP.md para configurar a nuvem.
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
            <input type="text" name="nome" value={formData.nome} onChange={handleInputChange} required className={inputClass} placeholder="Nome completo do paciente" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Telefone *</label>
            <input type="tel" name="telefone" value={formData.telefone} onChange={handleInputChange} required className={inputClass} placeholder="(11) 99999-9999" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Endereço *</label>
            <input type="text" name="endereco" value={formData.endereco} onChange={handleInputChange} required className={inputClass} placeholder="Endereço completo" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data de Nascimento *</label>
            <input type="date" name="dataNascimento" value={formData.dataNascimento} onChange={handleInputChange} required className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CPF *</label>
            <input type="text" name="cpf" value={formData.cpf} onChange={handleInputChange} required className={inputClass} placeholder="000.000.000-00" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Valor da Consulta *</label>
            <input type="number" name="valorConsulta" value={formData.valorConsulta} onChange={handleInputChange} required step="0.01" min="0" className={inputClass} placeholder="0,00" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Modalidade Preferida *</label>
            <select
              name="modalidadePreferida"
              value={formData.modalidadePreferida}
              onChange={(e) => setFormData(prev => ({ ...prev, modalidadePreferida: e.target.value }))}
              className={selectClass}
            >
              <option value="presencial_b">Presencial B</option>
              <option value="presencial_zs">Presencial ZS</option>
              <option value="online">Online</option>
            </select>
          </div>

          {/* Dados Adicionais */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Dados Adicionais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Naturalidade</label>
                <input type="text" name="naturalidade" value={formData.naturalidade} onChange={handleInputChange} className={inputClass} placeholder="Cidade, Estado" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sexo</label>
                <select name="sexo" value={formData.sexo} onChange={handleSelectChange} className={selectClass}>
                  <option value="">Selecionar</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estado Civil</label>
                <select name="estadoCivil" value={formData.estadoCivil} onChange={handleSelectChange} className={selectClass}>
                  <option value="">Selecionar</option>
                  <option value="solteiro">Solteiro(a)</option>
                  <option value="casado">Casado(a)</option>
                  <option value="divorciado">Divorciado(a)</option>
                  <option value="viuvo">Viúvo(a)</option>
                  <option value="uniao_estavel">União Estável</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Religião</label>
                <input type="text" name="religiao" value={formData.religiao} onChange={handleInputChange} className={inputClass} placeholder="Ex: Católica, Evangélica, etc." />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Raça/Cor</label>
                <select name="raca" value={formData.raca} onChange={handleSelectChange} className={selectClass}>
                  <option value="">Selecionar</option>
                  <option value="branca">Branca</option>
                  <option value="preta">Preta</option>
                  <option value="parda">Parda</option>
                  <option value="amarela">Amarela</option>
                  <option value="indigena">Indígena</option>
                  <option value="outra">Outra</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Escolaridade</label>
                <select name="escolaridade" value={formData.escolaridade} onChange={handleSelectChange} className={selectClass}>
                  <option value="">Selecionar</option>
                  <option value="analfabeto">Analfabeto</option>
                  <option value="fundamental_incompleto">Fundamental Incompleto</option>
                  <option value="fundamental_completo">Fundamental Completo</option>
                  <option value="medio_incompleto">Médio Incompleto</option>
                  <option value="medio_completo">Médio Completo</option>
                  <option value="superior_incompleto">Superior Incompleto</option>
                  <option value="superior_completo">Superior Completo</option>
                  <option value="pos_graduacao">Pós-graduação</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profissão</label>
                <input type="text" name="profissao" value={formData.profissao} onChange={handleInputChange} className={inputClass} placeholder="Ex: Professora, Engenheiro, etc." />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Encaminhado por</label>
                <input type="text" name="encaminhadoPor" value={formData.encaminhadoPor} onChange={handleInputChange} className={inputClass} placeholder="Nome do profissional ou indicação" />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-4">
              <input type="checkbox" name="temRepresentante" checked={formData.temRepresentante} onChange={handleInputChange} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <label className="text-sm font-medium text-gray-700">Paciente é menor de idade (tem representante)</label>
            </div>

            {formData.temRepresentante && (
              <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Representante</label>
                  <input type="text" name="nomeRepresentante" value={formData.nomeRepresentante} onChange={handleInputChange} className={inputClass} placeholder="Nome do responsável" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefone do Representante</label>
                  <input type="tel" name="telefoneRepresentante" value={formData.telefoneRepresentante} onChange={handleInputChange} className={inputClass} placeholder="(11) 99999-9999" />
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <Link href="/" className="flex-1 px-4 py-2 text-center text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">Cancelar</Link>
            <button type="submit" disabled={carregando} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">{carregando ? 'Salvando...' : 'Cadastrar Paciente'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
