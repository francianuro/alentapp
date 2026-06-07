import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}
const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});
export class PostgresEnrollmentRepository {
    async create(data) {
        const enrollment = await prisma.enrollment.create({
            data: {
                member_id: data.member_id,
                sport_id: data.sport_id,
                ...(data.enrollment_date && { enrollment_date: new Date(data.enrollment_date) }),
            },
            include: {
                member: { select: { name: true } },
                sport: { select: { name: true } },
            },
        });
        return this.mapToDTO(enrollment);
    }
    async findAll() {
        const enrollments = await prisma.enrollment.findMany({
            orderBy: { enrollment_date: 'desc' },
            include: {
                member: { select: { name: true } },
                sport: { select: { name: true } },
            },
        });
        return enrollments.map((enrollment) => this.mapToDTO(enrollment));
    }
    async findById(id) {
        const enrollment = await prisma.enrollment.findUnique({
            where: { id },
            include: {
                member: { select: { name: true } },
                sport: { select: { name: true } },
            },
        });
        return enrollment ? this.mapToDTO(enrollment) : null;
    }
    async existsBySportId(sportId) {
        const count = await prisma.enrollment.count({
            where: { sport_id: sportId },
        });
        return count > 0;
    }
    async existsByMemberAndSport(memberId, sportId) {
        const enrollment = await prisma.enrollment.findFirst({
            where: {
                member_id: memberId,
                sport_id: sportId,
            },
        });
        return enrollment !== null;
    }
    async delete(id) {
        await prisma.enrollment.delete({
            where: { id },
        });
    }
    mapToDTO(enrollment) {
        return {
            id: enrollment.id,
            member_id: enrollment.member_id,
            sport_id: enrollment.sport_id,
            enrollment_date: enrollment.enrollment_date.toISOString(),
            is_active: enrollment.is_active,
            member_name: enrollment.member?.name,
            sport_name: enrollment.sport?.name,
        };
    }
}
