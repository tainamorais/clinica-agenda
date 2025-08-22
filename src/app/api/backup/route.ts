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

async function ensureBackupsBucket(svc: ReturnType<typeof createClient>) {
  try {
    const { data: buckets } = await (svc.storage as any).listBuckets();
    const exists = (buckets || []).some((b: any) => b.name === 'backups');
    if (!exists) {
      await svc.storage.createBucket('backups', { public: false });
    }
  } catch (_) {
    // ignore (older libs may not support listBuckets); best-effort create
    try { await svc.storage.createBucket('backups', { public: false }); } catch { /* noop */ }
  }
}

async function runBackup() {
  const supabaseUrl = assertEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = assertEnv('SUPABASE_SERVICE_ROLE_KEY');

  const svc = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  await ensureBackupsBucket(svc);

  const timestamp = new Date().toISOString().replace(/[:]/g, '-');
  const prefix = `backups/${timestamp}`;

  async function fetchTable(table: string) {
    const { data, error } = await svc.from(table as any).select('*');
    if (error) {
      // Table may not exist in some setups; return null to skip
      return null as any;
    }
    return data ?? [];
  }

  const [pacientes, consultas, allowedEmails] = await Promise.all([
    fetchTable('pacientes'),
    fetchTable('consultas'),
    fetchTable('allowed_emails'),
  ]);

  const manifest = {
    createdAt: new Date().toISOString(),
    tables: {
      pacientes: Array.isArray(pacientes) ? pacientes.length : 0,
      consultas: Array.isArray(consultas) ? consultas.length : 0,
      allowed_emails: Array.isArray(allowedEmails) ? allowedEmails.length : 0,
    },
  };

  async function upload(path: string, body: unknown) {
    const buffer = Buffer.from(JSON.stringify(body, null, 2));
    const { error } = await svc.storage.from('backups').upload(path, buffer, {
      contentType: 'application/json; charset=utf-8',
      upsert: true,
    } as any);
    if (error) throw error;
  }

  await upload(`${prefix}/manifest.json`, manifest);
  if (pacientes) await upload(`${prefix}/pacientes.json`, pacientes);
  if (consultas) await upload(`${prefix}/consultas.json`, consultas);
  if (allowedEmails) await upload(`${prefix}/allowed_emails.json`, allowedEmails);

  return { ok: true, prefix, manifest };
}

function isAuthorized(req: NextRequest) {
  const secret = process.env.BACKUP_CRON_SECRET || '';
  if (!secret) return process.env.NODE_ENV !== 'production';
  const header = req.headers.get('x-cron-secret') || req.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '');
  return token === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return json({ error: 'Unauthorized' }, 401);
  try {
    const result = await runBackup();
    return json(result, 200);
  } catch (e: any) {
    return json({ error: e?.message || 'Backup failed' }, 500);
  }
}

export async function GET(req: NextRequest) {
  // Allow triggering with GET too
  return POST(req);
}


