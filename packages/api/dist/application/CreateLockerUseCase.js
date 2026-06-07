export class CreateLockerUseCase {
    lockerRepo;
    memberRepo;
    lockerValidator;
    constructor(lockerRepo, memberRepo, lockerValidator) {
        this.lockerRepo = lockerRepo;
        this.memberRepo = memberRepo;
        this.lockerValidator = lockerValidator;
    }
    async execute(data) {
        this.lockerValidator.validateRequiredFields(data);
        this.lockerValidator.validateNumber(data.number);
        const status = data.status ?? 'Available';
        this.lockerValidator.validateStatus(status);
        this.lockerValidator.validateMemberAssignment(status, data.member_id);
        await this.lockerValidator.validateNumberIsUnique(data.number);
        if (data.member_id) {
            const member = await this.memberRepo.findById(data.member_id);
            if (!member) {
                throw new Error('El socio no existe');
            }
        }
        return this.lockerRepo.create({
            number: data.number,
            location: data.location.trim(),
            status,
            member_id: data.member_id ?? null,
        });
    }
}
