'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured, isLocalCacheEnabled, UserRole } from '../../../config/supabase-config';
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
  modalidade_preferida?: string;
  naturalidade?: string;
  sexo?: string;
  estado_civil?: string;
  religiao?: string;
  raca?: string;
  escolaridade?: string;
  profissao?: string;
  encaminhado_por?: string;
  nome_representante?: string;
  telefone_representante?: string;
  tem_representante?: boolean;
  data_cadastro?: string;
  created_at?: string;
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
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [tab, setTab] = useState<'dados' | 'remedios' | 'ficha'>('dados');
  
  // Estados para edição dos dados adicionais
  const [editandoDados, setEditandoDados] = useState(false);
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [dadosEdit, setDadosEdit] = useState({
    naturalidade: '',
    sexo: '',
    estado_civil: '',
    religiao: '',
    raca: '',
    escolaridade: '',
    profissao: '',
    encaminhado_por: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editMedicacoes, setEditMedicacoes] = useState('');
  const [editResumo, setEditResumo] = useState('');
  const [savingInline, setSavingInline] = useState(false);

  useEffect(() => {
    carregar();
  }, [params.id]);

  // Carrega papel do usuário para controlar abas
  useEffect(() => {
    const run = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const email = session?.user?.email ?? null;
        if (!email) return;
        const { data } = await supabase.from('allowed_emails').select('role').eq('email', email).maybeSingle();
        const r = (data?.role as UserRole) || null;
        setUserRole(r);
        if (r === 'contador') setTab('dados');
      } catch (_) {}
    };
    run();
  }, []);

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
              modalidade_preferida: firstPatient.modalidade_preferida,
              naturalidade: firstPatient.naturalidade,
              sexo: firstPatient.sexo,
              estado_civil: firstPatient.estado_civil,
              religiao: firstPatient.religiao,
              raca: firstPatient.raca,
              escolaridade: firstPatient.escolaridade,
              profissao: firstPatient.profissao,
              encaminhado_por: firstPatient.encaminhado_por,
              nome_representante: firstPatient.nome_representante,
              telefone_representante: firstPatient.telefone_representante,
              tem_representante: firstPatient.tem_representante,
              data_cadastro: firstPatient.data_cadastro,
              created_at: firstPatient.created_at,
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
            medicacoes: row.medicacoes || '',
            resumo: row.resumo || '',
          }));
          setConsultas(mapeadas);
          setCarregando(false);
          return;
        }
      }

      // Fallback local
      const pacientesSalvos = isLocalCacheEnabled ? JSON.parse(localStorage.getItem('pacientes') || '[]') : [];
      const pacienteLocal = pacientesSalvos.find((p: Paciente) => p.id === pacienteIdNum) || null;
      setPaciente(pacienteLocal);
      const consultasSalvas: Consulta[] = isLocalCacheEnabled ? JSON.parse(localStorage.getItem('consultas') || '[]') : [];
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
      const consultasSalvas: Consulta[] = isLocalCacheEnabled ? JSON.parse(localStorage.getItem('consultas') || '[]') : [];
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

  const iniciarEdicao = (c: Consulta) => {
    setEditingId(c.id);
    setEditMedicacoes(c.medicacoes || '');
    setEditResumo(c.resumo || '');
  };

  const cancelarEdicao = () => {
    setEditingId(null);
    setEditMedicacoes('');
    setEditResumo('');
  };

  const salvarEdicao = async (consultaId: number) => {
    try {
      setSavingInline(true);
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('consultas')
          .update({ medicacoes: editMedicacoes || null, resumo: editResumo || null })
          .eq('id', consultaId);
        if (error) throw error;
      } else if (isLocalCacheEnabled) {
        const cons: any[] = JSON.parse(localStorage.getItem('consultas') || '[]');
        const atual = cons.map((c) => (c.id === consultaId ? { ...c, medicacoes: editMedicacoes, resumo: editResumo } : c));
        localStorage.setItem('consultas', JSON.stringify(atual));
      }
      await carregar();
      setMensagem('Consulta atualizada.');
      setTipoMensagem('sucesso');
      setTimeout(() => setMensagem(''), 3000);
      cancelarEdicao();
    } catch (e) {
      console.error(e);
      setMensagem('Erro ao salvar edição.');
      setTipoMensagem('erro');
      setTimeout(() => setMensagem(''), 3000);
    } finally {
      setSavingInline(false);
    }
  };

  // Funções para edição dos dados adicionais
  const iniciarEdicaoDados = () => {
    if (!paciente) return;
    setDadosEdit({
      naturalidade: paciente.naturalidade || '',
      sexo: paciente.sexo || '',
      estado_civil: paciente.estado_civil || '',
      religiao: paciente.religiao || '',
      raca: paciente.raca || '',
      escolaridade: paciente.escolaridade || '',
      profissao: paciente.profissao || '',
      encaminhado_por: paciente.encaminhado_por || ''
    });
    setEditandoDados(true);
  };

  const cancelarEdicaoDados = () => {
    setEditandoDados(false);
    setDadosEdit({
      naturalidade: '',
      sexo: '',
      estado_civil: '',
      religiao: '',
      raca: '',
      escolaridade: '',
      profissao: '',
      encaminhado_por: ''
    });
  };

  const salvarDadosAdicionais = async () => {
    if (!paciente) return;
    setSalvandoDados(true);
    try {
      const dadosForSupabase = {
        naturalidade: dadosEdit.naturalidade.trim() || null,
        sexo: dadosEdit.sexo || null,
        estado_civil: dadosEdit.estado_civil || null,
        religiao: dadosEdit.religiao.trim() || null,
        raca: dadosEdit.raca || null,
        escolaridade: dadosEdit.escolaridade || null,
        profissao: dadosEdit.profissao.trim() || null,
        encaminhado_por: dadosEdit.encaminhado_por.trim() || null
      };

      const dadosForState = {
        naturalidade: dadosEdit.naturalidade.trim() || undefined,
        sexo: dadosEdit.sexo || undefined,
        estado_civil: dadosEdit.estado_civil || undefined,
        religiao: dadosEdit.religiao.trim() || undefined,
        raca: dadosEdit.raca || undefined,
        escolaridade: dadosEdit.escolaridade || undefined,
        profissao: dadosEdit.profissao.trim() || undefined,
        encaminhado_por: dadosEdit.encaminhado_por.trim() || undefined
      };

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('pacientes')
          .update(dadosForSupabase)
          .eq('id', paciente.id);
        if (error) throw error;
      } else if (isLocalCacheEnabled) {
        const pacientesLocal = JSON.parse(localStorage.getItem('pacientes') || '[]');
        const atualizado = pacientesLocal.map((p: any) => 
          p.id === paciente.id ? { ...p, ...dadosForState } : p
        );
        localStorage.setItem('pacientes', JSON.stringify(atualizado));
      }
      
      // Atualiza o estado local
      setPaciente(prev => prev ? { ...prev, ...dadosForState } : null);
      setEditandoDados(false);
      setMensagem('Dados adicionais salvos com sucesso!');
      setTipoMensagem('sucesso');
      setTimeout(() => setMensagem(''), 3000);
    } catch (e) {
      console.error(e);
      setMensagem('Erro ao salvar dados adicionais.');
      setTipoMensagem('erro');
      setTimeout(() => setMensagem(''), 3000);
    } finally {
      setSalvandoDados(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Link href="/buscar-paciente" className="text-blue-600 text-xl">←</Link>
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
            {/* Bloco fixo de dados principais */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">{paciente.nome}</h2>
              <p className="text-sm text-gray-600">Telefone: {paciente.telefone}</p>
              <p className="text-sm text-gray-600">CPF: {paciente.cpf}</p>
              <p className="text-sm text-gray-600">Endereço: {paciente.endereco}</p>
              <p className="text-sm text-gray-600">Nascimento: {formatarData(getDataNasc(paciente))}</p>
              <p className="text-sm text-gray-600">Valor da Consulta: R$ {getValorConsulta(paciente).toFixed(2)}</p>
              <div className="mt-4 flex space-x-2">
                <Link href={`/editar-paciente/${paciente.id}`} className="flex-1 px-3 py-2 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600 transition-colors text-center">Editar Paciente</Link>
                <button
                  onClick={async () => {
                    if (!confirm('Tem certeza que deseja apagar este paciente e suas consultas?')) return;
                    try {
                      if (isSupabaseConfigured) {
                        const { error } = await supabase.from('pacientes').delete().eq('id', paciente.id);
                        if (error) throw error;
                      }
                      try {
                        if (isLocalCacheEnabled) {
                          const pacientesLocal = JSON.parse(localStorage.getItem('pacientes') || '[]');
                          const consultasLocal = JSON.parse(localStorage.getItem('consultas') || '[]');
                          localStorage.setItem('pacientes', JSON.stringify(pacientesLocal.filter((p: any) => p.id !== paciente.id)));
                          localStorage.setItem('consultas', JSON.stringify(consultasLocal.filter((c: any) => c.pacienteId !== paciente.id)));
                        }
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
            </div>

            {/* Abas */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="border-b px-4 pt-3">
                <div className="flex gap-2">
                  <button onClick={() => setTab('dados')} className={`px-3 py-1.5 text-sm rounded-md ${tab==='dados' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}>Dados adicionais</button>
                  {userRole !== 'contador' && (
                    <>
                      <button onClick={() => setTab('remedios')} className={`px-3 py-1.5 text-sm rounded-md ${tab==='remedios' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}>Remédios</button>
                      <button onClick={() => setTab('ficha')} className={`px-3 py-1.5 text-sm rounded-md ${tab==='ficha' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}>Ficha</button>
                    </>
                  )}
                </div>
              </div>
              <div className="p-6">
                {tab === 'dados' && (
                  <div>
                    {!editandoDados ? (
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                          {paciente.naturalidade && (
                            <div>
                              <strong className="text-gray-700">Naturalidade:</strong>
                              <p className="text-gray-900">{paciente.naturalidade}</p>
                            </div>
                          )}
                          {paciente.sexo && (
                            <div>
                              <strong className="text-gray-700">Sexo:</strong>
                              <p className="text-gray-900">{paciente.sexo === 'masculino' ? 'Masculino' : paciente.sexo === 'feminino' ? 'Feminino' : 'Outro'}</p>
                            </div>
                          )}
                          {paciente.estado_civil && (
                            <div>
                              <strong className="text-gray-700">Estado Civil:</strong>
                              <p className="text-gray-900">
                                {paciente.estado_civil === 'solteiro' ? 'Solteiro(a)' : 
                                 paciente.estado_civil === 'casado' ? 'Casado(a)' :
                                 paciente.estado_civil === 'divorciado' ? 'Divorciado(a)' :
                                 paciente.estado_civil === 'viuvo' ? 'Viúvo(a)' :
                                 paciente.estado_civil === 'uniao_estavel' ? 'União Estável' : paciente.estado_civil}
                              </p>
                            </div>
                          )}
                          {paciente.religiao && (
                            <div>
                              <strong className="text-gray-700">Religião:</strong>
                              <p className="text-gray-900">{paciente.religiao}</p>
                            </div>
                          )}
                          {paciente.raca && (
                            <div>
                              <strong className="text-gray-700">Raça/Cor:</strong>
                              <p className="text-gray-900">
                                {paciente.raca === 'branca' ? 'Branca' :
                                 paciente.raca === 'preta' ? 'Preta' :
                                 paciente.raca === 'parda' ? 'Parda' :
                                 paciente.raca === 'amarela' ? 'Amarela' :
                                 paciente.raca === 'indigena' ? 'Indígena' :
                                 paciente.raca === 'outra' ? 'Outra' : paciente.raca}
                              </p>
                            </div>
                          )}
                          {paciente.escolaridade && (
                            <div>
                              <strong className="text-gray-700">Escolaridade:</strong>
                              <p className="text-gray-900">
                                {paciente.escolaridade === 'analfabeto' ? 'Analfabeto' :
                                 paciente.escolaridade === 'fundamental_incompleto' ? 'Fundamental Incompleto' :
                                 paciente.escolaridade === 'fundamental_completo' ? 'Fundamental Completo' :
                                 paciente.escolaridade === 'medio_incompleto' ? 'Médio Incompleto' :
                                 paciente.escolaridade === 'medio_completo' ? 'Médio Completo' :
                                 paciente.escolaridade === 'superior_incompleto' ? 'Superior Incompleto' :
                                 paciente.escolaridade === 'superior_completo' ? 'Superior Completo' :
                                 paciente.escolaridade === 'pos_graduacao' ? 'Pós-graduação' : paciente.escolaridade}
                              </p>
                            </div>
                          )}
                          {paciente.profissao && (
                            <div>
                              <strong className="text-gray-700">Profissão:</strong>
                              <p className="text-gray-900">{paciente.profissao}</p>
                            </div>
                          )}
                          {paciente.encaminhado_por && (
                            <div>
                              <strong className="text-gray-700">Encaminhado por:</strong>
                              <p className="text-gray-900">{paciente.encaminhado_por}</p>
                            </div>
                          )}
                          {paciente.modalidade_preferida && (
                            <div>
                              <strong className="text-gray-700">Modalidade Preferida:</strong>
                              <p className="text-gray-900">
                                {paciente.modalidade_preferida === 'presencial_b' ? 'Presencial B' :
                                 paciente.modalidade_preferida === 'presencial_zs' ? 'Presencial ZS' :
                                 paciente.modalidade_preferida === 'online' ? 'Online' : paciente.modalidade_preferida}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* Botão para editar ou mensagem se vazio */}
                        {(!paciente.naturalidade && !paciente.sexo && !paciente.estado_civil && !paciente.religiao && 
                          !paciente.raca && !paciente.escolaridade && !paciente.profissao && !paciente.encaminhado_por) ? (
                          <div className="text-center text-gray-500 italic mb-4">
                            Nenhum dado adicional cadastrado.
                          </div>
                        ) : null}
                        
                        <button 
                          onClick={iniciarEdicaoDados}
                          className="w-full px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
                        >
                          Editar Dados Adicionais
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h3 className="font-medium text-gray-800 mb-3">Editando Dados Adicionais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Naturalidade</label>
                            <input 
                              type="text" 
                              value={dadosEdit.naturalidade} 
                              onChange={(e) => setDadosEdit(prev => ({ ...prev, naturalidade: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                              placeholder="Cidade, Estado" 
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                            <select 
                              value={dadosEdit.sexo} 
                              onChange={(e) => setDadosEdit(prev => ({ ...prev, sexo: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                            >
                              <option value="">Selecionar</option>
                              <option value="masculino">Masculino</option>
                              <option value="feminino">Feminino</option>
                              <option value="outro">Outro</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil</label>
                            <select 
                              value={dadosEdit.estado_civil} 
                              onChange={(e) => setDadosEdit(prev => ({ ...prev, estado_civil: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                            >
                              <option value="">Selecionar</option>
                              <option value="solteiro">Solteiro(a)</option>
                              <option value="casado">Casado(a)</option>
                              <option value="divorciado">Divorciado(a)</option>
                              <option value="viuvo">Viúvo(a)</option>
                              <option value="uniao_estavel">União Estável</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Religião</label>
                            <input 
                              type="text" 
                              value={dadosEdit.religiao} 
                              onChange={(e) => setDadosEdit(prev => ({ ...prev, religiao: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                              placeholder="Ex: Católica, Evangélica, etc." 
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Raça/Cor</label>
                            <select 
                              value={dadosEdit.raca} 
                              onChange={(e) => setDadosEdit(prev => ({ ...prev, raca: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                            >
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Escolaridade</label>
                            <select 
                              value={dadosEdit.escolaridade} 
                              onChange={(e) => setDadosEdit(prev => ({ ...prev, escolaridade: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                            >
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Profissão</label>
                            <input 
                              type="text" 
                              value={dadosEdit.profissao} 
                              onChange={(e) => setDadosEdit(prev => ({ ...prev, profissao: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                              placeholder="Ex: Professora, Engenheiro, etc." 
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Encaminhado por</label>
                            <input 
                              type="text" 
                              value={dadosEdit.encaminhado_por} 
                              onChange={(e) => setDadosEdit(prev => ({ ...prev, encaminhado_por: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                              placeholder="Nome do profissional ou indicação" 
                            />
                          </div>
                        </div>
                        
                        <div className="flex gap-3 pt-4">
                          <button 
                            onClick={salvarDadosAdicionais}
                            disabled={salvandoDados}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
                          >
                            {salvandoDados ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button 
                            onClick={cancelarEdicaoDados}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {tab === 'remedios' && (
                  <div className="space-y-3">
                    {consultas.filter(c=> (c.medicacoes||'').trim()).length===0 ? (
                      <p className="text-gray-500 text-sm">Nenhuma medicação registrada nas consultas.</p>
                    ) : (
                      consultas.map((c, idx) => {
                        const prev = consultas[idx + 1];
                        const atual = (c.medicacoes || '').trim();
                        if (!atual) return null;
                        const mantida = prev ? atual === (prev?.medicacoes || '').trim() : false;
                        return (
                          <div key={`med-${c.id}`} className="bg-gray-50 p-3 rounded">
                            <div className="flex justify-between items-center">
                              <div className="text-sm text-gray-900 font-medium"><span>{formatarData(c.data)}</span> <span className="text-gray-700">às {c.horario}</span></div>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${mantida ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>{mantida ? 'medicação mantida' : 'medicação alterada'}</span>
                            </div>
                            <div className="mt-1 text-sm whitespace-pre-line text-gray-800">{c.medicacoes}</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
                {tab === 'ficha' && (
                  <div>
                    {consultas.length === 0 ? (
                      <p className="text-gray-500">Nenhuma consulta registrada.</p>
                    ) : (
                      <div className="space-y-3">
                        {consultas.map((c, idx) => {
                          const prev = consultas[idx + 1];
                          const mantida = (c.medicacoes || '').trim() && (c.medicacoes || '').trim() === (prev?.medicacoes || '').trim();
                          return (
                            <div key={c.id} className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <p className="font-medium text-gray-800">{formatarData(c.data)} às {c.horario}</p>
                                  <p className="text-sm text-gray-600">{c.tipoConsulta === 'primeira' ? 'Primeira Vez' : 'Retorno'} - R$ {getValorConsulta(c.paciente).toFixed(2)}</p>
                                </div>
                                <div className={`text-sm font-medium ${c.jaPagou ? 'text-green-600' : 'text-red-600'}`}>{c.jaPagou ? '✅ Pago' : '❌ Pendente'}</div>
                              </div>
                              {c.observacoes && <p className="text-sm text-gray-600"><strong>Obs:</strong> {c.observacoes}</p>}
                              {(c.medicacoes || c.resumo) && (
                                <div className="mt-2 space-y-1 text-sm">
                                  {c.medicacoes && (
                                    <p className="text-gray-700">
                                      <strong>Remédios:</strong> {c.medicacoes}
                                      {prev && (c.medicacoes || '').trim() ? (
                                        <span className={`ml-2 ${mantida ? 'text-green-600' : 'text-yellow-700'}`}>{mantida ? '(mantida)' : '(alterada)'}</span>
                                      ) : null}
                                    </p>
                                  )}
                                  {c.resumo && (
                                    <p className="text-gray-700"><strong>Resumo:</strong> {c.resumo}</p>
                                  )}
                                </div>
                              )}
                              {editingId === c.id ? (
                                <div className="mt-3 space-y-2 bg-white border border-gray-200 p-3 rounded">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-800 mb-1">Remédios em uso (um por linha)</label>
                                    <textarea value={editMedicacoes} onChange={(e) => setEditMedicacoes(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900 placeholder-gray-500 text-base" placeholder="Ex.: Losartana 50mg 1x/dia\nMetformina 850mg 2x/dia" />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-800 mb-1">Resumo do atendimento</label>
                                    <textarea value={editResumo} onChange={(e) => setEditResumo(e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900 placeholder-gray-500 text-base" placeholder="Anamnese, conduta, orientações..." />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button disabled={savingInline} onClick={() => salvarEdicao(c.id)} className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400">Salvar</button>
                                    <button onClick={cancelarEdicao} className="px-3 py-2 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300 transition-colors">Cancelar</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  {!c.jaPagou && (
                                    <button onClick={() => marcarComoPaga(c.id)} className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors">Marcar como Paga</button>
                                  )}
                                  <button onClick={() => iniciarEdicao(c)} className="px-3 py-2 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600 transition-colors">Editar</button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Link href="/buscar-paciente" className="block w-full px-4 py-3 text-center text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">Voltar à Busca por Pacientes</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


