import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}
const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});
export class PostgresPaymentRepository {
    async create(data) {
        const payment = await prisma.payment.create({
            data: {
                amount: data.amount,
                month: data.month,
                year: data.year,
                due_date: new Date(data.due_date),
                member_id: data.member_id,
                status: 'Pending',
            },
        });
        return this.mapToDTO(payment);
    }
    async findById(id) {
        const payment = await prisma.payment.findFirst({
            where: { id, deleted_at: null },
        });
        if (!payment)
            return null;
        return this.mapToDTO(payment);
    }
    async findAll() {
        const payments = await prisma.payment.findMany({
            where: { deleted_at: null },
            orderBy: { created_at: 'desc' },
        });
        return payments.map(p => this.mapToDTO(p));
    }
    async update(id, data) {
        const updateData = {};
        if (data.amount !== undefined)
            updateData.amount = data.amount;
        if (data.month !== undefined)
            updateData.month = data.month;
        if (data.year !== undefined)
            updateData.year = data.year;
        if (data.due_date !== undefined)
            updateData.due_date = new Date(data.due_date);
        if (data.status !== undefined)
            updateData.status = data.status;
        if (data.payment_date !== undefined) {
            updateData.payment_date = data.payment_date ? new Date(data.payment_date) : null;
        }
        if (data.deleted_at !== undefined)
            updateData.deleted_at = data.deleted_at;
        const payment = await prisma.payment.update({
            where: { id },
            data: updateData,
        });
        return this.mapToDTO(payment);
    }
    mapToDTO(payment) {
        return {
            id: payment.id,
            amount: payment.amount,
            month: payment.month,
            year: payment.year,
            status: payment.status,
            due_date: payment.due_date.toISOString().split('T')[0],
            payment_date: payment.payment_date ? payment.payment_date.toISOString().split('T')[0] : null,
            member_id: payment.member_id,
            created_at: payment.created_at.toISOString(),
            updated_at: payment.updated_at.toISOString(),
        };
    }
}
