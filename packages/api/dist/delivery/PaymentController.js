export class PaymentController {
    createPaymentUseCase;
    updatePaymentUseCase;
    getPaymentsUseCase;
    constructor(createPaymentUseCase, updatePaymentUseCase, getPaymentsUseCase) {
        this.createPaymentUseCase = createPaymentUseCase;
        this.updatePaymentUseCase = updatePaymentUseCase;
        this.getPaymentsUseCase = getPaymentsUseCase;
    }
    async getAll(_request, reply) {
        try {
            const payments = await this.getPaymentsUseCase.execute();
            return reply.status(200).send({ data: payments });
        }
        catch (error) {
            return reply.status(500).send({ error: 'Error al obtener los pagos' });
        }
    }
    async create(request, reply) {
        try {
            const payment = await this.createPaymentUseCase.execute(request.body);
            return reply.status(201).send(payment);
        }
        catch (error) {
            const message = error.message;
            // Manejo de errores
            if (message.includes('no existe')) {
                return reply.status(404).send({ error: message });
            }
            if (message.includes('inválido') || message.includes('debe ser mayor')) {
                return reply.status(400).send({ error: message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
    async update(request, reply) {
        try {
            const { id } = request.params;
            const payment = await this.updatePaymentUseCase.execute(id, request.body);
            return reply.status(200).send(payment);
        }
        catch (error) {
            const message = error.message;
            if (message.includes('no encontrado')) {
                return reply.status(404).send({ error: message });
            }
            if (message.includes('finalizados') || message.includes('cancelados')) {
                return reply.status(409).send({ error: message });
            }
            if (message.includes('inválido') || message.includes('debe ser mayor')) {
                return reply.status(400).send({ error: message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
