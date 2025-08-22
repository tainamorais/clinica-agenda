# Clínica Agenda – Visão Geral (Documento vivo)

Este documento explica o projeto em linguagem simples. Ele será atualizado quando surgirem mudanças importantes.

## O que é
Aplicativo web de agenda para clínicas: cadastrar pacientes, agendar/editar consultas, ver agenda do dia, buscar pacientes e ver histórico básico.

## Como as pessoas entram
- Login pelo Google (você não guarda senhas).
- Só entra quem estiver na tabela `allowed_emails` com um papel (admin, gestor, médico, contador).

## O que cada papel faz (exemplos)
- Admin: gerencia usuários, vê e edita tudo.
- Gestor: agenda, relatórios básicos.
- Médico: agenda própria e dados necessários para atendimento.
- Contador: valores/financeiro.

## Onde ficam os dados
- Supabase (banco Postgres gerenciado).
- Regras de segurança (RLS) no banco garantem que apenas e‑mails permitidos vejam os dados.

## Tecnologias principais
- Linguagem: TypeScript.
- Web: Next.js (React) – App Router.
- Estilo: Tailwind CSS.
- Runtime: Node.js.
- Banco + Login: Supabase (`@supabase/supabase-js`).
- Deploy recomendado: Vercel.

## Estrutura das telas (rotas principais)
`/login`, `/` (menu), `/cadastrar-paciente`, `/buscar-paciente`, `/agendar-consulta`, `/consultas`, `/consultas-hoje`, `/editar-...`, `/historico`, `/admin/usuarios`.

## Banco de dados (tabelas)
- `pacientes`: dados do paciente, data de nascimento como DATE (evita erro de fuso).
- `consultas`: data (DATE), horário (TIME), tipo, pago/não pago, observações.
- `allowed_emails`: lista de e‑mails permitidos com papel (role).

## Segurança (resumo)
- Login Google (sem senhas locais).
- Lista de e‑mails permitidos + papéis (controle por função – RBAC).
- Regras no banco (RLS) que limitam acesso aos dados.
- Variáveis de ambiente guardam credenciais (não aparecem no código).

## Como rodar
- Local: `npm install` → `npm run dev` → abrir `http://localhost:3000`.
- Produção: Vercel + variáveis de ambiente do Supabase.

## Recomendações quando publicar para clientes
- Usar Node 20 na Vercel.
- Cabeçalhos de segurança (CSP, HSTS) e/ou mover operações sensíveis para server-side.
- Backups automáticos e teste de restauração mensal.
- Logs de auditoria (quem mudou o quê).
- Política de Privacidade, Termos e contrato controlador–operador (LGPD).

## Histórico de mudanças (manteremos atualizado)
- 2025‑08‑22: datas tratadas como DATE e utilitários de data estáveis; documentação inicial criada.
