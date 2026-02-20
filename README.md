# ZapShow PoC - Plataforma No-Code de Testes

PoC de automação com foco em criação, execução e gestão de testes no-code.

- Front-end: **React + Vite + Material UI**
- API: **Node.js + Express + TypeScript + Prisma + PostgreSQL**
- Testes E2E: **Playwright**
- Objetivo estratégico: Demonstrar como automação + IA (Copilot/OpenAI) aceleram desenvolvimento e validação de front-end.

---

## ⚡ Quick Start - Setup em 2 Comandos

### Requisitos
- Node.js 18+
- Docker Desktop rodando

### Setup Automatizado

```bash
# 1. Instalar dependências (já gera Prisma Client)
cd api
npm install

# 2. Rodar tudo (Docker + Migrations + Seed + Servidor)
npm run dev
```

**Pronto!** A API estará em `http://localhost:3001`

📘 **Guia detalhado:** [QUICKSTART.md](QUICKSTART.md) | [AUTOMACAO.md](AUTOMACAO.md)

**Credenciais padrão:**
- Master: `admin@zapshow.com` / `admin123`
- User: `user@zapshow.com` / `user123`

---

# 🎯 Objetivo do Projeto

Este projeto foi criado para:

- Validar a viabilidade do **Playwright como ferramenta E2E**
- Demonstrar ganho de produtividade usando **IA para gerar e estruturar testes**
- Estruturar testes em modelo profissional (Smoke / Regression)
- Preparar base para futura integração com CI/CD

---

# 🏗 Arquitetura

**Monorepo com npm workspaces:**

## Estrutura
```text
zapshow-poc-playwright-ia/
|- api/
|- web/
|- .tmp/
|- docker-compose.yml
|- package.json
`- README.md
```

---

# 🧩 Funcionalidades Implementadas

## Autenticação

- Tela de **login** com validação de formulário
- **Persistência de sessão** no `localStorage`
- **Logout** com limpeza de sessão
- Bloqueio de rotas para usuários não autenticados

## Cadastro e perfil de usuário

- Tela pública de **registro** (`/register`) para criação de conta `USER`
- Login retorna contexto de usuário com `id`, `name`, `email` e `role`

## Controle de acesso por perfil (RBAC)

- Perfis disponíveis: `MASTER` e `USER`
- Apenas `MASTER` acessa o módulo de **gestão de usuários** (`/users`)
- Usuário `USER` é redirecionado para `/events` ao tentar acessar `/users`

## Gestão de usuários (somente MASTER)

- Listagem de usuários com quantidade de eventos criados
- Criação de usuário com papel (`USER` ou `MASTER`)
- Edição de usuário
- Exclusão de usuário `USER`
- Regra de proteção: usuário `MASTER` não pode ser removido

## Gestão de eventos

- Listagem de eventos
- Criação de evento com validações obrigatórias
- Visibilidade por perfil:
  - `MASTER` visualiza todos os eventos
  - `USER` visualiza apenas os próprios eventos

---

# 🛠 Tecnologias

### Front-end
- React
- Vite
- Material UI
- React Router
- React Hook Form + Zod

### Back-end
- Node.js + Express + TypeScript
- **Prisma ORM**
- **PostgreSQL** (via Docker)
- Repository Pattern
- Async/await em todas as rotas

### Testes
- Playwright
- TypeScript

### DevOps
- Docker & Docker Compose
- Scripts automatizados de setup
- Migrations versionadas (Prisma)

---

# 📦 Pré-requisitos

- Node.js **18+** (recomendado Node 20)
- **Docker Desktop** (para PostgreSQL)
- npm

---

# ▶️ Como Rodar o Projeto

## 🚀 Opção 1: Desenvolvimento Automatizado (Recomendado)

### API com automação completa

```bash
# 1. Instalar dependências
cd api
npm install  # Já gera Prisma Client automaticamente

# 2. Rodar tudo (Docker + DB + Migrations + Seed + Servidor)
npm run dev  # Faz tudo automaticamente!
```

**O `npm run dev` faz:**
1. ✅ Sobe PostgreSQL com Docker
2. ✅ Aguarda banco ficar pronto
3. ✅ Aplica migrations
4. ✅ Popula banco (seed)
5. ✅ Inicia servidor em watch mode

### Web (front-end)

```bash
# Em outro terminal
cd web
npm install
npm run dev
```

**Saídas esperadas:**
- 🔵 API rodando em http://localhost:3001
- 🟢 Web rodando em http://localhost:5173
- 🗄️ PostgreSQL em localhost:5432

## 🐳 Opção 2: Docker Compose Completo

```bash
# Na raiz do projeto
docker-compose up -d

