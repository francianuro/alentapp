import { randomUUID } from 'node:crypto';
export class InMemoryEnrollmentRepository {
    enrollments = [];
    async create(data) {
        const enrollment = {
            id: randomUUID(),
            member_id: data.member_id,
            sport_id: data.sport_id,
            enrollment_date: data.enrollment_date ?? new Date().toISOString(),
            is_active: true,
        };
        this.enrollments.unshift(enrollment);
        return enrollment;
    }
    async findAll() {
        return [...this.enrollments];
    }
    async findById(id) {
        return this.enrollments.find((enrollment) => enrollment.id === id) ?? null;
    }
    async existsBySportId(sportId) {
        return this.enrollments.some((enrollment) => enrollment.sport_id === sportId);
    }
    async existsByMemberAndSport(memberId, sportId) {
        return this.enrollments.some((enrollment) => enrollment.member_id === memberId && enrollment.sport_id === sportId);
    }
    async delete(id) {
        this.enrollments = this.enrollments.filter((enrollment) => enrollment.id !== id);
    }
}
