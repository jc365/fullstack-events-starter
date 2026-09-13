import { vi } from 'vitest';
import { ReviewSubmissionUseCase } from '../../../../backend/src/application/use-cases/submissions/ReviewSubmissionUseCase';
import ISubmissionRepository from '../../../../backend/src/application/interfaces/ISubmissionRepository';
import IRoundRepository from '../../../../backend/src/application/interfaces/IRoundRepository';
import ICastingRepository from '../../../../backend/src/application/interfaces/ICastingRepository';
import Submission from '../../../../backend/src/domain/entities/Submission';
import Round, { type RoundParticipantEntry } from '../../../../backend/src/domain/entities/Round';
import Casting from '../../../../backend/src/domain/entities/Casting';
import VideoUrl from '../../../../backend/src/domain/value-objects/VideoUrl';
import CastingTitle from '../../../../backend/src/domain/value-objects/CastingTitle';
import Description from '../../../../backend/src/domain/value-objects/Description';
import Score from '../../../../backend/src/domain/value-objects/Score';
import Feedback from '../../../../backend/src/domain/value-objects/Feedback';
import BitacoraService from '../../../../backend/src/infrastructure/logging/BitacoraService';

describe('ReviewSubmissionUseCase', () => {
  let useCase: ReviewSubmissionUseCase;
  let submissionRepo: jest.Mocked<ISubmissionRepository>;
  let roundRepo: jest.Mocked<IRoundRepository>;
  let castingRepo: jest.Mocked<ICastingRepository>;
  let bitacoraService: jest.Mocked<BitacoraService>;

  const participants: RoundParticipantEntry[] = [{ id: 'user-1', role: 'actor' }];
  const round = Round.create(1, 'casting-1', participants, 'round-1');
  const casting = Casting.create(CastingTitle.create('Test Casting'), Description.create('A test'), [
    { userId: 'director-1', role: 'director' },
  ], 'casting-1');
  const submission = Submission.create('user-1', 'round-1', VideoUrl.create('https://youtube.com/watch?v=abc123'), 'submission-1');

  beforeEach(() => {
    submissionRepo = {
      findById: vi.fn(),
      findByRoundId: vi.fn(),
      findByActorId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    roundRepo = {
      findById: vi.fn(),
      findByCastingId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    castingRepo = {
      findById: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    bitacoraService = {
      log: vi.fn(),
    } as unknown as jest.Mocked<BitacoraService>;
    useCase = new ReviewSubmissionUseCase(submissionRepo, roundRepo, castingRepo, bitacoraService);
  });

  it('should review a pending submission successfully', async () => {
    submissionRepo.findById.mockResolvedValue(submission);
    roundRepo.findById.mockResolvedValue(round);
    castingRepo.findById.mockResolvedValue(casting);
    submissionRepo.save.mockResolvedValue();

    const result = await useCase.execute({
      submissionId: 'submission-1',
      score: 8,
      feedback: 'Great performance!',
    });

    expect(result.status).toBe('reviewed');
    expect(result.score.getValue()).toBe(8);
    expect(result.feedback.getValue()).toBe('Great performance!');
    expect(submissionRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should review when directorId is provided and user is director', async () => {
    submissionRepo.findById.mockResolvedValue(submission);
    roundRepo.findById.mockResolvedValue(round);
    castingRepo.findById.mockResolvedValue(casting);
    submissionRepo.save.mockResolvedValue();

    const result = await useCase.execute({
      submissionId: 'submission-1',
      score: 8,
      feedback: 'Great performance!',
      directorId: 'director-1',
    });

    expect(result.status).toBe('reviewed');
    expect(submissionRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should throw when directorId is provided but user is not director', async () => {
    submissionRepo.findById.mockResolvedValue(submission);
    roundRepo.findById.mockResolvedValue(round);
    castingRepo.findById.mockResolvedValue(casting);

    await expect(
      useCase.execute({
        submissionId: 'submission-1',
        score: 8,
        feedback: 'Good',
        directorId: 'not-a-director',
      })
    ).rejects.toThrow('User is not the director of this casting');

    expect(submissionRepo.save).not.toHaveBeenCalled();
  });

  it('should throw when submission is not found', async () => {
    submissionRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ submissionId: 'submission-999', score: 8, feedback: 'Good' })
    ).rejects.toThrow('Submission not found');

    expect(submissionRepo.save).not.toHaveBeenCalled();
  });

  it('should re-evaluate an already reviewed submission', async () => {
    const reviewed = submission.review(Score.create(7), Feedback.create('Nice'));

    submissionRepo.findById.mockResolvedValue(reviewed);
    roundRepo.findById.mockResolvedValue(round);
    castingRepo.findById.mockResolvedValue(casting);
    submissionRepo.save.mockResolvedValue();

    const result = await useCase.execute({ submissionId: 'submission-1', score: 9, feedback: 'Updated' });

    expect(result.status).toBe('reviewed');
    expect(result.score.getValue()).toBe(9);
    expect(result.feedback.getValue()).toBe('Updated');
    expect(submissionRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should throw when submission is selected', async () => {
    const selected = submission.review(Score.create(7), Feedback.create('Nice')).select();

    submissionRepo.findById.mockResolvedValue(selected);
    roundRepo.findById.mockResolvedValue(round);
    castingRepo.findById.mockResolvedValue(casting);

    await expect(
      useCase.execute({ submissionId: 'submission-1', score: 9, feedback: 'Updated' })
    ).rejects.toThrow('Cannot review a submission that has been selected or rejected');

    expect(submissionRepo.save).not.toHaveBeenCalled();
  });

  it('should throw when score is out of range', async () => {
    submissionRepo.findById.mockResolvedValue(submission);
    roundRepo.findById.mockResolvedValue(round);
    castingRepo.findById.mockResolvedValue(casting);

    await expect(
      useCase.execute({ submissionId: 'submission-1', score: 11, feedback: 'Good' })
    ).rejects.toThrow('Score must be between 0 and 10');

    expect(submissionRepo.save).not.toHaveBeenCalled();
  });

  it('should accept empty feedback as no feedback', async () => {
    submissionRepo.findById.mockResolvedValue(submission);
    roundRepo.findById.mockResolvedValue(round);
    castingRepo.findById.mockResolvedValue(casting);
    submissionRepo.save.mockResolvedValue();

    const result = await useCase.execute({ submissionId: 'submission-1', score: 8, feedback: '' });

    expect(result.feedback.isPresent()).toBe(false);
    expect(submissionRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should log to bitacora when submission is reviewed', async () => {
    submissionRepo.findById.mockResolvedValue(submission);
    roundRepo.findById.mockResolvedValue(round);
    castingRepo.findById.mockResolvedValue(casting);
    submissionRepo.save.mockResolvedValue();

    await useCase.execute({
      submissionId: 'submission-1',
      score: 8,
      feedback: 'Great performance!',
      directorId: 'director-1',
    });

    expect(bitacoraService.log).toHaveBeenCalledTimes(1);
    expect(bitacoraService.log).toHaveBeenCalledWith({
      userId: 'director-1',
      action: 'review_submission',
      details: { score: 8, feedback: 'Great performance!' },
      submissionId: 'submission-1',
      roundId: 'round-1',
      castingId: 'casting-1',
    });
  });
});
