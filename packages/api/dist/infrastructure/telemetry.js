import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import FastifyOtelInstrumentation from '@fastify/otel';
import { metrics } from '@opentelemetry/api';
// Configura Prometheus Exporter
const prometheusExporter = new PrometheusExporter({
    port: 9464,
    endpoint: '/metrics',
});
// Crear SDK con auto-instrumentaciones
const sdk = new NodeSDK({
    metricReader: prometheusExporter,
    instrumentations: [
        getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-http': {},
        }),
        FastifyOtelInstrumentation(),
    ],
});
// Iniciar el SDK
sdk.start();
const meter = metrics.getMeter('apentapp-api');
export function createREDMetrics(meter) {
    const requestCounter = meter.createCounter('http.requests.total', {
        description: 'Total de requests HTTP',
    });
    const errorCounter = meter.createCounter('http.requests.errors', {
        description: 'Total de errores HTTP',
    });
    const requestDuration = meter.createHistogram('http.request.duration', {
        description: 'Duración de requests',
        unit: 'ms',
    });
    return { requestCounter, errorCounter, requestDuration };
}
export { sdk, meter, prometheusExporter };
