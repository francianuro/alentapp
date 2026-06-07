import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}
const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});
export class PostgresSportRepository {
    async create(data) {
        const sport = await prisma.sport.create({
            data: {
                name: data.name,
                description: data.description,
                max_capacity: data.max_capacity,
                additional_price: data.additional_price,
                requires_medical_certificate: data.requires_medical_certificate,
            },
        });
        return this.mapToDTO(sport);
    }
    async findAll() {
        const sports = await prisma.sport.findMany({
            orderBy: { created_at: 'desc' },
        });
        return sports.map((sport) => this.mapToDTO(sport));
    }
    async findById(id) {
        const sport = await prisma.sport.findUnique({
            where: { id },
        });
        return sport ? this.mapToDTO(sport) : null;
    }
    async findByName(name) {
        const sport = await prisma.sport.findFirst({
            where: {
                name: {
                    equals: name.trim(),
                    mode: 'insensitive',
                },
            },
        });
        return sport ? this.mapToDTO(sport) : null;
    }
    async update(id, data) {
        const sport = await prisma.sport.update({
            where: { id },
            data: {
                ...(data.description !== undefined && { description: data.description }),
                ...(data.max_capacity !== undefined && { max_capacity: data.max_capacity }),
                ...(data.additional_price !== undefined && { additional_price: data.additional_price }),
                ...(data.requires_medical_certificate !== undefined && {
                    requires_medical_certificate: data.requires_medical_certificate,
                }),
            },
        });
        return this.mapToDTO(sport);
    }
    async delete(id) {
        await prisma.sport.delete({
            where: { id },
        });
    }
    mapToDTO(sport) {
        return {
            id: sport.id,
            name: sport.name,
            description: sport.description,
            max_capacity: sport.max_capacity,
            additional_price: Number(sport.additional_price),
            requires_medical_certificate: sport.requires_medical_certificate,
        };
    }
}
