import { PaymentRepository } from '../domain/PaymentRepository.ts';
import { MemberRepository } from '../domain/MemberRepository.ts';
import { CreatePaymentRequest, PaymentDTO } from '@alentapp/shared';

export class CreatePaymentUseCase {
    constructor(
        private paymentRepository: PaymentRepository,
        private memberRepository: MemberRepository
    ) { }

    async execute(request: CreatePaymentRequest): Promise<PaymentDTO> {
        // 1. Validar que el socio exista
        const member = await this.memberRepository.findById(request.member_id);

        if (!member) {
            throw new Error('MEMBER_NOT_FOUND');
        }

        // 2. Validar lógica (monto > 0, etc.)

        // 3. Persistir
        return await this.paymentRepository.create({
            ...request,
            status: 'Pending',
            payment_date: null,
        });
    }
}