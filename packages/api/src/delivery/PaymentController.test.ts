import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentController } from './PaymentController.ts';

describe('PaymentController', () => {
    const mockCreateUseCase = { execute: vi.fn() };
    const mockUpdateUseCase = { execute: vi.fn() };
    const mockGetUseCase = { execute: vi.fn() };
    const controller = new PaymentController(
        mockCreateUseCase as any,
        mockUpdateUseCase as any,
        mockGetUseCase as any,
    );

    const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
    };

    const mockRequest = {
        body: {
            member_id: 'uuid-member-1',
            amount: 500,
            year: 2026,
            due_date: '2026-05-29'
        },
        params: { id: 'uuid-payment-1' },
    };

    beforeEach(() => { vi.clearAllMocks() });

    describe('create', () => {

        // TEST 9: Retorna 201 en caso de éxito
        it('debe devovler 201 si la creación fue exitosa', async () => {
            const mockPayment = {
                id: 'uuid-payment-1',
                amount: 500,
                status: 'Pending',
            };

            mockCreateUseCase.execute.mockResolvedValueOnce(mockPayment);

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith(mockPayment);
        });


        // TEST 10: Retorna 404 si el socio no existe
        it('debe devolver 404 si el socio no existe', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(
                new Error('Error: El socio especificado o existe')
            );

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(404);
        });
    });

    describe('update', () => {

        // TEST 11: Retorna 409 si el pago está finalizado
        it('debe devolver 409 si el pago ya está finalizado', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(
                new Error('Error: No se permiten modificaciones en pagos finalizados')
            );

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(409);
        });

        // TEST 12: Retorna 404 si el pago no se encuentra
        it('debe devolver 404 si el pago no es encontrado', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(
                new Error('Error: Pago no encontrado')
            );

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(404);
        });
    });
});