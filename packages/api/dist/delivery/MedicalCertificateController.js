export class MedicalCertificateController {
    createMedicalCertificateUseCase;
    getMedicalCertificatesUseCase;
    updateMedicalCertificateUseCase;
    deleteMedicalCertificateUseCase;
    constructor(createMedicalCertificateUseCase, getMedicalCertificatesUseCase, updateMedicalCertificateUseCase, deleteMedicalCertificateUseCase) {
        this.createMedicalCertificateUseCase = createMedicalCertificateUseCase;
        this.getMedicalCertificatesUseCase = getMedicalCertificatesUseCase;
        this.updateMedicalCertificateUseCase = updateMedicalCertificateUseCase;
        this.deleteMedicalCertificateUseCase = deleteMedicalCertificateUseCase;
    }
    async getAll(_request, reply) {
        try {
            const certificates = await this.getMedicalCertificatesUseCase.execute();
            return reply.status(200).send({ data: certificates });
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    }
    async create(request, reply) {
        try {
            const medicalCertificate = await this.createMedicalCertificateUseCase.execute(request.body);
            return reply.status(201).send({
                data: medicalCertificate,
            });
        }
        catch (error) {
            if (error.message.includes('no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message.includes('obligatorio') ||
                error.message.includes('inválido') ||
                error.message.includes('posterior')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({
                error: 'Error interno, reintente más tarde',
            });
        }
    }
    async update(request, reply) {
        try {
            const { id } = request.params;
            const certificate = await this.updateMedicalCertificateUseCase.execute(id, request.body);
            return reply.status(200).send({ data: certificate });
        }
        catch (error) {
            if (error.message.includes('no encontrado')) {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message.includes('inválido') ||
                error.message.includes('posterior')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({
                error: 'Error interno, reintente más tarde',
            });
        }
    }
    async delete(request, reply) {
        try {
            const { id } = request.params;
            await this.deleteMedicalCertificateUseCase.execute(id);
            return reply.status(200).send({ message: 'Certificado eliminado correctamente' });
        }
        catch (error) {
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
