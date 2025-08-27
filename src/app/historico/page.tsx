import { redirect } from 'next/navigation';

export default function HistoricoRedirect() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
  redirect(`/financeiro?inicio=${inicio}&fim=${fim}`);
}
