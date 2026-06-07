import { randomUUID } from 'node:crypto';
export class InMemoryLockerRepository {
    lockers = [];
    async create(data) {
        const locker = {
            id: randomUUID(),
            number: data.number,
            location: data.location,
            status: data.status ?? 'Available',
            member_id: data.member_id ?? null,
            member_name: null,
            created_at: new Date().toISOString(),
        };
        this.lockers.unshift(locker);
        return locker;
    }
    async findAll() {
        return [...this.lockers];
    }
    async findById(id) {
        return this.lockers.find((locker) => locker.id === id) ?? null;
    }
    async findByNumber(number) {
        return this.lockers.find((locker) => locker.number === number) ?? null;
    }
    async update(id, data) {
        const index = this.lockers.findIndex((locker) => locker.id === id);
        if (index === -1) {
            throw new Error('El locker no existe');
        }
        const updatedLocker = {
            ...this.lockers[index],
            ...data,
            member_id: data.member_id !== undefined ? data.member_id : this.lockers[index].member_id,
        };
        this.lockers[index] = updatedLocker;
        return updatedLocker;
    }
    async delete(id) {
        this.lockers = this.lockers.filter((locker) => locker.id !== id);
    }
}
