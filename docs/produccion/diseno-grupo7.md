# Fase 2: Especificar y diseñar

## 2.1 Dockerfiles multi-stage

### a. `packages/api/Dockerfile.prod`

**Propósito**:  
Construir una imagen ligera y segura de la API (Node.js + TypeScript) para producción, eliminando herramientas de desarrollo y dependencias innecesarias.

**Estructura (3 etapas)**:

| Etapa | Nombre | Base | Propósito |
|-------|--------|------|-----------|
| 1 | `deps` | `node:22-alpine` | Instalar sólo dependencias de producción (`npm ci --omit=dev`) |
| 2 | `builder` | `node:22-alpine` | Compilar TypeScript a JavaScript, generar `dist/` |
| 3 | `runtime` | `node:22-alpine` | Copiar `dist/` y `node_modules` producción, ejecutar con usuario no-root |

**Requisitos no funcionales**:
- Tamaño final < 300 MB (reducción ≥70% respecto a imagen de desarrollo)
- Tiempo de startup < 3 segundos (cold start)
- Healthcheck: `curl --fail http://localhost:3000/health` (o `wget`)

**Mejoras respecto al Dockerfile actual** (basado en `Dockerfile-api.md`):
- Eliminar `COPY . .` que invalida caché → ordenar capas
- No instalar devDependencies (npm ci --omit=dev)
- No incluir `tsx`, `typescript`, `prisma` en runtime
- Usar usuario `node` (no root)

**Estructura de capas** (en orden ascendente de frecuencia de cambios):
```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --omit=dev

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --config packages/api/prisma.config.ts
RUN npm run build -w packages/api

FROM node:22-alpine AS runtime
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs
COPY --from=builder --chown=nodejs:nodejs /app/packages/api/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/api/prisma ./prisma
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health',(r)=>{process.exit(r.statusCode===200?0:1)})"
CMD ["node", "dist/app.js"]
```