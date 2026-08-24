FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json api/
COPY backend/package.json backend/
COPY frontend/package.json frontend/

RUN npm ci

COPY api/ api/
COPY backend/ backend/
COPY frontend/ frontend/
COPY tsconfig.base.json ./

ENV VITE_API_URL=""
RUN npm run build

CMD ["node", "backend/dist/server.js"]
