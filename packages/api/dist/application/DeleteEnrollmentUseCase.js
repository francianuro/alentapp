export class DeleteEnrollmentUseCase {
    enrollmentRepo;
    constructor(enrollmentRepo) {
        this.enrollmentRepo = enrollmentRepo;
    }
    async execute(id) {
        const existingEnrollment = await this.enrollmentRepo.findById(id);
        if (!existingEnrollment) {
            throw new Error('La inscripción no existe');
        }
        await this.enrollmentRepo.delete(id);
    }
}
