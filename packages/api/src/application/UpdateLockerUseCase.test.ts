import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UpdateLockerUseCase } from './UpdateLockerUseCase.js';
import { LockerRepository } from '../domain/LockerRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';

describe('UpdateLockerUseCase', () => {
  const existingLocker = {
    id: 'locker-1',
    number: 101,
    location: 'Vestuario principal',
    status: 'Available' as const,
    member_id: null,
    member_name: null,
    created_at: new Date().toISOString(),
  };

  const mockLockerRepo = {
    findById: vi.fn(),
    update: vi.fn(),
  } as unknown as LockerRepository;

  const mockMemberRepo = {
    findById: vi.fn(),
  } as unknown as MemberRepository;

  const mockLockerValidator = {
    validateNumber: vi.fn(),
    validateStatus: vi.fn(),
    validateMemberAssignment: vi.fn(),
    validateNumberIsUnique: vi.fn(),
  } as unknown as LockerValidator;

  const useCase = new UpdateLockerUseCase(mockLockerRepo, mockMemberRepo, mockLockerValidator);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe actualizar campos de un locker existente', async () => {
    const updateData = {
      number: 102,
      location: 'Vestuario secundario',
      status: 'Occupied' as const,
      member_id: 'member-1',
    };

    vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(existingLocker);
    vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({
      id: 'member-1',
      dni: '12345678',
      name: 'Juan Pérez',
      email: 'juan@test.com',
      birthdate: '2000-01-01',
      category: 'Pleno',
      status: 'Activo',
      created_at: new Date().toISOString(),
    });
    vi.mocked(mockLockerRepo.update).mockResolvedValueOnce({
      ...existingLocker,
      ...updateData,
      member_name: 'Juan Pérez',
    });

    const result = await useCase.execute('locker-1', updateData);

    expect(mockLockerRepo.findById).toHaveBeenCalledWith('locker-1');
    expect(mockLockerValidator.validateNumber).toHaveBeenCalledWith(102);
    expect(mockLockerValidator.validateNumberIsUnique).toHaveBeenCalledWith(102, 'locker-1');
    expect(mockLockerValidator.validateStatus).toHaveBeenCalledWith('Occupied');
    expect(mockLockerValidator.validateMemberAssignment).toHaveBeenCalledWith('Occupied', 'member-1');
    expect(mockMemberRepo.findById).toHaveBeenCalledWith('member-1');
    expect(mockLockerRepo.update).toHaveBeenCalledWith('locker-1', updateData);
    expect(result.number).toBe(102);
  });

  it('debe rechazar la actualización si el locker no existe', async () => {
    vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(null);

    await expect(useCase.execute('locker-x', { location: 'Nueva ubicación' })).rejects.toThrow('El locker no existe');
    expect(mockLockerRepo.update).not.toHaveBeenCalled();
  });
});
