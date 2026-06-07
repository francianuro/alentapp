import { randomUUID } from 'node:crypto';
export class InMemorySportRepository {
    sports = [];
    async create(data) {
        const sport = {
            id: randomUUID(),
            ...data,
        };
        this.sports.unshift(sport);
        return sport;
    }
    async findAll() {
        return [...this.sports];
    }
    async findById(id) {
        return this.sports.find((sport) => sport.id === id) ?? null;
    }
    async findByName(name) {
        return this.sports.find((sport) => sport.name.toLowerCase() === name.toLowerCase()) ?? null;
    }
    async update(id, data) {
        const index = this.sports.findIndex((sport) => sport.id === id);
        if (index === -1) {
            throw new Error('El deporte no existe');
        }
        const updatedSport = {
            ...this.sports[index],
            ...data,
        };
        this.sports[index] = updatedSport;
        return updatedSport;
    }
    async delete(id) {
        this.sports = this.sports.filter((sport) => sport.id !== id);
    }
}
