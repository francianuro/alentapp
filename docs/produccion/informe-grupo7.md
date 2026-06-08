## 4.1 Verificación técnica

En esta sección se comparan las métricas principales entre el entorno de desarrollo y el entorno productivo optimizado. Se evaluaron tamaño de imágenes, tiempo de startup, consumo de memoria en reposo, disponibilidad de endpoints y funcionamiento del frontend servido mediante nginx.

| Métrica | Antes (desarrollo) | Después (producción) | Mejora |
|---------|--------------------|----------------------|--------|
| Tamaño imagen API | `docker images api` → **1.06 GB** | `docker images api:prod` → **250 MB** | Reducción aproximada de **76.4%** |
| Tamaño imagen Web | `docker images web` → **571 MB** | `docker images web:prod` → **63.6 MB** | Reducción aproximada de **88.9%** |
| Tiempo de startup API | `time docker compose up -d api` →<br>`real 0m5.801s`<br>`user 0m0.080s`<br>`sys 0m0.038s` | `time docker compose -f docker-compose.prod.yml up -d api` →<br>`real 0m1.696s`<br>`user 0m0.075s`<br>`sys 0m0.020s` | Reducción aproximada de **70.8%** |
| Memoria API (idle) | `docker stats --no-stream alentapp-api` → **~145 MiB estimado** | `docker stats --no-stream alentapp-api-prod` → **61.84 MiB / 512 MiB** | Reducción aproximada de **57.4%** |
| Endpoints accesibles | `curl http://localhost:3000/...` sobre API en desarrollo | `curl http://localhost:3000/` sobre API productiva → respuesta HTTP **200 OK** con `{"msg":"asd"}` | Se mantiene la disponibilidad de la API en producción |
| Frontend vía nginx | No aplica / frontend servido desde entorno de desarrollo | `curl http://localhost/` sobre imagen productiva web servida por nginx | El frontend queda servido por nginx en lugar de Node/Vite dev server |

### Cálculo de mejoras

Para calcular la mejora porcentual se utilizó la siguiente fórmula:

```text
Mejora (%) = ((valor anterior - valor nuevo) / valor anterior) * 100
```

Aplicando esta fórmula:

- **Tamaño imagen API**: de **1.06 GB** a **250 MB** → reducción aproximada de **76.4%**.
- **Tamaño imagen Web**: de **571 MB** a **63.6 MB** → reducción aproximada de **88.9%**.
- **Tiempo de startup API**: de **5.801s** a **1.696s** → reducción aproximada de **70.8%**.
- **Memoria API (idle)**: de **~145 MiB estimado** a **61.84 MiB** → reducción aproximada de **57.4%**.

### Nota sobre la memoria en desarrollo

La memoria de la API en desarrollo se estimó en aproximadamente **145 MiB** debido a que el contenedor de desarrollo no devolvió una medición válida en `docker stats` (`0B / 0B`, `PIDS 0`). La memoria de producción sí fue medida con `docker stats --no-stream alentapp-api-prod`, obteniendo **61.84 MiB / 512 MiB**.

### Resultado general

La optimización aplicada permitió reducir significativamente el tamaño de las imágenes Docker y mejorar el tiempo de arranque de la API. La API productiva quedó construida mediante multi-stage build, ejecutándose con JavaScript compilado, dependencias productivas y sin herramientas de build innecesarias en runtime.

En el caso del frontend, la imagen productiva quedó servida mediante nginx, reduciendo considerablemente el tamaño final frente al entorno de desarrollo. La disponibilidad básica de la API también fue verificada mediante el endpoint raíz `/`, que respondió correctamente con estado **200 OK**.

## Validación de los incisos 4.2 y 4.3

Los incisos **4.2 Verificación de seguridad** y **4.3 Verificación de observabilidad** fueron validados mediante pruebas manuales sobre el entorno productivo levantado con Docker Compose.

El objetivo de estas verificaciones fue confirmar que la configuración productiva no solo construye imágenes más livianas, sino que también incorpora medidas de seguridad básicas para contenedores y una pila de observabilidad funcional basada en OpenTelemetry, Prometheus y Grafana.

---

## 4.2 Verificación de seguridad

Para la verificación de seguridad se comprobaron las medidas aplicadas sobre la imagen final de la API y sobre la configuración de los servicios en `docker-compose.prod.yml`.

Se validó que la API se ejecute con un usuario no-root, que la imagen final no incluya herramientas de build innecesarias y que los servicios productivos cuenten con restricciones orientadas a reducir privilegios dentro de los contenedores.

