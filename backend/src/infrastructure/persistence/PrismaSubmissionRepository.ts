/**
 * @file PrismaSubmissionRepository.ts
 * @module infrastructure/persistence
 */

import Submission from '../../domain/entities/Submission';
import VideoUrl from '../../domain/value-objects/VideoUrl';
import Score from '../../domain/value-objects/Score';
import Feedback from '../../domain/value-objects/Feedback';
import type ISubmissionRepository from '../../application/interfaces/ISubmissionRepository';
import prisma from './prismaClient';

export default class PrismaSubmissionRepository implements ISubmissionRepository {
  async findById(id: string): Promise<Submission | null> {
    const record = await prisma.submission.findUnique({
      where: { id },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByRoundId(roundId: string): Promise<Submission[]> {
    const records = await prisma.submission.findMany({
      where: { roundId },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByActorId(actorId: string): Promise<Submission[]> {
    const records = await prisma.submission.findMany({
      where: { actorId },
    });
    return records.map((r) => this.toDomain(r));
  }

  async save(submission: Submission): Promise<void> {
    await prisma.submission.upsert({
      where: { id: submission.id },
      create: {
        id: submission.id,
        actorId: submission.actorId,
        roundId: submission.roundId,
        videoUrl: submission.videoUrl.getValue(),
        videoKey: submission.videoKey,
        duration: submission.duration,
        status: submission.status,
        score: submission.score.getValue() ?? 0,
        feedback: submission.feedback.getValue() ?? '',
      },
      update: {
        videoKey: submission.videoKey,
        duration: submission.duration,
        status: submission.status,
        score: submission.score.getValue() ?? 0,
        feedback: submission.feedback.getValue() ?? '',
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.submission.delete({
      where: { id },
    });
  }

  private toDomain(record: { id: string; actorId: string; roundId: string; videoUrl: string; videoKey: string | null; duration: number | null; status: string; score: number; feedback: string }): Submission {
    const videoUrl = VideoUrl.create(record.videoUrl);
    const submission = Submission.create(record.actorId, record.roundId, videoUrl, record.id, record.videoKey ?? undefined);

    let result = record.duration != null ? submission.withDuration(record.duration) : submission;

    if (record.status === 'pending') return result;

    const score = Score.create(record.score);
    const feedback = record.feedback && record.feedback.trim().length > 0
      ? Feedback.create(record.feedback)
      : Feedback.none();
    result = result.review(score, feedback);

    if (record.status === 'selected') {
      result = result.select();
    } else if (record.status === 'rejected') {
      result = result.reject();
    }

    return result;
  }
}
