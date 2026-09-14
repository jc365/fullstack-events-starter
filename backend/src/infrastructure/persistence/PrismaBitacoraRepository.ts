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
        entityType: event.entityType ?? undefined,
        entityId: event.entityId ?? undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: event.metadata as any,
      },
    });
  }
}
