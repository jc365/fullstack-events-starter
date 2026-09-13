/**
 * @file ManageRoundParticipantsUseCase.test.ts
 * @module tests/unit/application/use-cases/rounds
 */

import { vi } from 'vitest';
import { ManageRoundParticipantsUseCase } from '../../../../../backend/src/application/use-cases/rounds/ManageRoundParticipantsUseCase';
import IUserRepository from '../../../../../backend/src/application/interfaces/IUserRepository';
import IRoundRepository from '../../../../../backend/src/application/interfaces/IRoundRepository';
import ISubmissionRepository from '../../../../../backend/src/application/interfaces/ISubmissionRepository';
import User from '../../../../../backend/src/domain/entities/User';
import Round, { type RoundParticipantEntry } from '../../../../../backend/src/domain/entities/Round';
import Email from '../../../../../backend/src/domain/value-objects/Email';
import FullName from '../../../../../backend/src/domain/value-objects/FullName';
import BitacoraService from '../../../../../backend/src/infrastructure/logging/BitacoraService';
import HashService from '../../../../../backend/src/infrastructure/security/HashService';

const hash = '$2b$10$abcdefghijklmnopqrstuu';

describe('ManageRoundParticipantsUseCase', () => {
  let useCase: ManageRoundParticipantsUseCase;
  let userRepo: jest.Mocked<IUserRepository>;
  let roundRepo: jest.Mocked<IRoundRepository>;
  let submissionRepo: jest.Mocked<ISubmissionRepository>;
  let bitacoraService: jest.Mocked<BitacoraService>;
  let hashService: jest.Mocked<HashService>;

  beforeEach(() => {
    userRepo = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    roundRepo = {
      findById: vi.fn(),
      findByCastingId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    submissionRepo = {
      findById: vi.fn(),
      findByRoundId: vi.fn().mockResolvedValue([]),
      findByActorId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    bitacoraService = {
      log: vi.fn(),
    } as unknown as jest.Mocked<BitacoraService>;
    hashService = {
      hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
      compare: vi.fn(),
    } as unknown as jest.Mocked<HashService>;
    useCase = new ManageRoundParticipantsUseCase(userRepo, roundRepo, submissionRepo, bitacoraService, hashService);
  });

  function makeRound(number: number, participants: RoundParticipantEntry[], id?: string): Round {
    return Round.create(number, 'casting-1', participants, id || `round-${number}`);
  }

  function makeUser(id: string, email: string, name: string): User {
    const userEmail = Email.create(email);
    const userName = FullName.create(name);
    return User.create(userName, userEmail, hash, id);
  }

  describe('add participants to existing round', () => {
    it('should add actors to an existing round', async () => {
      const currentRound = makeRound(1, [
        { id: 'user-1', role: 'actor' },
      ]);
      roundRepo.findById.mockResolvedValue(currentRound);
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.save.mockResolvedValue();
      roundRepo.save.mockResolvedValue();

      const result = await useCase.execute({
        roundId: 'round-1',
        actors: [{ email: 'new@test.com', name: 'New Actor' }],
        preselectors: [],
      });

      expect(result.participants).toHaveLength(2);
      expect(result.participants[1].role).toBe('actor');
      expect(userRepo.save).toHaveBeenCalledTimes(1);
      expect(roundRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should add preselectors to an existing round', async () => {
      const currentRound = makeRound(1, [
        { id: 'user-1', role: 'actor' },
      ]);
      roundRepo.findById.mockResolvedValue(currentRound);
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.save.mockResolvedValue();
      roundRepo.save.mockResolvedValue();

      const result = await useCase.execute({
        roundId: 'round-1',
        actors: [],
        preselectors: [{ email: 'pre@test.com', name: 'Pre Selector' }],
      });

      expect(result.participants).toHaveLength(2);
      expect(result.participants[1].role).toBe('preselector');
      expect(userRepo.save).toHaveBeenCalledTimes(1);
      expect(roundRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should reuse existing users by email', async () => {
      const existingUser = makeUser('user-1', 'existing@test.com', 'Existing User');
      const currentRound = makeRound(1, [
        { id: 'existing', role: 'actor' },
      ]);
      roundRepo.findById.mockResolvedValue(currentRound);
      userRepo.findByEmail.mockResolvedValue(existingUser);
      roundRepo.save.mockResolvedValue();

      const result = await useCase.execute({
        roundId: 'round-1',
        actors: [{ email: 'existing@test.com' }],
        preselectors: [],
      });

      expect(result.participants).toHaveLength(2);
      expect(result.participants[1].id).toBe('user-1');
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('should handle duplicate users in the same request', async () => {
      const currentRound = makeRound(1, [
        { id: 'existing', role: 'actor' },
      ]);
      roundRepo.findById.mockResolvedValue(currentRound);
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.save.mockResolvedValue();
      roundRepo.save.mockResolvedValue();

      const result = await useCase.execute({
        roundId: 'round-1',
        actors: [
          { email: 'dup@test.com', name: 'Dup User' },
          { email: 'dup@test.com', name: 'Dup User Again' },
        ],
        preselectors: [],
      });

      expect(result.participants).toHaveLength(3);
      expect(userRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should not duplicate actors already in the round', async () => {
      const existingUser = makeUser('user-1', 'actor@test.com', 'Actor One');
      const currentRound = makeRound(1, [
        { id: 'user-1', role: 'actor' },
      ]);
      roundRepo.findById.mockResolvedValue(currentRound);
      userRepo.findByEmail.mockResolvedValue(existingUser);
      roundRepo.save.mockResolvedValue();

      const result = await useCase.execute({
        roundId: 'round-1',
        actors: [{ email: 'actor@test.com', name: 'Actor One' }],
        preselectors: [],
      });

      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].id).toBe('user-1');
      expect(roundRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should not duplicate preselectors already in the round', async () => {
      const existingUser = makeUser('user-1', 'pre@test.com', 'Pre Selector');
      const currentRound = makeRound(1, [
        { id: 'user-1', role: 'preselector' },
      ]);
      roundRepo.findById.mockResolvedValue(currentRound);
      userRepo.findByEmail.mockResolvedValue(existingUser);
      roundRepo.save.mockResolvedValue();

      const result = await useCase.execute({
        roundId: 'round-1',
        actors: [],
        preselectors: [{ email: 'pre@test.com', name: 'Pre Selector' }],
      });

      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].id).toBe('user-1');
      expect(roundRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should allow same user as actor in one role and preselector in another', async () => {
      const existingUser = makeUser('user-1', 'multi@test.com', 'Multi User');
      const currentRound = makeRound(1, [
        { id: 'user-1', role: 'actor' },
      ]);
      roundRepo.findById.mockResolvedValue(currentRound);
      userRepo.findByEmail.mockResolvedValue(existingUser);
      roundRepo.save.mockResolvedValue();

      const result = await useCase.execute({
        roundId: 'round-1',
        actors: [],
        preselectors: [{ email: 'multi@test.com', name: 'Multi User' }],
      });

      expect(result.participants).toHaveLength(2);
      expect(result.participants[0].role).toBe('actor');
      expect(result.participants[1].role).toBe('preselector');
      expect(result.participants[0].id).toBe('user-1');
      expect(result.participants[1].id).toBe('user-1');
    });
  });

  describe('createNewRound', () => {
    it('should create a new round with actors when createNewRound is true', async () => {
      const currentRound = makeRound(1, [
        { id: 'user-1', role: 'actor' },
      ]);
      roundRepo.findById.mockResolvedValue(currentRound);
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.save.mockResolvedValue();
      roundRepo.save.mockResolvedValue();

      const result = await useCase.execute({
        roundId: 'round-1',
        actors: [{ email: 'new@test.com', name: 'New Actor' }],
        preselectors: [],
        createNewRound: true,
      });

      expect(result.number).toBe(2);
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].role).toBe('actor');
      expect(roundRepo.save).toHaveBeenCalledTimes(2); // new round + mark previous as passed
    });

    it('should not inherit participants from the previous round', async () => {
      const currentRound = makeRound(1, [
        { id: 'user-1', role: 'actor' },
        { id: 'user-2', role: 'preselector' },
      ]);
      roundRepo.findById.mockResolvedValue(currentRound);
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.save.mockResolvedValue();
      roundRepo.save.mockResolvedValue();

      const result = await useCase.execute({
        roundId: 'round-1',
        actors: [{ email: 'new@test.com', name: 'New Actor' }],
        preselectors: [],
        createNewRound: true,
      });

      expect(result.number).toBe(2);
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].role).toBe('actor');
      expect(result.participants[0].id).not.toBe('user-1');
      expect(result.participants[0].id).not.toBe('user-2');
    });

    it('should create new users when they do not exist', async () => {
      const currentRound = makeRound(1, []);
      roundRepo.findById.mockResolvedValue(currentRound);
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.save.mockResolvedValue();
      roundRepo.save.mockResolvedValue();

      await useCase.execute({
        roundId: 'round-1',
        actors: [{ email: 'brand@test.com', name: 'Brand New' }],
        preselectors: [],
        createNewRound: true,
      });

      expect(userRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should throw when createNewRound is true but preselectors are provided', async () => {
      const currentRound = makeRound(1, [
        { id: 'user-1', role: 'actor' },
      ]);
      roundRepo.findById.mockResolvedValue(currentRound);

      await expect(
        useCase.execute({
          roundId: 'round-1',
          actors: [{ email: 'new@test.com', name: 'New Actor' }],
          preselectors: [{ email: 'pre@test.com', name: 'Pre Selector' }],
          createNewRound: true,
        })
      ).rejects.toThrow('Preselectors are not allowed when creating a new round');

      expect(roundRepo.save).not.toHaveBeenCalled();
    });

    it('should throw when createNewRound is true but only preselectors are provided', async () => {
      const currentRound = makeRound(1, []);
      roundRepo.findById.mockResolvedValue(currentRound);

      await expect(
        useCase.execute({
          roundId: 'round-1',
          actors: [],
          preselectors: [{ email: 'pre@test.com', name: 'Pre Selector' }],
          createNewRound: true,
        })
      ).rejects.toThrow('Preselectors are not allowed when creating a new round');

      expect(roundRepo.save).not.toHaveBeenCalled();
    });

    it('should throw when createNewRound is true but actors list is empty', async () => {
      const currentRound = makeRound(1, [
        { id: 'user-1', role: 'actor' },
      ]);
      roundRepo.findById.mockResolvedValue(currentRound);

      await expect(
        useCase.execute({
          roundId: 'round-1',
          actors: [],
          preselectors: [],
          createNewRound: true,
        })
      ).rejects.toThrow('Actors list cannot be empty when creating a new round');

      expect(roundRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw when round is not found', async () => {
      roundRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          roundId: 'round-999',
          actors: [{ email: 'test@test.com', name: 'Test' }],
          preselectors: [],
        })
      ).rejects.toThrow('Round round-999 not found');

      expect(roundRepo.save).not.toHaveBeenCalled();
    });

    it('should throw when round is not found with createNewRound', async () => {
      roundRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          roundId: 'round-999',
          actors: [{ email: 'test@test.com', name: 'Test' }],
          preselectors: [],
          createNewRound: true,
        })
      ).rejects.toThrow('Round round-999 not found');

      expect(roundRepo.save).not.toHaveBeenCalled();
      expect(bitacoraService.log).not.toHaveBeenCalled();
    });
  });

  describe('bitacora logging', () => {
    it('should log add_participants when adding to existing round', async () => {
      const currentRound = makeRound(1, [
        { id: 'user-1', role: 'actor' },
      ]);
      roundRepo.findById.mockResolvedValue(currentRound);
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.save.mockResolvedValue();
      roundRepo.save.mockResolvedValue();

      await useCase.execute({
        roundId: 'round-1',
        actors: [{ email: 'new@test.com', name: 'New Actor' }],
        preselectors: [],
      });

      expect(bitacoraService.log).toHaveBeenCalledTimes(1);
      expect(bitacoraService.log).toHaveBeenCalledWith({
        userId: expect.any(String),
        action: 'add_participants',
        details: { actors: expect.any(Array), preselectors: [] },
        roundId: 'round-1',
        castingId: 'casting-1',
      });
    });

    it('should log create_round when creating new round', async () => {
      const currentRound = makeRound(1, [
        { id: 'user-1', role: 'actor' },
      ]);
      roundRepo.findById.mockResolvedValue(currentRound);
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.save.mockResolvedValue();
      roundRepo.save.mockResolvedValue();

      await useCase.execute({
        roundId: 'round-1',
        actors: [{ email: 'new@test.com', name: 'New Actor' }],
        preselectors: [],
        createNewRound: true,
      });

      expect(bitacoraService.log).toHaveBeenCalledTimes(1);
      expect(bitacoraService.log).toHaveBeenCalledWith({
        userId: expect.any(String),
        action: 'create_round',
        details: { actors: expect.any(Array), roundNumber: 2 },
        roundId: expect.any(String),
        castingId: 'casting-1',
      });
    });
  });
});
