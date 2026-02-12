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
zapshow-poc-playwright-ia/
│
├── api/ # API mock (Express + TS)
│ └── src/index.ts
│
├── web/ # Front-end (React + Vite + MUI)
│ ├── src/
│ ├── tests/
│ │ ├── helpers/
│ │ │ └── auth.ts
│ │ ├── smoke.login.spec.ts
│ │ ├── regression.create-event.spec.ts
│ │ └── regression.validation.spec.ts
│ └── playwright.config.ts
│
└── README.md


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

## 1️⃣ Subir a API

```bash
cd api
npm install
npm run dev

| Método | Endpoint    | Descrição                                                              |
| ------ | ----------- | ---------------------------------------------------------------------- |
| POST   | /login      | Login (email=[qa@empresa.com](mailto:qa@empresa.com), password=123456) |
| GET    | /events     | Lista eventos                                                          |
| POST   | /events     | Cria evento (retorna 201)                                              |
| POST   | /test/reset | Reseta dados (usado nos testes)                                        |


