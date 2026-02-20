# ZapShow PoC - Plataforma No-Code de Testes

PoC de automação com foco em criação, execução e gestão de testes no-code.

## Stack
- Front-end: React + Vite + Material UI
- API: Node.js + Express + TypeScript
- Runner: Playwright (execução programática pela API)

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

## Como rodar
```bash
npm install
npm run dev
```

Serviços:
- Web: `http://localhost:5173`
- API: `http://localhost:3001`

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
