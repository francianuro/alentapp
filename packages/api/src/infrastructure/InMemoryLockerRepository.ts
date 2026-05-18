import { randomUUID } from 'node:crypto';
import { CreateLockerRequest, LockerDTO, UpdateLockerRequest } from '@alentapp/shared';
import { LockerRepository } from '../domain/LockerRepository.js';

export class InMemoryLockerRepository implements LockerRepository {
  private lockers: LockerDTO[] = [];

  async create(data: CreateLockerRequest): Promise<LockerDTO> {
    const locker: LockerDTO = {
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

  async findAll(): Promise<LockerDTO[]> {
    return [...this.lockers];
  }

  async findById(id: string): Promise<LockerDTO | null> {
    return this.lockers.find((locker) => locker.id === id) ?? null;
  }

  async findByNumber(number: number): Promise<LockerDTO | null> {
    return this.lockers.find((locker) => locker.number === number) ?? null;
  }

  async update(id: string, data: UpdateLockerRequest): Promise<LockerDTO> {
    const index = this.lockers.findIndex((locker) => locker.id === id);
    if (index === -1) {
      throw new Error('El locker no existe');
    }

    const updatedLocker: LockerDTO = {
      ...this.lockers[index],
      ...data,
      member_id: data.member_id !== undefined ? data.member_id : this.lockers[index].member_id,
    };
    this.lockers[index] = updatedLocker;
    return updatedLocker;
  }

  async delete(id: string): Promise<void> {
    this.lockers = this.lockers.filter((locker) => locker.id !== id);
  }
}
