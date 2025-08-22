import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function json(data: unknown, init: number | ResponseInit = 200) {
  const status = typeof init === 'number' ? init : (init as ResponseInit).status ?? 200;
  const initObj: ResponseInit = typeof init === 'number' ? { status } : init;
  return new NextResponse(JSON.stringify(data), {
    ...initObj,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(initObj.headers || {}),
    },
  });
}

function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

export async function GET() {
  try {
    const supabaseUrl = assertEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anon = assertEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const svc = createClient(supabaseUrl, anon, { auth: { persistSession: false } });

    const tables = ['pacientes', 'consultas'];
    const result: Record<string, unknown[]> = {};

    for (const t of tables) {
      const { data } = await svc.from(t as any).select('*');
      result[t] = data ?? [];
    }

    return json(result, 200);
  } catch (e: any) {
    return json({ error: e?.message || 'Export failed' }, 500);
  }
}


