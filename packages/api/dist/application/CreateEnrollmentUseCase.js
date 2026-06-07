export class CreateEnrollmentUseCase {
    enrollmentRepo;
    memberRepo;
    sportRepo;
    constructor(enrollmentRepo, memberRepo, sportRepo) {
        this.enrollmentRepo = enrollmentRepo;
        this.memberRepo = memberRepo;
        this.sportRepo = sportRepo;
    }
    async execute(request) {
        if (!request.member_id) {
            throw new Error('El socio es obligatorio');
        }
        if (!request.sport_id) {
            throw new Error('El deporte es obligatorio');
        }
        const member = await this.memberRepo.findById(request.member_id);
        if (!member) {
            throw new Error('El socio no existe');
        }
        const sport = await this.sportRepo.findById(request.sport_id);
        if (!sport) {
            throw new Error('El deporte no existe');
        }
        const alreadyExists = await this.enrollmentRepo.existsByMemberAndSport(request.member_id, request.sport_id);
        if (alreadyExists) {
            throw new Error('El socio ya está inscripto en ese deporte');
        }
        return this.enrollmentRepo.create(request);
    }
}
