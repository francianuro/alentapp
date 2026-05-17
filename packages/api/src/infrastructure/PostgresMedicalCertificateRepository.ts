import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../generated/client/client.js';
import { MedicalCertificateRepository }
from '../domain/MedicalCertificateRepository.js';
import {
  MedicalCertificateDTO,
  CreateMedicalCertificateRequest,
  UpdateMedicalCertificateRequest,
} from '@alentapp/shared';
const connectionString =
  process.env.DATABASE_URL as string;
const adapter = new PrismaPg({
  connectionString,
});
const prisma = new PrismaClient({
  adapter,
});
export class PostgresMedicalCertificateRepository
  implements MedicalCertificateRepository {
  async invalidatePreviousCertificates(
    memberId: string
  ): Promise<void> {
    await prisma.medicalCertificate.updateMany({
      where: {
        memberId,
        isValidated: true,
        deletedAt: null,
      },
      data: {
        isValidated: false,
      },
    });
  }
  async create(
    data: CreateMedicalCertificateRequest
  ): Promise<MedicalCertificateDTO> {
    try {
      const medicalCertificate =
        await prisma.medicalCertificate.create({
          data: {
            memberId: data.memberId,
            expiryDate: new Date(data.expiryDate),
            doctorLicense: data.doctorLicense,
            isValidated: true,
          },
        });
      return {
        id: medicalCertificate.id,
        issueDate:
          medicalCertificate.issueDate.toISOString(),
        expiryDate:
          medicalCertificate.expiryDate.toISOString(),
        doctorLicense:
          medicalCertificate.doctorLicense,
        isValidated:
          medicalCertificate.isValidated,
        deletedAt:
          medicalCertificate.deletedAt
            ? medicalCertificate.deletedAt.toISOString()
            : null,
        memberId:
          medicalCertificate.memberId,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new Error(
          'Error interno, reintente más tarde'
        );
      }
      throw error;
    }
  }
  async findAll(): Promise<MedicalCertificateDTO[]> {
    const certificates = await prisma.medicalCertificate.findMany({
      where: { deletedAt: null },
      orderBy: { issueDate: 'desc' },
    });
    return certificates.map((cert) => ({
      id: cert.id,
      issueDate: cert.issueDate.toISOString(),
      expiryDate: cert.expiryDate.toISOString(),
      doctorLicense: cert.doctorLicense,
      isValidated: cert.isValidated,
      deletedAt: cert.deletedAt ? cert.deletedAt.toISOString() : null,
      memberId: cert.memberId,
    }));
  }
  async findById(id: string): Promise<MedicalCertificateDTO | null> {
    const certificate = await prisma.medicalCertificate.findUnique({
      where: { id },
    });
    if (!certificate) return null;
    return {
      id: certificate.id,
      issueDate: certificate.issueDate.toISOString(),
      expiryDate: certificate.expiryDate.toISOString(),
      doctorLicense: certificate.doctorLicense,
      isValidated: certificate.isValidated,
      deletedAt: certificate.deletedAt ? certificate.deletedAt.toISOString() : null,
      memberId: certificate.memberId,
    };
  }
  async update(
    id: string,
    data: UpdateMedicalCertificateRequest
  ): Promise<MedicalCertificateDTO> {
    const certificate = await prisma.medicalCertificate.update({
      where: { id },
      data: {
        ...(data.expiryDate !== undefined && { expiryDate: new Date(data.expiryDate) }),
        ...(data.isValidated !== undefined && { isValidated: data.isValidated }),
      },
    });
    return {
      id: certificate.id,
      issueDate: certificate.issueDate.toISOString(),
      expiryDate: certificate.expiryDate.toISOString(),
      doctorLicense: certificate.doctorLicense,
      isValidated: certificate.isValidated,
      deletedAt: certificate.deletedAt ? certificate.deletedAt.toISOString() : null,
      memberId: certificate.memberId,
    };
  }
  async delete(id: string): Promise<void> {
    await prisma.medicalCertificate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    })
  }
}