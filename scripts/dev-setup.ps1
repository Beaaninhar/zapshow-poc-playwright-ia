# PowerShell - Development setup script (ROOT)

Write-Host "Starting dev setup..." -ForegroundColor Green

# 1. Start Docker Compose (database only)
Write-Host "Starting PostgreSQL with Docker..." -ForegroundColor Cyan
docker-compose up -d db

# 1b. Ensure api/.env exists
if (-not (Test-Path "api\.env")) {
    if (Test-Path "api\.env.example") {
        Copy-Item "api\.env.example" "api\.env"
    }
}

# 2. Wait for database readiness
Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check database health
Write-Host "Checking database health..." -ForegroundColor Cyan
$maxAttempts = 30
$attempt = 0
$ready = $false

while (-not $ready -and $attempt -lt $maxAttempts) {
    $attempt++
    try {
        docker-compose exec -T db pg_isready -U postgres -d appdb 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
        } else {
            Write-Host "   Waiting for database... (attempt $attempt of $maxAttempts)" -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    } catch {
        Write-Host "   Waiting for database... (attempt $attempt of $maxAttempts)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if ($ready) {
    Write-Host "PostgreSQL is ready." -ForegroundColor Green
} else {
    Write-Host "Timeout waiting for PostgreSQL. Check Docker." -ForegroundColor Red
    exit 1
}

# 2b. Ensure sample Playwright tests exist
$sampleSpecPath = "tests\sample.generated.spec.ts"
if (-not (Test-Path $sampleSpecPath)) {
    $sampleContent = @'
import { test, expect } from "@playwright/test";

test("sample: app loads", async ({ page }) => {
  await page.goto("http://localhost:5173/");
  await expect(page.locator("body")).toBeVisible();
});
'@

    Set-Content -Path $sampleSpecPath -Value $sampleContent -Encoding UTF8
}

# Ensure DATABASE_URL is set for Prisma
if (-not $env:DATABASE_URL -or $env:DATABASE_URL -eq "") {
    $env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/appdb?schema=public"
}

# 3. Apply schema
if (Test-Path "api\prisma\migrations") {
    Write-Host "Applying migrations..." -ForegroundColor Cyan
    npm run prisma:deploy

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to apply migrations." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "No migrations found. Using prisma db push..." -ForegroundColor Yellow
    npm -w api run prisma:db:push

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to push schema." -ForegroundColor Red
        exit 1
    }
}

# 4. Seed database
Write-Host "Seeding database..." -ForegroundColor Cyan
npm run prisma:seed

if ($LASTEXITCODE -ne 0) {
    Write-Host "Seed failed (maybe data already exists). Continuing..." -ForegroundColor Yellow
}

# 5. Import tests from /tests
Write-Host "Importing tests from /tests..." -ForegroundColor Cyan
npm run prisma:import:tests

Write-Host ""
Write-Host "Setup complete. Starting servers..." -ForegroundColor Green
Write-Host ""
