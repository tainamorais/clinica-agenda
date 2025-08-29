"use client";

import { formatISOToBR, calculateAgeFromISO } from '../../lib/date';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured, isLocalCacheEnabled } from '../../config/supabase-config';

interface Paciente {
  id: number;
  nome: string;
  telefone: string;
  endereco: string;
  // datas podem vir em ambos formatos
  dataNascimento?: string;
  data_nascimento?: string;
  cpf: string;
  // valor pode vir em ambos formatos
  valorConsulta?: number;
  valor_consulta?: number;
  modalidade_preferida?: 'presencial_b' | 'presencial_zs' | 'online';
  // representante pode vir em ambos formatos
  nomeRepresentante?: string;
  nome_representante?: string;
  telefoneRepresentante?: string;
  telefone_representante?: string;
  temRepresentante?: boolean;
  tem_representante?: boolean;
  dataCadastro?: string;
  data_cadastro?: string;
}

export default function BuscarPaciente() {
  const [termoBusca, setTermoBusca] = useState('');
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);
  const [todosPacientes, setTodosPacientes] = useState<Paciente[]>([]);

  // Helpers para compatibilizar formatos
  const getValorConsulta = (p: Paciente) => {
    const bruto = (p as any)?.valor_consulta ?? (p as any)?.valorConsulta ?? 0;
    return Number(bruto) || 0;
  };
  const getDataNascimento = (p: Paciente) => p.dataNascimento || (p as any).data_nascimento || '';
  const getDataCadastro = (p: Paciente) => p.dataCadastro || (p as any).data_cadastro || '';
  const getModalidadePreferida = (p: Paciente) => (p as any).modalidade_preferida || (p as any).modalidadePreferida || '';
  const hasRepresentante = (p: Paciente) => Boolean((p as any).tem_representante ?? p.temRepresentante);
  const getNomeRepresentante = (p: Paciente) => p.nomeRepresentante || (p as any).nome_representante || '';
  const getTelefoneRepresentante = (p: Paciente) => p.telefoneRepresentante || (p as any).telefone_representante || '';

  // Monta link do WhatsApp a partir do telefone
  const buildWhatsUrl = (phone: string, name?: string) => {
    const digits = (phone || '').replace(/\D/g, '');
    if (!digits) return '#';
    const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
    const firstName = (name || '').trim().split(' ')[0] || '';
    const text = encodeURIComponent(firstName ? `Olá, ${firstName}!` : 'Olá!');
    return `https://wa.me/${withCountry}?text=${text}`;
  };

  const WhatsIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      className="text-white"
    >
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.031-.967-.273-.099-.472-.149-.672.15-.198.297-.768.966-.941 1.164-.173.199-.347.224-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.607.134-.133.298-.347.446-.52.149-.173.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.672-1.614-.92-2.207-.242-.58-.487-.502-.672-.511l-.571-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.71.306 1.265.489 1.697.626.713.227 1.362.195 1.877.118.572-.085 1.758-.718 2.006-1.412.248-.694.248-1.289.173-1.412-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.237-.374A9.86 9.86 0 012.29 12.02c0-5.45 4.436-9.885 9.887-9.885 2.64 0 5.122 1.03 6.988 2.897a9.825 9.825 0 012.894 6.994c-.003 5.45-4.438 9.885-9.888 9.885M20.13 3.893A11.815 11.815 0 0012.178.003C5.574.003.29 5.288.292 11.89c0 2.096.547 4.142 1.588 5.94L.057 24l6.334-1.665a11.87 11.87 0 005.79 1.475h.005c6.601 0 11.89-5.287 11.893-11.89a11.82 11.82 0 00-3.949-8.027"
      />
    </svg>
  );

  // Carregar pacientes do Supabase (ou localStorage como fallback)
  useEffect(() => {
    const carregarPacientes = async () => {
      try {
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('pacientes')
            .select('*')
            .order('nome', { ascending: true });
          if (!error && data && data.length > 0) {
            setTodosPacientes(data as any);
            setPacientes(data as any);
            return;
          }
        }
        const pacientesSalvos = isLocalCacheEnabled ? localStorage.getItem('pacientes') : null;
        if (pacientesSalvos) {
          const pacientesCarregados: Paciente[] = JSON.parse(pacientesSalvos);
          setTodosPacientes(pacientesCarregados);
          setPacientes(pacientesCarregados);
        } else {
          setTodosPacientes([]);
          setPacientes([]);
        }
      } catch (error) {
        console.error('Erro ao carregar pacientes:', error);
      }
    };
    carregarPacientes();
  }, []);

  const normalizar = (texto: string) =>
    (texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const filtrarPacientes = (termo: string) => {
    if (!termo.trim()) return todosPacientes;
    const t = normalizar(termo);
    return todosPacientes.filter(paciente =>
      normalizar(paciente.nome).includes(t) ||
      (paciente.telefone || '').includes(termo) ||
      (paciente.cpf || '').includes(termo)
    );
  };

  const handleBusca = (e: React.FormEvent) => {
    e.preventDefault();
    const resultados = filtrarPacientes(termoBusca);
    setPacientes(resultados);
  };

  const selecionarPaciente = (paciente: Paciente) => {
    setPacienteSelecionado(paciente);
  };

  // Evita bug de fuso (YYYY-MM-DD interpretado como UTC) formatando manualmente
  const formatarData = (data: string) => formatISOToBR(data);

  const calcularIdade = (p: Paciente) => {
    const age = calculateAgeFromISO(getDataNascimento(p));
    return age == null ? '' : `${age} anos`;
  };

  const formatarDataCadastro = (p: Paciente) => formatarData(getDataCadastro(p));

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500";

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Cabeçalho */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Link href="/" className="text-blue-600 text-xl">←</Link>
            <h1 className="text-xl font-bold text-gray-800">
              Buscar Paciente
            </h1>
          </div>
        </div>

        {/* Campo de Busca */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <form onSubmit={handleBusca} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar por nome, telefone ou CPF
              </label>
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className={inputClass}
                placeholder="Digite para buscar..."
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              🔍 Buscar
            </button>
          </form>
        </div>

        {/* Estatísticas */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{todosPacientes.length}</p>
            <p className="text-sm text-gray-600">Total de Pacientes Cadastrados</p>
          </div>
        </div>

        {/* Resultados da Busca */}
        <div className="space-y-4">
          {pacientes.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              {todosPacientes.length === 0 ? (
                <div>
                  <p className="text-gray-500 text-lg">Nenhum paciente cadastrado ainda</p>
                  <Link 
                    href="/cadastrar-paciente"
                    className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                  >
                    Cadastrar primeiro paciente
                  </Link>
                </div>
              ) : (
                <p className="text-gray-500 text-lg">Nenhum paciente encontrado</p>
              )}
            </div>
          ) : (
            pacientes.map(paciente => (
              <div 
                key={paciente.id} 
                className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => selecionarPaciente(paciente)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-lg">
                      {paciente.nome}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{paciente.telefone}</span>
                      {paciente.telefone && (
                        <a
                          href={buildWhatsUrl(paciente.telefone, paciente.nome)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Enviar WhatsApp"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-500 hover:bg-green-600"
                          onClick={(e) => e.stopPropagation()}
                          title="WhatsApp"
                        >
                          <WhatsIcon />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-blue-600">
                      {calcularIdade(paciente)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                  <p><strong>CPF:</strong> {paciente.cpf}</p>
                  <p><strong>Endereço:</strong> {paciente.endereco}</p>
                  <p><strong>Valor Consulta:</strong> R$ {getValorConsulta(paciente).toFixed(2)}</p>
                  {getModalidadePreferida(paciente) && (
                    <p>
                      <strong>Modalidade:</strong>{' '}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${getModalidadePreferida(paciente)==='online' ? 'bg-orange-100 text-orange-800' : getModalidadePreferida(paciente)==='presencial_zs' ? 'bg-pink-100 text-pink-800' : 'bg-purple-100 text-purple-800'}`}>
                        {getModalidadePreferida(paciente)==='online' ? 'Online' : getModalidadePreferida(paciente)==='presencial_zs' ? 'Presencial Botafogo' : 'Presencial Barra'}
                      </span>
                    </p>
                  )}
                  <p><strong>Data Nascimento:</strong> {formatarData(getDataNascimento(paciente))}</p>
                  <p><strong>Cadastrado em:</strong> {formatarDataCadastro(paciente)}</p>
                  
                  {hasRepresentante(paciente) && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                      <div className="flex items-center justify-between gap-2 text-xs text-yellow-800">
                        <p>
                          <strong>Representante:</strong> {getNomeRepresentante(paciente)} - {getTelefoneRepresentante(paciente)}
                        </p>
                        {getTelefoneRepresentante(paciente) && (
                          <a
                            href={buildWhatsUrl(getTelefoneRepresentante(paciente), getNomeRepresentante(paciente))}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="WhatsApp do representante"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-500 hover:bg-green-600"
                            onClick={(e) => e.stopPropagation()}
                            title="WhatsApp"
                          >
                            <WhatsIcon />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex space-x-2">
                  <Link
                    href={`/historico-paciente/${paciente.id}`}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors text-center"
                  >
                    Ver Ficha Completa
                  </Link>
                  <Link
                    href={`/agendar-consulta?pacienteId=${paciente.id}`}
                    className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors text-center"
                  >
                    Agendar Consulta
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Botão Voltar */}
        <div className="mt-6">
          <Link
            href="/"
            className="block w-full px-4 py-3 text-center text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
          >
            Voltar ao Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
