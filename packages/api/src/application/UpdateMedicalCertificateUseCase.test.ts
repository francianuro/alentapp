import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateMedicalCertificateUseCase } from './UpdateMedicalCertificateUseCase.js';
import type { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import type { MedicalCertificateValidator } from '../domain/services/MedicalCertificateValidator.js';
import type { MedicalCertificateDTO } from '@alentapp/shared';

describe('UpdateMedicalCertificateUseCase', () => {
  // Se crean mocks del repositorio de certificados y del validador para
  // aislar la lógica del CU
  const mockMedCertRepo = {
    findById: vi.fn(),
    invalidatePreviousCertificates: vi.fn(),
    update: vi.fn(),
  } as unknown as MedicalCertificateRepository;

  const mockValidator = {
    validateUpdate: vi.fn(),
  } as unknown as MedicalCertificateValidator;

  const useCase = new UpdateMedicalCertificateUseCase(
    mockMedCertRepo,
    mockValidator,
  );

  // Se define un certificado mockeado que servirá como estado inicial para varios tests
  const mockCertificate: MedicalCertificateDTO = {
    id: 'cert-uuid',
    issueDate: '2026-01-01',
    expiryDate: '2026-06-01',
    doctorLicense: 'LIC-1234',
    isValidated: false,
    deletedAt: null,
    memberId: 'member-uuid',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Por defecto el certificado existe, asi se evita repetir el mock en
    // cada test que requiere un certificado existente
    vi.mocked(mockMedCertRepo.findById).mockResolvedValue(mockCertificate);
  });

  // se comprueba que el CU rechace la actualización
  // cuando el certificado no existe 
  // sobreescribe el mock de findById para que retorne null
  it('debe lanzar error si el certificado no existe', async () => {
    vi.mocked(mockMedCertRepo.findById).mockResolvedValueOnce(null);

    await expect(useCase.execute('no-existe', {})).rejects.toThrow(
      'Certificado no encontrado',
    );
  });

  // se verifica que al activar isValidated=true se invalidan
  // los certificados anteriores del mismo socio
  // se ejecuta update con isValidated=true, verificando que
  // se llamo a invalidatePreviousCertificates con el memberId del certificado
  // existente y que luego se llamo a update con los datos correctos
  it('debe invalidar certificados anteriores si se activa isValidated=true', async () => {
    vi.mocked(mockMedCertRepo.update).mockResolvedValueOnce({
      ...mockCertificate,
      isValidated: true,
    });

    await useCase.execute('cert-uuid', { isValidated: true });

    expect(
      mockMedCertRepo.invalidatePreviousCertificates,
    ).toHaveBeenCalledWith('member-uuid');
    expect(mockMedCertRepo.update).toHaveBeenCalledWith('cert-uuid', {
      isValidated: true,
    });
  });
});