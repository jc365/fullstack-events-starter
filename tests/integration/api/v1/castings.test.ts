/**
 * @file castings.test.ts
 * @module tests/integration/api/v1/castings
 */

import request from 'supertest';
import app from '../../../../backend/src/index';
import prisma from '../../../../backend/src/infrastructure/persistence/prismaClient';
import { generateToken } from '../../../../backend/src/infrastructure/middleware/auth';

beforeEach(async () => {
  await prisma.bitacora.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.round.deleteMany();
  await prisma.casting.deleteMany();
  await prisma.user.deleteMany();
});

describe('POST /api/v1/castings', () => {
  it('should create a casting with director as participant and initial round (201)', async () => {
    await prisma.user.create({
      data: { id: 'user-1', name: 'Test Director', email: 'dir@test.com', password: 'hash' },
    });

    const res = await request(app)
      .post('/api/v1/castings')
      .set('Authorization', `Bearer ${generateToken('user-1')}`)
      .send({
        title: 'Casting Principal',
        description: 'Buscamos protagonista',
        directorEmail: 'dir@test.com',
        directorName: 'Test Director',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Casting Principal');
    expect(res.body.description).toBe('Buscamos protagonista');
    expect(res.body.participants).toHaveLength(1);
    expect(res.body.participants[0].role).toBe('director');
    expect(res.body.participants[0].userId).toBe('user-1');
    expect(res.body.rounds).toHaveLength(1);
    expect(res.body.rounds[0].number).toBe(1);
  });

  it('should create a new user as director when user does not exist (201)', async () => {
    const res = await request(app)
      .post('/api/v1/castings')
      .set('Authorization', `Bearer ${generateToken('user-newdir')}`)
      .send({
        title: 'Casting Principal',
        description: 'Buscamos protagonista',
        directorEmail: 'new@test.com',
        directorName: 'New Director',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Casting Principal');
    expect(res.body.participants).toHaveLength(1);
    expect(res.body.participants[0].role).toBe('director');
    expect(res.body.rounds).toHaveLength(1);
    expect(res.body.rounds[0].number).toBe(1);

    const user = await prisma.user.findUnique({ where: { email: 'new@test.com' } });
    expect(user).not.toBeNull();
    expect(user!.name).toBe('New Director');
  });

  it('should return 400 when title is empty', async () => {
    await prisma.user.create({
      data: { id: 'user-1', name: 'Test Director', email: 'dir@test.com', password: 'hash' },
    });

    const res = await request(app)
      .post('/api/v1/castings')
      .set('Authorization', `Bearer ${generateToken('user-1')}`)
      .send({
        title: '',
        description: 'Buscamos protagonista',
        directorEmail: 'dir@test.com',
        directorName: 'Test Director',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /api/v1/castings', () => {
  it('should list all castings (200)', async () => {
    await prisma.user.create({
      data: { id: 'user-1', name: 'Test Director', email: 'dir@test.com', password: 'hash' },
    });
    await prisma.casting.create({
      data: { id: 'casting-1', title: 'Casting Test', description: 'Desc' },
    });
    await prisma.participant.create({
      data: { userId: 'user-1', castingId: 'casting-1', role: 'director' },
    });

    const res = await request(app)
      .get('/api/v1/castings')
      .set('Authorization', `Bearer ${generateToken('user-1')}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Casting Test');
    expect(res.body[0].participants).toHaveLength(1);
  });
});

describe('GET /api/v1/castings/:id', () => {
  it('should return a casting with participants and rounds (200)', async () => {
    await prisma.user.create({
      data: { id: 'user-1', name: 'Test Director', email: 'dir@test.com', password: 'hash' },
    });
    await prisma.casting.create({
      data: { id: 'casting-1', title: 'Casting Test', description: 'Desc' },
    });
    await prisma.participant.create({
      data: { userId: 'user-1', castingId: 'casting-1', role: 'director' },
    });
    await prisma.round.create({
      data: { id: 'round-1', number: 1, castingId: 'casting-1' },
    });

    const res = await request(app)
      .get('/api/v1/castings/casting-1')
      .set('Authorization', `Bearer ${generateToken('user-1')}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Casting Test');
    expect(res.body.participants).toHaveLength(1);
    expect(res.body.participants[0].role).toBe('director');
    expect(res.body.rounds).toHaveLength(1);
    expect(res.body.rounds[0].number).toBe(1);
  });

  it('should return 404 when casting does not exist', async () => {
    const res = await request(app)
      .get('/api/v1/castings/casting-nonexistent')
      .set('Authorization', `Bearer ${generateToken('user-1')}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('not found');
  });
});
