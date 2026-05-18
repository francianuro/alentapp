import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CreateLockerUseCase } from './CreateLockerUseCase.js';
import { LockerRepository } from '../domain/LockerRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';
import { CreateLockerRequest } from '@alentapp/shared';

describe('CreateLockerUseCase', () => {
  const mockLockerRepo = {
    create: vi.fn(),
  } as unknown as LockerRepository;

  const mockMemberRepo = {
    findById: vi.fn(),
  } as unknown as MemberRepository;

  const mockLockerValidator = {
    validateRequiredFields: vi.fn(),
    validateNumber: vi.fn(),
    validateStatus: vi.fn(),
    validateMemberAssignment: vi.fn(),
    validateNumberIsUnique: vi.fn(),
  } as unknown as LockerValidator;

  const useCase = new CreateLockerUseCase(mockLockerRepo, mockMemberRepo, mockLockerValidator);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe crear un locker con estado Available por defecto', async () => {
    const request: CreateLockerRequest = {
      number: 101,
      location: ' Vestuario principal ',
    };

    vi.mocked(mockLockerRepo.create).mockResolvedValueOnce({
      id: 'locker-1',
      number: 101,
      location: 'Vestuario principal',
      status: 'Available',
      member_id: null,
      member_name: null,
      created_at: new Date().toISOString(),
    });

    const result = await useCase.execute(request);

    expect(mockLockerValidator.validateRequiredFields).toHaveBeenCalledWith(request);
    expect(mockLockerValidator.validateNumber).toHaveBeenCalledWith(101);
    expect(mockLockerValidator.validateStatus).toHaveBeenCalledWith('Available');
    expect(mockLockerValidator.validateNumberIsUnique).toHaveBeenCalledWith(101);
    expect(mockLockerRepo.create).toHaveBeenCalledWith({
      number: 101,
      location: 'Vestuario principal',
      status: 'Available',
      member_id: null,
    });
    expect(result.status).toBe('Available');
  });
});
