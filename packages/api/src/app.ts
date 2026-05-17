import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PostgresMemberRepository } from './infrastructure/PostgresMemberRepository.js';
import { MemberValidator } from './domain/services/MemberValidator.js';
import { CreateMemberUseCase } from './application/NewMemberUseCase.js';
import { GetMembersUseCase } from './application/GetMembersUseCase.js';
import { UpdateMemberUseCase } from './application/UpdateMemberUseCase.js';
import { DeleteMemberUseCase } from './application/DeleteMemberUseCase.js';
import { MemberController } from './delivery/MemberController.js';
import { PostgresSportRepository } from './infrastructure/PostgresSportRepository.js';
import { PostgresEnrollmentRepository } from './infrastructure/PostgresEnrollmentRepository.js';
import { SportValidator } from './domain/services/SportValidator.js';
import { CreateSportUseCase } from './application/CreateSportUseCase.js';
import { GetSportsUseCase } from './application/GetSportsUseCase.js';
import { UpdateSportUseCase } from './application/UpdateSportUseCase.js';
import { DeleteSportUseCase } from './application/DeleteSportUseCase.js';
import { SportController } from './delivery/SportController.js';
import { PostgresMedicalCertificateRepository } from './infrastructure/PostgresMedicalCertificateRepository.js';
import { MedicalCertificateValidator } from './domain/services/MedicalCertificateValidator.js';
import { CreateMedicalCertificateUseCase } from './application/CreateMedicalCertificateUseCase.js';
import { MedicalCertificateController } from './delivery/MedicalCertificateController.js';
import { GetMedicalCertificatesUseCase } from './application/GetMedicalCertificateUseCase.js';
import { UpdateMedicalCertificateUseCase } from './application/UpdateMedicalCertificateUseCase.js';
import { DeleteMedicalCertificateUseCase } from './application/DeleteMedicalCertificateUseCase.js';
import { PostgresPaymentRepository } from './infrastructure/PostgresPaymentRepository.ts';
import { PaymentValidator } from './domain/services/PaymentValidator.js';
import { CreatePaymentUseCase } from './application/CreatePaymentUseCase.ts';
import { UpdatePaymentUseCase } from './application/UpdatePaymentUseCase.ts';
import { GetPaymentsUseCase } from './application/GetPaymentsUseCase.ts';
import { PaymentController } from './delivery/PaymentController.ts';
import { CreateEnrollmentUseCase } from './application/CreateEnrollmentUseCase.js';
import { GetEnrollmentsUseCase } from './application/GetEnrollmentsUseCase.js';
import { DeleteEnrollmentUseCase } from './application/DeleteEnrollmentUseCase.js';
import { EnrollmentController } from './delivery/EnrollmentController.js';

