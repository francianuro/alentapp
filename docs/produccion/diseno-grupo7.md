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

**Estructura conceptual**

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { metrics } from '@opentelemetry/api';

// SDK con auto-instrumentaciones HTTP y Fastify
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
| 1. Requests por segundo | ```rate(http_server_duration_cound[1m])``` | Time series | Tráfico actual |
| 2. Tasa de error (%) | ```sum(rate(http_server_duration_count{http_status_code=~"[45].."}[1m])) / sum(rate(http_server_duration_count[1m])) * 100``` | Time series | % de errores |
| 3. Latencia p95/p99 | ```histogram_quantile(0.95, sum(rate(http_server_duration_bucket[5m])) by (le))``` | Time series | Performance |
| 4. Por status code | ```sum by (http_status_code) (rate(http_server_duration_count[5m]))``` | Stacked area | Distribución de respuestas |
| 5. Memoria del proceso | ```process_memory_usage_bytes / 1024 / 1024``` | Time series | Consumo de RAM |
| 6. Endpoints más lentos | ```topk(5, avg by (http_route) (rate(http_server_duration_sum[5m]) / rate(http_server_duration_count[5m])))``` | Bar chart | Cuellos de botella |

## Nuevos servicios para docker-compose.prod.yml

Se agregan dos nuevos servicios, para implementar Grafana y Prometheus, parte del stack a utilizar en la implementación de OpenTelemetry.

**Observaciones**
- Se usan tags específicos para las imágenes en lugar de ```latest```.
- ```user:``` se fuerza específicamemte con UID:GID numérico, sin depender del default de la imagen.
- ```cap_drop: ALL``` y ```no-new-privileges``` consistente con el reto del TP.
- ```read_only: true``` en ambos, con ```tmpfs``` en ```/tmp``` para las carpetas donde sí se necesita escribir logs en disco.
- Grafana necesita también ```tmpfs``` en ```/var/log/grafana``` porque con ```read_only``` no puede escribir logs en disco.
- ```GF_ANALYTICS_REPORTING_ENABLED=false```  evita que Grafana haga requests salientes a grafana.com, reduciendo superficie de red.


```yaml
prometheus:
    image: prom/prometheus:v3.4.0
    container_name: alentapp-prometheus
    user: "65534:65534"  # nobody:nobody, usuario por defecto de la imagen
    volumes:
      - ./observability/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    networks:
      - alentapp-network
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    read_only: true
    tmpfs:
      - /tmp
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  grafana:
    image: grafana/grafana-oss:11.6.1
    container_name: alentapp-grafana
    user: "472:472"  # usuario grafana por defecto de la imagen
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_USER}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_ANALYTICS_REPORTING_ENABLED=false
      - GF_ANALYTICS_CHECK_FOR_UPDATES=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./observability/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./observability/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    ports:
      - "3001:3000"
    networks:
      - alentapp-network
    depends_on:
      - prometheus
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    read_only: true
    tmpfs:
      - /tmp
      - /var/log/grafana
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```
