import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { metrics, Meter } from '@opentelemetry/api';  // ✅ Meter desde api

const prometheusExporter = new PrometheusExporter({
    port: 9464,
    endpoint: '/metrics',
});

const sdk = new NodeSDK({
    metricReader: prometheusExporter,
    instrumentations: [
        getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-http': {},  // ✅ fastify removido
        }),
    ],
});

sdk.start();

const meter = metrics.getMeter('alentapp-api');

export function createREDMetrics(meter: Meter) {  // ✅ tipo resuelto
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
