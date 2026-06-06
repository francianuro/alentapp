# Fase 1: Analizar y proponer

## 1.1 Análisis de la infraestructura Docker actual

| #  | Problema                                                 | ¿Dónde ocurre?                                                                                                                                                                                                                                                       | Impacto (A/M/B) | Solución propuesta                                                                                                                                                                                                                                                                                                                                   |
| -- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6  | Uso de versiones `latest` o implícitas en imágenes base  | `docker-compose.yml`: la imagen de PostgreSQL está correctamente fijada como `postgres:16-alpine`. El problema aparece principalmente en `packages/api/Dockerfile` y `packages/web/Dockerfile`, donde la imagen base de Node no queda fijada con una versión exacta. | **M** (Medio)   | Fijar versiones explícitas y reproducibles en todos los Dockerfiles. Por ejemplo, usar `node:20.18.0-alpine` o declarar `ARG NODE_VERSION=20.18.0-alpine` y luego `FROM node:${NODE_VERSION}`. Además, documentar en `.env.example` las variables esperadas con valores por defecto comentados, evitando depender de valores implícitos del entorno. |
| 7  | Falta de archivo `.dockerignore`                         | No se observa un `.dockerignore` completo en la raíz del proyecto. Al construir las imágenes, Docker puede enviar al contexto archivos innecesarios como `node_modules`, `.git`, `dist`, logs o archivos `.env`.                                                     | **M** (Medio)   | Crear un `.dockerignore` en la raíz del repositorio. Esto reduce el tamaño del contexto de build, evita copiar archivos sensibles y mejora el uso de caché de capas. Debe excluir, como mínimo, `node_modules`, `.git`, `dist`, `build`, `coverage`, `.env`, logs y archivos temporales.                                                             |
| 8  | Ausencia de política de reinicio para servicios críticos | `docker-compose.yml`: los servicios `db`, `api`, `web` y cualquier servicio de observabilidad no definen la propiedad `restart:`.                                                                                                                                    | **M** (Medio)   | Agregar `restart: unless-stopped` en los servicios críticos. Esto permite que Docker intente recuperar automáticamente un contenedor si se detiene por un fallo inesperado, sin impedir que el operador pueda frenarlo manualmente cuando sea necesario.                                                                                             |
| 9  | No se define una red personalizada                       | `docker-compose.yml`: no aparece una sección `networks:` ni se asignan los servicios a una red explícita. Por defecto, Compose crea una red, pero queda menos documentada y menos controlada.                                                                        | **B** (Bajo)    | Definir una red bridge propia, por ejemplo `taller-net`, y conectar allí los servicios internos. Esto mejora el aislamiento, deja la arquitectura más explícita y evita confusiones con otros contenedores o redes del host.                                                                                                                         |
| 10 | Exposición innecesaria del puerto de PostgreSQL al host  | `docker-compose.yml`: exposición de `5432:5432` para el servicio `db`.                                                                                                                                                                                               | **B** (Bajo)    | En producción, no publicar el puerto de PostgreSQL hacia el host. La API puede conectarse a la base usando el nombre del servicio `db` dentro de la red interna. Para desarrollo local puede mantenerse en un compose de desarrollo u override, pero no en el compose productivo.                                                                    |

### Complemento técnico de las soluciones propuestas

#### Versiones explícitas de imágenes

En lugar de usar imágenes con tags genéricos o implícitos, conviene fijar una versión concreta. Esto hace que el build sea más predecible y evita que una actualización automática de la imagen base cambie el comportamiento del sistema sin pasar por revisión.

Ejemplo para los Dockerfiles de Node:

```Dockerfile
ARG NODE_VERSION=20.18.0-alpine
FROM node:${NODE_VERSION}
```

#### Archivo `.dockerignore` sugerido

```dockerignore
node_modules
**/node_modules

.git
.gitignore

dist
build
coverage
.vite

.env
.env.*
!.env.example

logs
*.log
npm-debug.log*
.DS_Store
Thumbs.db

Dockerfile.local
docker-compose.override.yml
```

#### Variables esperadas en `.env.example`

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=alentapp
DATABASE_URL=postgresql://postgres:postgres@db:5432/alentapp

PORT=3000
NODE_ENV=production

VITE_API_URL=http://localhost:3000

OTEL_SERVICE_NAME=alentapp-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

#### Política de reinicio

```yaml
services:
  db:
    restart: unless-stopped

  api:
    restart: unless-stopped

  web:
    restart: unless-stopped

  otel-collector:
    restart: unless-stopped
```

#### Red interna personalizada

