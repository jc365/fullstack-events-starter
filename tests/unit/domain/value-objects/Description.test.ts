import Description from '../../../../backend/src/domain/value-objects/Description';

describe('Description Value Object', () => {
  describe('create()', () => {
    it('should create a valid Description', () => {
      const desc = Description.create('Buscamos actor principal');
      expect(desc.getValue()).toBe('Buscamos actor principal');
    });

    it('should trim whitespace', () => {
      const desc = Description.create('  text  ');
      expect(desc.getValue()).toBe('text');
    });

    it('should throw error for exceeding 2000 characters', () => {
      expect(() => Description.create('a'.repeat(2001))).toThrow('Description must be at most 2000 characters');
    });
  });

  describe('empty()', () => {
    it('should create an empty Description', () => {
      const desc = Description.empty();
      expect(desc.getValue()).toBe('');
      expect(desc.isEmpty()).toBe(true);
    });
  });

  describe('isEmpty()', () => {
    it('should return true for empty', () => {
      expect(Description.empty().isEmpty()).toBe(true);
    });

    it('should return false for non-empty', () => {
      expect(Description.create('text').isEmpty()).toBe(false);
    });
  });

  describe('equals()', () => {
    it('should return true for equal descriptions', () => {
      const d1 = Description.create('Same text');
      const d2 = Description.create('Same text');
      expect(d1.equals(d2)).toBe(true);
    });

    it('should return false for different descriptions', () => {
      const d1 = Description.create('Text 1');
      const d2 = Description.create('Text 2');
      expect(d1.equals(d2)).toBe(false);
    });
  });

  describe('isValid()', () => {
    it('should return true for valid description', () => {
      expect(Description.isValid('Valid text')).toBe(true);
    });

    it('should return false for exceeding 2000 chars', () => {
      expect(Description.isValid('a'.repeat(2001))).toBe(false);
    });
  });
});
