#!/bin/bash
# Script de setup automático para desenvolvimento

echo "🚀 Iniciando setup de desenvolvimento..."

# 1. Subir Docker Compose (apenas o banco)
echo "🐳 Subindo PostgreSQL com Docker..."
cd ..
docker-compose up -d db

# 2. Aguardar o banco ficar pronto
echo "⏳ Aguardando PostgreSQL ficar pronto..."
sleep 5

# Verificar se o banco está pronto (healthcheck)
echo "🔍 Verificando saúde do banco de dados..."
until docker-compose exec -T db pg_isready -U postgres -d appdb > /dev/null 2>&1; do
  echo "   Aguardando conexão..."
  sleep 2
done

echo "✅ PostgreSQL está pronto!"

# 3. Voltar para o diretório da API
cd api

# 4. Rodar migrations
echo "📦 Aplicando migrations..."
npm run prisma:deploy

# 5. Rodar seed
echo "🌱 Populando banco de dados..."
npm run prisma:seed

echo "✨ Setup completo! Iniciando servidor..."
echo ""