```yaml
services:
  db:
    networks:
      - taller-net

  api:
    networks:
      - taller-net

  web:
    networks:
      - taller-net

networks:
  taller-net:
    driver: bridge
```

#### Puerto de PostgreSQL solo para desarrollo

En desarrollo puede ser útil exponer PostgreSQL para conectarse desde herramientas como DBeaver, DataGrip o Prisma Studio:

```yaml
ports:
  - "5432:5432"
```

Pero en producción conviene eliminar esa publicación:

```yaml
# Sin ports en db para producción.
# La API se conecta internamente usando el hostname "db".
```

De esta forma, la base de datos queda accesible para los servicios internos, pero no queda abierta directamente desde el host.

---

## 1.2 OpenTelemetry

### 1.2.1 ¿Qué es OpenTelemetry y en qué se diferencia de Prometheus?

OpenTelemetry, también conocido como OTel, es un conjunto de especificaciones, APIs, SDKs y herramientas para generar, recolectar y exportar telemetría de una aplicación. Esa telemetría puede incluir métricas, trazas y logs. Su objetivo principal no es reemplazar a una base de datos de métricas, sino estandarizar la forma en que las aplicaciones producen y envían información de observabilidad.

Prometheus, en cambio, cumple otro rol dentro del stack: se enfoca principalmente en recolectar, almacenar y consultar métricas de series temporales. Prometheus suele obtener datos mediante un modelo pull, es decir, scrapeando endpoints HTTP expuestos por los servicios.

Una forma simple de verlo es la siguiente:

```text
Aplicación Node/Fastify
        │
        │ genera métricas, logs y trazas
        ▼
OpenTelemetry SDK
        │
        │ exporta datos estandarizados
        ▼
OpenTelemetry Collector
        │
        ├──► Prometheus / Mimir  → métricas
        ├──► Loki                → logs
        └──► Tempo               → trazas
```

| Aspecto            | OpenTelemetry                                            | Prometheus                                        |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------- |
| Rol principal      | Instrumentación, recolección y exportación de telemetría | Almacenamiento, consulta y alertas sobre métricas |
| Tipo de datos      | Métricas, logs y trazas                                  | Métricas                                          |
| Acoplamiento       | Neutral frente al proveedor                              | Backend específico de métricas                    |
| Protocolo típico   | OTLP por HTTP o gRPC                                     | Scrape HTTP en formato Prometheus/OpenMetrics     |
| Uso en el proyecto | Instrumentar la API y enviar datos de observabilidad     | Consultar métricas y alimentar dashboards         |

La diferencia central es que OpenTelemetry está más cerca de la aplicación y de la instrumentación, mientras que Prometheus está más cerca del almacenamiento y consulta de métricas.

### 1.2.2 Los tres pilares de la observabilidad y qué aborda OpenTelemetry

Los tres pilares clásicos de la observabilidad son:

* **Métricas:** valores numéricos medidos en el tiempo. Permiten responder preguntas como cuántas requests recibe la API, cuántas fallan o cuánto tarda en responder.
* **Logs:** eventos discretos emitidos por la aplicación. Ayudan a entender qué ocurrió en un momento puntual, por ejemplo un error de validación o una excepción inesperada.
* **Trazas:** representan el recorrido de una request a través del sistema. Son útiles cuando una operación pasa por varios servicios o capas y se necesita identificar dónde se produjo la demora o el fallo.

OpenTelemetry aborda los tres pilares, aunque en esta actividad el foco principal está puesto en las métricas de la API. La ventaja de usar OTel es que permite instrumentar de manera consistente y dejar preparada la arquitectura para crecer luego hacia logs y trazas correlacionadas.

```text
                  ┌────────────────────┐
                  │      Alentapp      │
                  │  API Node/Fastify  │
                  └─────────┬──────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
          Métricas        Logs         Trazas
          tráfico       eventos      recorrido
          errores       errores      latencias
          latencia      contexto     spans
              │             │             │
              └─────────────┴─────────────┘
                            ▼
                OpenTelemetry Collector
```

Para la primera implementación, lo más importante es capturar métricas RED, porque permiten evaluar rápidamente la salud de la API desde el punto de vista del usuario.

### 1.2.3 Métricas RED: Rate, Errors, Duration

RED es un enfoque de monitoreo pensado para servicios que atienden requests. Se concentra en tres señales simples pero muy útiles:

