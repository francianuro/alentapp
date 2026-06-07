export class DeleteSportUseCase {
    sportRepo;
    enrollmentRepo;
    constructor(sportRepo, enrollmentRepo) {
        this.sportRepo = sportRepo;
        this.enrollmentRepo = enrollmentRepo;
    }
    async execute(id) {
        const existingSport = await this.sportRepo.findById(id);
        if (!existingSport) {
            throw new Error('El deporte no existe');
        }
        const hasEnrollments = await this.enrollmentRepo.existsBySportId(id);
        if (hasEnrollments) {
            throw new Error('No se puede eliminar un deporte con inscripciones');
        }
        await this.sportRepo.delete(id);
    }
}