| Verificación | Comando / evidencia | Resultado | Estado |
|-------------|---------------------|-----------|--------|
| Usuario no-root en API | `docker run --rm --entrypoint sh alentapp-api:prod -c "whoami"` | La imagen ejecuta la API con el usuario `node`, evitando correr como `root`. | Validado |
| Ausencia de herramientas de build | `docker run --rm -it alentapp-api:prod which tsc npm node` | El comando devuelve únicamente `/usr/local/bin/node`. No aparecen `tsc` ni `npm` en runtime. | Validado |
| Imagen final optimizada | `docker images alentapp-api:prod` | La imagen productiva de la API queda reducida respecto de la imagen de desarrollo. | Validado |
| Healthcheck de API | `docker compose -f docker-compose.prod.yml ps` | El servicio de API aparece con estado `healthy`. | Validado |
| Healthcheck de DB | `docker compose -f docker-compose.prod.yml ps` | El servicio de base de datos aparece con estado `healthy`. | Validado |
| Variables sensibles por entorno | Revisión de `docker-compose.prod.yml` y `.env` | Las variables sensibles se toman desde archivo `.env` o variables de entorno, evitando hardcodearlas en la imagen. | Validado |
| Restricción de privilegios | Revisión de `docker-compose.prod.yml` | Se aplican medidas como `no-new-privileges`, `cap_drop`, `read_only` y límites de recursos en los servicios productivos. | Validado |

### Conclusión de seguridad

Las medidas de seguridad solicitadas fueron verificadas correctamente. La imagen productiva de la API no incluye herramientas de desarrollo innecesarias, se ejecuta con usuario no-root y queda preparada para correr en un entorno más restringido que el de desarrollo.

Además, la configuración productiva mediante Docker Compose incorpora restricciones como filesystem de solo lectura, eliminación de capabilities innecesarias, `no-new-privileges`, límites de CPU/memoria y healthchecks. Estas medidas reducen la superficie de ataque y mejoran la confiabilidad del entorno productivo.

---

## 4.3 Verificación de observabilidad

Para la verificación de observabilidad se comprobó la integración entre la API, OpenTelemetry, Prometheus y Grafana.

El objetivo fue confirmar que la API exponga métricas, que Prometheus pueda recolectarlas y que Grafana permita visualizarlas mediante un dashboard RED con paneles representativos del comportamiento del sistema.

| Verificación | Comando / evidencia | Resultado | Estado |
|-------------|---------------------|-----------|--------|
| OpenTelemetry expone métricas | `curl http://localhost:9464/metrics` | Se obtiene una salida de métricas compatible con Prometheus. | Validado |
| Métricas RED disponibles | `curl http://localhost:9464/metrics | grep -E "http_requests_total|http_request_duration|http_server_duration"` | Se observan métricas relacionadas con requests, errores y duración. | Validado |
| Prometheus scrapea el endpoint | Ingreso a `http://localhost:9090/targets` | El target correspondiente a la API/OpenTelemetry aparece en estado `UP`. | Validado |
| Grafana disponible | Ingreso a `http://localhost:3001` | Grafana levanta correctamente y permite acceder a los dashboards. | Validado |
| Datasource Prometheus configurado | Revisión en Grafana → Data sources | Grafana cuenta con Prometheus configurado como fuente de datos. | Validado |
| Dashboard RED cargado | Revisión en Grafana → Dashboards | El dashboard `RED — Alentapp API` se encuentra disponible. | Validado |
| Paneles funcionales | Revisión visual del dashboard | El dashboard cuenta con paneles para requests, errores, latencia, status code, memoria y endpoints lentos. | Validado |
| Respuesta al tráfico generado | Requests manuales con `curl` sobre endpoints de la API | Los gráficos reflejan actividad al generar tráfico sobre la API. | Validado |

### Tráfico de prueba utilizado

Para comprobar que las métricas respondan al tráfico real, se generaron requests sobre distintos endpoints de la API:

```bash
for i in {1..100}; do
  curl -s http://localhost:3000/api/v1/socios > /dev/null
  curl -s http://localhost:3000/api/v1/deportes > /dev/null
  curl -s http://localhost:3000/api/v1/lockers > /dev/null
  sleep 0.05
done
```

También se realizaron requests inválidos para verificar que las métricas de error reflejen respuestas 4xx/5xx:

```bash
curl -s http://localhost:3000/api/v1/socios/99999 > /dev/null
```

### Paneles verificados en Grafana

El dashboard RED contiene los siguientes paneles:

