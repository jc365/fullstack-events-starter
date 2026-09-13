/**
 * @file PrismaCastingRepository.ts
 * @module infrastructure/persistence
 */

import Casting, { type CastingParticipantEntry, type CastingParticipantRole } from '../../domain/entities/Casting';
import CastingTitle from '../../domain/value-objects/CastingTitle';
import Description from '../../domain/value-objects/Description';
import type ICastingRepository from '../../application/interfaces/ICastingRepository';
import prisma from './prismaClient';

export default class PrismaCastingRepository implements ICastingRepository {
  async findById(id: string): Promise<Casting | null> {
    const record = await prisma.casting.findUnique({
      where: { id },
      include: { participants: true },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findAll(): Promise<Casting[]> {
    const records = await prisma.casting.findMany({
      include: { participants: true },
    });
    return records.map((r) => this.toDomain(r));
  }

  async save(casting: Casting): Promise<void> {
    await prisma.casting.upsert({
      where: { id: casting.id },
      create: {
        id: casting.id,
        title: casting.title,
        description: casting.description,
        participants: {
          create: casting.participants.map((p) => ({
            userId: p.userId,
            role: p.role,
          })),
        },
      },
      update: {
        title: casting.title,
        description: casting.description,
        participants: {
          deleteMany: { roundId: null },
          create: casting.participants.map((p) => ({
            userId: p.userId,
            role: p.role,
          })),
        },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.participant.deleteMany({
      where: { castingId: id, roundId: null },
    });
    await prisma.casting.delete({
      where: { id },
    });
  }

  private toDomain(record: {
    id: string;
    title: string;
    description: string;
    participants: { userId: string; role: string }[];
  }): Casting {
    const castingTitle = CastingTitle.create(record.title);
    const castingDescription = Description.create(record.description);
    const participants: CastingParticipantEntry[] = record.participants.map((p) => ({
      userId: p.userId,
      role: p.role as CastingParticipantRole,
    }));
    return Casting.create(castingTitle, castingDescription, participants, record.id);
  }
}
