import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetPaymentsUseCase } from './GetPaymentsUseCase.ts';
import { PaymentRepository } from '../domain/PaymentRepository.ts';

describe('GetPaymentsUseCase', () => {
    const mockPaymentRepo = {
        findAll: vi.fn(),
    } as unknown as PaymentRepository;

    const useCase = new GetPaymentsUseCase(mockPaymentRepo);

    beforeEach(() => { vi.clearAllMocks(); });

    // TEST 7: Retorna la lista
    it('debe retornar la lista de pagos', async () => {
        const mockPayments = [
            { id: 'uuid-payment-1', amount: 100 },
            { id: 'uuid-payment-2', amount: 200 }
        ];

        vi.mocked(mockPaymentRepo.findAll).mockResolvedValueOnce(mockPayments as any);

        const result = await useCase.execute();

        expect(result).toEqual(mockPayments);
        expect(mockPaymentRepo.findAll).toHaveBeenCalledOnce();
    });

    // TEST 8: Retorna lista vacía si no hay pagos
    it('debe retornar array vacío si no hay pagos', async () => {
        vi.mocked(mockPaymentRepo.findAll).mockResolvedValueOnce([]);

        const result = await useCase.execute();

        expect(result).toEqual([]);
    });
});