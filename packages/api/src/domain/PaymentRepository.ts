import { PaymentDTO, CreatePaymentRequest } from "@alentapp/shared";

export interface PaymentRepository {

    /**
     * Crea un nuevo pago
     * @param payment Datos del pago sin el ID
     * (se genera en la persistencia)
     */
    create(payment: Omit<PaymentDTO, 'id'>): Promise<PaymentDTO>;

    /**
     * Busca un pago por su id
     */
    findById(id: string): Promise<PaymentDTO | null>;

    /**
     * Recupera todos los pagos asociados a un socio específoco
     */
    findByMemberId(memberId: string): Promise<PaymentDTO[]>;

    /**
     * Actualiza el estado de un pago (p.ej de Pending a Paid)
     */
    updateStatus(id: string, status: PaymentDTO['status'], paymentDate?: string): Promise<PaymentDTO>;

}