export function buildApp() {
    const server = Fastify({
        logger: {
            level: 'info',
            transport: process.env.NODE_ENV === 'development'
                ? {
                    target: 'pino-pretty',
                    options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
                }
                : undefined,
        },
    });
    server.register(cors, {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });
    const memberRepo = new PostgresMemberRepository();
    const memberValidator = new MemberValidator(memberRepo);

    const createMemberUseCase = new CreateMemberUseCase(memberRepo, memberValidator);
    const getMembersUseCase = new GetMembersUseCase(memberRepo);
    const updateMemberUseCase = new UpdateMemberUseCase(memberRepo, memberValidator);
    const deleteMemberUseCase = new DeleteMemberUseCase(memberRepo);
    const memberController = new MemberController(
        createMemberUseCase,
        getMembersUseCase,
        updateMemberUseCase,
        deleteMemberUseCase
    );

    const sportRepo = new PostgresSportRepository();
    const enrollmentRepo = new PostgresEnrollmentRepository();
    const sportValidator = new SportValidator(sportRepo);
    const createSportUseCase = new CreateSportUseCase(sportRepo, sportValidator);
    const getSportsUseCase = new GetSportsUseCase(sportRepo);
    const updateSportUseCase = new UpdateSportUseCase(sportRepo, sportValidator);
    const deleteSportUseCase = new DeleteSportUseCase(sportRepo, enrollmentRepo);
    const sportController = new SportController(
        createSportUseCase,
        getSportsUseCase,
        updateSportUseCase,
        deleteSportUseCase
    );
    const medicalCertificateRepo = new PostgresMedicalCertificateRepository();
    const medicalCertificateValidator = new MedicalCertificateValidator();
    const createMedicalCertificateUseCase = new CreateMedicalCertificateUseCase(
      medicalCertificateRepo,
      memberRepo,
      medicalCertificateValidator
    );
    const getMedicalCertificatesUseCase = new GetMedicalCertificatesUseCase(medicalCertificateRepo
    );
     const updateMedicalCertificateUseCase = new UpdateMedicalCertificateUseCase(
      medicalCertificateRepo,
      medicalCertificateValidator,
    );
    const deleteMedicalCertificateUseCase = new DeleteMedicalCertificateUseCase(
      medicalCertificateRepo,
    );
    const medicalCertificateController = new MedicalCertificateController(
        createMedicalCertificateUseCase,
        getMedicalCertificatesUseCase,
        updateMedicalCertificateUseCase,
        deleteMedicalCertificateUseCase, 
    );

    const paymentRepo = new PostgresPaymentRepository();
    const paymentValidator = new PaymentValidator(memberRepo);
    const createPaymentUseCase = new CreatePaymentUseCase(paymentRepo, paymentValidator);
    const updatePaymentUseCase = new UpdatePaymentUseCase(paymentRepo, paymentValidator);
    const getPaymentsUseCase = new GetPaymentsUseCase(paymentRepo);
    const paymentController = new PaymentController(createPaymentUseCase, updatePaymentUseCase,getPaymentsUseCase);

    const createEnrollmentUseCase = new CreateEnrollmentUseCase(enrollmentRepo, memberRepo, sportRepo);
    const getEnrollmentsUseCase = new GetEnrollmentsUseCase(enrollmentRepo);
    const deleteEnrollmentUseCase = new DeleteEnrollmentUseCase(enrollmentRepo);
    const enrollmentController = new EnrollmentController(
        createEnrollmentUseCase,
        getEnrollmentsUseCase,
        deleteEnrollmentUseCase
    );

    server.get('/api/v1/socios', memberController.getAll.bind(memberController));
    server.post('/api/v1/socios', memberController.create.bind(memberController));
    server.put('/api/v1/socios/:id', memberController.update.bind(memberController));
    server.delete('/api/v1/socios/:id', memberController.delete.bind(memberController));
    server.get('/api/v1/deportes', sportController.getAll.bind(sportController));
    server.post('/api/v1/deportes', sportController.create.bind(sportController));
    server.put('/api/v1/deportes/:id', sportController.update.bind(sportController));
    server.delete('/api/v1/deportes/:id', sportController.delete.bind(sportController));
    server.get('/api/v1/certificados-medicos', medicalCertificateController.getAll.bind(medicalCertificateController));
    server.post('/api/v1/certificados-medicos', medicalCertificateController.create.bind(medicalCertificateController));
    server.put('/api/v1/certificados-medicos/:id', medicalCertificateController.update.bind(medicalCertificateController));
    server.delete('/api/v1/certificados-medicos/:id', medicalCertificateController.delete.bind(medicalCertificateController));

    server.post('/api/v1/pagos', paymentController.create.bind(paymentController));
    server.get('/api/v1/pagos', paymentController.getAll.bind(paymentController));

    server.put('/api/v1/pagos/:id', paymentController.update.bind(paymentController));

    server.get('/api/v1/inscripciones', enrollmentController.getAll.bind(enrollmentController));
    server.post('/api/v1/inscripciones', enrollmentController.create.bind(enrollmentController));
    server.delete('/api/v1/inscripciones/:id', enrollmentController.delete.bind(enrollmentController));


    server.get('/', async (req, rep) => {
        rep.status(200).send({ msg: 'asd' })
    });
    return server;
}
// Solo iniciar el servidor si el script se ejecuta directamente (no cuando es importado por vitest)
if (process.argv[1] && process.argv[1].endsWith('app.ts')) {
    const server = buildApp();
    const port = parseInt(process.env.PORT || '3000', 10);
    server.listen({ port, host: '0.0.0.0' }, () =>
        server.log.info(`API server running on http://localhost:${port}`)
    );
    ['SIGINT', 'SIGTERM'].forEach((signal) => {
        process.on(signal, async () => {
            await server.close();
            process.exit(0);
        });
    });
}