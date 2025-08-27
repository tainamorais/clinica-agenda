import Link from 'next/link';
import RoleAlert from './_components/RoleAlert';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <RoleAlert />
      <div className="max-w-md mx-auto">
        {/* Cabeçalho */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-center text-blue-600 mb-2">
            🏥 Clínica Agenda
          </h1>
          <p className="text-center text-gray-600">
            Sistema de Agendamento
          </p>
        </div>

        {/* Menu Principal */}
        <div className="space-y-4">
          {/* Agendar Consulta */}
          <Link href="/agendar-consulta">
            <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-all">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <span className="text-2xl">📅</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Agendar Consulta
                  </h2>
                  <p className="text-sm text-gray-600">
                    Marcar nova consulta
                  </p>
                </div>
                <div className="text-gray-400">
                  <span className="text-xl">→</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Consultas por Data */}
          <Link href="/consultas">
            <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-all">
              <div className="flex items-center space-x-4">
                <div className="bg-indigo-100 p-3 rounded-full">
                  <span className="text-2xl">🗓️</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Consultas por Data
                  </h2>
                  <p className="text-sm text-gray-600">
                    Visualizar em qualquer dia
                  </p>
                </div>
                <div className="text-gray-400">
                  <span className="text-xl">→</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Cadastrar Paciente */}
          <Link href="/cadastrar-paciente">
            <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-all">
              <div className="flex items-center space-x-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <span className="text-2xl">👤</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Cadastrar Paciente
                  </h2>
                  <p className="text-sm text-gray-600">
                    Novo paciente
                  </p>
                </div>
                <div className="text-gray-400">
                  <span className="text-xl">→</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Consultas de Hoje */}
          <Link href="/consultas-hoje">
            <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-all">
              <div className="flex items-center space-x-4">
                <div className="bg-yellow-100 p-3 rounded-full">
                  <span className="text-2xl">📋</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Consultas de Hoje
                  </h2>
                  <p className="text-sm text-gray-600">
                    Ver agenda do dia
                  </p>
                </div>
                <div className="text-gray-400">
                  <span className="text-xl">→</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Histórico */}
          <Link href="/historico">
            <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-all">
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Histórico
                  </h2>
                  <p className="text-sm text-gray-600">
                    Consultas e pagamentos
                  </p>
                </div>
                <div className="text-gray-400">
                  <span className="text-xl">→</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Financeiro */}
          <Link href="/financeiro">
            <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-all">
              <div className="flex items-center space-x-4">
                <div className="bg-emerald-100 p-3 rounded-full">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Financeiro
                  </h2>
                  <p className="text-sm text-gray-600">
                    Resumo de faturamento e pendências
                  </p>
                </div>
                <div className="text-gray-400">
                  <span className="text-xl">→</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Buscar Paciente */}
          <Link href="/buscar-paciente">
            <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-all">
              <div className="flex items-center space-x-4">
                <div className="bg-orange-100 p-3 rounded-full">
                  <span className="text-2xl">🔍</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Buscar Paciente
                  </h2>
                  <p className="text-sm text-gray-600">
                    Encontrar paciente
                  </p>
                </div>
                <div className="text-gray-400">
                  <span className="text-xl">→</span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Rodapé */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Versão 1.0 - Sistema de Agenda</p>
          <p className="mt-1">Otimizado para celular</p>
        </div>
      </div>
    </div>
  );
}
