# 🚀 Configuração do Supabase para Clínica Agenda

## 📋 Passo a Passo para Configurar

### 1. Criar Conta no Supabase
- Acesse: https://supabase.com
- Clique em "Start your project"
- Faça login com GitHub ou Google
- Clique em "New Project"

### 2. Criar Novo Projeto
- **Nome do Projeto**: `clinica-agenda` (ou o nome que preferir)
- **Database Password**: Crie uma senha forte (anote em lugar seguro)
- **Region**: Escolha a região mais próxima (ex: São Paulo)
- Clique em "Create new project"

### 3. Aguardar Configuração
- O projeto pode demorar 2-3 minutos para ficar pronto
- Aguarde até aparecer "Project is ready"

### 4. Pegar as Credenciais
- No projeto, vá em **Settings** → **API**
- Copie:
  - **Project URL** (ex: `https://abc123.supabase.co`)
  - **anon public** key (chave longa)

### 5. Configurar no Projeto
- Crie um arquivo `.env.local` na raiz do projeto
- Adicione:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

### 6. Criar as Tabelas
- No Supabase, vá em **Table Editor**
- Clique em **New Table**

#### Tabela: `pacientes`
```sql
id: int8 (Primary Key, Identity)
nome: text (not null)
telefone: text (not null)
endereco: text (not null)
data_nascimento: date (not null)
cpf: text (not null)
valor_consulta: numeric (not null)
nome_representante: text
telefone_representante: text
tem_representante: boolean (default: false)
data_cadastro: timestamp (default: now())
created_at: timestamp (default: now())
```

#### Tabela: `consultas`
```sql
id: int8 (Primary Key, Identity)
paciente_id: int8 (Foreign Key -> pacientes.id)
data: date (not null)
horario: time (not null)
tipo_consulta: text (not null)
ja_pagou: boolean (default: false)
observacoes: text
data_agendamento: timestamp (default: now())
created_at: timestamp (default: now())
```

### 7. Configurar Políticas de Segurança + Login Google
- Vá em **Authentication** → **Policies**
- Ative o provider Google em Authentication → Providers → Google.
- Redirect URLs:
  - Local: `http://localhost:3000/auth/callback`
  - Produção: `https://SEU-DOMINIO.vercel.app/auth/callback`
- Crie a tabela `allowed_emails` e políticas iniciais:

```sql
create table if not exists public.allowed_emails (
  email text primary key,
  role text not null check (role in ('admin','gestor','medico','contador')),
  created_at timestamp with time zone default now()
);

alter table public.allowed_emails enable row level security;

-- Ler a própria permissão
create policy "read own allowed" on public.allowed_emails
  for select using (auth.email() = email);

-- Admin gerencia tudo (troque pelo seu e‑mail)
create policy "admin manage allowed" on public.allowed_emails
  for all using (auth.email() = 'seu-email-admin@exemplo.com')
  with check (auth.email() = 'seu-email-admin@exemplo.com');

-- Inserir seu e‑mail como admin
insert into public.allowed_emails(email, role)
values ('seu-email-admin@exemplo.com','admin')
on conflict (email) do update set role = excluded.role;

-- Restringir acesso às tabelas por e‑mail permitido
alter table public.pacientes enable row level security;
alter table public.consultas enable row level security;

create policy "allowed select pacientes" on public.pacientes
  for select using (exists (select 1 from public.allowed_emails a where a.email = auth.email()));
create policy "allowed insert pacientes" on public.pacientes
  for insert with check (exists (select 1 from public.allowed_emails a where a.email = auth.email())) to authenticated;
create policy "allowed update pacientes" on public.pacientes
  for update using (exists (select 1 from public.allowed_emails a where a.email = auth.email()))
  with check (exists (select 1 from public.allowed_emails a where a.email = auth.email())) to authenticated;
create policy "allowed delete pacientes" on public.pacientes
  for delete using (exists (select 1 from public.allowed_emails a where a.email = auth.email())) to authenticated;

create policy "allowed select consultas" on public.consultas
  for select using (exists (select 1 from public.allowed_emails a where a.email = auth.email()));
create policy "allowed insert consultas" on public.consultas
  for insert with check (exists (select 1 from public.allowed_emails a where a.email = auth.email())) to authenticated;
create policy "allowed update consultas" on public.consultas
  for update using (exists (select 1 from public.allowed_emails a where a.email = auth.email()))
  with check (exists (select 1 from public.allowed_emails a where a.email = auth.email())) to authenticated;
create policy "allowed delete consultas" on public.consultas
  for delete using (exists (select 1 from public.allowed_emails a where a.email = auth.email())) to authenticated;
```

Mais tarde, refine por papel (ex.: `contador` somente leitura): use `exists (select 1 from allowed_emails where email = auth.email() and role = 'contador')` nas políticas.

### 8. Testar
- Reinicie o servidor: `npm run dev`
- Teste cadastrar um paciente
- Teste agendar uma consulta

## 🔧 Comandos SQL para Criar Tabelas

### Tabela Pacientes:
```sql
CREATE TABLE pacientes (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  endereco TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  cpf TEXT NOT NULL,
  valor_consulta NUMERIC NOT NULL,
  nome_representante TEXT,
  telefone_representante TEXT,
  tem_representante BOOLEAN DEFAULT FALSE,
  data_cadastro TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela Consultas:
```sql
CREATE TABLE consultas (
  id BIGSERIAL PRIMARY KEY,
  paciente_id BIGINT REFERENCES pacientes(id),
  data DATE NOT NULL,
  horario TIME NOT NULL,
  tipo_consulta TEXT NOT NULL,
  ja_pagou BOOLEAN DEFAULT FALSE,
  observacoes TEXT,
  data_agendamento TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## ✅ Benefícios Após Configuração

- **Dados na nuvem** - Acesse de qualquer lugar
- **Compartilhamento** - Médico, secretária e você acessam a mesma base
- **Backup automático** - Dados sempre seguros
- **Sincronização** - Mudanças aparecem para todos em tempo real
- **Escalável** - Cresce com sua clínica

## 🆘 Suporte

Se tiver dúvidas na configuração:
1. Verifique se as credenciais estão corretas
2. Confirme se as tabelas foram criadas
3. Verifique as políticas de segurança
4. Teste com um paciente simples primeiro

**Boa sorte! 🏥✨**
