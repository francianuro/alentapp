import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateMedicalCertificateUseCase }
from '../application/CreateMedicalCertificateUseCase.js';
import { GetMedicalCertificatesUseCase }
from '../application/GetMedicalCertificateUseCase.js';
import { UpdateMedicalCertificateUseCase }
from '../application/UpdateMedicalCertificateUseCase.js';
import { DeleteMedicalCertificateUseCase }
from '../application/DeleteMedicalCertificateUseCase.js';
import {
    CreateMedicalCertificateRequest,
    UpdateMedicalCertificateRequest,
} from '@alentapp/shared';

// Registra métricas RED en cada ruta
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('apentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', { 
  unit: 'ms',
});

export class MedicalCertificateController {
    constructor(
        private readonly createMedicalCertificateUseCase:
            CreateMedicalCertificateUseCase,
        private readonly getMedicalCertificatesUseCase: GetMedicalCertificatesUseCase,
        private readonly updateMedicalCertificateUseCase: UpdateMedicalCertificateUseCase,
        private readonly deleteMedicalCertificateUseCase: DeleteMedicalCertificateUseCase,
    ) {}
    async getAll(_request: FastifyRequest, reply: FastifyReply) {

        const start = Date.now();
        const method = _request.method;
        const route = _request.url.split('?')[0];

        try {
            const certificates = await this.getMedicalCertificatesUseCase.execute();
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: certificates });
        } catch (error: any) {
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: error.message });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }
    async create(
        request: FastifyRequest<{
            Body: CreateMedicalCertificateRequest;
        }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];

        try {
            const medicalCertificate =
                await this.createMedicalCertificateUseCase.execute(
                    request.body,
                );
            
            requestCounter.add(1, { method, route, status: '201' });
            
            return reply.status(201).send({
                data: medicalCertificate,
            });
        } catch (error: any) {
            if (error.message.includes('no existe')) {
                errorCounter.add(1, { method, route, status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            if (
                error.message.includes('obligatorio') ||
                error.message.includes('inválido') ||
                error.message.includes('posterior')
            ) {
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({
                error: 'Error interno, reintente más tarde',
            });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }
    async update(
        request: FastifyRequest<{
            Params: { id: string };
            Body: UpdateMedicalCertificateRequest;
        }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];

        try {
            const { id } = request.params;
            const certificate =
                await this.updateMedicalCertificateUseCase.execute(id, request.body);
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: certificate });
        } catch (error: any) {
            if (error.message.includes('no encontrado')) {
                errorCounter.add(1, { method, route, status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            if (
                error.message.includes('inválido') ||
                error.message.includes('posterior')
            ) {
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({
                error: 'Error interno, reintente más tarde',
            });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }
    async delete(
        request: FastifyRequest<{
            Params: { id: string };
        }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];

        try {
            const { id } = request.params;
            await this.deleteMedicalCertificateUseCase.execute(id);
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ message: 'Certificado eliminado correctamente' });
        } catch (error: any) {
            if (error.message.includes('no encontrado')) {
                errorCounter.add(1, { method, route, status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            if (error.message.includes('No se puede eliminar')) {
                errorCounter.add(1, { method, route, status: '400' });

                return reply.status(400).send({ error: error.message });
            }
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({
                error: 'Error interno, reintente más tarde',
            });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }
}