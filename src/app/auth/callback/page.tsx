"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/config/supabase-config';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Após autenticar, redireciona para a home
      router.replace('/');
    };
    handleSession();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6 text-center text-gray-700">
        Processando login…
      </div>
    </div>
  );
}


