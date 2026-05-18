import { CreateLockerRequest, LockerDTO, LockerStatus } from '@alentapp/shared';
import { LockerRepository } from '../domain/LockerRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';

export class CreateLockerUseCase {
  constructor(
    private readonly lockerRepo: LockerRepository,
    private readonly memberRepo: MemberRepository,
    private readonly lockerValidator: LockerValidator,
  ) {}

  async execute(data: CreateLockerRequest): Promise<LockerDTO> {
    this.lockerValidator.validateRequiredFields(data);
    this.lockerValidator.validateNumber(data.number);

    const status: LockerStatus = data.status ?? 'Available';
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
