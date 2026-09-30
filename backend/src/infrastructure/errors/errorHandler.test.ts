/**
 * @file errorHandler.test.ts
 * @module infrastructure/errors
 *
 * Tests del handler global de errores (S8): envelope único
 * `{ error: { code, message } }` para 4xx/5xx, JSON siempre (nunca
 * HTML) y mensaje genérico en 500. Va co-localado con el módulo para
 * poder importar `express` desde `backend/node_modules` (los tests de
 * `tests/` solo resuelven dependencias de la raíz).
 */

import express from 'express';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import {
  errorHandler,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ConflictError,
  InternalError,
  ITEM_NOT_FOUND,
  AUTH_INVALID_TOKEN,
  ITEM_UPLOAD_FAILED,
} from './index';

function buildApp() {
  const app = express();
  app.use(express.json());

  app.get('/domain/not-found', () => {
    throw new NotFoundError('Item not found', ITEM_NOT_FOUND);
  });
  app.get('/domain/unauthorized', () => {
    throw new UnauthorizedError('Invalid token', AUTH_INVALID_TOKEN);
  });
  app.get('/domain/validation', () => {
    throw new ValidationError('Title too short');
  });
  app.get('/domain/conflict', () => {
    throw new ConflictError('Email already registered');
  });
  app.get('/boom', () => {
    throw new Error('sensitive internal detail');
  });
  app.get('/boom-app-error', () => {
    throw new InternalError('secret storage detail', ITEM_UPLOAD_FAILED);
  });
  app.post('/echo', (req, res) => {
    res.json(req.body);
  });

  // Mismo patrón que backend/src/index.ts
  app.use((req, _res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });
  app.use(errorHandler);

  return app;
}

const app = buildApp();

describe('errorHandler — envelope global', () => {
  it('404 → { error: { code, message } } con código de dominio', async () => {
    const res = await request(app).get('/domain/not-found');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'ITEM_NOT_FOUND', message: 'Item not found' },
    });
  });

  it('401 → envelope con AUTH_INVALID_TOKEN', async () => {
    const res = await request(app).get('/domain/unauthorized');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_TOKEN');
    expect(res.body.error.message).toBe('Invalid token');
  });

  it('400 → envelope con VALIDATION_ERROR', async () => {
    const res = await request(app).get('/domain/validation');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Title too short');
  });

  it('409 → envelope con CONFLICT', async () => {
    const res = await request(app).get('/domain/conflict');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.message).toBe('Email already registered');
  });

  it('500 no controlado → INTERNAL_ERROR genérico (no filtra el detalle)', async () => {
    const res = await request(app).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(JSON.stringify(res.body)).not.toContain('sensitive internal detail');
  });

  it('500 AppError → code propio + message genérico', async () => {
    const res = await request(app).get('/boom-app-error');

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('ITEM_UPLOAD_FAILED');
    expect(res.body.error.message).toBe('Internal server error');
    expect(JSON.stringify(res.body)).not.toContain('secret storage detail');
  });

  it('ruta desconocida → 404 NOT_FOUND en envelope JSON', async () => {
    const res = await request(app).get('/this/route/does/not/exist');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('GET /this/route/does/not/exist');
  });

  it('JSON malformado → 400 VALIDATION_ERROR en JSON (nunca HTML)', async () => {
    const res = await request(app)
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(typeof res.body.error.message).toBe('string');
  });
});
