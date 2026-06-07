import { FastifyRequest, FastifyReply } from 'fastify';
import { CreatePaymentRequest, UpdatePaymentRequest } from '@alentapp/shared';
import { CreatePaymentUseCase } from '../application/CreatePaymentUseCase.js';
import { UpdatePaymentUseCase } from '../application/UpdatePaymentUseCase.js';
import { GetPaymentsUseCase } from '../application/GetPaymentsUseCase.js';

// Registra métricas RED en cada ruta
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('apentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', { 
  unit: 'ms',
});

export class PaymentController {
    constructor(
        private createPaymentUseCase: CreatePaymentUseCase,
        private updatePaymentUseCase: UpdatePaymentUseCase,
        private getPaymentsUseCase: GetPaymentsUseCase
    ) { }

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        const start = Date.now();
        const method = _request.method;
        const route = _request.url.split('?')[0];

        try {
            const payments = await this.getPaymentsUseCase.execute();
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: payments });
        } catch (error: any) {
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: 'Error al obtener los pagos' });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async create(request: FastifyRequest<{ Body: CreatePaymentRequest }>, reply: FastifyReply) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];

        try {
            const payment = await this.createPaymentUseCase.execute(request.body);
            requestCounter.add(1, { method, route, status: '201' });
            return reply.status(201).send(payment);
        } catch (error: any) {
            const message = error.message;

            // Manejo de errores
            if (message.includes('no existe')) {
                errorCounter.add(1, { method, route, status: '404' });

                return reply.status(404).send({ error: message });
            }

            if (message.includes('inválido') || message.includes('debe ser mayor')) {
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: message });
            }

            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async update(request: FastifyRequest<{ Params: { id: string }, Body: UpdatePaymentRequest }>, reply: FastifyReply) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];

        try {
            const { id } = request.params;
            const payment = await this.updatePaymentUseCase.execute(id, request.body);
            requestCounter.add(1, { method, route, status: '200' });

            return reply.status(200).send(payment);
        } catch (error: any) {
            const message = error.message;

            if (message.includes('no encontrado')) {
                errorCounter.add(1, { method, route, status: '404' });

                return reply.status(404).send({ error: message });
            }

            if (message.includes('finalizados') || message.includes('cancelados')) {
                errorCounter.add(1, { method, route, status: '409' });
                return reply.status(409).send({ error: message });
            }

            if (message.includes('inválido') || message.includes('debe ser mayor')) {
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: message });
            }

            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }
}