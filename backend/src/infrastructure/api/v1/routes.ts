/**
 * @file routes.ts
 * @module infrastructure/api/v1/routes
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { CreateUserUseCase } from '../../../application/use-cases/CreateUserUseCase';
import { GetAllUsersUseCase } from '../../../application/use-cases/GetAllUsersUseCase';
import { CreateCastingUseCase } from '../../../application/use-cases/CreateCastingUseCase';
import { SubmitVideoUseCase } from '../../../application/use-cases/SubmitVideoUseCase';
import { ManageRoundParticipantsUseCase } from '../../../application/use-cases/rounds/ManageRoundParticipantsUseCase';
import { ReviewSubmissionUseCase } from '../../../application/use-cases/submissions/ReviewSubmissionUseCase';
import { LoginUseCase } from '../../../application/use-cases/LoginUseCase';
import { GetConfigUseCase, GetAllConfigUseCase, GetConfigByCategoryUseCase } from '../../../application/use-cases/config/GetConfigUseCase';
import { UpsertConfigUseCase } from '../../../application/use-cases/config/UpsertConfigUseCase';
import { DeleteConfigUseCase } from '../../../application/use-cases/config/DeleteConfigUseCase';
import PrismaUserRepository from '../../persistence/PrismaUserRepository';
import PrismaCastingRepository from '../../persistence/PrismaCastingRepository';
import PrismaRoundRepository from '../../persistence/PrismaRoundRepository';
import PrismaSubmissionRepository from '../../persistence/PrismaSubmissionRepository';
import PrismaBitacoraRepository from '../../persistence/PrismaBitacoraRepository';
import PrismaConfigRepository from '../../persistence/PrismaConfigRepository';
import BitacoraService from '../../logging/BitacoraService';
import HashService from '../../security/HashService';
import requestLogger from '../../logging/requestContext';
import { authMiddleware } from '../../middleware/auth';
import type { AuthRequest } from '../../middleware/auth';
import prisma from '../../persistence/prismaClient';
import videoUpload from '../../storage/videoUpload';
import { uploadFile, isR2Configured, getFileUrlAsync } from '../../storage/storageService';
import path from 'path';
import { dispatchEvent } from '../../webhooks/webhookClient';

const LOG_LEVEL_NORMALIZE: Record<string, string> = {
  'warning': 'warn',
  'critical': 'fatal',
  'debug': 'debug',
  'info': 'info',
  'warn': 'warn',
  'error': 'error',
  'fatal': 'fatal',
  'trace': 'trace',
};

function normalizeLogLevel(value: unknown): string {
  if (typeof value !== 'string') return 'info';
  return LOG_LEVEL_NORMALIZE[value.toLowerCase()] ?? 'info';
}

const router = Router();

const userRepository = new PrismaUserRepository();
const bitacoraRepository = new PrismaBitacoraRepository();
const bitacoraService = new BitacoraService(bitacoraRepository);
const hashService = new HashService();

const createUserUseCase = new CreateUserUseCase(userRepository, bitacoraService, hashService);
const getAllUsersUseCase = new GetAllUsersUseCase(userRepository);
const loginUseCase = new LoginUseCase(userRepository, hashService);

const castingRepository = new PrismaCastingRepository();
const roundRepository = new PrismaRoundRepository();
const createCastingUseCase = new CreateCastingUseCase(castingRepository, userRepository, roundRepository, bitacoraService, hashService);

const submissionRepository = new PrismaSubmissionRepository();
const submitVideoUseCase = new SubmitVideoUseCase(userRepository, roundRepository, submissionRepository, bitacoraService);

const manageParticipantsUseCase = new ManageRoundParticipantsUseCase(userRepository, roundRepository, submissionRepository, bitacoraService, hashService);
const reviewSubmissionUseCase = new ReviewSubmissionUseCase(submissionRepository, roundRepository, castingRepository, bitacoraService);

const configRepository = new PrismaConfigRepository();
const getConfigUseCase = new GetConfigUseCase(configRepository);
const getAllConfigUseCase = new GetAllConfigUseCase(configRepository);
const getConfigByCategoryUseCase = new GetConfigByCategoryUseCase(configRepository);
const upsertConfigUseCase = new UpsertConfigUseCase(configRepository, bitacoraService);
const deleteConfigUseCase = new DeleteConfigUseCase(configRepository, bitacoraService);

// ============================================
// Rate limiters
// ============================================

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // tiempo de espera para reset: 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 100,    // 100 en desarrollo
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 500, // ← 500 en desarrollo
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// Rutas públicas (sin autenticación)
// ============================================

router.post('/auth/login', loginLimiter, async (req, res) => {
  requestLogger.info({}, 'POST /auth/login');

  try {
    const { email, password, xUserId } = req.body;
    const result = await loginUseCase.execute({ email, password, xUserId });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message }, 'POST /auth/login failed');
    res.status(401).json({ error: message });
  }
});

// ============================================
// Rutas protegidas (requieren autenticación)
// ============================================

router.use(authMiddleware);
router.use(apiLimiter);

router.get('/users', async (_req, res) => {
  requestLogger.info({}, 'GET /users');

  try {
    const users = await getAllUsersUseCase.execute();
    res.json(users.map((u) => ({
      id: u.id,
      name: u.name.getValue(),
      email: u.email.getValue(),
    })));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message }, 'GET /users failed');
    res.status(500).json({ error: message });
  }
});

router.get('/users/me/participations', async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  requestLogger.info({ userId }, 'GET /users/me/participations');

  try {
    const participations = await prisma.participant.findMany({
      where: { userId },
      include: {
        casting: { select: { id: true, title: true, description: true } },
        round: {
          select: {
            id: true,
            number: true,
            castingId: true,
            casting: { select: { id: true, title: true } },
          },
        },
      },
    });

    const result = participations.map((p) => {
      if (p.castingId && p.casting) {
        return {
          type: 'casting' as const,
          castingId: p.casting.id,
          castingTitle: p.casting.title,
          castingDescription: p.casting.description,
          role: p.role,
        };
      }
      if (p.roundId && p.round) {
        return {
          type: 'round' as const,
          roundId: p.round.id,
          roundNumber: p.round.number,
          castingId: p.round.castingId,
          castingTitle: p.round.casting?.title ?? '',
          role: p.role,
        };
      }
      return null;
    }).filter(Boolean);

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message }, 'GET /users/me/participations failed');
    res.status(500).json({ error: message });
  }
});

router.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  requestLogger.info({ id }, 'GET /users/:id');

  try {
    const user = await userRepository.findById(id);

    if (!user) {
      requestLogger.warn({ id }, 'GET /users/:id: not found');
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      name: user.name.getValue(),
      email: user.email.getValue(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, id }, 'GET /users/:id failed');
    res.status(400).json({ error: message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { id, name, email, password } = req.body;
    const user = await createUserUseCase.execute({ id, name, email, password });
    res.status(201).json({
      id: user.id,
      name: user.name.getValue(),
      email: user.email.getValue(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message }, 'POST /users failed');
    res.status(400).json({ error: message });
  }
});

router.post('/castings', async (req: AuthRequest, res) => {
  requestLogger.info({}, 'POST /castings');

  try {
    const { title, description, directorEmail, directorName } = req.body;
    const directorId = req.user?.id;
    const casting = await createCastingUseCase.execute({ title, description, directorEmail, directorName, directorId });
    res.status(201).json({
      id: casting.id,
      title: casting.title,
      description: casting.description,
      participants: casting.participants.map((p) => ({
        userId: p.userId,
        role: p.role,
      })),
      rounds: casting.rounds.map((r) => ({
        id: r.id,
        number: r.number,
        participants: r.participants.map((p) => ({
          actorId: p.id,
          role: p.role,
        })),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message }, 'POST /castings failed');
    res.status(400).json({ error: message });
  }
});

router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  requestLogger.info({ id }, 'DELETE /users/:id');

  try {
    const existing = await userRepository.findById(id);

    if (!existing) {
      requestLogger.warn({ id }, 'DELETE /users/:id: not found');
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await userRepository.delete(id);

    requestLogger.info({ id }, 'DELETE /users/:id: completed');
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, id }, 'DELETE /users/:id failed');
    res.status(400).json({ error: message });
  }
});

router.get('/castings', async (_req, res) => {
  requestLogger.info({}, 'GET /castings');

  try {
    const castings = await castingRepository.findAll();
    res.json(castings.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      participants: c.participants.map((p) => ({
        userId: p.userId,
        role: p.role,
      })),
    })));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message }, 'GET /castings failed');
    res.status(500).json({ error: message });
  }
});

router.get('/castings/:id', async (req, res) => {
  const { id } = req.params;
  requestLogger.info({ id }, 'GET /castings/:id');

  try {
    const casting = await castingRepository.findById(id);

    if (!casting) {
      requestLogger.warn({ id }, 'GET /castings/:id: not found');
      res.status(404).json({ error: 'Casting not found' });
      return;
    }

    const rounds = await roundRepository.findByCastingId(casting.id);
    const roundsData = rounds.map((r) => ({
      id: r.id,
      number: r.number,
      status: r.status,
      participants: r.participants.map((p) => ({
        actorId: p.id,
        role: p.role,
      })),
    }));

    res.json({
      id: casting.id,
      title: casting.title,
      description: casting.description,
      participants: casting.participants.map((p) => ({
        userId: p.userId,
        role: p.role,
      })),
      rounds: roundsData,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, id }, 'GET /castings/:id failed');
    res.status(400).json({ error: message });
  }
});

router.get('/rounds/:id', async (req, res) => {
  const { id } = req.params;
  requestLogger.info({ id }, 'GET /rounds/:id');

  try {
    const round = await roundRepository.findById(id);

    if (!round) {
      requestLogger.warn({ id }, 'GET /rounds/:id: not found');
      res.status(404).json({ error: 'Round not found' });
      return;
    }

    const submissions = await submissionRepository.findByRoundId(round.id);

    const participantsWithEmail = await Promise.all(
      round.participants.map(async (p) => {
        const user = await userRepository.findById(p.id);
        return {
          actorId: p.id,
          role: p.role,
          email: user?.email?.getValue() ?? null,
          name: user?.name?.getValue() ?? null,
        };
      })
    );

    res.json({
      id: round.id,
      number: round.number,
      castingId: round.castingId,
      status: round.status,
      participants: participantsWithEmail,
      submissions: submissions.map((s) => ({
        id: s.id,
        actorId: s.actorId,
        videoUrl: s.videoUrl.getValue(),
        videoKey: s.videoKey,
        duration: s.duration,
        status: s.status,
        score: s.score.getValue(),
        feedback: s.feedback.getValue(),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, id }, 'GET /rounds/:id failed');
    res.status(400).json({ error: message });
  }
});

router.get('/rounds/:id/submissions', async (req, res) => {
  const { id } = req.params;
  requestLogger.info({ id }, 'GET /rounds/:id/submissions');

  try {
    const round = await roundRepository.findById(id);

    if (!round) {
      requestLogger.warn({ id }, 'GET /rounds/:id/submissions: round not found');
      res.status(404).json({ error: 'Round not found' });
      return;
    }

    const submissions = await submissionRepository.findByRoundId(round.id);
    res.json(submissions.map((s) => ({
      id: s.id,
      actorId: s.actorId,
      roundId: s.roundId,
      videoUrl: s.videoUrl.getValue(),
      videoKey: s.videoKey,
      duration: s.duration,
      status: s.status,
      score: s.score.getValue(),
      feedback: s.feedback.getValue(),
    })));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, id }, 'GET /rounds/:id/submissions failed');
    res.status(400).json({ error: message });
  }
});

router.post('/submissions', videoUpload.single('video'), async (req: AuthRequest, res) => {
  requestLogger.info({}, 'POST /submissions');

  try {
    const actorId = req.user?.id;
    const { roundId, videoUrl, duration } = req.body;

    // Determine video source: file upload or URL
    let finalVideoUrl: string;
    let videoKey: string | undefined;
    if (req.file) {
      // File uploaded — store key in BD, generate presigned URL for response
      const ext = path.extname(req.file.originalname) || '.mp4';
      const key = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const storedKey = await uploadFile(key, req.file.buffer, req.file.mimetype);
      videoKey = storedKey;
      finalVideoUrl = isR2Configured()
        ? await getFileUrlAsync(storedKey)
        : `/uploads/videos/${key}`;
    } else if (videoUrl) {
      // URL provided (YouTube, Vimeo, etc.)
      finalVideoUrl = videoUrl;
    } else {
      res.status(400).json({ error: 'Either video URL or video file is required' });
      return;
    }

    const submission = await submitVideoUseCase.execute({ actorId: actorId || '', roundId, videoUrl: finalVideoUrl, videoKey, duration: duration ? Number(duration) : undefined });

    dispatchEvent('submission.created', {
      submission_id: submission.id,
      actor_id: submission.actorId,
      round_id: submission.roundId,
      video_url: finalVideoUrl,
    });

    res.status(201).json({
      id: submission.id,
      actorId: submission.actorId,
      roundId: submission.roundId,
      videoUrl: submission.videoUrl.getValue(),
      duration: submission.duration,
      status: submission.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('not found')) {
      requestLogger.error({ error: message }, 'POST /submissions: not found');
      res.status(404).json({ error: message });
      return;
    }
    if (message.includes('not invited')) {
      requestLogger.error({ error: message }, 'POST /submissions: user not invited');
      res.status(400).json({ error: message });
      return;
    }
    if (message.includes('Invalid video URL') || message.includes('Video URL') || message.includes('Invalid file type')) {
      requestLogger.error({ error: message }, 'POST /submissions: invalid input');
      res.status(400).json({ error: message });
      return;
    }
    requestLogger.error({ error: message }, 'POST /submissions failed');
    res.status(400).json({ error: message });
  }
});

router.post('/rounds/participants', async (req, res) => {
  requestLogger.info({}, 'POST /rounds/participants');

  try {
    const { roundId, actors, preselectors, createNewRound } = req.body;
    const round = await manageParticipantsUseCase.execute({ roundId, actors: actors || [], preselectors: preselectors || [], createNewRound });
    res.status(201).json({
      id: round.id,
      number: round.number,
      castingId: round.castingId,
      participants: round.participants.map((p) => ({
        actorId: p.id,
        role: p.role,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('not found')) {
      requestLogger.error({ error: message }, 'POST /rounds/participants: round not found');
      res.status(404).json({ error: message });
      return;
    }
    if (message.includes('empty') || message.includes('Empty')) {
      requestLogger.error({ error: message }, 'POST /rounds/participants: empty participants');
      res.status(400).json({ error: message });
      return;
    }
    requestLogger.error({ error: message }, 'POST /rounds/participants failed');
    res.status(400).json({ error: message });
  }
});

router.patch('/submissions/:id/review', async (req: AuthRequest, res) => {
  const { id } = req.params;
  requestLogger.info({ id }, 'PATCH /submissions/:id/review');

  try {
    const { score, feedback } = req.body;
    const directorId = req.user?.id;
    const submission = await reviewSubmissionUseCase.execute({
      submissionId: id,
      score,
      feedback,
      directorId,
    });

    dispatchEvent('review.completed', {
      submission_id: submission.id,
      actor_id: submission.actorId,
      director_id: directorId,
      score: submission.score.getValue(),
      feedback: submission.feedback.getValue(),
    });

    res.json({
      id: submission.id,
      actorId: submission.actorId,
      roundId: submission.roundId,
      videoUrl: submission.videoUrl.getValue(),
      duration: submission.duration,
      status: submission.status,
      score: submission.score.getValue(),
      feedback: submission.feedback.getValue(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('not found')) {
      requestLogger.error({ error: message }, 'PATCH /submissions/:id/review: not found');
      res.status(404).json({ error: message });
      return;
    }
    if (message.includes('Cannot review a submission that has been selected or rejected')) {
      requestLogger.error({ error: message }, 'PATCH /submissions/:id/review: final status');
      res.status(400).json({ error: message });
      return;
    }
    if (message.includes('not the director')) {
      requestLogger.error({ error: message }, 'PATCH /submissions/:id/review: not authorized');
      res.status(403).json({ error: message });
      return;
    }
    if (message.includes('Score must be') || message.includes('Feedback')) {
      requestLogger.error({ error: message }, 'PATCH /submissions/:id/review: invalid input');
      res.status(400).json({ error: message });
      return;
    }
    requestLogger.error({ error: message }, 'PATCH /submissions/:id/review failed');
    res.status(400).json({ error: message });
  }
});

router.put('/castings/:id', async (req, res) => {
  const { id } = req.params;
  requestLogger.info({ id }, 'PUT /castings/:id');

  try {
    const existing = await castingRepository.findById(id);

    if (!existing) {
      requestLogger.warn({ id }, 'PUT /castings/:id: not found');
      res.status(404).json({ error: 'Casting not found' });
      return;
    }

    const { title, description } = req.body;

    await prisma.casting.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
      },
    });

    const updated = await castingRepository.findById(id);
    requestLogger.info({ id }, 'PUT /castings/:id: completed');
    res.json({
      id: updated!.id,
      title: updated!.title,
      description: updated!.description,
      participants: updated!.participants.map((p) => ({
        userId: p.userId,
        role: p.role,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, id }, 'PUT /castings/:id failed');
    res.status(400).json({ error: message });
  }
});

router.delete('/castings/:id', async (req, res) => {
  const { id } = req.params;
  requestLogger.info({ id }, 'DELETE /castings/:id');

  try {
    const existing = await castingRepository.findById(id);

    if (!existing) {
      requestLogger.warn({ id }, 'DELETE /castings/:id: not found');
      res.status(404).json({ error: 'Casting not found' });
      return;
    }

    const rounds = await roundRepository.findByCastingId(id);
    for (const round of rounds) {
      await prisma.submission.deleteMany({ where: { roundId: round.id } });
      await prisma.participant.deleteMany({ where: { roundId: round.id } });
      await roundRepository.delete(round.id);
    }

    await prisma.participant.deleteMany({ where: { castingId: id } });
    await castingRepository.delete(id);

    requestLogger.info({ id }, 'DELETE /castings/:id: completed');
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, id }, 'DELETE /castings/:id failed');
    res.status(400).json({ error: message });
  }
});

router.delete('/rounds/:roundId/participants/:userId', async (req: AuthRequest, res) => {
  const { roundId, userId } = req.params;
  const directorId = req.user?.id;
  requestLogger.info({ roundId, userId }, 'DELETE /rounds/:roundId/participants/:userId');

  try {
    const round = await roundRepository.findById(roundId);
    if (!round) {
      res.status(404).json({ error: 'Round not found' });
      return;
    }

    const casting = await castingRepository.findById(round.castingId);
    if (!casting) {
      res.status(404).json({ error: 'Casting not found' });
      return;
    }

    const isDirector = casting.directorIds.some(id => id === directorId);
    if (!isDirector) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const participant = round.participants.find(p => p.id === userId);
    if (!participant) {
      res.status(404).json({ error: 'Participant not found in this round' });
      return;
    }

    const submissions = await submissionRepository.findByRoundId(roundId);
    const hadSubmissions = submissions.some(s => s.actorId === userId);

    await prisma.participant.deleteMany({
      where: { roundId, userId },
    });

    requestLogger.info({ roundId, userId }, 'DELETE /rounds/:roundId/participants/:userId: completed');
    res.json({ success: true, hadSubmissions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, roundId, userId }, 'DELETE /rounds/:roundId/participants/:userId failed');
    res.status(400).json({ error: message });
  }
});

router.delete('/rounds/:id', async (req, res) => {
  const { id } = req.params;
  requestLogger.info({ id }, 'DELETE /rounds/:id');

  try {
    const existing = await roundRepository.findById(id);

    if (!existing) {
      requestLogger.warn({ id }, 'DELETE /rounds/:id: not found');
      res.status(404).json({ error: 'Round not found' });
      return;
    }

    await prisma.submission.deleteMany({ where: { roundId: id } });
    await prisma.participant.deleteMany({ where: { roundId: id } });
    await roundRepository.delete(id);

    requestLogger.info({ id }, 'DELETE /rounds/:id: completed');
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, id }, 'DELETE /rounds/:id failed');
    res.status(400).json({ error: message });
  }
});

router.patch('/rounds/:id', async (req, res) => {
  const { id } = req.params;
  requestLogger.info({ id }, 'PATCH /rounds/:id');

  try {
    const existing = await roundRepository.findById(id);

    if (!existing) {
      requestLogger.warn({ id }, 'PATCH /rounds/:id: not found');
      res.status(404).json({ error: 'Round not found' });
      return;
    }

    const { number } = req.body;

    if (typeof number !== 'number' || !Number.isInteger(number) || number < 1) {
      requestLogger.warn({ id, number }, 'PATCH /rounds/:id: invalid number');
      res.status(400).json({ error: 'Number must be a positive integer' });
      return;
    }

    await prisma.round.update({
      where: { id },
      data: { number },
    });

    const updated = await roundRepository.findById(id);
    requestLogger.info({ id }, 'PATCH /rounds/:id: completed');
    res.json({
      id: updated!.id,
      number: updated!.number,
      castingId: updated!.castingId,
      participants: updated!.participants.map((p) => ({
        actorId: p.id,
        role: p.role,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, id }, 'PATCH /rounds/:id failed');
    res.status(400).json({ error: message });
  }
});

router.delete('/submissions/:id', async (req, res) => {
  const { id } = req.params;
  requestLogger.info({ id }, 'DELETE /submissions/:id');

  try {
    const existing = await submissionRepository.findById(id);

    if (!existing) {
      requestLogger.warn({ id }, 'DELETE /submissions/:id: not found');
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    await submissionRepository.delete(id);

    requestLogger.info({ id }, 'DELETE /submissions/:id: completed');
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, id }, 'DELETE /submissions/:id failed');
    res.status(400).json({ error: message });
  }
});

router.get('/submissions/:id', async (req, res) => {
  const { id } = req.params;
  requestLogger.info({ id }, 'GET /submissions/:id');

  try {
    const submission = await submissionRepository.findById(id);

    if (!submission) {
      requestLogger.warn({ id }, 'GET /submissions/:id: not found');
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    res.json({
      id: submission.id,
      actorId: submission.actorId,
      roundId: submission.roundId,
      videoUrl: submission.videoUrl.getValue(),
      videoKey: submission.videoKey,
      duration: submission.duration,
      status: submission.status,
      score: submission.score.getValue(),
      feedback: submission.feedback.getValue(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, id }, 'GET /submissions/:id failed');
    res.status(400).json({ error: message });
  }
});

router.get('/videos/:submissionId/url', async (req, res) => {
  const { submissionId } = req.params;
  requestLogger.info({ submissionId }, 'GET /videos/:submissionId/url');

  try {
    const submission = await submissionRepository.findById(submissionId);

    if (!submission) {
      requestLogger.warn({ submissionId }, 'GET /videos/:submissionId/url: not found');
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const videoKey = submission.videoKey;

    if (!videoKey) {
      // External URL (YouTube, Vimeo) or local — return as-is
      res.json({ url: submission.videoUrl.getValue() });
      return;
    }

    // Generate presigned URL from R2 key
    const url = await getFileUrlAsync(videoKey, 7200);
    res.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, submissionId }, 'GET /videos/:submissionId/url failed');
    res.status(400).json({ error: message });
  }
});

router.patch('/submissions/:id/metadata', async (req, res) => {
  const { id } = req.params;
  requestLogger.info({ id }, 'PATCH /submissions/:id/metadata');

  try {
    const existing = await submissionRepository.findById(id);

    if (!existing) {
      requestLogger.warn({ id }, 'PATCH /submissions/:id/metadata: not found');
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const { duration } = req.body;
    const updated = existing.withDuration(Number(duration));
    await submissionRepository.save(updated);

    requestLogger.info({ id }, 'PATCH /submissions/:id/metadata: completed');
    res.json({
      id: updated.id,
      actorId: updated.actorId,
      roundId: updated.roundId,
      videoUrl: updated.videoUrl.getValue(),
      duration: updated.duration,
      status: updated.status,
      score: updated.score.getValue(),
      feedback: updated.feedback.getValue(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, id }, 'PATCH /submissions/:id/metadata failed');
    res.status(400).json({ error: message });
  }
});

// ============================================
// Event Queue endpoints (service-to-service)
// ============================================

router.get('/events/pending', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const events = await prisma.eventQueue.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    if (events.length === 0) {
      res.json({ events: [] });
      return;
    }

    const ids = events.map(e => e.id);
    await prisma.eventQueue.updateMany({
      where: { id: { in: ids } },
      data: { status: 'processing' },
    });

    res.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message }, 'GET /events/pending failed');
    res.status(500).json({ error: message });
  }
});

router.patch('/events/:id/complete', async (req, res) => {
  const { id } = req.params;
  try {
    const event = await prisma.eventQueue.findUnique({ where: { id } });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const updated = await prisma.eventQueue.update({
      where: { id },
      data: { status: 'completed', processedAt: new Date() },
    });

    res.json({ id: updated.id, status: updated.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, id }, 'PATCH /events/:id/complete failed');
    res.status(400).json({ error: message });
  }
});

router.patch('/events/:id/fail', async (req, res) => {
  const { id } = req.params;
  try {
    const event = await prisma.eventQueue.findUnique({ where: { id } });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const maxAttempts = 3;
    const newAttempts = event.attempts + 1;
    const newStatus = newAttempts >= maxAttempts ? 'failed' : 'pending';

    const updated = await prisma.eventQueue.update({
      where: { id },
      data: {
        status: newStatus,
        attempts: newAttempts,
        lastError: req.body.error || null,
      },
    });

    res.json({ id: updated.id, status: updated.status, attempts: updated.attempts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, id }, 'PATCH /events/:id/fail failed');
    res.status(400).json({ error: message });
  }
});

// ============================================
// Config endpoints
// ============================================

router.get('/config', async (_req, res) => {
  requestLogger.info({}, 'GET /config');
  try {
    const configs = await getAllConfigUseCase.execute();
    res.json(configs.map((c) => ({
      id: c.id,
      key: c.key,
      value: c.value,
      description: c.description,
      category: c.category,
      updatedBy: c.updatedBy,
      updatedAt: c.updatedAt,
    })));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message }, 'GET /config failed');
    res.status(500).json({ error: message });
  }
});

router.get('/config/category/:category', async (req, res) => {
  const { category } = req.params;
  requestLogger.info({ category }, 'GET /config/category/:category');
  try {
    const configs = await getConfigByCategoryUseCase.execute(category);
    res.json(configs.map((c) => ({
      id: c.id,
      key: c.key,
      value: c.value,
      description: c.description,
      category: c.category,
      updatedBy: c.updatedBy,
      updatedAt: c.updatedAt,
    })));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, category }, 'GET /config/category/:category failed');
    res.status(500).json({ error: message });
  }
});

router.get('/config/:key', async (req, res) => {
  const { key } = req.params;
  requestLogger.info({ key }, 'GET /config/:key');
  try {
    const config = await getConfigUseCase.execute(key);
    if (!config) {
      res.status(404).json({ error: `Config "${key}" not found` });
      return;
    }
    res.json({
      id: config.id,
      key: config.key,
      value: config.value,
      description: config.description,
      category: config.category,
      updatedBy: config.updatedBy,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, key }, 'GET /config/:key failed');
    res.status(500).json({ error: message });
  }
});

router.put('/config/:key', async (req: AuthRequest, res) => {
  const { key } = req.params;
  requestLogger.info({ key }, 'PUT /config/:key');
  try {
    const { value, description, category } = req.body;
    if (value === undefined) {
      res.status(400).json({ error: 'value is required' });
      return;
    }
    const normalizedValue = key === 'logging.level' ? normalizeLogLevel(value) : value;
    const config = await upsertConfigUseCase.execute({
      key,
      value: normalizedValue,
      description,
      category,
      updatedBy: req.user?.id,
    });
    res.status(201).json({
      id: config.id,
      key: config.key,
      value: config.value,
      description: config.description,
      category: config.category,
      updatedBy: config.updatedBy,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, key }, 'PUT /config/:key failed');
    res.status(400).json({ error: message });
  }
});

router.patch('/config/:key', async (req: AuthRequest, res) => {
  const { key } = req.params;
  requestLogger.info({ key }, 'PATCH /config/:key');
  try {
    const existing = await getConfigUseCase.execute(key);
    if (!existing) {
      res.status(404).json({ error: `Config "${key}" not found` });
      return;
    }
    const { value, description, category } = req.body;
    const normalizedValue = key === 'logging.level' && value !== undefined ? normalizeLogLevel(value) : value;
    const config = await upsertConfigUseCase.execute({
      key,
      value: normalizedValue !== undefined ? normalizedValue : existing.value,
      description: description !== undefined ? description : existing.description ?? undefined,
      category: category !== undefined ? category : existing.category ?? undefined,
      updatedBy: req.user?.id,
    });
    res.json({
      id: config.id,
      key: config.key,
      value: config.value,
      description: config.description,
      category: config.category,
      updatedBy: config.updatedBy,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    requestLogger.error({ error: message, key }, 'PATCH /config/:key failed');
    res.status(400).json({ error: message });
  }
});

router.delete('/config/:key', async (req: AuthRequest, res) => {
  const { key } = req.params;
  requestLogger.info({ key }, 'DELETE /config/:key');
  try {
    await deleteConfigUseCase.execute(key, req.user?.id);
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
      return;
    }
    requestLogger.error({ error: message, key }, 'DELETE /config/:key failed');
    res.status(400).json({ error: message });
  }
});

export default router;
