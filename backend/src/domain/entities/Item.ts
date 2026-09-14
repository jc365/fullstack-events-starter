/**
 * @file Item.ts
 * @module domain/entities
 */

import genUUID from '../utils/genUUID';
import ItemTitle from '../value-objects/ItemTitle';

export type ItemStatus = 'active' | 'archived';

export default class Item {
  private readonly _id: string;
  private readonly _title: ItemTitle;
  private readonly _description: string | null;
  private readonly _status: ItemStatus;
  private readonly _createdBy: string;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(
    id: string,
    title: ItemTitle,
    description: string | null,
    status: ItemStatus,
    createdBy: string,
    createdAt: Date,
    updatedAt: Date
  ) {
    this._id = id;
    this._title = title;
    this._description = description;
    this._status = status;
    this._createdBy = createdBy;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(
    title: ItemTitle,
    description: string | null,
    createdBy: string,
    id?: string
  ): Item {
    const now = new Date();
    return new Item(
      id || genUUID('item'),
      title,
      description ?? null,
      'active',
      createdBy,
      now,
      now
    );
  }

  get id(): string {
    return this._id;
  }

  get title(): ItemTitle {
    return this._title;
  }

  get description(): string | null {
    return this._description;
  }

  get status(): ItemStatus {
    return this._status;
  }

  get createdBy(): string {
    return this._createdBy;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  withUpdates(data: { title?: ItemTitle; description?: string | null; status?: ItemStatus }): Item {
    return new Item(
      this._id,
      data.title ?? this._title,
      data.description !== undefined ? data.description : this._description,
      data.status ?? this._status,
      this._createdBy,
      this._createdAt,
      new Date()
    );
  }
}
