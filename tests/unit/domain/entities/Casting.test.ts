import Casting from '../../../../backend/src/domain/entities/Casting';
import CastingTitle from '../../../../backend/src/domain/value-objects/CastingTitle';
import Description from '../../../../backend/src/domain/value-objects/Description';

describe('Casting Entity', () => {
  const title = CastingTitle.create('Casting Principal');
  const desc = Description.create('Buscamos protagonista');

  it('should create a casting with create()', () => {
    const casting = Casting.create(title, desc, [
      { userId: 'user-1', role: 'director' },
    ], 'cas-1');
    expect(casting.id).toBe('cas-1');
    expect(casting.title).toBe('Casting Principal');
    expect(casting.description).toBe('Buscamos protagonista');
    expect(casting.participants).toHaveLength(1);
    expect(casting.participants[0].userId).toBe('user-1');
    expect(casting.participants[0].role).toBe('director');
  });

  it('should generate an id when not provided', () => {
    const casting = Casting.create(title, desc);
    expect(casting.id).toBeDefined();
    expect(casting.id.startsWith('cas-')).toBe(true);
  });

  it('should have empty rounds initially', () => {
    const casting = Casting.create(title, desc, [], 'cas-1');
    expect(casting.rounds).toEqual([]);
  });

  it('should have empty participants by default', () => {
    const casting = Casting.create(title, desc, [], 'cas-1');
    expect(casting.participants).toEqual([]);
  });

  it('should return directorIds', () => {
    const casting = Casting.create(title, desc, [
      { userId: 'user-1', role: 'director' },
    ], 'cas-1');
    expect(casting.directorIds).toHaveLength(1);
    expect(casting.directorIds[0]).toBe('user-1');
  });

  it('should add a round immutably', () => {
    const casting = Casting.create(title, desc, [
      { userId: 'user-1', role: 'director' },
    ], 'cas-1');
    const updated = casting.addRound({ roundNumber: 1 });
    expect(updated.rounds).toHaveLength(1);
    expect(casting.rounds).toHaveLength(0);
  });
});
