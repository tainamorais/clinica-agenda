"use client";
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function RoleAlert() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('forbidden');
  const [open, setOpen] = useState(false);

  const message = useMemo(() => {
    if (!reason) return '';
    if (reason === 'admin') return 'Acesso restrito a administradores.';
    if (reason === 'contador') return 'Seu perfil (contador) possui acesso somente de leitura.';
    if (reason === 'medico') return 'Seu perfil (médico) não tem permissão para esta ação.';
    return 'Seu perfil não tem permissão para esta ação.';
  }, [reason]);

  useEffect(() => {
    setOpen(Boolean(reason));
  }, [reason]);

  if (!open || !reason) return null;

  const close = () => {
    setOpen(false);
    // remove o parâmetro da URL sem recarregar
    const url = new URL(window.location.href);
    url.searchParams.delete('forbidden');
    router.replace(url.pathname + (url.search ? url.search : ''));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="relative z-10 max-w-sm w-[90%] bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm text-gray-800">
            {message}
          </div>
          <button onClick={close} aria-label="Fechar" className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
      </div>
    </div>
  );
}


