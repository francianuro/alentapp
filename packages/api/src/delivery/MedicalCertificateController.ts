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
export class MedicalCertificateController {
    constructor(
        private readonly createMedicalCertificateUseCase:
            CreateMedicalCertificateUseCase,
        private readonly getMedicalCertificatesUseCase: GetMedicalCertificatesUseCase,
        private readonly updateMedicalCertificateUseCase: UpdateMedicalCertificateUseCase,
        private readonly deleteMedicalCertificateUseCase: DeleteMedicalCertificateUseCase,
    ) {}
    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const certificates = await this.getMedicalCertificatesUseCase.execute();
            return reply.status(200).send({ data: certificates });
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    }
    async create(
        request: FastifyRequest<{
            Body: CreateMedicalCertificateRequest;
        }>,
        reply: FastifyReply,
    ) {
        try {
            const medicalCertificate =
                await this.createMedicalCertificateUseCase.execute(
                    request.body,
                );
            return reply.status(201).send({
                data: medicalCertificate,
            });
        } catch (error: any) {
            if (error.message.includes('no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            if (
                error.message.includes('obligatorio') ||
                error.message.includes('inválido') ||
                error.message.includes('posterior')
            ) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({
                error: 'Error interno, reintente más tarde',
            });
        }
    }
    async update(
        request: FastifyRequest<{
            Params: { id: string };
            Body: UpdateMedicalCertificateRequest;
        }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            const certificate =
                await this.updateMedicalCertificateUseCase.execute(id, request.body);
            return reply.status(200).send({ data: certificate });
        } catch (error: any) {
            if (error.message.includes('no encontrado')) {
                return reply.status(404).send({ error: error.message });
            }
            if (
                error.message.includes('inválido') ||
                error.message.includes('posterior')
            ) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({
                error: 'Error interno, reintente más tarde',
            });
        }
    }
    async delete(
        request: FastifyRequest<{
            Params: { id: string };
        }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            await this.deleteMedicalCertificateUseCase.execute(id);
            return reply.status(200).send({ message: 'Certificado eliminado correctamente' });
        } catch (error: any) {
            if (error.message.includes('no encontrado')) {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message.includes('No se puede eliminar')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({
                error: 'Error interno, reintente más tarde',
            });
        }
    }
}