# Acesse:
# API: http://localhost:3001
# Web: http://localhost:5173
```

## 🔧 Opção 3: Setup Manual

### Setup inicial (raiz do projeto)

```bash
# Instalar dependências do monorepo
npm install
```

### API

```bash
cd api
npm install

# Subir apenas PostgreSQL
cd ..
docker-compose up -d db

# Aplicar migrations
cd api
npm run prisma:deploy

# Popular banco
npm run prisma:seed

# Iniciar servidor
npm run dev:server
```

### Web

```bash
cd web
npm install
npm run dev
```

---

### Scripts principais

| Script                     | Descrição                                 |
| -------------------------- | ----------------------------------------- |
| `npm run dev` *(raiz)*     | Inicia API + Web em paralelo (legacy)     |
| `cd api && npm run dev`    | **Setup automático + API** ⚡             |
| `cd web && npm run dev`    | Inicia apenas o Web                       |
| `npm run dev:api` *(raiz)* | Inicia apenas a API (sem automação)       |
| `npm run dev:web` *(raiz)* | Inicia apenas o Web                       |
| `npx playwright test`      | Executa todos os testes E2E               |
| `npx playwright test --ui` | Abre Playwright UI com os testes          |

---

# 🔐 Usuários padrão (Seed)

| Perfil | Email                    | Senha      |
| ------ | ------------------------ | ---------- |
| MASTER | `admin@zapshow.com`      | `admin123` |
| USER   | `user@zapshow.com`       | `user123`  |

**Legado (ainda funciona):**

| Perfil | Nome | Email                   | Senha    |
| ------ | ---- | ----------------------- | -------- |
| MASTER | Ana  | `qa_ana@empresa.com`    | `123456` |
| MASTER | João | `qa_joao@empresa.com`   | `123456` |

> Você pode criar novos usuários pela tela de registro (`/register`) ou, como MASTER, pelo módulo `/users`.

---

# 🌐 API Endpoints

## Gerais

| Método | Endpoint | Descrição |
| ------ | -------- | --------- |
| GET    | `/health` | Health check |
| POST   | `/login`  | Login (retorna usuário autenticado) |
| POST   | `/test/reset` | Reseta dados mock (usado em testes) |

## Usuários

| Método | Endpoint | Descrição |
| ------ | -------- | --------- |
| POST   | `/users` | Cria usuário |
| GET    | `/users` | Lista usuários (**requer header `x-user-role: MASTER`**) |
| PUT    | `/users/:id` | Atualiza usuário (**requer MASTER**) |
| DELETE | `/users/:id` | Remove usuário (**requer MASTER** e não permite remover MASTER) |

## Eventos

| Método | Endpoint | Descrição |
| ------ | -------- | --------- |
| GET    | `/events` | Lista eventos (filtrados por perfil) |
| POST   | `/events` | Cria evento |

### Headers esperados para contexto autenticado

A API mock utiliza headers para simular autenticação/autorização nos endpoints protegidos:

- `x-user-id`
- `x-user-name`
- `x-user-role` (`MASTER` ou `USER`)

---

# 🧪 Testes E2E

Os testes estão organizados em dois grupos:

### Smoke tests

- **`smoke.login.spec.ts`** — Validação básica do fluxo de login

### Regression tests

- **`regression.create-event.spec.ts`** — Criação e validação de eventos
- **`regression.validation.spec.ts`** — Validações gerais de login e formulário de eventos

### Rodando testes

```bash
# Executar todos os testes (headless) - relatório em: playwright-report/index.html
npx playwright test

# Abrir Playwright UI (modo interativo)
npx playwright test --ui
```

Por padrão, a suíte está configurada para gravar **vídeo em todos os testes** para exibição no relatório HTML do Playwright.

## Fluxo no-code
1. Acesse a tela de testes no app.
2. Crie testes manualmente (editor no-code) ou gere via Jobs.
3. Execute testes individuais ou em lote.
4. Veja relatórios na própria plataforma.

## Diretórios de runtime
Arquivos temporários gerados em execução ficam em:
- `.tmp/no-code-tests/specs`
- `.tmp/no-code-tests/runs`
- `.tmp/no-code-tests/artifacts`

## Endpoints principais
- `POST /runs` - Executa um teste
- `POST /runs/batch` - Executa lote de testes
- `POST /tests/:testId/versions` - Salva versão de teste
- `POST /tests/:testId/publish` - Publica spec gerada
- `GET /tests/spec-files` - Lista specs geradas
- `GET /artifacts?path=...` - Serve artefatos permitidos

## Scripts úteis
- `npm run dev`
- `npm run dev:api`
- `npm run dev:web`
- `npm run build`
- `npm run test`
