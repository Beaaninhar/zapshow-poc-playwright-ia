# 🚀 ZapShow PoC – Playwright + IA

Proof of Concept (PoC) de automação E2E utilizando **Playwright (TypeScript)** em um mini-projeto com arquitetura semelhante ao ZapShow:

- Front-end: **React + Vite + Material UI**
- API mock: **Node.js + Express + TypeScript**
- Testes E2E: **Playwright**
- Objetivo estratégico: Demonstrar como automação + IA (Copilot/OpenAI) aceleram desenvolvimento e validação de front-end.

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

```text
zapshow-poc-playwright-ia/
├── api/                    # Mock API (Express + TypeScript)
│  ├── Dockerfile
│  ├── package.json
│  └── src/
│
├── web/                    # Front-end (React + Vite + MUI)
│  ├── Dockerfile
│  ├── package.json
│  └── src/
│
├── tests/                  # E2E Tests (Playwright)
│  ├── helpers/
│  │  └── auth.ts
│  ├── smoke.login.spec.ts
│  ├── regression.create-event.spec.ts
│  ├── regression.validation.spec.ts
│  └── constants.ts
│
├── docker-compose.yml      # Local container orchestration
├── playwright.config.ts    # Unified test configuration
├── package.json            # Monorepo configuration (workspaces)
└── README.md
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

### Back-end (Mock)

- Node.js
- Express
- TypeScript

### Testes

- Playwright
- TypeScript

---

# 📦 Pré-requisitos

- Node.js **18.19+** (recomendado Node 20)
- npm

---

# ▶️ Como Rodar o Projeto

### Setup inicial

```bash
# Instalar dependências (monorepo workspace)
npm install

# Rodar API + Web simultaneamente
npm run dev
```

**Saídas esperadas:**

- 🔵 API rodando em http://localhost:3001
- 🟢 Web rodando em http://localhost:5173

### Scripts principais

| Script                     | Descrição                        |
| -------------------------- | -------------------------------- |
| `npm run dev`              | Inicia API + Web em paralelo     |
| `npm run dev:api`          | Inicia apenas a API              |
| `npm run dev:web`          | Inicia apenas o Web              |
| `npx playwright test`      | Executa todos os testes E2E      |
| `npx playwright test --ui` | Abre Playwright UI com os testes |

---

# 🔐 Usuários padrão para login

| Perfil | Nome | Email                | Senha    |
| ------ | ---- | -------------------- | -------- |
| MASTER | Ana  | `qa_ana@empresa.com` | `123456` |
| MASTER | João | `qa_joao@empresa.com`| `123456` |

> Você também pode criar novos usuários pela tela de registro (`/register`) ou, como MASTER, pelo módulo `/users`.

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
