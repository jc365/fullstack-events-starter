/**
 * @file CreateCastingUseCase.ts
 * @module application/use-cases/castings
 */

import Casting from '../../domain/entities/Casting';
import Round from '../../domain/entities/Round';
import User from '../../domain/entities/User';
import CastingTitle from '../../domain/value-objects/CastingTitle';
import Description from '../../domain/value-objects/Description';
import Email from '../../domain/value-objects/Email';
import FullName from '../../domain/value-objects/FullName';
import ICastingRepository from '../interfaces/ICastingRepository';
import IRoundRepository from '../interfaces/IRoundRepository';
import IUserRepository from '../interfaces/IUserRepository';
import { CreateCastingInput } from '../dtos';
import logger from '../../infrastructure/logging/requestContext';
import BitacoraService from '../../infrastructure/logging/BitacoraService';
import HashService from '../../infrastructure/security/HashService';

export class CreateCastingUseCase {
  constructor(
    private readonly castingRepository: ICastingRepository,
    private readonly userRepository: IUserRepository,
    private readonly roundRepository: IRoundRepository,
    private readonly bitacoraService: BitacoraService,
    private readonly hashService: HashService
  ) {}

  async execute(input: CreateCastingInput): Promise<Casting> {
    const { title, description, directorEmail, directorName, directorId } = input;

    logger.info({ title, directorEmail }, 'CreateCastingUseCase: starting');

    let directorUser = null;

    if (directorId) {
      directorUser = await this.userRepository.findById(directorId);
    }

    if (!directorUser) {
      const email = Email.create(directorEmail);
      directorUser = await this.userRepository.findByEmail(email.getValue());

      if (!directorUser) {
        const name = FullName.create(directorName);
        const defaultPassword = await this.hashService.hash('changeme');
        directorUser = User.create(name, email, defaultPassword);
        await this.userRepository.save(directorUser);
      }
    }

    const castingTitle = CastingTitle.create(title);
    const castingDescription = Description.create(description);

    const casting = Casting.create(castingTitle, castingDescription, [
      { userId: directorUser.id, role: 'director' },
    ]);

    await this.castingRepository.save(casting);

    const initialRound = Round.create(1, casting.id, []);
    await this.roundRepository.save(initialRound);

    const castingWithRound = casting.addRound(initialRound);

    await this.bitacoraService.log({
      userId: directorUser.id,
      action: 'create_casting',
      details: { title, description },
      castingId: casting.id,
    });

    logger.info({ castingId: casting.id }, 'CreateCastingUseCase: completed');
    return castingWithRound;
  }
}
