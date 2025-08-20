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

### 7. Configurar Políticas de Segurança
- Vá em **Authentication** → **Policies**
- Para cada tabela, adicione política:
  - **Policy Name**: `Enable all access`
  - **Target roles**: `authenticated`
  - **Policy definition**: `true`

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
