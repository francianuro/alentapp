import { LockerDTO, LockerStatus, UpdateLockerRequest } from '@alentapp/shared';
import { LockerRepository } from '../domain/LockerRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';

export class UpdateLockerUseCase {
  constructor(
    private readonly lockerRepo: LockerRepository,
    private readonly memberRepo: MemberRepository,
    private readonly lockerValidator: LockerValidator,
  ) {}

  async execute(id: string, data: UpdateLockerRequest): Promise<LockerDTO> {
    const existingLocker = await this.lockerRepo.findById(id);
    if (!existingLocker) {
      throw new Error('El locker no existe');
    }

    if (data.number !== undefined) {
      this.lockerValidator.validateNumber(data.number);
      await this.lockerValidator.validateNumberIsUnique(data.number, id);
    }

    if (data.status !== undefined) {
      this.lockerValidator.validateStatus(data.status);
    }

    if (data.location !== undefined && data.location.trim().length === 0) {
      throw new Error('Debe completar todos los campos');
    }

    const nextStatus: LockerStatus = data.status ?? existingLocker.status;
    const nextMemberId = data.member_id !== undefined ? data.member_id : existingLocker.member_id;
    this.lockerValidator.validateMemberAssignment(nextStatus, nextMemberId);

    if (data.member_id) {
      const member = await this.memberRepo.findById(data.member_id);
      if (!member) {
        throw new Error('El socio no existe');
      }
    }

    return this.lockerRepo.update(id, {
      ...(data.number !== undefined && { number: data.number }),
      ...(data.location !== undefined && { location: data.location.trim() }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.member_id !== undefined && { member_id: data.member_id || null }),
    });
  }
}
