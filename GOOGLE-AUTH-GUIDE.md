# Login com Google (Supabase Auth) – Passo a passo completo

Este guia ensina, do zero, a habilitar login com Google neste projeto, usando Supabase Auth e Vercel. Ao final, somente e‑mails permitidos poderão acessar o sistema, com papéis de acesso (admin, gestor, médico, contador).

---

## 0) O que você vai precisar
- Uma conta no Supabase (gratuita)
- Uma conta no Google Cloud (gratuita)
- O projeto já rodando na Vercel (gratuito)
- O domínio fixo de produção do projeto na Vercel (ex.: `https://clinica-agenda-blush.vercel.app`)

Observação importante: evite usar domínios temporários da Vercel (com partes aleatórias). Use sempre o domínio “estável” que aparece em Settings → Domains do seu projeto.

---

## 1) Definir o domínio estável na Vercel (confirmar)
1. Vercel → Project → Settings → Domains.
2. Anote o domínio estável de produção (ex.: `https://clinica-agenda-blush.vercel.app`). É ele que usaremos em todas as configurações.

Não precisa fazer deploy aqui.

---

## 2) Configurar URLs no Supabase
1. Supabase → sua instância → Authentication → URL Configuration.
2. Preencha:
   - Site URL: `https://SEU-PROJETO.vercel.app`
   - Redirect URLs (Add URL):
     - `http://localhost:3000/auth/callback`
     - `https://SEU-PROJETO.vercel.app/auth/callback`
3. Clique em Save changes.

Dica: Se o login no celular redirecionar para `localhost`, é porque o Site URL ainda está como `http://localhost:3000`. Troque para o domínio da Vercel e salve.

---

## 3) Criar credenciais no Google Cloud
1. Acesse `https://console.cloud.google.com/` e escolha/crie um projeto (ex.: Clinica Agenda).
2. Menu “APIs e serviços” → Tela de consentimento OAuth:
   - Tipo de usuário: Externo.
   - Nome do app, e‑mail de suporte/desenvolvedor: preencha com seu Gmail.
   - Em “Usuários de teste”: adicione os e‑mails que poderão logar (pelo menos o seu). Salve.
3. Menu “APIs e serviços” → Credenciais → Criar credenciais → ID do cliente OAuth → Tipo “Aplicativo da Web”.
   - Origens JavaScript autorizadas:
     - `http://localhost:3000`
     - `https://SEU-PROJETO.vercel.app`
   - URIs de redirecionamento autorizados:
     - `http://localhost:3000/auth/callback`
     - `https://SEU-PROJETO.vercel.app/auth/callback`
   - Criar. Copie o Client ID e o Client Secret.

Observação: manter a “Tela de consentimento” em modo Testing é gratuito. O Google pode pedir reautorização após alguns dias – isso é normal em Testing.

---

## 4) Ativar o provider Google no Supabase
1. Supabase → Authentication → Sign in / Providers → Google.
2. Habilite Google e **cole**:
   - Client IDs: o Client ID gerado no passo anterior
   - Client Secret (for OAuth): o Client Secret gerado
3. Salve.

Pronto: o Supabase já consegue autenticar com Google.

---

## 5) Liberar acesso apenas para e‑mails permitidos (RBAC básico)
O projeto usa a tabela `allowed_emails` para controlar quem entra e qual papel a pessoa tem. Rode este SQL no Supabase (SQL Editor → New query → Run). Substitua `SEU_GMAIL_AQUI` pelo seu Gmail de admin.

```sql
create table if not exists public.allowed_emails (
  email text primary key,
  role  text not null check (role in ('admin','gestor','medico','contador')),
  created_at timestamptz default now()
);

alter table public.allowed_emails enable row level security;

drop policy if exists "read own allowed" on public.allowed_emails;
create policy "read own allowed" on public.allowed_emails
  for select using (auth.email() = email);

drop policy if exists "admin manage allowed" on public.allowed_emails;
create policy "admin manage allowed" on public.allowed_emails
  for all using (auth.email() = 'SEU_GMAIL_AQUI')
  with check (auth.email() = 'SEU_GMAIL_AQUI');

insert into public.allowed_emails (email, role)
values ('SEU_GMAIL_AQUI','admin')
on conflict (email) do update set role = excluded.role;
```

Depois do login, o admin verá o menu “Usuários” e poderá adicionar/remover e‑mails e trocar papéis na tela `/admin/usuarios`.

---

## 6) Políticas de acesso às tabelas da aplicação
Caso ainda não tenha configurado RLS para as tabelas `pacientes` e `consultas`, use o arquivo `SUPABASE-SETUP.md` deste repositório. Lá há um bloco pronto de políticas que restringem acesso a quem está em `allowed_emails`.

---

## 7) Testar o login
1. Abra uma **aba anônima** e acesse: `https://SEU-PROJETO.vercel.app/login`.
2. Clique em “Entrar com Google”, selecione o e‑mail que você inseriu em `allowed_emails`.
3. Ao logar, seu e‑mail aparecerá no topo; se for admin, o menu “Usuários” também aparece.

Dica: Para uso local, acesse `http://localhost:3000/login`. O Node local precisa ser ≥ 18 (use `nvm install 18 && nvm use 18`).

---

## 8) Solução de problemas (FAQ)
- “Safari/Chrome voltou para localhost no celular”: o Site URL no Supabase está errado. Vá em Authentication → URL Configuration e troque para `https://SEU-PROJETO.vercel.app`.
- “redirect_uri_mismatch” no Google: confira **exatamente** as URLs em Origens/Redirect (incluindo `https://`, domínio, e `/auth/callback`).
- “404: DEPLOYMENT_NOT_FOUND” (Vercel): você usou um domínio **temporário** ou um deploy antigo. Use o domínio de produção de Settings → Domains. Se necessário, Vercel → Deployments → Redeploy com “Clear build cache”.
- “Seu e‑mail não está autorizado”: verifique a tabela `allowed_emails` (Table Editor) e confirme que seu e‑mail está lá. Na tela de consentimento do Google (Testing), adicione o e‑mail em “Usuários de teste”.
- Mudanças no Supabase/Google precisam de redeploy? **Não**. Só o caso do 404 da Vercel pede redeploy com “Clear build cache”.

---

## 9) Papéis e permissões (como funciona)
- `admin`: tudo liberado; gerencia usuários em `/admin/usuarios`.
- `gestor`: gerencia a agenda e pacientes (sem acesso à tela de administração).
- `medico`: leitura de agenda; edição de ficha de paciente (restrições aplicadas no guard).
- `contador`: somente leitura.

A checagem é feita no front (guard) e reforçada por RLS no banco.

---

## 10) Resumo rápido
1. Vercel: anote o domínio fixo (Settings → Domains).
2. Supabase (URL Configuration): Site URL = domínio fixo; Redirects: localhost + domínio fixo com `/auth/callback`.
3. Google Cloud: consentimento (Testing) + credenciais OAuth Web com as mesmas URLs.
4. Supabase (Providers → Google): cole Client ID/Secret.
5. Supabase (SQL): crie `allowed_emails` e insira seu e‑mail como admin.
6. Teste em `https://SEU-PROJETO.vercel.app/login`.

Pronto! Login com Google funcionando, com controle de e‑mails e papéis.
