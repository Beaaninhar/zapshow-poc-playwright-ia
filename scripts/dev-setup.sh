#!/bin/bash
# Development setup script (ROOT)

echo "Starting dev setup..."

# 1. Start Docker Compose (database only)
echo "Starting PostgreSQL with Docker..."
docker-compose up -d db

# 1b. Ensure api/.env exists
if [ ! -f "api/.env" ] && [ -f "api/.env.example" ]; then
  cp "api/.env.example" "api/.env"
fi

# 2. Wait for database readiness
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Check database health
echo "Checking database health..."
until docker-compose exec -T db pg_isready -U postgres -d appdb > /dev/null 2>&1; do
  echo "   Waiting for database..."
  sleep 2
done

echo "PostgreSQL is ready."

# 2b. Ensure sample Playwright tests exist
sample_spec_path="tests/sample.generated.spec.ts"
if [ ! -f "$sample_spec_path" ]; then
  cat <<'EOF' > "$sample_spec_path"
import { test, expect } from "@playwright/test";

test("sample: app loads", async ({ page }) => {
  await page.goto("http://localhost:5173/");
  await expect(page.locator("body")).toBeVisible();
});
EOF
fi

# Ensure DATABASE_URL is set for Prisma
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/appdb?schema=public"
fi

# 3. Apply schema
if [ -d "api/prisma/migrations" ]; then
  echo "Applying migrations..."
  npm run prisma:deploy
else
  echo "No migrations found. Using prisma db push..."
  npm -w api run prisma:db:push
fi

# 4. Seed database
echo "Seeding database..."
npm run prisma:seed

# 5. Import tests from /tests
echo "Importing tests from /tests..."
npm run prisma:import:tests

echo "Setup complete. Starting servers..."
echo ""
