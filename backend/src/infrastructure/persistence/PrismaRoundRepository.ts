/**
 * @file PrismaRoundRepository.ts
 * @module infrastructure/persistence
 */

import Round, { type RoundParticipantEntry, type RoundParticipantRole, type RoundStatus } from '../../domain/entities/Round';
import type IRoundRepository from '../../application/interfaces/IRoundRepository';
import prisma from './prismaClient';

export default class PrismaRoundRepository implements IRoundRepository {
  async findById(id: string): Promise<Round | null> {
    const record = await prisma.round.findUnique({
      where: { id },
      include: { participants: true },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByCastingId(castingId: string): Promise<Round[]> {
    const records = await prisma.round.findMany({
      where: { castingId },
      include: { participants: true },
    });
    return records.map((r) => this.toDomain(r));
  }

  async save(round: Round): Promise<void> {
    await prisma.round.upsert({
      where: { id: round.id },
      create: {
        id: round.id,
        number: round.number,
        castingId: round.castingId,
        status: round.status,
        participants: {
          create: round.participants.map((entry) => ({
            userId: entry.id,
            role: entry.role,
          })),
        },
      },
      update: {
        number: round.number,
        status: round.status,
        participants: {
          deleteMany: { roundId: round.id },
          create: round.participants.map((entry) => ({
            userId: entry.id,
            role: entry.role,
          })),
        },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.participant.deleteMany({
      where: { roundId: id },
    });
    await prisma.round.delete({
      where: { id },
    });
  }

  private toDomain(record: {
    id: string;
    number: number;
    castingId: string;
    status: string;
    participants: { userId: string; role: string }[];
  }): Round {
    const participants: RoundParticipantEntry[] = record.participants.map((p) => ({
      id: p.userId,
      role: p.role as RoundParticipantRole,
    }));
    return Round.create(record.number, record.castingId, participants, record.id, record.status as RoundStatus);
  }
}
