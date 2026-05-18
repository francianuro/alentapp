import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DeleteLockerUseCase } from './DeleteLockerUseCase.js';
import { LockerRepository } from '../domain/LockerRepository.js';

describe('DeleteLockerUseCase', () => {
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
    delete: vi.fn(),
  } as unknown as LockerRepository;

  const useCase = new DeleteLockerUseCase(mockLockerRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe eliminar físicamente un locker existente', async () => {
    vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(existingLocker);

    await useCase.execute('locker-1');

    expect(mockLockerRepo.findById).toHaveBeenCalledWith('locker-1');
    expect(mockLockerRepo.delete).toHaveBeenCalledWith('locker-1');
  });

  it('debe rechazar la eliminación si el locker no existe', async () => {
    vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(null);

    await expect(useCase.execute('locker-x')).rejects.toThrow('El locker no existe');
    expect(mockLockerRepo.delete).not.toHaveBeenCalled();
  });
});