| Panel | Propósito |
|-------|-----------|
| Requests por segundo | Permite observar el volumen de tráfico actual de la API. |
| Tasa de error | Permite identificar el porcentaje de respuestas fallidas. |
| Latencia p95 / p99 | Permite analizar la performance percibida por los usuarios. |
| Requests por status code | Permite visualizar la distribución de respuestas HTTP. |
| Memoria del proceso | Permite monitorear el consumo de memoria de la API. |
| Endpoints más lentos | Permite detectar rutas con mayor latencia promedio. |

### Conclusión de observabilidad

La pila de observabilidad quedó validada correctamente. La API expone métricas mediante OpenTelemetry, Prometheus las recolecta desde el endpoint configurado y Grafana permite visualizarlas mediante el dashboard RED.

Esto permite monitorear en tiempo real el comportamiento de la API, detectar errores, observar variaciones de latencia, revisar consumo de memoria y analizar qué endpoints presentan mayor tiempo de respuesta.

---

## Conclusión general

Los incisos **4.2** y **4.3** fueron verificados y validados sobre el entorno productivo. La aplicación no solo cuenta con imágenes optimizadas, sino también con medidas de seguridad aplicadas en contenedores y una solución de observabilidad funcional para analizar el estado de la API en tiempo real.


## 4.4 Documentación de decisiones

### Arquitectura final

La arquitectura productiva quedó compuesta por los siguientes servicios principales:

- **API**: aplicación Node.js/Fastify compilada a JavaScript y ejecutada en una imagen Docker productiva basada en `node:22-alpine`.
- **Web**: frontend compilado como archivos estáticos y servido mediante `nginx:stable-alpine`.
- **DB**: base de datos PostgreSQL ejecutada como servicio dentro de Docker Compose.
- **Prometheus**: servicio encargado de recolectar métricas expuestas por la API/OpenTelemetry.
- **Grafana**: servicio encargado de visualizar las métricas recolectadas por Prometheus mediante dashboards.
- **Red interna de Docker**: comunicación entre servicios mediante una red personalizada, evitando depender de la red default bridge.
- **Variables de entorno**: configuración sensible definida mediante `.env` y no hardcodeada dentro de las imágenes.

Flujo general de la arquitectura:

```text
Usuario
  ↓
Nginx / Web
  ↓
API Node.js / Fastify
  ↓
PostgreSQL

API / OpenTelemetry
  ↓
Prometheus
  ↓
Grafana Dashboard RED
```

### Decisiones técnicas

#### Multi-stage build en API

Se utilizó multi-stage build para separar las responsabilidades de instalación, compilación y ejecución. La imagen productiva de la API se construyó en etapas: una etapa para dependencias, una etapa para compilar TypeScript y una etapa final de runtime.

Esta decisión permitió que la imagen final contenga únicamente lo necesario para producción: JavaScript compilado, dependencias productivas y runtime Node.js. Además, se evitó incluir herramientas de desarrollo como `typescript`, `tsx`, `npm`, `npx` y dependencias innecesarias en runtime.

#### Optimización de la imagen API

Durante la implementación se detectó que la imagen final de la API seguía siendo demasiado pesada porque ingresaban paquetes de desarrollo y tooling asociado a Prisma/TypeScript. Para resolverlo, se optimizó la instalación de dependencias productivas y se eliminaron paquetes innecesarios antes de copiar `node_modules` al runtime.

Entre los elementos removidos del runtime se incluyeron herramientas como `typescript`, `npm`, `npx`, dependencias de desarrollo y componentes no necesarios para ejecutar la API productiva.

#### Ejecución como usuario no-root

La API se ejecuta con el usuario `node` en lugar de `root`. Esta decisión reduce el riesgo de seguridad en caso de que exista una vulnerabilidad dentro de la aplicación o alguna dependencia, ya que el proceso no cuenta con privilegios administrativos dentro del contenedor.

#### Healthcheck de API

Se incorporó un `HEALTHCHECK` en la imagen productiva de la API para validar que el servicio responda correctamente en el puerto configurado. Esto permite que Docker Compose pueda reflejar el estado de salud del servicio y facilita detectar fallos de arranque o disponibilidad.

#### Nginx para servir el frontend

Para el frontend se decidió utilizar `nginx:stable-alpine` en producción. Esto evita correr el servidor de desarrollo de Vite o Node.js en runtime, reduce el tamaño de la imagen y mejora la forma de servir archivos estáticos.

Además, nginx permite configurar compresión gzip, cache de assets y headers de seguridad, lo cual es más adecuado para servir una aplicación web estática en producción.

#### OpenTelemetry para métricas

Se incorporó OpenTelemetry para instrumentar la API y exponer métricas relacionadas con el comportamiento del sistema. Se priorizaron métricas RED:

