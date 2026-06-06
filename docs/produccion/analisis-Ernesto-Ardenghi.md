# Fase 1: Analizar y proponer

## 1.1 Análisis de la Infraestructura Docker actual


| # | Problema | ¿Dónde ocurre? | Impacto (A/M/B) | Solución propuesta (basada en buenas prácticas) |
|---|----------|----------------|-----------------|---------------------------------------------------|
| 1 | Credenciales de base de datos en texto plano | `docker-compose.yml`: líneas 6–8, 30 | **A** (Alto) | • Usar archivo `.env` (no versionado) y referencias con `${VAR:-default}`. Ejemplo: `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-password123}`. <br><br>• Documentar variables en `.env.example` |
| 2 | Contenedor ejecuta procesos como root | `Dockerfile-api.md`: línea 1<br>`Dockerfile-web.md`: línea 1 | **M** (Medio) | • Crear usuario no root en los Dockerfiles (`RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs`) y luego `USER nodejs`. <br><br>• Para producción, añadir `--cap-drop ALL` y solo las capabilities necesarias. |
| 3 | Montaje del código fuente como volumen (bind mount) en producción | `docker-compose.yml`: líneas 25-28 (api)<br>líneas 52-55 (web) | **A** (Alto) | • Eliminar los volúmenes de montaje en producción. <br><br>• El código debe estar empaquetado dentro de la imagen. <br><br>• Usar bind mounts **solo en desarrollo** (ej. con `docker-compose.override.yml`). <br><br>• En producción, usar volúmenes anónimos o nombrados solo para datos persistentes. |
| 4 | Uso de comandos de desarrollo (`prisma migrate dev` + `tsx watch`) en el entrypoint | `docker-compose.yml`: líneas 36-38 (api) | **A** (Alto) | • Separar migraciones: ejecutar `prisma migrate deploy` como un paso previo (inicialización). <br><br>• Compilar TypeScript a JavaScript y ejecutar con `node`. Usar multistage build (sección 9) para generar imagen de producción con solo `dist/` y dependencias de producción. <br><br>• El CMD debe ser `node dist/app.js`. |
| 5 | Ausencia de límites de recursos (CPU/memoria) y healthchecks en `api` / `web` | `docker-compose.yml`: todo el archivo (faltan `deploy.resources` y `healthcheck` en api/web) | **M** (Medio) | • Agregar `deploy.resources.limits` con valores adecuados (ej. CPU:0.5, memoria:256M para api; CPU:0.3, memoria:256M para web). <br><br>• Definir healthcheck usando `wget` o `curl` (imagen `node:20-alpine` puede instalar `curl`). <br><br>Ejemplo: `test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]`. Configurar `start_period: 30s`, `interval: 15s`. Ver secciones 2 y 3 del documento. |

## 1.2 OpenTelemetry

### 1.2.1 OpenTelemetry y su diferencia con Prometheus

```OpenTelemetry (OTel)``` es el estándar de facto de la industria para la instrumentación y transporte de señales de telemetría, como métricas, logs y trazas.  

Es un proyecto unificado y agnóstico frente a los proveedores, lo que te permite instrumentar el código de tu aplicación una sola vez mediante un único SDK y exportar los datos a cualquier destino compatible, evitando así el vendor lock-in (dependencia de un solo proveedor).  

OTel se compone principalmente de tres partes:

| Componente | Función |
|------------|---------|
| API | Define interfaces estándar independientes del proveedor. |
| SDK | Es la implementación que incluye herramientas como la auto-instrumentación, la cual permite generar métricas y trazas automáticamente sin necesidad de modificar el código fuente de tu aplicación.|
| Collector | Un servidor independiente que recibe los datos (mediante el protocolo OTLP), los procesa (filtra, agrupa) y los exporta a múltiples backends.|


### Diferencias principales con Prometheus:
La diferencia fundamental es que ocupan roles distintos dentro de la arquitectura de observabilidad y utilizan convenciones de datos diferentes:

