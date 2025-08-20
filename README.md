# 🏥 Clínica Agenda - Sistema de Agendamento

Sistema completo de agenda para clínicas médicas. Funciona no celular, computador e tablet.

## 🚀 Instalação Completa (Passo a Passo)

### ⚠️ IMPORTANTE: Você precisa ter o Node.js instalado
**Antes de começar, verifique se tem o Node.js:**
```bash
node --version
```
**Se aparecer "command not found" ou versão menor que 18, instale o Node.js primeiro:**
- Acesse: https://nodejs.org
- Baixe a versão "LTS" (mais estável)
- Instale normalmente

### 1. Baixar o projeto
```bash
git clone https://github.com/seu-usuario/clinica-agenda.git
cd clinica-agenda
```

### 2. Instalar dependências
```bash
npm install
```
**Aguarde terminar (pode demorar alguns minutos)**

### 3. Configurar banco de dados (Supabase)
**Siga exatamente estes passos:**

1. **Acesse:** https://supabase.com
2. **Clique em:** "Start your project"
3. **Faça login** com GitHub ou Google
4. **Clique em:** "New Project"
5. **Nome do projeto:** `clinica-agenda`
6. **Database Password:** crie uma senha forte (anote em lugar seguro!)
7. **Region:** escolha a mais próxima (ex: São Paulo)
8. **Clique em:** "Create new project"
9. **AGUARDE** até aparecer "Project is ready" (2-3 minutos)

### 4. Pegar credenciais do Supabase
**No projeto criado:**

1. **Clique em:** "Settings" (ícone de engrenagem ⚙️)
2. **Clique em:** "API"
3. **Copie exatamente:**
   - **Project URL** (ex: `https://abc123.supabase.co`)
   - **anon public** key (chave muito longa)

### 5. Criar arquivo de configuração
**Na pasta do projeto, crie um arquivo chamado `.env.local`**

**Conteúdo do arquivo:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

**⚠️ SUBSTITUA pelas suas credenciais reais!**

### 6. Criar tabelas no banco
**No Supabase:**

1. **Clique em:** "Table Editor"
2. **Clique em:** "New Table"

#### Primeira tabela: `pacientes`
**Nome da tabela:** `pacientes`
**Colunas:**
- `id` - tipo: `int8`, marcar: `Primary Key` e `Identity`
- `nome` - tipo: `text`, marcar: `not null`
- `telefone` - tipo: `text`, marcar: `not null`
- `endereco` - tipo: `text`, marcar: `not null`
- `data_nascimento` - tipo: `date`, marcar: `not null`
- `cpf` - tipo: `text`, marcar: `not null`
- `valor_consulta` - tipo: `numeric`, marcar: `not null`
- `nome_representante` - tipo: `text`
- `telefone_representante` - tipo: `text`
- `tem_representante` - tipo: `boolean`, valor padrão: `false`
- `data_cadastro` - tipo: `timestamp`, valor padrão: `now()`
- `created_at` - tipo: `timestamp`, valor padrão: `now()`

**Clique em:** "Save"

#### Segunda tabela: `consultas`
**Nome da tabela:** `consultas`
**Colunas:**
- `id` - tipo: `int8`, marcar: `Primary Key` e `Identity`
- `paciente_id` - tipo: `int8`, marcar: `Foreign Key` → `pacientes.id`
- `data` - tipo: `date`, marcar: `not null`
- `horario` - tipo: `time`, marcar: `not null`
- `tipo_consulta` - tipo: `text`, marcar: `not null`
- `ja_pagou` - tipo: `boolean`, valor padrão: `false`
- `observacoes` - tipo: `text`
- `data_agendamento` - tipo: `timestamp`, valor padrão: `now()`
- `created_at` - tipo: `timestamp`, valor padrão: `now()`

**Clique em:** "Save"

### 7. Rodar o projeto
```bash
npm run dev
```

**Aguarde aparecer:**
```
✓ Ready in XXXXms
- Local:        http://localhost:3000
```

### 8. Acessar no navegador
**Abra seu navegador e acesse:**
```
http://localhost:3000
```

## ✅ Pronto! Sistema funcionando!

## 🔧 Se der erro - Soluções:

### ❌ Erro: "Node.js version required"
**Solução:**
```bash
node --version
```
**Se versão menor que 18:**
- Baixe e instale Node.js em: https://nodejs.org
- Escolha versão "LTS"
- Reinicie o terminal
- Tente novamente: `npm run dev`

### ❌ Erro: "Cannot find module"
**Solução:**
```bash
npm install
npm run dev
```

### ❌ Erro: "Connection failed"
**Solução:**
1. Verifique se as credenciais estão corretas no `.env.local`
2. Confirme se as tabelas foram criadas no Supabase
3. Verifique se o projeto Supabase está ativo

### ❌ Erro: "Table does not exist"
**Solução:**
1. Volte ao Supabase
2. Confirme se as tabelas `pacientes` e `consultas` foram criadas
3. Verifique se os nomes estão exatamente iguais

## 📱 Como usar o sistema:

1. **Cadastrar Paciente** - Adicione dados completos do paciente
2. **Agendar Consulta** - Marque consultas com data e horário
3. **Consultas de Hoje** - Veja agenda do dia atual
4. **Histórico** - Acompanhe todas as consultas e pagamentos
5. **Buscar Paciente** - Encontre pacientes por nome, telefone ou CPF

## 🌐 Colocar na internet (opcional):

### Vercel (gratuito):
1. Acesse: https://vercel.com
2. Faça login com GitHub
3. Clique em "New Project"
4. Selecione seu repositório `clinica-agenda`
5. Configure as variáveis de ambiente (mesmas do `.env.local`)
6. Clique em "Deploy"

## 📞 Precisa de ajuda?

**Problemas mais comuns:**
- **Node.js não instalado** → Baixe em https://nodejs.org
- **Credenciais erradas** → Verifique o arquivo `.env.local`
- **Tabelas não criadas** → Confirme no Supabase
- **Projeto não roda** → Verifique se está na pasta correta

## 🎯 O que você terá no final:

- ✅ Sistema de agenda completo funcionando
- ✅ Banco de dados na nuvem (acesso de qualquer lugar)
- ✅ Interface otimizada para celular
- ✅ Controle completo de pacientes e consultas
- ✅ Histórico de pagamentos
- ✅ Dados compartilhados entre médico, secretária e você

**Agora você pode usar em qualquer lugar e compartilhar com sua equipe! 🚀**

---

**💡 Dica:** Se der algum erro, copie a mensagem de erro e pesquise no Google. Geralmente alguém já passou pelo mesmo problema!
