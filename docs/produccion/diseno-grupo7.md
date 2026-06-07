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

### b. packages/web/Dockerfile.prod
**Propósito**
Servir el frontend estático (React + Vite) mediante Nginx, optimizando compresión, caché y seguridad.

**Estructura (3 etapas):**

| Etapa | Nombre | Base | Propósito |
|-------|--------|------|-----------|
| 1 | ```deps```| ```node:22-alpine``` | Instalar dependencias (incluyendo las de build) |
| 2 | ```builder```| ```node:22-aplpine``` | Ejecutar ```npm run build -w packages/web``` para generar ```dist/``` |
| 3 | ```runtime``` | ```nginx:stable-alpine``` | Copiar ```dist/``` a ```/usr/share/nginx/html``` y configurar Nginx |

**Requisitos no funcionales**
- Tamaño final < 170 MB (original ~570MB)
- Healthcheck: ```curl -f http://localhost/``` o ```wget --spider```
- Headers de seguridad: ```X-Frame-Options```, ```X-Content-Type-Options```, ```X-XSS-Protection```
- Compresión gzip activada, caché de assets estáticos (1 año)

**Estructura de capas:**
```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY packages/web/package.json ./packages/web/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -w packages/web

FROM nginx:stable-alpine AS runtime
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget --spider -q http://localhost/ || exit 1
```

## c. Docker Compose para producción

Archivo: ```docker-compose.prod.yml```

**Propósito:**
Definir los servicios db, api, web con configuraciones optimizadas para entorno productivo (límites de recursos, healthchecks, redes, logging, seguridad).

Estructura por servicio (tabla de aspectos a configurar):

| Servicio | Resource limits | Healthcheck | Security |
|----------|-----------------|-------------|----------|
| ```db``` | CPU:0.5, Mem:256MB | ```pg_isready``` | No exponer puerto al host |
| ```api``` | CPU:0.5, Mem:512M | endpoint ```/health``` | read_only, cap_dropo ALL, user no-root |
| ```web``` | CPU:0.3, Mem:128M | puerto 80 | read_only, cap_drop ALL excepto NET_BIND_SERVICE |

**Variables sensibles:** todas desde archivo ```.env``` (no harcodeadas). Ejemplo:

```yaml
environment:
  DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
```

**Red personalizada:**
```yaml
networks:
  prod-net:
    driver: bridge
```

**Logging:**
```yaml
x-logging: &default-logging
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

**Security (para ```api```):**
```yaml
read_only: true
cap_drop:
  - ALL
cap_add:
  - NET_BIND_SERVICE   # para bindear puerto 3000
security_opt:
  - no-new-privileges:true
user: "1001:1001"
```

## 2.2 Diseño de la observabilidad

### a. Métricas RED a capturar

| Métrica | Tipo OpenTelemetry | Descripción | Labels |
|---------|--------------------|-------------|--------|
| Rate | Counter | Requests por segundo | ```method```, ```route```, ```status``` |
| Errors | Counter | Tasa de error (4xx, 5xx) | ```method```, ```route```, ```status``` |
| Duration | Histogram | Latencia de requests (ms) | ```method```, ```route``` |
| Memoria | Gauge | ```process.memory.usage``` | - |
| Requests activos | Gauge | ```http.requests.active``` | - |

## b. Configuración del SDK de OpenTelemetry

Archivo: ```packages/api/src/infrastructure/telemetry.ts```

**Estructura**

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const prometheusExporter = new PrometheusExporter({
  port: 9464,
  endpoint: '/metrics',
});

const sdk = new NodeSDK({
  metricReader: prometheusExporter,
  instrumentations: getNodeAutoInstrumentations(),
});

sdk.start();

export function createREDMetrics(meter) {
  return {
    requestCounter: meter.createCounter('http.requests.total'),
    errorCounter: meter.createCounter('http.requests.errors'),
    requestDuration: meter.createHistogram('http.request.duration', { unit: 'ms' }),
    activeRequests: meter.createObservableGauge('http.active.requests'),
  };
}
```

## c. Dashboard RED en Grafana

Paneles requeridos (6 paneles)

| Panel | Métrica PromQL | Tipo de gráfico | Propósito |
|-------|----------------|-----------------|-----------|
| 1. Requests por segundo | ```rate(http_requests_total[1m])``` | Time series | Tráfico actual |
| 2. Tasa de error (%) | ```sum(rate(http_requests_errors_total[1m])) / sum(rate(http_requests_total[1m])) * 100``` | Time series | % de errores |
| 3. Latencia p95/p99 | ```histogram_quantile(0.95, sum(rate(http_request_duration_bucket[5m])) by (le))``` | Time series | Performance |
| 4. Por status code | ```sum by (status) (rate(http_requests_total[5m]))``` | Stacked area | Distribución de respuestas |
| 5. Memoria del proceso | ```process_memory_usage_bytes / 1024 / 1024``` | Time series | Consumo de RAM |
| 6. Endpoints más lentos | ```topk(5, avg by (route) (http_request_duration_ms))``` | Bar chart | Cuellos de botella |