Propósito en la arquitectura: 
- ```OpenTelemetry``` es el pipeline de recolección y transporte encargado de extraer las métricas de la aplicación y llevarlas hasta un destino.  
- ```Prometheus``` (o soluciones compatibles con él, como Mimir) es el backend de almacenamiento de series de tiempo (TSDB) donde residen esos datos para ser posteriormente consultados y visualizados mediante el lenguaje PromQL.
- Nomenclatura de atributos (Labels): OpenTelemetry utiliza atributos separados por puntos en su modelo de datos (por ejemplo, http.method o http.status_code). Por el contrario, Prometheus no admite puntos ni caracteres especiales en sus etiquetas; exige reglas estrictas donde los puntos se convierten en guiones bajos (http_method) y el formato camelCase pasa a snake_case.
- Conversión automática: Para integrar ambas herramientas, el ```OTel Collector``` utiliza un exportador (```prometheusremotewrite```) que sanitiza automáticamente los atributos con puntos de OpenTelemetry para transformarlos a los guiones bajos que requiere Prometheus antes de guardar la información.
- Nombres de las métricas: Como convención, ```OpenTelemetry``` incluye explícitamente la unidad de medida en el nombre de la métrica generada. Por ejemplo, en lugar de generar una métrica llamada ```http_server_duration_count```, genera ```http_server_duration_milliseconds_count```, un detalle importante al momento de escribir las consultas PromQL en los dashboards.


```text
┌──────────────┐     OTLP     ┌──────────────┐
│   App con    │ ───────────► │ OTel         │
│   OTel SDK   │              │ Collector    │
└──────────────┘              └──────┬───────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
      │    Loki      │      │    Tempo     │      │    Mimir     │
      │    logs      │      │   trazas     │      │   métricas   │
      └──────────────┘      └──────────────┘      └──────┬───────┘
                                                         │
                                                         ▼
                                                   ┌──────────────┐
                                                   │   Grafana    │
                                                   └──────────────┘
```


| Aspecto | OpenTelemetry | Prometheus |
|---------|---------------|------------|
| Propósito | Framework de instrumentación y transporte | Sistema de almacenamiento y consulta de métricas |
| Tipos de datos | ✅ Métricas, ✅ Logs, ✅ Trazas | ✅ Métricas (principalmente) |
| Rol en el stack | Generación + colección + exportación | Almacenamiento + consulta + alertas |
| Modelo de recolección | Push (vía OTLP) | Pull (scrape endpoints) |
| Vendor lock-in | Neutral: exporta a cualquier backend | Es un backend específico |
| Protocolo | OTLP (estándar abierto) | Formato Prometheus + PromQL |
	

	
### 1.2.2 Los 3 pilares de la Observabilidad. Abordaje de OpenTelemetry

Los "3 pilares" de la observabilidad son las tres señales fundamentales que permiten entender el estado interno de un sistema:

- Métricas: Son datos cuantitativos que miden el sistema, como contadores, mediciones variables (gauges) o histogramas. Permiten visualizar tendencias a alto nivel, como el tráfico, la tasa de errores y la latencia.

- Logs: Son registros de eventos ocurridos en un momento específico (timestamp). Para ser realmente útiles, deben estar en un formato estructurado (como JSON) que permita filtrar atributos concretos y determinar qué sucedió.
    
- Trazas: Representan el recorrido completo de una petición a medida que atraviesa los distintos servicios de un sistema. Están formadas por operaciones individuales llamadas spans, las cuales construyen un árbol de llamadas que detalla la duración, el estado y los atributos de negocio de cada paso.

En cuanto a cuál de ellos aborda OpenTelemetry, la respuesta es que OpenTelemetry unifica y aborda los tres pilares.
A diferencia de depender de múltiples herramientas propietarias para cada señal, OpenTelemetry proporciona un único SDK estandarizado que se encarga de recolectar métricas, logs y trazas simultáneamente. Su mayor beneficio es que asegura la correlación entre los tres pilares al compartir automáticamente un mismo identificador único (trace_id). De esta forma, si detectas un problema en las métricas, puedes revisar los logs estructurados y usar el trace_id para saltar directamente a la traza exacta que muestra la causa raíz del fallo.

#### Arquitectura de OTel
```text
┌─────────────────┐
│   App con OTel  │
│  • Métricas 📈  │
│  • Logs 📝      │
│  • Trazas 🔍    │
└────────┬────────┘
         │ OTLP
         ▼
┌─────────────────┐
│ OTel Collector  │
│ (pipeline único)│
└───────┬─────────┘
        │
   ┌────┴────┬────┐
   ▼         ▼    ▼
┌─────┐ ┌─────┐ ┌─────┐
│Mimir│ │Loki │ │Tempo│
│📈   ││📝   │ │🔍   │
└─────┘ └─────┘ └─────┘
```

	
### 1.2.3 Conceptos de Métricas RED (Rate, Errors, Duration)

El framework ```RED``` (por sus siglas en inglés: Rate, Errors, Duration) es un modelo originado en la ingeniería de confiabilidad del sitio (SRE) que está diseñado específicamente para medir y monitorear el rendimiento a nivel de los servicios (a diferencia de otros modelos como USE, que se enfocan en la infraestructura física).  

