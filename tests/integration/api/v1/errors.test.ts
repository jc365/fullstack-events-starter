/**
 * @file errors.test.ts
 * @module tests/integration/api/v1/errors
 *
 * Envelope global de errores en rutas reales (S8): 401/403/404/409/400
 * devuelven siempre `{ error: { code, message } }`.
 */

import request from 'supertest';
import app from '../../../../backend/src/index';
import prisma from '../../../../backend/src/infrastructure/persistence/prismaClient';
import { generateToken } from '../../../../backend/src/infrastructure/middleware/auth';

const token = generateToken('usr-nonexistent');

beforeEach(async () => {
  await prisma.bitacora.deleteMany();
  await prisma.eventQueue.deleteMany();
  await prisma.config.deleteMany();
  await prisma.item.deleteMany();
  await prisma.user.deleteMany();
});

describe('401 — autenticación', () => {
  it('sin Authorization → UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/v1/users');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toBe('Unauthorized');
  });

  it('token inválido → AUTH_INVALID_TOKEN', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', 'Bearer not-a-jwt');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_TOKEN');
    expect(res.body.error.message).toBe('Invalid token');
  });

  it('login con credenciales inválidas → AUTH_INVALID_CREDENTIALS', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(res.body.error.message).toBe('Invalid credentials');
  });

  it('login sin email/password → VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Email and password are required');
  });
});

describe('403 — autorización', () => {
  it('ruta admin con usuario inexistente → FORBIDDEN', async () => {
    const res = await request(app)
      .get('/api/v1/admin/bitacora')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('admin');
  });
});

describe('404 — recursos inexistentes', () => {
  it('GET /users/:id → USER_NOT_FOUND', async () => {
    const res = await request(app)
      .get('/api/v1/users/usr-does-not-exist')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
    expect(res.body.error.message).toBe('User not found');
  });

  it('GET /items/:id → ITEM_NOT_FOUND', async () => {
    const res = await request(app)
      .get('/api/v1/items/item-does-not-exist')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ITEM_NOT_FOUND');
    expect(res.body.error.message).toBe('Item not found');
  });

  it('GET /config/:key → CONFIG_NOT_FOUND', async () => {
    const res = await request(app)
      .get('/api/v1/config/no.such.key')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CONFIG_NOT_FOUND');
    expect(res.body.error.message).toContain('no.such.key');
  });

  it('PATCH /events/:id/complete → EVENT_NOT_FOUND', async () => {
    const res = await request(app)
      .patch('/api/v1/events/evt-does-not-exist/complete')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
    expect(res.body.error.message).toBe('Event not found');
  });

  it('ruta desconocida → NOT_FOUND (envelope, no HTML)', async () => {
    const res = await request(app)
      .get('/api/v1/this-does-not-exist')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(typeof res.body.error.message).toBe('string');
  });
});

describe('400/409 — validación y conflicto', () => {
  it('POST /users con nombre vacío → VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '', email: 'test@test.com', password: 'secret123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Name cannot be empty');
  });

  it('POST /users con email duplicado → 409 USER_EMAIL_EXISTS', async () => {
    await prisma.user.create({
      data: { id: 'usr-existing', name: 'Existing', email: 'dup@test.com', password: 'hash' },
    });

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Otro', email: 'dup@test.com', password: 'secret123' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USER_EMAIL_EXISTS');
    expect(res.body.error.message).toContain('already registered');
  });

  it('POST /items/:id/file sin fichero → FILE_NOT_FOUND', async () => {
    const res = await request(app)
      .post('/api/v1/items/item-x/file')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send('{}');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_NOT_FOUND');
    expect(res.body.error.message).toBe('No file provided');
  });

  it('PUT /config/:key sin value → VALIDATION_ERROR', async () => {
    await prisma.user.create({
      data: { id: 'usr-admin', name: 'Admin', email: 'admin@test.com', password: 'hash', role: 'admin' },
    });

    const res = await request(app)
      .put('/api/v1/config/some.key')
      .set('Authorization', `Bearer ${generateToken('usr-admin')}`)
      .send({ description: 'sin value' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('value is required');
  });
});
