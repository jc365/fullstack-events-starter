/**
 * @file SubmitVideoUseCase.ts
 * @module application/use-cases/submissions
 */

import Submission from '../../domain/entities/Submission';
import VideoUrl from '../../domain/value-objects/VideoUrl';
import IUserRepository from '../interfaces/IUserRepository';
import IRoundRepository from '../interfaces/IRoundRepository';
import ISubmissionRepository from '../interfaces/ISubmissionRepository';
import { SubmitVideoInput } from '../dtos';
import logger from '../../infrastructure/logging/requestContext';
import BitacoraService from '../../infrastructure/logging/BitacoraService';

export class SubmitVideoUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly roundRepository: IRoundRepository,
    private readonly submissionRepository: ISubmissionRepository,
    private readonly bitacoraService: BitacoraService
  ) {}

  async execute(input: SubmitVideoInput): Promise<Submission> {
    const { actorId, roundId, videoUrl, videoKey } = input;

    logger.info({ actorId, roundId }, 'SubmitVideoUseCase: starting');

    const existingUser = await this.userRepository.findById(actorId);
    if (!existingUser) {
      logger.error({ actorId }, 'SubmitVideoUseCase: user not found');
      throw new Error(`User ${actorId} not found`);
    }

    const existingRound = await this.roundRepository.findById(roundId);
    if (!existingRound) {
      logger.error({ roundId }, 'SubmitVideoUseCase: round not found');
      throw new Error(`Round ${roundId} not found`);
    }

    const isInvited = existingRound.actorIds.some(id => id === actorId);
    if (!isInvited) {
      logger.error({ actorId, roundId }, 'SubmitVideoUseCase: user not invited');
      throw new Error(`User ${actorId} is not invited to round ${roundId}`);
    }

    const videoUrlVO = VideoUrl.create(videoUrl);

    const submission = Submission.create(actorId, roundId, videoUrlVO, undefined, videoKey);

    await this.submissionRepository.save(submission);

    await this.bitacoraService.log({
      userId: actorId,
      action: 'submit_video',
      details: { videoUrl, videoKey, roundId },
      roundId,
      submissionId: submission.id,
    });

    logger.info({ submissionId: submission.id }, 'SubmitVideoUseCase: completed');
    return submission;
  }
}
