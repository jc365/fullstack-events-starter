import Round, { type RoundParticipantEntry } from '../../../../backend/src/domain/entities/Round';

describe('Round Entity', () => {
  const participants: RoundParticipantEntry[] = [
    { id: 'actor-1', role: 'actor' },
    { id: 'actor-2', role: 'actor' },
  ];

  it('should create a round with create()', () => {
    const round = Round.create(1, 'casting-1', participants, 'rnd-1');
    expect(round.id).toBe('rnd-1');
    expect(round.number).toBe(1);
    expect(round.castingId).toBe('casting-1');
    expect(round.participants).toHaveLength(2);
    expect(round.actorIds).toHaveLength(2);
  });

  it('should generate an id when not provided', () => {
    const round = Round.create(1, 'casting-1', participants);
    expect(round.id).toBeDefined();
    expect(round.id.startsWith('rnd-')).toBe(true);
  });

  it('should throw when number is 0', () => {
    expect(() => Round.create(0, 'casting-1', participants, 'rnd-1')).toThrow('Number must be greater than 0');
  });

  it('should create a round with empty participants', () => {
    const round = Round.create(1, 'casting-1', [], 'rnd-1');
    expect(round.id).toBe('rnd-1');
    expect(round.number).toBe(1);
    expect(round.castingId).toBe('casting-1');
    expect(round.participants).toHaveLength(0);
    expect(round.actorIds).toHaveLength(0);
  });

  it('should return only actor IDs from actorIds getter', () => {
    const mixedParticipants: RoundParticipantEntry[] = [
      { id: 'actor-1', role: 'actor' },
      { id: 'preselector-1', role: 'preselector' },
    ];
    const round = Round.create(1, 'casting-1', mixedParticipants, 'rnd-1');
    expect(round.actorIds).toHaveLength(1);
    expect(round.actorIds[0]).toBe('actor-1');
  });

  it('should return only preselector IDs from preselectorIds getter', () => {
    const mixedParticipants: RoundParticipantEntry[] = [
      { id: 'actor-1', role: 'actor' },
      { id: 'preselector-1', role: 'preselector' },
    ];
    const round = Round.create(1, 'casting-1', mixedParticipants, 'rnd-1');
    expect(round.preselectorIds).toHaveLength(1);
    expect(round.preselectorIds[0]).toBe('preselector-1');
  });
});
