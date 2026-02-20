FROM node:18-alpine
WORKDIR /app

ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE

COPY package.json package-lock.json* ./
RUN npm ci --production || npm install --production

COPY . .
RUN npm run build

EXPOSE 5173
CMD ["npx", "vite", "preview", "--port", "5173", "--host"]