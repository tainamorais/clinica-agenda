"use client";
import { useEffect, useState } from 'react';
import { supabase, UserRole } from '@/config/supabase-config';

type AllowedRow = { email: string; role: UserRole };

const roles: UserRole[] = ['admin', 'gestor', 'medico', 'contador'];

export default function UsuariosAdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [itens, setItens] = useState<AllowedRow[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('gestor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('allowed_emails').select('email, role').order('email');
    if (error) setError(error.message);
    setItens((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email ?? '';
      if (!email) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase.from('allowed_emails').select('role').eq('email', email).maybeSingle();
      setIsAdmin((data?.role as UserRole) === 'admin');
    };
    checkAdmin();
    carregar();
  }, []);

  const adicionar = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.from('allowed_emails').insert([{ email: email.trim().toLowerCase(), role }]);
    if (error) setError(error.message);
    setEmail('');
    await carregar();
  };

  const remover = async (e: string) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.from('allowed_emails').delete().eq('email', e);
    if (error) setError(error.message);
    await carregar();
  };

  const atualizarRole = async (e: string, r: UserRole) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.from('allowed_emails').update({ role: r }).eq('email', e);
    if (error) setError(error.message);
    await carregar();
  };

  if (isAdmin === false) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <div className="bg-white border rounded p-6 text-center text-red-600">Acesso restrito a administradores.</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-800 mb-4">Usuários Permitidos</h1>
      <div className="bg-white border rounded p-4 mb-6">
        <div className="flex gap-2 flex-col sm:flex-row">
          <input
            type="email"
            placeholder="email@exemplo.com"
            className="flex-1 border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select className="border rounded px-3 py-2" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button onClick={adicionar} className="bg-green-600 text-white px-4 py-2 rounded">Adicionar</button>
        </div>
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      </div>
      <div className="bg-white border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">E‑mail</th>
              <th className="text-left p-2">Papel</th>
              <th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((row) => (
              <tr key={row.email} className="border-t">
                <td className="p-2">{row.email}</td>
                <td className="p-2">
                  <select
                    className="border rounded px-2 py-1"
                    value={row.role}
                    onChange={(e) => atualizarRole(row.email, e.target.value as UserRole)}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2 text-right">
                  <button onClick={() => remover(row.email)} className="text-red-600">Remover</button>
                </td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-500">Nenhum usuário adicionado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