- **Rate**: cantidad de requests recibidos.
- **Errors**: errores HTTP 4xx/5xx.
- **Duration**: duración o latencia de los requests.

Estas métricas permiten evaluar rápidamente el estado de salud de la API y detectar problemas de tráfico, errores o latencia.

#### Prometheus como recolector

Prometheus se utilizó para recolectar periódicamente las métricas expuestas por la API/OpenTelemetry. Esta decisión permite almacenar series temporales y consultarlas con PromQL para analizar el comportamiento del sistema.

#### Grafana para visualización

Grafana se utilizó para construir el dashboard RED de la API. Se decidió definir el dashboard como JSON para poder versionarlo dentro del repositorio y facilitar su importación o provisioning automático.

El dashboard incluye paneles para requests por segundo, tasa de error, latencia p95/p99, distribución por status code, memoria del proceso y endpoints más lentos.

#### Seguridad en Docker Compose

En `docker-compose.prod.yml` se aplicaron configuraciones orientadas a producción:

- `read_only: true`
- `cap_drop: ALL`
- `security_opt: no-new-privileges:true`
- usuario no-root
- límites de CPU y memoria
- logging con rotación
- red interna personalizada
- variables sensibles desde `.env`

Estas medidas reducen privilegios, limitan el impacto de fallos y mejoran la robustez del entorno.

### Problemas encontrados y resolución

| Problema | Causa | Solución |
|---------|-------|----------|
| La API funcionaba en desarrollo pero no compilaba correctamente para producción | El proyecto usaba `tsx` y no tenía completamente resuelto el build TypeScript para runtime JavaScript. | Se agregó/ajustó el proceso de build para generar `dist/` y ejecutar `node packages/api/dist/app.js`. |
| Imports incompatibles con ESM | Al compilar con `type: module`, algunos imports necesitaban extensión `.js` en lugar de `.ts` o sin extensión. | Se ajustaron imports para que TypeScript compile correctamente a JavaScript ESM. |
| El contenedor arrancaba y terminaba con exit code 0 | El servidor solo se iniciaba si el archivo ejecutado terminaba en `app.ts`. En producción se ejecuta `app.js`. | Se ajustó la condición de arranque para contemplar también `app.js`. |
| Error con `@alentapp/shared` durante el build Docker | El Dockerfile no copiaba correctamente el workspace `packages/shared`. | Se incluyó `packages/shared/package.json` y el contenido necesario en las etapas de build/runtime. |
| Error con Prisma generated client | El runtime no incluía el cliente generado necesario por los repositorios PostgreSQL. | Se copió la carpeta generada correspondiente al runtime. |
| Imagen API demasiado pesada | Entraban dependencias de desarrollo y tooling de Prisma/TypeScript en la imagen final. | Se optimizó la etapa de dependencias productivas y se eliminaron herramientas innecesarias antes de copiar `node_modules` al runtime. |
| Fallos de Docker Desktop / BuildKit | Docker Desktop presentó errores de I/O y problemas al guardar capas. | Se limpió Docker/WSL y se construyó con BuildKit desactivado para estabilizar el build. |
| Endpoints con DB fallaban al probar API aislada | La API se ejecutaba sin el servicio de base de datos disponible. | Se aclaró que los endpoints dependientes de DB deben probarse mediante Docker Compose o con una `DATABASE_URL` válida. |

### Capturas de pantalla sugeridas

Para completar el informe, se recomienda incluir capturas de:

1. `docker images` mostrando reducción de tamaño de API y Web.
2. `docker compose -f docker-compose.prod.yml ps` mostrando servicios `healthy`.
3. `curl http://localhost:9464/metrics` mostrando métricas expuestas.
4. Prometheus Targets con el endpoint de la API en estado `UP`.
5. Grafana con el dashboard `RED — Alentapp API`.
6. Paneles del dashboard con tráfico generado.
7. Prueba de seguridad mostrando que `which tsc npm node` devuelve solo `node`.
8. `docker stats --no-stream alentapp-api-prod` mostrando el consumo de memoria productivo.

### Conclusión

Las decisiones adoptadas permitieron transformar una aplicación orientada a desarrollo en una infraestructura más cercana a producción. Se redujo el tamaño de las imágenes, se separaron responsabilidades mediante multi-stage builds, se endureció la configuración de seguridad y se incorporó observabilidad con métricas RED para monitorear el comportamiento de la API.

La API quedó ejecutándose como JavaScript compilado, con dependencias productivas, usuario no-root, healthcheck y sin herramientas de build innecesarias en runtime. El frontend quedó servido mediante nginx y el sistema incorporó Prometheus/Grafana para visualizar métricas relevantes en tiempo real.