| Métrica RED  | Qué mide                                   | Para qué sirve                                                           | Ejemplo en Alentapp                                              |
| ------------ | ------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| **Rate**     | Cantidad de requests por segundo           | Permite ver el nivel de tráfico y detectar picos o caídas de uso         | Requests a `/api/v1/socios`, `/api/v1/deportes`, `/api/v1/pagos` |
| **Errors**   | Cantidad o porcentaje de requests fallidas | Permite detectar problemas funcionales o técnicos que afectan al usuario | Respuestas 4xx por validaciones o 5xx por errores internos       |
| **Duration** | Tiempo que tarda una request en responder  | Permite analizar latencia y encontrar endpoints lentos                   | Tiempo de respuesta al listar socios o crear pagos               |

En OpenTelemetry podrían modelarse así:

| Métrica                       | Tipo OpenTelemetry               | Atributos sugeridos              |
| ----------------------------- | -------------------------------- | -------------------------------- |
| `http.server.requests.total`  | Counter                          | `method`, `route`, `status_code` |
| `http.server.errors.total`    | Counter                          | `method`, `route`, `status_code` |
| `http.server.duration`        | Histogram                        | `method`, `route`                |
| `http.server.active_requests` | UpDownCounter o Gauge observable | `route`                          |
| `process.memory.usage`        | Observable Gauge                 | `service.name`                   |

Con estas métricas se puede armar un dashboard que muestre tráfico, errores, latencia p95/p99, distribución por código HTTP, memoria y endpoints más lentos.

### 1.2.4 ¿Qué es OTLP y qué ventaja tiene frente a exportar directamente a Prometheus?

OTLP significa OpenTelemetry Protocol. Es el protocolo estándar de OpenTelemetry para transportar telemetría desde una aplicación hacia un collector o backend compatible. Puede utilizar HTTP o gRPC y sirve para enviar métricas, logs y trazas con un formato común.

La ventaja de usar OTLP en lugar de exportar directamente a Prometheus es que se reduce el acoplamiento. Si la API envía telemetría a un OpenTelemetry Collector, el Collector puede decidir luego a dónde reenviar esos datos: Prometheus, Grafana Cloud, Mimir, Tempo, Loki u otro backend.

```text
Sin Collector:
API ─────────────► Prometheus

Con OTLP + Collector:
API ──OTLP───────► OTel Collector ──► Prometheus
                                  ├─► Tempo
                                  └─► Loki
```

Esto permite cambiar o ampliar el stack de observabilidad sin modificar la instrumentación de la aplicación. Además, el Collector puede procesar los datos antes de exportarlos: agregar atributos, filtrar información, normalizar nombres, agrupar señales o enviar la misma telemetría a más de un destino.

En el contexto de Alentapp, OTLP es conveniente porque permite que la API se concentre en generar telemetría y que la infraestructura decida cómo almacenarla y visualizarla.

### 1.2.5 Relación entre OpenTelemetry y Grafana

Grafana es la herramienta de visualización. No reemplaza a OpenTelemetry ni a Prometheus: consume datos desde distintos datasources y permite construir dashboards, alertas y paneles para interpretar el estado del sistema.

La relación entre las herramientas podría quedar así:

```text
┌──────────────────────┐
│ API Alentapp          │
│ Instrumentada con OTel│
└───────────┬──────────┘
            │ OTLP
            ▼
┌──────────────────────┐
│ OpenTelemetry        │
│ Collector            │
└───────────┬──────────┘
            │ métricas
            ▼
┌──────────────────────┐
│ Prometheus / Mimir   │
│ almacenamiento       │
└───────────┬──────────┘
            │ datasource
            ▼
┌──────────────────────┐
│ Grafana              │
│ dashboards RED       │
└──────────────────────┘
```

En una implementación productiva, Grafana podría mostrar al menos estos paneles:

| Panel                 | Consulta o métrica base                | Objetivo                                   |
| --------------------- | -------------------------------------- | ------------------------------------------ |
| Requests por segundo  | `rate(http_server_requests_total[1m])` | Ver tráfico actual                         |
| Errores por minuto    | `rate(http_server_errors_total[1m])`   | Detectar fallas funcionales o técnicas     |
| Latencia p95          | `histogram_quantile(0.95, ...)`        | Medir experiencia percibida por el usuario |
| Respuestas por status | `sum by (status_code) (...)`           | Ver proporción de 2xx, 4xx y 5xx           |
| Memoria de proceso    | `process_memory_usage_bytes`           | Controlar consumo de recursos              |
| Endpoints más lentos  | `topk(5, ...)`                         | Identificar cuellos de botella             |

De esta forma, OpenTelemetry se encarga de generar y transportar la información, Prometheus/Mimir la almacena como series temporales y Grafana la convierte en visualizaciones útiles para el equipo.
