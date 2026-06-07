import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../generated/client/client.js';
const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({
    connectionString,
});
const prisma = new PrismaClient({
    adapter,
});
export class PostgresMedicalCertificateRepository {
    async invalidatePreviousCertificates(memberId) {
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
    async create(data) {
        try {
            const medicalCertificate = await prisma.medicalCertificate.create({
                data: {
                    memberId: data.memberId,
                    expiryDate: new Date(data.expiryDate),
                    doctorLicense: data.doctorLicense,
                    isValidated: true,
                },
            });
            return {
                id: medicalCertificate.id,
                issueDate: medicalCertificate.issueDate.toISOString(),
                expiryDate: medicalCertificate.expiryDate.toISOString(),
                doctorLicense: medicalCertificate.doctorLicense,
                isValidated: medicalCertificate.isValidated,
                deletedAt: medicalCertificate.deletedAt
                    ? medicalCertificate.deletedAt.toISOString()
                    : null,
                memberId: medicalCertificate.memberId,
            };
        }
        catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                throw new Error('Error interno, reintente más tarde');
            }
            throw error;
        }
    }
    async findAll() {
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
    async findById(id) {
        const certificate = await prisma.medicalCertificate.findUnique({
            where: { id },
        });
        if (!certificate)
            return null;
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
    async update(id, data) {
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
    async delete(id) {
        await prisma.medicalCertificate.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });
    }
}
