import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteMedicalCertificateUseCase } from './DeleteMedicalCertificateUseCase.js';
import type { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import type { MedicalCertificateDTO } from '@alentapp/shared';

describe('DeleteMedicalCertificateUseCase', () => {
  // Se crea un mock del repositorio con los metodos que usa el CU findById
  // para verificar existencia y delete (para el borrado logico)
  const mockMedCertRepo = {
    findById: vi.fn(),
    delete: vi.fn(),
  } as unknown as MedicalCertificateRepository;

  const useCase = new DeleteMedicalCertificateUseCase(mockMedCertRepo);

  // Certificado de ejemplo: no validado y no eliminado (condicion necesaria para poder eliminarlo0
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
  });

  // comprueba que el CU lance error si el certificado no existe (findById retorna null)
  // se mockea findById para que retorne null
  it('debe lanzar error si el certificado no existe', async () => {
    vi.mocked(mockMedCertRepo.findById).mockResolvedValueOnce(null);

    await expect(useCase.execute('no-existe')).rejects.toThrow(
      'Certificado no encontrado',
    );
    expect(mockMedCertRepo.delete).not.toHaveBeenCalled();
  });

  // comprueba que el CU rechace la eliminaciOn de un
  // certificado que esta validado 
  // se mockea findById para retornar un certificado con isValidated=true
  it('debe lanzar error si el certificado está validado', async () => {
    vi.mocked(mockMedCertRepo.findById).mockResolvedValueOnce({
      ...mockCertificate,
      isValidated: true,
    });

    await expect(useCase.execute('cert-uuid')).rejects.toThrow(
      'No se puede eliminar un certificado validado',
    );
    expect(mockMedCertRepo.delete).not.toHaveBeenCalled();
  });
});