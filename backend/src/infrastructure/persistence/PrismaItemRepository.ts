/**
 * @file PrismaItemRepository.ts
 * @module infrastructure/persistence
 */

import Item from '../../domain/entities/Item';
import ItemTitle from '../../domain/value-objects/ItemTitle';
import type IItemRepository from '../../application/interfaces/IItemRepository';
import prisma from './prismaClient';

export default class PrismaItemRepository implements IItemRepository {
  async findById(id: string): Promise<Item | null> {
    const record = await prisma.item.findUnique({
      where: { id },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findAll(): Promise<Item[]> {
    const records = await prisma.item.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record: { id: string; title: string; description: string | null; status: string; createdBy: string; createdAt: Date; updatedAt: Date }) => this.toDomain(record));
  }

  async findByCreatedBy(createdBy: string): Promise<Item[]> {
    const records = await prisma.item.findMany({
      where: { createdBy },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record: { id: string; title: string; description: string | null; status: string; createdBy: string; createdAt: Date; updatedAt: Date }) => this.toDomain(record));
  }

  async save(item: Item): Promise<void> {
    await prisma.item.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        title: item.title.getValue(),
        description: item.description,
        status: item.status,
        createdBy: item.createdBy,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
      update: {
        title: item.title.getValue(),
        description: item.description,
        status: item.status,
        updatedAt: item.updatedAt,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.item.delete({
      where: { id },
    });
  }

  private toDomain(record: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }): Item {
    const title = ItemTitle.create(record.title);
    return Item.create(title, record.description, record.createdBy, record.id);
  }
}
