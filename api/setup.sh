#!/bin/bash

echo "🚀 Iniciando setup da API Zapshow POC Playwright IA..."
echo ""

# 1. Instalar dependências
echo "📦 Instalando dependências..."
npm install

# 2. Verificar .env
if [ ! -f .env ]; then
    echo "⚙️  Criando arquivo .env..."
    cp .env.example .env
    echo "✅ Arquivo .env criado. Configure DATABASE_URL se necessário."
else
    echo "✅ Arquivo .env já existe."
fi

# 3. Gerar Prisma Client
echo "🔧 Gerando Prisma Client..."
npm run prisma:generate

echo ""
echo "✨ Setup concluído!"
echo ""
echo "📝 Próximos passos:"
echo "1. Configure o arquivo .env com suas variáveis de ambiente"
echo "2. Suba o banco de dados: cd .. && docker-compose up -d db"
echo "3. Rode as migrations: npm run prisma:deploy"
echo "4. Popule o banco: npm run prisma:seed"
echo "5. Inicie o servidor: npm run dev"
echo ""
