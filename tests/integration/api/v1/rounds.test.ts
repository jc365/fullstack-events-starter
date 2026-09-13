/**
 * @file rounds.test.ts
 * @module tests/integration/api/v1/rounds
 */

import request from 'supertest';
import app from '../../../../backend/src/index';
import prisma from '../../../../backend/src/infrastructure/persistence/prismaClient';
import { generateToken } from '../../../../backend/src/infrastructure/middleware/auth';

beforeEach(async () => {
  await prisma.bitacora.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.round.deleteMany();
  await prisma.casting.deleteMany();
  await prisma.user.deleteMany();
});

describe('POST /api/v1/rounds/participants', () => {
  describe('add participants to existing round', () => {
    it('should add actors to an existing round (201)', async () => {
      await prisma.user.create({
        data: { id: 'user-1', name: 'Test Director', email: 'dir@test.com', password: 'hash' },
      });
      const casting = await prisma.casting.create({
        data: { id: 'casting-1', title: 'Casting Test', description: 'Desc' },
      });
      await prisma.participant.create({
        data: { userId: 'user-1', castingId: casting.id, role: 'director' },
      });
      const round = await prisma.round.create({
        data: { id: 'round-1', number: 1, castingId: casting.id },
      });

      const res = await request(app)
        .post('/api/v1/rounds/participants')
        .set('Authorization', `Bearer ${generateToken('user-1')}`)
        .send({
          roundId: 'round-1',
          actors: [{ email: 'new@test.com', name: 'New Actor' }],
          preselectors: [],
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('round-1');
      expect(res.body.participants).toHaveLength(1);
      expect(res.body.participants[0].role).toBe('actor');

      const user = await prisma.user.findUnique({ where: { email: 'new@test.com' } });
      expect(user).not.toBeNull();
    });

    it('should add preselectors to an existing round (201)', async () => {
      await prisma.user.create({
        data: { id: 'user-1', name: 'Test Director', email: 'dir@test.com', password: 'hash' },
      });
      const casting = await prisma.casting.create({
        data: { id: 'casting-1', title: 'Casting Test', description: 'Desc' },
      });
      await prisma.participant.create({
        data: { userId: 'user-1', castingId: casting.id, role: 'director' },
      });
      const round = await prisma.round.create({
        data: { id: 'round-1', number: 1, castingId: casting.id },
      });

      const res = await request(app)
        .post('/api/v1/rounds/participants')
        .set('Authorization', `Bearer ${generateToken('user-1')}`)
        .send({
          roundId: 'round-1',
          actors: [],
          preselectors: [{ email: 'pre@test.com', name: 'Pre Selector' }],
        });

      expect(res.status).toBe(201);
      expect(res.body.participants).toHaveLength(1);
      expect(res.body.participants[0].role).toBe('preselector');
    });

    it('should not duplicate actors already in the round (201)', async () => {
      await prisma.user.create({
        data: { id: 'actor-1', name: 'Actor One', email: 'a1@test.com', password: 'hash' },
      });
      const casting = await prisma.casting.create({
        data: { id: 'casting-1', title: 'Casting Test', description: 'Desc' },
      });
      const round = await prisma.round.create({
        data: { id: 'round-1', number: 1, castingId: casting.id },
      });
      await prisma.participant.create({
        data: { userId: 'actor-1', roundId: round.id, role: 'actor' },
      });

      const res = await request(app)
        .post('/api/v1/rounds/participants')
        .set('Authorization', `Bearer ${generateToken('actor-1')}`)
        .send({
          roundId: 'round-1',
          actors: [{ email: 'a1@test.com', name: 'Actor One' }],
          preselectors: [],
        });

      expect(res.status).toBe(201);
      expect(res.body.participants).toHaveLength(1);
      expect(res.body.participants[0].actorId).toBe('actor-1');
    });

    it('should allow same user as actor and preselector (201)', async () => {
      await prisma.user.create({
        data: { id: 'user-1', name: 'Multi User', email: 'multi@test.com', password: 'hash' },
      });
      const casting = await prisma.casting.create({
        data: { id: 'casting-1', title: 'Casting Test', description: 'Desc' },
      });
      const round = await prisma.round.create({
        data: { id: 'round-1', number: 1, castingId: casting.id },
      });
      await prisma.participant.create({
        data: { userId: 'user-1', roundId: round.id, role: 'actor' },
      });

      const res = await request(app)
        .post('/api/v1/rounds/participants')
        .set('Authorization', `Bearer ${generateToken('user-1')}`)
        .send({
          roundId: 'round-1',
          actors: [],
          preselectors: [{ email: 'multi@test.com', name: 'Multi User' }],
        });

      expect(res.status).toBe(201);
      expect(res.body.participants).toHaveLength(2);
      expect(res.body.participants[0].role).toBe('actor');
      expect(res.body.participants[1].role).toBe('preselector');
    });
  });

  describe('createNewRound', () => {
    it('should create a new round with selected actors (201)', async () => {
      await prisma.user.create({
        data: { id: 'user-1', name: 'Test Director', email: 'dir@test.com', password: 'hash' },
      });
      const casting = await prisma.casting.create({
        data: { id: 'casting-1', title: 'Casting Test', description: 'Desc' },
      });
      await prisma.participant.create({
        data: { userId: 'user-1', castingId: casting.id, role: 'director' },
      });
      await prisma.user.create({
        data: { id: 'actor-1', name: 'Actor One', email: 'a1@test.com', password: 'hash' },
      });
      await prisma.user.create({
        data: { id: 'actor-2', name: 'Actor Two', email: 'a2@test.com', password: 'hash' },
      });
      const round = await prisma.round.create({
        data: { id: 'round-1', number: 1, castingId: casting.id },
      });
      await prisma.participant.createMany({
        data: [
          { userId: 'actor-1', roundId: round.id, role: 'actor' },
          { userId: 'actor-2', roundId: round.id, role: 'actor' },
        ],
      });

      const res = await request(app)
        .post('/api/v1/rounds/participants')
        .set('Authorization', `Bearer ${generateToken('user-1')}`)
        .send({
          roundId: 'round-1',
          actors: [
            { email: 'a1@test.com', name: 'Actor One' },
          ],
          preselectors: [],
          createNewRound: true,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.number).toBe(2);
      expect(res.body.castingId).toBe('casting-1');
      expect(res.body.participants).toHaveLength(1);
      expect(res.body.participants[0].role).toBe('actor');
      expect(res.body.participants[0].actorId).toBe('actor-1');
    });

    it('should not inherit previous round participants (201)', async () => {
      await prisma.user.create({
        data: { id: 'user-1', name: 'Test Director', email: 'dir@test.com', password: 'hash' },
      });
      const casting = await prisma.casting.create({
        data: { id: 'casting-1', title: 'Casting Test', description: 'Desc' },
      });
      await prisma.participant.create({
        data: { userId: 'user-1', castingId: casting.id, role: 'director' },
      });
      await prisma.user.create({
        data: { id: 'actor-1', name: 'Actor One', email: 'a1@test.com', password: 'hash' },
      });
      await prisma.user.create({
        data: { id: 'actor-2', name: 'Actor Two', email: 'a2@test.com', password: 'hash' },
      });
      await prisma.user.create({
        data: { id: 'pre-1', name: 'Pre Selector', email: 'pre@test.com', password: 'hash' },
      });
      const round = await prisma.round.create({
        data: { id: 'round-1', number: 1, castingId: casting.id },
      });
      await prisma.participant.createMany({
        data: [
          { userId: 'actor-1', roundId: round.id, role: 'actor' },
          { userId: 'actor-2', roundId: round.id, role: 'actor' },
          { userId: 'pre-1', roundId: round.id, role: 'preselector' },
        ],
      });

      const res = await request(app)
        .post('/api/v1/rounds/participants')
        .set('Authorization', `Bearer ${generateToken('user-1')}`)
        .send({
          roundId: 'round-1',
          actors: [{ email: 'a1@test.com', name: 'Actor One' }],
          preselectors: [],
          createNewRound: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.number).toBe(2);
      expect(res.body.participants).toHaveLength(1);
      expect(res.body.participants[0].actorId).toBe('actor-1');

      const round2Participants = await prisma.participant.findMany({
        where: { roundId: res.body.id },
      });
      expect(round2Participants).toHaveLength(1);
      expect(round2Participants[0].userId).toBe('actor-1');
      expect(round2Participants[0].role).toBe('actor');
    });

    it('should create new users when they do not exist (201)', async () => {
      await prisma.user.create({
        data: { id: 'user-1', name: 'Test Director', email: 'dir@test.com', password: 'hash' },
      });
      const casting = await prisma.casting.create({
        data: { id: 'casting-1', title: 'Casting Test', description: 'Desc' },
      });
      await prisma.participant.create({
        data: { userId: 'user-1', castingId: casting.id, role: 'director' },
      });
      const round = await prisma.round.create({
        data: { id: 'round-1', number: 1, castingId: casting.id },
      });

      const res = await request(app)
        .post('/api/v1/rounds/participants')
        .set('Authorization', `Bearer ${generateToken('user-1')}`)
        .send({
          roundId: 'round-1',
          actors: [{ email: 'brand@test.com', name: 'Brand New' }],
          preselectors: [],
          createNewRound: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.number).toBe(2);
      expect(res.body.participants).toHaveLength(1);

      const user = await prisma.user.findUnique({ where: { email: 'brand@test.com' } });
      expect(user).not.toBeNull();
      expect(user!.name).toBe('Brand New');
    });

    it('should return 404 when round does not exist', async () => {
      const res = await request(app)
        .post('/api/v1/rounds/participants')
        .set('Authorization', `Bearer ${generateToken('user-1')}`)
        .send({
          roundId: 'round-nonexistent',
          actors: [{ email: 'a@test.com', name: 'Actor' }],
          preselectors: [],
          createNewRound: true,
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should return 400 when actors list is empty with createNewRound', async () => {
      const casting = await prisma.casting.create({
        data: { id: 'casting-1', title: 'Casting Test', description: 'Desc' },
      });
      const round = await prisma.round.create({
        data: { id: 'round-1', number: 1, castingId: casting.id },
      });

      const res = await request(app)
        .post('/api/v1/rounds/participants')
        .set('Authorization', `Bearer ${generateToken('user-1')}`)
        .send({
          roundId: 'round-1',
          actors: [],
          preselectors: [],
          createNewRound: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 when preselectors are provided with createNewRound', async () => {
      const casting = await prisma.casting.create({
        data: { id: 'casting-1', title: 'Casting Test', description: 'Desc' },
      });
      const round = await prisma.round.create({
        data: { id: 'round-1', number: 1, castingId: casting.id },
      });

      const res = await request(app)
        .post('/api/v1/rounds/participants')
        .set('Authorization', `Bearer ${generateToken('user-1')}`)
        .send({
          roundId: 'round-1',
          actors: [{ email: 'a@test.com', name: 'Actor' }],
          preselectors: [{ email: 'p@test.com', name: 'Pre' }],
          createNewRound: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Preselectors');
    });
  });

  describe('full flow: casting → participants → submissions → new round', () => {
    it('should create casting, add actors, submit videos, create new round with selected actors', async () => {
      const directorToken = generateToken('dir-1');

      const directorRes = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${directorToken}`)
        .send({ id: 'dir-1', name: 'Director', email: 'dir@test.com', password: 'secret123' });
      expect(directorRes.status).toBe(201);

      const castingRes = await request(app)
        .post('/api/v1/castings')
        .set('Authorization', `Bearer ${directorToken}`)
        .send({
          title: 'Casting Principal',
          description: 'Buscamos protagonista',
          directorEmail: 'dir@test.com',
          directorName: 'Director',
        });
      expect(castingRes.status).toBe(201);
      const castingId = castingRes.body.id;
      const round1Id = castingRes.body.rounds[0].id;

      const addActorsRes = await request(app)
        .post('/api/v1/rounds/participants')
        .set('Authorization', `Bearer ${directorToken}`)
        .send({
          roundId: round1Id,
          actors: [
            { email: 'actor1@test.com', name: 'Actor One' },
            { email: 'actor2@test.com', name: 'Actor Two' },
            { email: 'actor3@test.com', name: 'Actor Three' },
          ],
          preselectors: [],
        });
      expect(addActorsRes.status).toBe(201);
      expect(addActorsRes.body.participants).toHaveLength(3);

      const actor1 = await prisma.user.findUnique({ where: { email: 'actor1@test.com' } });
      const actor2 = await prisma.user.findUnique({ where: { email: 'actor2@test.com' } });
      const actor3 = await prisma.user.findUnique({ where: { email: 'actor3@test.com' } });
      expect(actor1).not.toBeNull();
      expect(actor2).not.toBeNull();
      expect(actor3).not.toBeNull();

      const sub1 = await request(app)
        .post('/api/v1/submissions')
        .set('Authorization', `Bearer ${generateToken(actor1!.id)}`)
        .send({
          roundId: round1Id,
          videoUrl: 'https://example.com/video1.mp4',
        });
      expect(sub1.status).toBe(201);

      const sub2 = await request(app)
        .post('/api/v1/submissions')
        .set('Authorization', `Bearer ${generateToken(actor2!.id)}`)
        .send({
          roundId: round1Id,
          videoUrl: 'https://example.com/video2.mp4',
        });
      expect(sub2.status).toBe(201);

      const sub3 = await request(app)
        .post('/api/v1/submissions')
        .set('Authorization', `Bearer ${generateToken(actor3!.id)}`)
        .send({
          roundId: round1Id,
          videoUrl: 'https://example.com/video3.mp4',
        });
      expect(sub3.status).toBe(201);

      const round1Subs = await request(app)
        .get(`/api/v1/rounds/${round1Id}/submissions`)
        .set('Authorization', `Bearer ${directorToken}`);
      expect(round1Subs.status).toBe(200);
      expect(round1Subs.body).toHaveLength(3);

      const newRoundRes = await request(app)
        .post('/api/v1/rounds/participants')
        .set('Authorization', `Bearer ${directorToken}`)
        .send({
          roundId: round1Id,
          actors: [
            { email: 'actor1@test.com', name: 'Actor One' },
            { email: 'actor2@test.com', name: 'Actor Two' },
          ],
          preselectors: [],
          createNewRound: true,
        });
      expect(newRoundRes.status).toBe(201);
      expect(newRoundRes.body.number).toBe(2);
      expect(newRoundRes.body.castingId).toBe(castingId);
      expect(newRoundRes.body.participants).toHaveLength(2);

      const round2Participants = await prisma.participant.findMany({
        where: { roundId: newRoundRes.body.id },
      });
      expect(round2Participants).toHaveLength(2);
      const round2ActorIds = round2Participants.map((p: { userId: string }) => p.userId).sort();
      expect(round2ActorIds).toEqual([actor1!.id, actor2!.id].sort());

      const castingDetail = await request(app)
        .get(`/api/v1/castings/${castingId}`)
        .set('Authorization', `Bearer ${directorToken}`);
      expect(castingDetail.status).toBe(200);
      expect(castingDetail.body.rounds).toHaveLength(2);

      const round2Detail = await request(app)
        .get(`/api/v1/rounds/${newRoundRes.body.id}`)
        .set('Authorization', `Bearer ${directorToken}`);
      expect(round2Detail.status).toBe(200);
      expect(round2Detail.body.participants).toHaveLength(2);
    });
  });
});
