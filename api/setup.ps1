# PowerShell setup script for Windows

Write-Host "🚀 Iniciando setup da API Zapshow POC Playwright IA..." -ForegroundColor Green
Write-Host ""

# 1. Instalar dependências
Write-Host "📦 Instalando dependências..." -ForegroundColor Cyan
npm install

# 2. Verificar .env
if (-Not (Test-Path .env)) {
    Write-Host "⚙️  Criando arquivo .env..." -ForegroundColor Cyan
    Copy-Item .env.example .env
    Write-Host "✅ Arquivo .env criado. Configure DATABASE_URL se necessário." -ForegroundColor Green
} else {
    Write-Host "✅ Arquivo .env já existe." -ForegroundColor Green
}

# 3. Gerar Prisma Client
Write-Host "🔧 Gerando Prisma Client..." -ForegroundColor Cyan
npm run prisma:generate

Write-Host ""
Write-Host "✨ Setup concluído!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Configure o arquivo .env com suas variáveis de ambiente"
Write-Host "2. Suba o banco de dados: cd .. ; docker-compose up -d db"
Write-Host "3. Rode as migrations: npm run prisma:deploy"
Write-Host "4. Popule o banco: npm run prisma:seed"
Write-Host "5. Inicie o servidor: npm run dev"
Write-Host ""
