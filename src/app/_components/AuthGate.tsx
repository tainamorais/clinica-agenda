"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase, AllowedEmail, UserRole } from '@/config/supabase-config';

type Props = {
  children: React.ReactNode;
};

export function AuthGate({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [denied, setDenied] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const run = async () => {
      // Páginas públicas
      if (pathname?.startsWith('/login') || pathname?.startsWith('/auth/callback')) {
        setChecking(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email ?? null;
      if (!email) {
        router.replace('/login');
        return;
      }

      // Verifica e-mail permitido e carrega papel
      const { data, error } = await supabase
        .from('allowed_emails')
        .select('email, role')
        .eq('email', email)
        .maybeSingle();
      if (error) {
        setDenied('Erro ao verificar permissão.');
        setChecking(false);
        return;
      }
      if (!data) {
        setDenied('Seu e‑mail não está autorizado.');
        setChecking(false);
        return;
      }

      const userRole = (data as any)?.role as UserRole;
      setRole(userRole);

      // Regras de acesso por papel
      const path = pathname || '/';
      const isAdmin = userRole === 'admin';
      const isGestor = userRole === 'gestor';
      const isMedico = userRole === 'medico';
      const isContador = userRole === 'contador';

      // Rotas administrativas
      if (path.startsWith('/admin') && !isAdmin) {
        setDenied('Acesso restrito a administradores.');
        setChecking(false);
        return;
      }

      // Bloqueios por função
      // Contador: somente leitura (bloqueia páginas de criação/edição)
      const contadorBloqueadas = [
        '/cadastrar-paciente',
        '/agendar-consulta',
        '/editar-consulta',
        '/editar-paciente',
      ];
      if (isContador && contadorBloqueadas.some((p) => path.startsWith(p))) {
        setDenied('Seu perfil (contador) possui acesso somente de leitura.');
        setChecking(false);
        return;
      }

      // Médico: leitura da agenda e edição apenas de ficha de paciente
      const medicoBloqueadas = [
        '/cadastrar-paciente',
        '/agendar-consulta',
        '/editar-consulta',
      ];
      if (isMedico && medicoBloqueadas.some((p) => path.startsWith(p))) {
        setDenied('Seu perfil (médico) não pode acessar esta página.');
        setChecking(false);
        return;
      }

      // Gestor: permite tudo exceto /admin
      // Admin: tudo liberado

      setChecking(false);
    };
    run();
  }, [router, pathname]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700">Carregando…</div>
    );
  }
  if (denied) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border rounded p-4 text-center">
          <div className="text-red-600 mb-2">{denied}</div>
          <button
            className="mt-2 px-4 py-2 bg-gray-800 text-white rounded"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
          >Trocar conta</button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}


