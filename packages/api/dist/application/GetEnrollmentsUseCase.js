export class GetEnrollmentsUseCase {
    enrollmentRepo;
    constructor(enrollmentRepo) {
        this.enrollmentRepo = enrollmentRepo;
    }
    async execute() {
        return this.enrollmentRepo.findAll();
    }
}
