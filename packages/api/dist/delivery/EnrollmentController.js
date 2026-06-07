export class EnrollmentController {
    createEnrollmentUseCase;
    getEnrollmentsUseCase;
    deleteEnrollmentUseCase;
    constructor(createEnrollmentUseCase, getEnrollmentsUseCase, deleteEnrollmentUseCase) {
        this.createEnrollmentUseCase = createEnrollmentUseCase;
        this.getEnrollmentsUseCase = getEnrollmentsUseCase;
        this.deleteEnrollmentUseCase = deleteEnrollmentUseCase;
    }
    async getAll(_request, reply) {
        try {
            const enrollments = await this.getEnrollmentsUseCase.execute();
            return reply.status(200).send({ data: enrollments });
        }
        catch (error) {
            return reply.status(500).send({ error: 'Error al obtener las inscripciones' });
        }
    }
    async create(request, reply) {
        try {
            const enrollment = await this.createEnrollmentUseCase.execute(request.body);
            return reply.status(201).send({ data: enrollment });
        }
        catch (error) {
            if (error.message.includes('ya está inscripto')) {
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('obligatorio') || error.message.includes('no existe')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
    async delete(request, reply) {
        try {
            const { id } = request.params;
            await this.deleteEnrollmentUseCase.execute(id);
            return reply.status(204).send();
        }
        catch (error) {
            if (error.message.includes('no existe')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
