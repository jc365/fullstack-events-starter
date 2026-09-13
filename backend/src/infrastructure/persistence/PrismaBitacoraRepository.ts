/**
 * @file PrismaBitacoraRepository.ts
 * @module infrastructure/persistence
 */

import IBitacoraRepository from '../../application/interfaces/IBitacoraRepository';
import type { BitacoraEvent } from '../../application/interfaces/IBitacoraRepository';
import prisma from './prismaClient';

export default class PrismaBitacoraRepository implements IBitacoraRepository {
  async log(event: BitacoraEvent): Promise<void> {
    await prisma.bitacora.create({
      data: {
        userId: event.userId,
        action: event.action,
        details: event.details ?? undefined,
        castingId: event.castingId ?? undefined,
        roundId: event.roundId ?? undefined,
        submissionId: event.submissionId ?? undefined,
      },
    });
  }
}
