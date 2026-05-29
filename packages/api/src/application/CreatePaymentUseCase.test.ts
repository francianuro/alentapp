import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatePaymentUseCase } from './CreatePaymentUseCase.ts';
import { PaymentRepository } from '../domain/PaymentRepository.ts';
import { PaymentValidator } from '../domain/services/PaymentValidator.ts';
import { CreatePaymentRequest } from '@alentapp/shared';

describe('CreatePaymentUseCase', () => {
    const mockPaymentRepo = {
        create: vi.fn(),
    } as unknown as PaymentRepository;

    const mockPaymentValidator = {
        validateAll: vi.fn(),
    } as unknown as PaymentValidator;

    const useCase = new CreatePaymentUseCase(mockPaymentRepo, mockPaymentValidator);

    beforeEach(() => { vi.clearAllMocks(); });

    // TEST 1: Camino feliz - crea exitosamente
    it('debe crear un pago exitosamente si pasa las validaciones', async () => {
        const mockRequest: CreatePaymentRequest = {
            member_id: 'uuid-member-1',
            amount: 1500.50,
            month: 5,
            year: 2026,
            due_date: '2026-05-29',
        };

        vi.mocked(mockPaymentValidator.validateAll).mockResolvedValue();
        vi.mocked(mockPaymentRepo.create).mockResolvedValueOnce({
            id: 'uuid-payment-1',
            ...mockRequest,
            status: 'Pending',
            payment_date: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });

        const result = await useCase.execute(mockRequest);

        expect(mockPaymentValidator.validateAll).toHaveBeenCalledWith(mockRequest);
        expect(mockPaymentRepo.create).toHaveBeenCalledWith(mockRequest);
        expect(result.id).toBe('uuid-payment-1');
        expect(result.status).toBe('Pending');
    });


    // TEST 2: Camino de error — el validador lanza una excepción
    it('debe lanzar un error si el socio no existe y NO llamar a create', async () => {
        const mockRequest: CreatePaymentRequest = {
            member_id: 'uuid-inexistente',
            amount: 500,
            month: 5,
            year: 2026,
            due_date: '2026-05-29',
        };
        vi.mocked(mockPaymentValidator.validateAll).mockRejectedValueOnce(
            new Error('Error: El socio especificado no existe')
        );
        await expect(useCase.execute(mockRequest)).rejects.toThrow('El socio especificado no existe');
        expect(mockPaymentRepo.create).not.toHaveBeenCalled();
    });
});