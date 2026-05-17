import type { MedicalCertificateDTO, CreateMedicalCertificateRequest, UpdateMedicalCertificateRequest } from '@alentapp/shared';
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';
export const medicalCertificatesService = {
  async getAll(): Promise<MedicalCertificateDTO[]> {
    const response = await fetch(`${API_URL}/certificados-medicos`);
    if (!response.ok) {
      throw new Error('Error al obtener los certificados');
    }
    const result = await response.json();
    return result.data;
  },
  async create(data: CreateMedicalCertificateRequest): Promise<MedicalCertificateDTO> {
    const response = await fetch(`${API_URL}/certificados-medicos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al crear el certificado médico');
    }
    const result = await response.json();
    return result.data;
  },
  async update(id: string, data: UpdateMedicalCertificateRequest): Promise<MedicalCertificateDTO> {
    const response = await fetch(`${API_URL}/certificados-medicos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al actualizar el certificado');
    }
    const result = await response.json();
    return result.data;
  },
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/certificados-medicos/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al eliminar el certificado');
    }
  },
};