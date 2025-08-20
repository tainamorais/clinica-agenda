'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '../../config/supabase-config';

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
  const hasRepresentante = (p: Paciente) => Boolean((p as any).tem_representante ?? p.temRepresentante);
  const getNomeRepresentante = (p: Paciente) => p.nomeRepresentante || (p as any).nome_representante || '';
  const getTelefoneRepresentante = (p: Paciente) => p.telefoneRepresentante || (p as any).telefone_representante || '';

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
        const pacientesSalvos = localStorage.getItem('pacientes');
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

  const filtrarPacientes = (termo: string) => {
    if (!termo.trim()) {
      return todosPacientes;
    }

    const termoLower = termo.toLowerCase();
    return todosPacientes.filter(paciente =>
      paciente.nome.toLowerCase().includes(termoLower) ||
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

  const formatarData = (data: string) => {
    if (!data) return '';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const calcularIdade = (p: Paciente) => {
    const dataNascimento = getDataNascimento(p);
    if (!dataNascimento) return '';
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return `${idade} anos`;
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
                    <p className="text-sm text-gray-600">{paciente.telefone}</p>
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
                  <p><strong>Data Nascimento:</strong> {formatarData(getDataNascimento(paciente))}</p>
                  <p><strong>Cadastrado em:</strong> {formatarDataCadastro(paciente)}</p>
                  
                  {hasRepresentante(paciente) && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                      <p className="text-xs text-yellow-800">
                        <strong>Representante:</strong> {getNomeRepresentante(paciente)} - {getTelefoneRepresentante(paciente)}
                      </p>
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
                    href="/agendar-consulta"
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
