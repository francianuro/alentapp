import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { CreateLockerRequest, LockerDTO, UpdateLockerRequest } from '@alentapp/shared';
import { LockerRepository } from '../domain/LockerRepository.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBLocker = {
  id: string;
  number: number;
  location: string;
  status: 'Available' | 'Occupied' | 'Maintenance';
  member_id: string | null;
  created_at: Date;
  member?: {
    name: string;
  } | null;
};

export class PostgresLockerRepository implements LockerRepository {
  async create(data: CreateLockerRequest): Promise<LockerDTO> {
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

  async findAll(): Promise<LockerDTO[]> {
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

  async findById(id: string): Promise<LockerDTO | null> {
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

  async findByNumber(number: number): Promise<LockerDTO | null> {
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

  async update(id: string, data: UpdateLockerRequest): Promise<LockerDTO> {
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

  async delete(id: string): Promise<void> {
    await prisma.locker.delete({
      where: { id },
    });
  }

  private mapToDTO(locker: DBLocker): LockerDTO {
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