Se basa en aislar tres señales fundamentales ("señales doradas") para entender rápidamente la salud de una aplicación:

- Rate (Tasa o Tráfico): Mide el volumen de carga del sistema, es decir, la cantidad de peticiones o solicitudes por segundo que está recibiendo el servicio. Sirve para entender el comportamiento del tráfico y detectar picos o caídas anormales en el uso. En herramientas como Prometheus o Mimir, se calcula típicamente usando la función rate() sobre un intervalo de tiempo. Ejemplo: ```rate(http_server_duration_ms_count[5m])``` 

- Errors (Errores): Mide la tasa de peticiones que fallan. Sirve para identificar de forma proactiva si la aplicación está fallando y afectando a los usuarios. Se suele medir filtrando las métricas por códigos de estado HTTP específicos, como los errores de cliente (4xx) o de servidor (5xx).  


- Duration (Duración o Latencia): Mide cuánto tiempo tarda el servicio en responder a una petición. Sirve para vigilar la velocidad y la experiencia de los usuarios. Para medirla de forma precisa y evitar que valores atípicos distorsionen la realidad, se recomienda utilizar percentiles (como el percentil 95 o p95) mediante funciones de histograma (ejemplo. ```histogram_quantile(0.95, ...)```).

### 1.2.4 OTLP (OpenTelemetry Protocol) & OLTP vs Prometheus
El OTLP (OpenTelemetry Protocol) es el protocolo estándar diseñado por OpenTelemetry para transportar la telemetría de un sistema hacia un colector o backend. Este protocolo es versátil y soporta la transmisión de datos tanto a través de gRPC (generalmente en el puerto 4317) como mediante HTTP (en el puerto 4318).  

Las ventajas de utilizar OTLP y el ecosistema de OpenTelemetry frente a exportar métricas directamente a un SDK específico de Prometheus son sustanciales:

- Evita la dependencia del proveedor (vendor lock-in): Al usar OTLP, instrumentas el código de tu aplicación una sola vez utilizando una especificación estándar y abierta. Esto significa que tu código es completamente neutral frente a los proveedores; puedes enviar tus datos a un OTel Collector y desde ahí exportarlos a cualquier backend compatible (como Prometheus, Mimir, o soluciones propietarias como Datadog) sin necesidad de modificar ni una línea de tu código si decides cambiar de tecnología mañana.  

- Unificación de los tres pilares: Si exportas directamente a Prometheus, estás limitando esa integración a las métricas. OTLP, por su parte, te proporciona un solo SDK unificado para transportar métricas, logs y trazas al mismo tiempo.  


- Sanitización automática de los datos: OpenTelemetry y Prometheus utilizan modelos de datos con reglas distintas. Por ejemplo, OpenTelemetry permite atributos con puntos (como http.method), mientras que Prometheus exige reglas estrictas donde los puntos deben ser guiones bajos y el formato debe ser snake_case. Al usar el pipeline de OTLP, el OTel Collector procesa la información y utiliza exportadores (como prometheusremotewrite) que sanitizan y convierten automáticamente las etiquetas para que cumplan con los requisitos de Prometheus. Esto te libera de tener que adaptar el formato de tus métricas manualmente dentro de tu código.


### 1.2.5 Relación entre OpenTelemetry y Grafana
OpenTelemetry y Grafana tienen una relación complementaria en el stack de observabilidad. No compiten, sino que cada uno cumple un rol específico en el pipeline de datos.

#### Roles en el Pipeline
```text
┌─────────────────┐     OTLP    ┌──────────────┐
│   App con OTel  │ ─────────►  │ OTel         │
│   (Generación)  │  gRPC/HTTP  │ Collector    │
└─────────────────┘             └──────┬───────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              ▼                        ▼                        ▼
      ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
      │    Mimir     │       │    Loki      │       │    Tempo     │
      │  (métricas)  │       │   (logs)     │       │  (trazas)    │
      └──────┬───────┘       └──────┬───────┘       └──────┬───────┘
             └──────────────────────┼──────────────────────┘
                                    ▼
                           ┌─────────────────┐
                           │    GRAFANA      │
                           │ (Visualización) │
                           └─────────────────┘
```

| Componente | Rol | Relación con Grafana |
|------------|-----|----------------------|
| OpenTelemetry | Genera y exporta telemetría | Provee los datos que Grafana visualiza |
| OTel Collector | Procesa y enruta datos | Actúa como "puente" hacia los backends de Grafana |
| Mimir/Loki/Tempo | Almacenan señales | Son datasources nativos de Grafana |
| Grafana | Visualiza y correlaciona | Consume los datos almacenados para dashboards |

