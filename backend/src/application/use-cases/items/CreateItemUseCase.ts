/**
 * @file CreateItemUseCase.ts
 * @module application/use-cases/items
 */

import Item from '../../../domain/entities/Item';
import ItemTitle from '../../../domain/value-objects/ItemTitle';
import IItemRepository from '../../interfaces/IItemRepository';
import { CreateItemInput } from '../../dtos';
import logger from '../../../infrastructure/logging/requestContext';
import BitacoraService from '../../../infrastructure/logging/BitacoraService';
import { ValidationError } from '../../../infrastructure/errors';

export default class CreateItemUseCase {
  constructor(
    private readonly itemRepository: IItemRepository,
    private readonly bitacoraService: BitacoraService
  ) {}

  async execute(input: CreateItemInput, createdBy: string): Promise<Item> {
    const { title, description } = input;

    logger.info({ title, createdBy }, 'CreateItemUseCase: starting');

    let itemTitle: ItemTitle;
    try {
      itemTitle = ItemTitle.create(title);
    } catch (err) {
      throw new ValidationError(err instanceof Error ? err.message : 'Invalid item title');
    }
    const item = Item.create(itemTitle, description ?? null, createdBy);

    await this.itemRepository.save(item);

    await this.bitacoraService.log({
      userId: createdBy,
      action: 'create_item',
      entityType: 'item',
      entityId: item.id,
      metadata: { title },
    });

    logger.info({ itemId: item.id }, 'CreateItemUseCase: completed');
    return item;
  }
}
