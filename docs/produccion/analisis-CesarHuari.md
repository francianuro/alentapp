# Fase 1 — Análizar y proponer

## 1.1. Análisis de la infraestructura Docker actual

### Tabla completa de problemas, impacto y solución propuesta
| # | Problema | ¿Dónde ocurre? | Impacto (A/M/B) | Solución propuesta  |
|---|----------|----------------|-----------------|---------------------------------------------------|
| 1 | Falta de límites de logs y rotación | `docker-compose.yml`: ningún servicio define `logging:` | **M** (Medio) | Agregar configuración de logging con rotación: `driver: "json-file"`, `max-size: "10m"`, `max-file: "3"` para evitar llenar el disco (ver sección 4 del documento). |
| 2 | Uso de volúmenes anónimos para `node_modules` (sin nombre, sin control) | `docker-compose.yml`: líneas 19, 20, 42, 43, 44 | **M** (Medio) | En desarrollo está bien, pero en producción no se deben montar volúmenes de `node_modules`. Para desarrollo, usar volúmenes nombrados o eliminarlos con `docker compose down -v` periódicamente. |
| 3 | El servicio `web` expone el puerto `5173` pero el comando usa `--host 0.0.0.0`, sin healthcheck ni límites | `docker-compose.yml`: líneas 45-49 | **M** (Medio) | Agregar healthcheck (verificar puerto 5173), límites de recursos, y en producción usar un servidor estático (ej. `serve` o nginx) en lugar de `vite dev`. |
| 4 | Dockerfile-api copia todo el contexto después de `npm install`, invalidando la caché de capas | `Dockerfile-api.md`: línea 14 (`COPY . .`) | **M** (Medio) | Reordenar capas: copiar solo archivos necesarios (`packages/api/src`, `packages/shared`, `prisma`) antes de `npm run build`. Usar `.dockerignore`. |
| 5 | Dockerfile-web no instala dependencias de `shared` (monorepo roto) | `Dockerfile-web.md`: solo copia `packages/web/package*.json`, falta `packages/shared` | **A** (Alto) | Copiar también `packages/shared/package.json` y ejecutar `npm install` desde la raíz, igual que en el Dockerfile de API. El build fallará si `web` depende de `shared`. |


## 1.2.OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

OpenTelemetry, también llamado OTel, es un framework open source y vendor-neutral para instrumentar, generar, recolectar y exportar telemetría de aplicaciones: trazas, métricas y logs. Su objetivo es estandarizar la forma en que las aplicaciones producen datos de observabilidad sin quedar atadas a un proveedor específico.

Prometheus, en cambio, es principalmente un sistema de monitoreo y base de datos de series temporales orientado a métricas. Prometheus recolecta, almacena y permite consultar métricas con PromQL.

| Aspecto | OpenTelemetry | Prometheus |
|---|---|---|
| Rol principal | Instrumentar, recolectar y exportar telemetría | Recolectar, almacenar, consultar y alertar sobre métricas |
| Señales | Trazas, métricas, logs y más | Métricas |
| Almacenamiento | No es backend principal de almacenamiento | Sí almacena series temporales |
| Consulta | No reemplaza PromQL | Usa PromQL |
| Visualización | Se integra con backends como Grafana | Se integra con Grafana para dashboards |
| Enfoque | Estándar de instrumentación y transporte | Sistema de monitoreo de métricas |

### los 3 pilares de la observabilidad y Cuál aborda OpenTelemetry

Los tres pilares son:

| Pilar | Qué representa | Ejemplo |
|---|---|---|
| Métricas | Mediciones numéricas en el tiempo | Requests por segundo, memoria, CPU, latencia |
| Logs | Eventos registrados por la aplicación | Errores, warnings, operaciones relevantes |
| Trazas | Recorrido de una solicitud por servicios | API → servicio → base de datos |


### Métricas RED: Rate, Errors, Duration

El método RED se usa para monitorear servicios, especialmente APIs y microservicios. Propone medir tres aspectos de cada servicio:

| Métrica | Qué mide | Para qué sirve | Ejemplo en Alentapp |
|---|---|---|---|
| Rate | Cantidad de requests por segundo | Conocer tráfico y carga del sistema | Requests a `/api/v1/socios` por segundo |
| Errors | Cantidad o porcentaje de requests fallidos | Detectar fallas funcionales o técnicas | Respuestas 4xx/5xx por endpoint |
| Duration | Tiempo que tarda cada request | Medir latencia y experiencia del usuario | p95/p99 de `/api/v1/lockers` |

Aplicación práctica:

- Si sube `Rate`, hay más demanda.
- Si sube `Errors`, el servicio está fallando.
- Si sube `Duration`, el servicio está lento aunque siga respondiendo.

### ¿Qué es OTLP y Qué ventaja tiene frente a exportar directamente a Prometheus?

OTLP significa OpenTelemetry Protocol. Es el protocolo estándar de OpenTelemetry para transportar datos de telemetría entre aplicaciones, collectors y backends.

Ventajas de OTLP frente a exportar directamente a Prometheus:

| Exportar directo a Prometheus | Exportar por OTLP |
|---|---|
| Enfocado principalmente en métricas | Transporta métricas, trazas y logs |
| La aplicación queda más acoplada a Prometheus | La aplicación queda desacoplada del backend |
| Menos flexible si cambia el backend | Permite enviar a Grafana, Tempo, Loki, Prometheus, Jaeger, etc. |
| Menos procesamiento intermedio | Un Collector puede filtrar, transformar, agregar, hacer batching y retry |
| Útil para setups simples | Mejor para producción y arquitecturas evolutivas |


### ¿Cómo se relaciona OpenTelemetry con Grafana?

Grafana es la capa de visualización y análisis. OpenTelemetry genera y exporta la telemetría; Grafana la consume desde backends compatibles.

Arquitectura posible:

```text
Aplicación Node.js / Fastify
        ↓
OpenTelemetry SDK
        ↓
OTLP o Prometheus exporter
        ↓
Prometheus / Grafana Alloy / OpenTelemetry Collector
        ↓
Grafana dashboards
```

En este proyecto, la relación esperada sería:

1. La API Node.js se instrumenta con OpenTelemetry.
2. Se generan métricas RED.
3. Se exponen métricas en `/metrics` o se envían por OTLP.
4. Prometheus scrapea las métricas.
5. Grafana usa Prometheus como datasource.
6. Grafana muestra el dashboard `RED — Alentapp API` con paneles de tráfico, errores, latencia, memoria y endpoints lentos.
