// domain/entities/Round.ts

/**
 * @file Round.ts
 * @module domain/entities
 */

import genUUID from '../utils/genUUID';

export type RoundParticipantRole = 'actor' | 'preselector';
export type RoundStatus = 'active' | 'passed';

export interface RoundParticipantEntry {
  id: string;
  role: RoundParticipantRole;
}

export default class Round {
  private readonly _id: string;
  private readonly _number: number;
  private readonly _castingId: string;
  private readonly _status: RoundStatus;
  private readonly _participants: RoundParticipantEntry[];

  static create(number: number, castingId: string, participants: RoundParticipantEntry[] = [], id?: string, status: RoundStatus = 'active'): Round {
    if (number <= 0) {
      throw new Error('Number must be greater than 0');
    }
    const finalId = id || genUUID('rnd');
    return new Round(finalId, number, castingId, status, participants);
  }

  private constructor(id: string, number: number, castingId: string, status: RoundStatus, participants: RoundParticipantEntry[]) {
    this._id = id;
    this._number = number;
    this._castingId = castingId;
    this._status = status;
    this._participants = participants;
  }

  get id(): string {
    return this._id;
  }

  get number(): number {
    return this._number;
  }

  get castingId(): string {
    return this._castingId;
  }

  get status(): RoundStatus {
    return this._status;
  }

  get participants(): RoundParticipantEntry[] {
    return this._participants;
  }

  get actorIds(): string[] {
    return this._participants.filter(p => p.role === 'actor').map(p => p.id);
  }

  get preselectorIds(): string[] {
    return this._participants.filter(p => p.role === 'preselector').map(p => p.id);
  }

  markAsPassed(): Round {
    return new Round(this._id, this._number, this._castingId, 'passed', this._participants);
  }
}
