export class LockerController {
    createLockerUseCase;
    getLockersUseCase;
    updateLockerUseCase;
    deleteLockerUseCase;
    constructor(createLockerUseCase, getLockersUseCase, updateLockerUseCase, deleteLockerUseCase) {
        this.createLockerUseCase = createLockerUseCase;
        this.getLockersUseCase = getLockersUseCase;
        this.updateLockerUseCase = updateLockerUseCase;
        this.deleteLockerUseCase = deleteLockerUseCase;
    }
    async getAll(_request, reply) {
        try {
            const lockers = await this.getLockersUseCase.execute();
            return reply.status(200).send({ data: lockers });
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    }
    async create(request, reply) {
        try {
            const locker = await this.createLockerUseCase.execute(request.body);
            return reply.status(201).send({ data: locker });
        }
        catch (error) {
            if (error.message.includes('Ya existe un locker con ese numero')) {
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('Debe completar') ||
                error.message.includes('mayor a cero') ||
                error.message.includes('inválido') ||
                error.message.includes('El socio no existe')) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('mantenimiento')) {
                return reply.status(409).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
    async update(request, reply) {
        try {
            const { id } = request.params;
            const locker = await this.updateLockerUseCase.execute(id, request.body);
            return reply.status(200).send({ data: locker });
        }
        catch (error) {
            if (error.message.includes('Ya existe un locker con ese numero')) {
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('mantenimiento')) {
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('no existe') ||
                error.message.includes('Debe completar') ||
                error.message.includes('mayor a cero') ||
                error.message.includes('inválido')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
    async delete(request, reply) {
        try {
            const { id } = request.params;
            await this.deleteLockerUseCase.execute(id);
            return reply.status(204).send();
        }
        catch (error) {
            if (error.message.includes('no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
