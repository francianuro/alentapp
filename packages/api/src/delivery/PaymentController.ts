import { FastifyRequest, FastifyReply } from 'fastify';
import { CreatePaymentUseCase } from '../application/CreatePaymentUseCase.ts';
import { CreatePaymentRequest } from '@alentapp/shared';

export class PaymentController {
    constructor(private createPaymentUseCase: CreatePaymentUseCase) { }

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const body = request.body as CreatePaymentRequest;

            // Se delega la lógica al caso de uso
            const payment = await this.createPaymentUseCase.execute(body);

            return reply.status(201).send({ data: payment });
        } catch (error: any) {
            // Manejo de errores de negocio
            if (error.message === 'MEMBER_NOT_FOUND') {
                return reply
                    .status(404)
                    .send({ error: 'El socio especificado no existe' });
            }

            if (error.message === 'INVALID_AMOUNT') {
                return reply
                    .status(400)
                    .send({
                        error: 'El monto debe ser mayor a cero'
                    });
            }

            // Error genérico
            console.error(error);
            return reply
                .status(500)
                .send({ 
                    error: 'Error interno, reintente más tarde' 
                });
        }
    }
}