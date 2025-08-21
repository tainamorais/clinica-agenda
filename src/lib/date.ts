export function splitIsoYMD(iso: string): { y: number; m: number; d: number } | null {
  if (!iso) return null;
  const base = iso.split('T')[0];
  const [ys, ms, ds] = (base || '').split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

export function formatISOToBR(iso: string): string {
  const parts = splitIsoYMD(iso);
  if (!parts) return '';
  const { y, m, d } = parts;
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${dd}/${mm}/${y}`;
}

export function calculateAgeFromISO(iso: string, today: Date = new Date()): number | null {
  const parts = splitIsoYMD(iso);
  if (!parts) return null;
  const { y, m, d } = parts;
  const birth = new Date(y, m - 1, d); // Local (sem UTC)
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  // Garante mínimo 0
  return age < 0 ? 0 : age;
}


