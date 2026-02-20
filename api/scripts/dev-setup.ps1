# PowerShell - Script de setup automático para desenvolvimento

Write-Host "🚀 Iniciando setup de desenvolvimento..." -ForegroundColor Green

# 1. Subir Docker Compose (apenas o banco)
Write-Host "🐳 Subindo PostgreSQL com Docker..." -ForegroundColor Cyan
Set-Location ..
docker-compose up -d db

# 2. Aguardar o banco ficar pronto
Write-Host "⏳ Aguardando PostgreSQL ficar pronto..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verificar se o banco está pronto (healthcheck)
Write-Host "🔍 Verificando saúde do banco de dados..." -ForegroundColor Cyan
$maxAttempts = 30
$attempt = 0
$ready = $false

while (-not $ready -and $attempt -lt $maxAttempts) {
    $attempt++
    try {
        $result = docker-compose exec -T db pg_isready -U postgres -d appdb 2>$null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
        } else {
            Write-Host "   Aguardando conexão... (tentativa $attempt/$maxAttempts)" -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    } catch {
        Write-Host "   Aguardando conexão... (tentativa $attempt/$maxAttempts)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if ($ready) {
    Write-Host "✅ PostgreSQL está pronto!" -ForegroundColor Green
} else {
    Write-Host "❌ Timeout aguardando PostgreSQL. Verifique o Docker." -ForegroundColor Red
    Set-Location api
    exit 1
}

# 3. Voltar para o diretório da API
Set-Location api

# 4. Rodar migrations
Write-Host "📦 Aplicando migrations..." -ForegroundColor Cyan
npm run prisma:deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao aplicar migrations" -ForegroundColor Red
    exit 1
}

# 5. Rodar seed
Write-Host "🌱 Populando banco de dados..." -ForegroundColor Cyan
npm run prisma:seed

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Aviso: Seed falhou (pode já ter dados). Continuando..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✨ Setup completo! Iniciando servidor..." -ForegroundColor Green
Write-Host ""
