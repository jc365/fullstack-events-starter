import CastingTitle from '../../../../backend/src/domain/value-objects/CastingTitle';

describe('CastingTitle Value Object', () => {
  describe('create()', () => {
    it('should create a valid CastingTitle', () => {
      const title = CastingTitle.create('Casting Principal');
      expect(title.getValue()).toBe('Casting Principal');
    });

    it('should normalize whitespace', () => {
      const title = CastingTitle.create('  Casting   Principal  ');
      expect(title.getValue()).toBe('Casting Principal');
    });

    it('should throw error for empty string', () => {
      expect(() => CastingTitle.create('')).toThrow('Title cannot be empty');
    });

    it('should throw error for exceeding 200 characters', () => {
      expect(() => CastingTitle.create('A'.repeat(201))).toThrow('Title must be at most 200 characters');
    });

    it('should throw error for invalid characters', () => {
      expect(() => CastingTitle.create('Title@#$')).toThrow('Title contains invalid characters');
    });
  });

  describe('equals()', () => {
    it('should return true for equal titles', () => {
      const t1 = CastingTitle.create('Casting 1');
      const t2 = CastingTitle.create('Casting 1');
      expect(t1.equals(t2)).toBe(true);
    });

    it('should return false for different titles', () => {
      const t1 = CastingTitle.create('Casting 1');
      const t2 = CastingTitle.create('Casting 2');
      expect(t1.equals(t2)).toBe(false);
    });
  });

  describe('isValid()', () => {
    it('should return true for valid title', () => {
      expect(CastingTitle.isValid('Casting Principal')).toBe(true);
    });

    it('should return false for empty', () => {
      expect(CastingTitle.isValid('')).toBe(false);
    });

    it('should return false for exceeding 200 chars', () => {
      expect(CastingTitle.isValid('A'.repeat(201))).toBe(false);
    });
  });
});
