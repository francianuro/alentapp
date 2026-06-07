export class SportController {
    createSportUseCase;
    getSportsUseCase;
    updateSportUseCase;
    deleteSportUseCase;
    constructor(createSportUseCase, getSportsUseCase, updateSportUseCase, deleteSportUseCase) {
        this.createSportUseCase = createSportUseCase;
        this.getSportsUseCase = getSportsUseCase;
        this.updateSportUseCase = updateSportUseCase;
        this.deleteSportUseCase = deleteSportUseCase;
    }
    async getAll(_request, reply) {
        try {
            const deportes = await this.getSportsUseCase.execute();
            return reply.status(200).send({ data: deportes });
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    }
    async create(request, reply) {
        try {
            const deporte = await this.createSportUseCase.execute(request.body);
            return reply.status(201).send({ data: deporte });
        }
        catch (error) {
            if (error.message.includes('Ya existe un deporte con ese nombre')) {
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('obligatorio') ||
                error.message.includes('mayor a cero')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
    async update(request, reply) {
        try {
            const { id } = request.params;
            const deporte = await this.updateSportUseCase.execute(id, request.body);
            return reply.status(200).send({ data: deporte });
        }
        catch (error) {
            if (error.message.includes('no existe') ||
                error.message.includes('no puede modificarse') ||
                error.message.includes('mayor a cero')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
    async delete(request, reply) {
        try {
            const { id } = request.params;
            await this.deleteSportUseCase.execute(id);
            return reply.status(204).send();
        }
        catch (error) {
            if (error.message.includes('inscripciones')) {
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('no existe')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
