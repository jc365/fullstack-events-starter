/**
 * @file client.test.ts
 * @module tests
 *
 * Normalización del envelope global de errores en el interceptor de
 * respuesta de axios (S8): `data.error` (objeto o string) → string en
 * `error.message`.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

const { requestUse, responseUse } = vi.hoisted(() => ({
  requestUse: vi.fn(),
  responseUse: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: requestUse },
        response: { use: responseUse },
      },
    })),
  },
}));

import './client';

type OnRejected = (error: unknown) => Promise<unknown>;

let onRejected: OnRejected;

beforeAll(() => {
  // El interceptor de error es el 2º argumento registrado en `use`
  onRejected = responseUse.mock.calls[0][1] as OnRejected;
});

function fakeError(data: unknown) {
  return {
    message: 'Request failed with status code 400',
    response: { status: 400, data },
  };
}

function errorWithoutResponse() {
  return {
    message: 'Network Error',
    response: undefined as { status: number; data: unknown } | undefined,
  };
}

describe('client — normalización de errores (S8)', () => {
  it('está registrado el interceptor de respuesta con handlers', () => {
    expect(responseUse).toHaveBeenCalledTimes(1);
    expect(typeof responseUse.mock.calls[0][1]).toBe('function');
  });

  it('normaliza data.error (objeto envelope) a string y lo copia a error.message', async () => {
    const error = fakeError({
      error: { code: 'USER_EMAIL_EXISTS', message: 'Email x@test.com is already registered' },
    });

    await expect(onRejected(error)).rejects.toBe(error);

    expect((error.response.data as { error: unknown }).error).toBe(
      'Email x@test.com is already registered',
    );
    expect(error.message).toBe('Email x@test.com is already registered');
  });

  it('acepta data.error como string (formato legado)', async () => {
    const error = fakeError({ error: 'Too many login attempts' });

    await expect(onRejected(error)).rejects.toBe(error);

    expect(error.message).toBe('Too many login attempts');
  });

  it('no toca el error si no hay response o sin campo error', async () => {
    const noResponse = errorWithoutResponse();
    await expect(onRejected(noResponse)).rejects.toBe(noResponse);
    expect(noResponse.message).toBe('Network Error');

    const noEnvelope = fakeError({ detail: 'otra cosa' });
    await expect(onRejected(noEnvelope)).rejects.toBe(noEnvelope);
    expect(noEnvelope.message).toBe('Request failed with status code 400');
  });
});
