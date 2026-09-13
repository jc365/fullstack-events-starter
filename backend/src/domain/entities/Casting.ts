/**
 * @file Casting.ts
 * @module domain/entities
 */

import CastingTitle from '../value-objects/CastingTitle';
import Description from '../value-objects/Description';
import genUUID from '../utils/genUUID';

export type CastingParticipantRole = 'director' | 'reviewer';

export interface CastingParticipantEntry {
  userId: string;
  role: CastingParticipantRole;
}

export default class Casting {
  private _id: string;
  private _title: CastingTitle;
  private _description: Description;
  private _participants: CastingParticipantEntry[];
  private _rounds: any[];

  private constructor(
    id: string,
    title: CastingTitle,
    description: Description,
    participants: CastingParticipantEntry[]
  ) {
    this._id = id;
    this._title = title;
    this._description = description;
    this._participants = participants;
    this._rounds = [];
  }

  static create(
    title: CastingTitle,
    description: Description,
    participants: CastingParticipantEntry[] = [],
    id?: string
  ): Casting {
    const finalId = id || genUUID('cas');
    return new Casting(finalId, title, description, participants);
  }

  public get id(): string {
    return this._id;
  }

  public get title(): string {
    return this._title.getValue();
  }

  public get description(): string {
    return this._description.getValue();
  }

  public get participants(): CastingParticipantEntry[] {
    return [...this._participants];
  }

  public get directorIds(): string[] {
    return this._participants
      .filter(p => p.role === 'director')
      .map(p => p.userId);
  }

  public get rounds(): any[] {
    return [...this._rounds];
  }

  public addRound(round: any): Casting {
    const newCasting = new Casting(this._id, this._title, this._description, this._participants);
    newCasting._rounds = [...this._rounds, round];
    return newCasting;
  }
}
