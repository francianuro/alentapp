import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}
const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});
export class PostgresLockerRepository {
    async create(data) {
        const locker = await prisma.locker.create({
            data: {
                number: data.number,
                location: data.location,
                status: data.status ?? 'Available',
                member_id: data.member_id ?? null,
            },
            include: {
                member: {
                    select: { name: true },
                },
            },
        });
        return this.mapToDTO(locker);
    }
    async findAll() {
        const lockers = await prisma.locker.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                member: {
                    select: { name: true },
                },
            },
        });
        return lockers.map((locker) => this.mapToDTO(locker));
    }
    async findById(id) {
        const locker = await prisma.locker.findUnique({
            where: { id },
            include: {
                member: {
                    select: { name: true },
                },
            },
        });
        return locker ? this.mapToDTO(locker) : null;
    }
    async findByNumber(number) {
        const locker = await prisma.locker.findUnique({
            where: { number },
            include: {
                member: {
                    select: { name: true },
                },
            },
        });
        return locker ? this.mapToDTO(locker) : null;
    }
    async update(id, data) {
        const locker = await prisma.locker.update({
            where: { id },
            data: {
                ...(data.number !== undefined && { number: data.number }),
                ...(data.location !== undefined && { location: data.location }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.member_id !== undefined && { member_id: data.member_id }),
            },
            include: {
                member: {
                    select: { name: true },
                },
            },
        });
        return this.mapToDTO(locker);
    }
    async delete(id) {
        await prisma.locker.delete({
            where: { id },
        });
    }
    mapToDTO(locker) {
        return {
            id: locker.id,
            number: locker.number,
            location: locker.location,
            status: locker.status,
            member_id: locker.member_id,
            member_name: locker.member?.name ?? null,
            created_at: locker.created_at.toISOString(),
        };
    }
}
