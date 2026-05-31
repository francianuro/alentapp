import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdatePaymentUseCase } from './UpdatePaymentUseCase.ts';
import { PaymentRepository } from '../domain/PaymentRepository.ts';
import { PaymentValidator } from '../domain/services/PaymentValidator.ts';
import { PaymentDTO, UpdatePaymentRequest } from '@alentapp/shared';

describe('UpdatePaymentUseCase', () => {
    const mockPaymentRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as PaymentRepository;

    const mockPaymentValidator = {
        validateAmount: vi.fn(),
        validateMonth: vi.fn(),
        validateYear: vi.fn(),
    } as unknown as PaymentValidator;

    const useCase = new UpdatePaymentUseCase(mockPaymentRepo, mockPaymentValidator);

    // Pago existente que se usará de base en cada test.
    const mockExistingPayment: PaymentDTO = {
        id: 'uuid-payment-1',
        member_id: 'uuid-member-1',
        amount: 1000,
        month: 5,
        year: 2026,
        status: 'Pending',
        due_date: '2026-05-29',
        payment_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Por defecto, el pago existe
        vi.mocked(mockPaymentRepo.findById).mockResolvedValue(mockExistingPayment);
    });

    // TEST 3: Lanza error si el pago no existe.
    it('debe lanzar error si el pago no existe', async () => {
        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(null);
        await expect(useCase.execute('uuid-inexistente', {})).rejects.toThrow('Pago no encontrado');

    })

    // TEST 4: No modifica pagos ya pagados.
    it('debe lanzar error si el pago ya está en estado Paid', async () => {
        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce({
            ...mockExistingPayment, status: 'Paid'
        });

        await expect(useCase.execute('uuid-payment-1', { amount: 2000 })).rejects.toThrow(
            'No se permiten modificaciones en pagos finalizados'
        );

        expect(mockPaymentRepo.update).not.toHaveBeenCalled();
    });

    // TEST 5: No modifica pagos cancelados.
    it('debe lanzar error si el pago está cancelado', async () => {
        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce({
            ...mockExistingPayment, status: 'Canceled'
        });

        await expect(useCase.execute('uuid-payment-1', { amount: 2000 })).rejects.toThrow(
            'No se permiten modificaciones en pagos cancelados'
        );
    });

    // Test 6: Auto-genera payment_date al marcar como Paid.
    it('debe auto-generar payment_date al cambiar status a Paid', async () => {
        const updateData: UpdatePaymentRequest = { status: 'Paid' };
        vi.mocked(mockPaymentRepo.update).mockResolvedValueOnce({
            ...mockExistingPayment,
            status: 'Paid',
            payment_date: '2026-05-29',
        });

        await useCase.execute('uuid-payment-1', updateData);

        // Verifico que update recibe un payment_date generado.
        expect(mockPaymentRepo.update).toHaveBeenCalledWith(
            'uuid-payment-1',
            expect.objectContaining({ payment_date: expect.any(String) })
        );
    });
});