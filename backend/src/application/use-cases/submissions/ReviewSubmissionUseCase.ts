/**
 * @file ReviewSubmissionUseCase.ts
 * @module application/use-cases/submissions
 */

import Submission from '../../../domain/entities/Submission';
import Score from '../../../domain/value-objects/Score';
import Feedback from '../../../domain/value-objects/Feedback';
import ISubmissionRepository from '../../interfaces/ISubmissionRepository';
import IRoundRepository from '../../interfaces/IRoundRepository';
import ICastingRepository from '../../interfaces/ICastingRepository';
import { ReviewSubmissionInput } from '../../dtos';
import logger from '../../../infrastructure/logging/requestContext';
import BitacoraService from '../../../infrastructure/logging/BitacoraService';

export class ReviewSubmissionUseCase {
  constructor(
    private readonly submissionRepository: ISubmissionRepository,
    private readonly roundRepository: IRoundRepository,
    private readonly castingRepository: ICastingRepository,
    private readonly bitacoraService: BitacoraService
  ) {}

  async execute(input: ReviewSubmissionInput): Promise<Submission> {
    const { submissionId, score, feedback, directorId } = input;

    logger.info({ submissionId }, 'ReviewSubmissionUseCase: starting');

    const submission = await this.submissionRepository.findById(submissionId);
    if (!submission) {
      logger.error({ submissionId }, 'ReviewSubmissionUseCase: submission not found');
      throw new Error('Submission not found');
    }

    const round = await this.roundRepository.findById(submission.roundId);
    if (!round) {
      logger.error({ submissionId }, 'ReviewSubmissionUseCase: round not found');
      throw new Error('Round not found');
    }

    const casting = await this.castingRepository.findById(round.castingId);
    if (!casting) {
      logger.error({ submissionId }, 'ReviewSubmissionUseCase: casting not found');
      throw new Error('Casting not found');
    }

    if (directorId) {
      const isDirector = casting.directorIds.some(id => id === directorId);
      if (!isDirector) {
        logger.error({ submissionId, directorId }, 'ReviewSubmissionUseCase: not authorized');
        throw new Error('User is not the director of this casting');
      }
    }

    const scoreVO = Score.create(score);
    const feedbackVO = feedback && feedback.trim().length > 0
      ? Feedback.create(feedback)
      : Feedback.none();

    const updatedSubmission = submission.updateReview(scoreVO, feedbackVO);

    await this.submissionRepository.save(updatedSubmission);

    await this.bitacoraService.log({
      userId: directorId || submission.actorId,
      action: 'review_submission',
      details: { score, feedback },
      submissionId,
      roundId: submission.roundId,
      castingId: casting.id,
    });

    logger.info({ submissionId }, 'ReviewSubmissionUseCase: completed');
    return updatedSubmission;
  }
}
