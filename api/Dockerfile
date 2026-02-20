FROM node:18-alpine
WORKDIR /app

# Copiar package files
COPY package.json package-lock.json* ./

# Instalar dependências (incluindo prisma CLI)
RUN npm ci --only=production || npm install --production

# Copiar prisma schema
COPY prisma ./prisma

# Gerar Prisma Client
RUN npx prisma generate

# Copiar código fonte
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 3001

# Rodar migrations e depois startar (migrations automáticas no startup)
CMD sh -c "npx prisma migrate deploy && node dist/index.js"
