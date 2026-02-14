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

```
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
├── docker-compose.yml       # Local container orchestration
├── playwright.config.ts     # Unified test configuration
├── package.json            # Monorepo configuration (workspaces)
└── README.md
```

---

# 🛠 Tecnologias

### Front-end

- React
- Vite
- Material UI

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

### Setup Inicial

```bash
# Instalar dependências (monorepo workspace)
npm install

# Rodar API + Web simultaneamente
npm run dev
```

**Saídas esperadas:**

- 🔵 API rodando em http://localhost:3001
- 🟢 Web rodando em http://localhost:5173

### Scripts Principais

| Script                     | Descrição                        |
| -------------------------- | -------------------------------- |
| `npm run dev`              | Inicia API + Web em paralelo     |
| `npm run dev:api`          | Inicia apenas a API              |
| `npm run dev:web`          | Inicia apenas o Web              |
| `npx playwright test`      | Executa todos os testes E2E      |
| `npx playwright test --ui` | Abre Playwright UI com os testes |

### API Endpoints

| Método | Endpoint      | Descrição                                       |
| ------ | ------------- | ----------------------------------------------- |
| POST   | `/login`      | Login (email: qa@empresa.com, password: 123456) |
| GET    | `/events`     | Lista eventos                                   |
| POST   | `/events`     | Cria evento (retorna 201)                       |
| POST   | `/test/reset` | Reseta dados (usado nos testes)                 |

---

# 🧪 Testes E2E

Os testes estão organizados em dois grupos:

### Smoke Tests

- **`smoke.login.spec.ts`** — Validação básica do fluxo de login

### Regression Tests

- **`regression.create-event.spec.ts`** — Criação e validação de eventos
- **`regression.validation.spec.ts`** — Validações gerais da aplicação

### Rodando Testes

```bash
# Executar todos os testes (headless) - Relatório em: playwright-report/index.html
npx playwright test

# Abrir Playwright UI (modo interativo)
npx playwright test --ui
```

---
