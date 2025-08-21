"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/config/supabase-config';

export default function Topbar() {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setEmail(session?.user?.email ?? null);
      const userEmail = session?.user?.email ?? null;
      if (userEmail) {
        const { data } = await supabase.from('allowed_emails').select('role').eq('email', userEmail).maybeSingle();
        setIsAdmin(data?.role === 'admin');
      } else {
        setIsAdmin(false);
      }
    };
    load();
  }, []);

  const sair = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="w-full bg-gray-800 text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
        <Link href="/" className="font-semibold">Agenda Clínica</Link>
        <div className="flex items-center gap-3 text-sm">
          {isAdmin && <Link href="/admin/usuarios" className="hover:underline">Usuários</Link>}
          {email ? <span>{email}</span> : null}
          <button onClick={sair} className="bg-gray-700 px-2 py-1 rounded">Sair</button>
        </div>
      </div>
    </div>
  );
}


