import { vi } from 'vitest';
import { CreateCastingUseCase } from '../../../../backend/src/application/use-cases/CreateCastingUseCase';
import ICastingRepository from '../../../../backend/src/application/interfaces/ICastingRepository';
import IUserRepository from '../../../../backend/src/application/interfaces/IUserRepository';
import IRoundRepository from '../../../../backend/src/application/interfaces/IRoundRepository';
import User from '../../../../backend/src/domain/entities/User';
import Email from '../../../../backend/src/domain/value-objects/Email';
import FullName from '../../../../backend/src/domain/value-objects/FullName';
import BitacoraService from '../../../../backend/src/infrastructure/logging/BitacoraService';
import HashService from '../../../../backend/src/infrastructure/security/HashService';

const hash = '$2b$10$abcdefghijklmnopqrstuu';

describe('CreateCastingUseCase', () => {
  let useCase: CreateCastingUseCase;
  let castingRepo: jest.Mocked<ICastingRepository>;
  let userRepo: jest.Mocked<IUserRepository>;
  let roundRepo: jest.Mocked<IRoundRepository>;
  let bitacoraService: jest.Mocked<BitacoraService>;
  let hashService: jest.Mocked<HashService>;

  beforeEach(() => {
    castingRepo = {
      findById: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
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
    bitacoraService = {
      log: vi.fn(),
    } as unknown as jest.Mocked<BitacoraService>;
    hashService = {
      hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
      compare: vi.fn(),
    } as unknown as jest.Mocked<HashService>;
    useCase = new CreateCastingUseCase(castingRepo, userRepo, roundRepo, bitacoraService, hashService);
  });

  it('should create a casting when director user exists', async () => {
    const user = User.create(FullName.create('Jane Doe'), Email.create('jane@test.com'), hash, 'user-1');
    userRepo.findByEmail.mockResolvedValue(user);
    castingRepo.save.mockResolvedValue();
    roundRepo.save.mockResolvedValue();

    const result = await useCase.execute({
      title: 'Casting Principal',
      description: 'Buscamos protagonista',
      directorEmail: 'jane@test.com',
      directorName: 'Jane Doe',
    });

    expect(result.title).toBe('Casting Principal');
    expect(result.description).toBe('Buscamos protagonista');
    expect(result.participants).toHaveLength(1);
    expect(result.participants[0].role).toBe('director');
    expect(castingRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should create a new user when director does not exist', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    userRepo.save.mockResolvedValue();
    castingRepo.save.mockResolvedValue();
    roundRepo.save.mockResolvedValue();

    const result = await useCase.execute({
      title: 'Casting Principal',
      description: 'Buscamos protagonista',
      directorEmail: 'new@test.com',
      directorName: 'New Director',
    });

    expect(result.title).toBe('Casting Principal');
    expect(result.participants).toHaveLength(1);
    expect(result.participants[0].role).toBe('director');
    expect(userRepo.save).toHaveBeenCalledTimes(1);
    expect(castingRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should create an initial round (Round 1) with empty participants', async () => {
    const user = User.create(FullName.create('Jane Doe'), Email.create('jane@test.com'), hash, 'user-1');
    userRepo.findByEmail.mockResolvedValue(user);
    castingRepo.save.mockResolvedValue();
    roundRepo.save.mockResolvedValue();

    const result = await useCase.execute({
      title: 'Casting Principal',
      description: 'Buscamos protagonista',
      directorEmail: 'jane@test.com',
      directorName: 'Jane Doe',
    });

    expect(result.rounds).toHaveLength(1);
    expect(result.rounds[0].number).toBe(1);
    expect(result.rounds[0].participants).toHaveLength(0);
    expect(roundRepo.save).toHaveBeenCalledTimes(1);
    const savedRound = roundRepo.save.mock.calls[0][0];
    expect(savedRound.number).toBe(1);
    expect(savedRound.participants).toHaveLength(0);
  });

  it('should throw when title is invalid', async () => {
    const user = User.create(FullName.create('Jane Doe'), Email.create('jane@test.com'), hash, 'user-1');
    userRepo.findByEmail.mockResolvedValue(user);

    await expect(
      useCase.execute({
        title: '',
        description: 'Valid description',
        directorEmail: 'jane@test.com',
        directorName: 'Jane Doe',
      })
    ).rejects.toThrow('Title cannot be empty');
  });

  it('should throw when description exceeds max length', async () => {
    const user = User.create(FullName.create('Jane Doe'), Email.create('jane@test.com'), hash, 'user-1');
    userRepo.findByEmail.mockResolvedValue(user);

    await expect(
      useCase.execute({
        title: 'Valid Title',
        description: 'a'.repeat(2001),
        directorEmail: 'jane@test.com',
        directorName: 'Jane Doe',
      })
    ).rejects.toThrow('Description must be at most 2000 characters');
  });

  it('should log to bitacora when casting is created', async () => {
    const user = User.create(FullName.create('Jane Doe'), Email.create('jane@test.com'), hash, 'user-1');
    userRepo.findByEmail.mockResolvedValue(user);
    castingRepo.save.mockResolvedValue();
    roundRepo.save.mockResolvedValue();

    await useCase.execute({
      title: 'Casting Principal',
      description: 'Buscamos protagonista',
      directorEmail: 'jane@test.com',
      directorName: 'Jane Doe',
    });

    expect(bitacoraService.log).toHaveBeenCalledTimes(1);
    expect(bitacoraService.log).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'create_casting',
      details: { title: 'Casting Principal', description: 'Buscamos protagonista' },
      castingId: expect.any(String),
    });
  });
});
