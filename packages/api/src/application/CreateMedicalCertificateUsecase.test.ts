import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateMedicalCertificateUseCase } from './CreateMedicalCertificateUseCase.js';
import type { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import type { MemberRepository } from '../domain/MemberRepository.js';
import type { MedicalCertificateValidator } from '../domain/services/MedicalCertificateValidator.js';
import type { CreateMedicalCertificateRequest, MedicalCertificateDTO } from '@alentapp/shared';

describe('CreateMedicalCertificateUseCase', () => {
  // Se crean mocks de las tres dependencias (repositorio de certificados,
  // repositorio de socios y validador) aíslando el CU de la bd
  // y de la lógica de validación
  const mockMedCertRepo = {
    invalidatePreviousCertificates: vi.fn(),
    create: vi.fn(),
  } as unknown as MedicalCertificateRepository;

  const mockMemberRepo = {
    findById: vi.fn(),
  } as unknown as MemberRepository;

  const mockValidator = {
    validate: vi.fn(),
  } as unknown as MedicalCertificateValidator;

  const useCase = new CreateMedicalCertificateUseCase(
    mockMedCertRepo,
    mockMemberRepo,
    mockValidator,
  );

  const mockRequest: CreateMedicalCertificateRequest = {
    memberId: 'member-uuid',
    expiryDate: '2027-01-01',
    doctorLicense: 'LIC-1234',
  };

  const mockResponse: MedicalCertificateDTO = {
    id: 'cert-uuid',
    issueDate: '2026-05-30',
    expiryDate: '2027-01-01',
    doctorLicense: 'LIC-1234',
    isValidated: true,
    deletedAt: null,
    memberId: 'member-uuid',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // se comprueba el flujo completo de creacion 
  // se mockea findById del repositorio de socios para que retorne
  // un socio existente y create del repo de certificados para que
  // retorne el certificado creado
  // se verifica que se llame al validador, se verifique la existencia del socio,
  // se invaliden certificados anteriores, se cree el nuevo certificado y el 
  // resultado coincide con lo esperado
  it('debe crear el certificado, invalidar los anteriores y devolver el nuevo', async () => {
    vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({
      id: 'member-uuid',
    } as any);
    vi.mocked(mockMedCertRepo.create).mockResolvedValueOnce(mockResponse);

    const result = await useCase.execute(mockRequest);

    expect(mockValidator.validate).toHaveBeenCalledWith(mockRequest);
    expect(mockMemberRepo.findById).toHaveBeenCalledWith('member-uuid');
    expect(mockMedCertRepo.invalidatePreviousCertificates).toHaveBeenCalledWith(
      'member-uuid',
    );
    expect(mockMedCertRepo.create).toHaveBeenCalledWith(mockRequest);
    expect(result).toEqual(mockResponse);
  });

  // se comprueba que el CU tire error cuando el socio no existe en la bd
  // se mockea findById para que retorne null, se ejecuta el CU
  // tambien se verifica que no se haya intentado invalidar certificados 
  // ni crear uno nuevo
  it('debe lanzar error si el socio no existe', async () => {
    vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

    await expect(useCase.execute(mockRequest)).rejects.toThrow(
      'El socio no existe',
    );
    expect(
      mockMedCertRepo.invalidatePreviousCertificates,
    ).not.toHaveBeenCalled();
    expect(mockMedCertRepo.create).not.toHaveBeenCalled();
  });
});