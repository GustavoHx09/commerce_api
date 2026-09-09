# Imagem de produção para a API do Commerce.
# O frontend é implantado separadamente na Vercel.
FROM node:22-alpine

WORKDIR /app

# Copia os manifests do monorepo e do workspace da API.
COPY package*.json ./
COPY packages/api/package*.json ./packages/api/

# Instala apenas as dependências de produção da API.
RUN npm ci -w api --omit=dev

# Copia o código-fonte da API.
COPY packages/api/src ./packages/api/src

WORKDIR /app/packages/api

EXPOSE 3001

CMD ["node", "src/server.js"]
