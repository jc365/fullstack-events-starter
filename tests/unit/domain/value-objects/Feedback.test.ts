import Feedback from '../../../../backend/src/domain/value-objects/Feedback';

describe('Feedback Value Object', () => {
  describe('create()', () => {
    it('should create a valid Feedback', () => {
      const feedback = Feedback.create('Great performance!');
      expect(feedback.getValue()).toBe('Great performance!');
    });

    it('should normalize whitespace', () => {
      const feedback = Feedback.create('  Great   performance!  ');
      expect(feedback.getValue()).toBe('Great performance!');
    });

    it('should throw error for empty value', () => {
      expect(() => Feedback.create('')).toThrow('Feedback cannot be empty');
    });

    it('should throw error for whitespace-only value', () => {
      expect(() => Feedback.create('   ')).toThrow('Feedback cannot be empty');
    });

    it('should throw error for HTML tags', () => {
      expect(() => Feedback.create('Nice <script>alert("xss")</script>')).toThrow('Feedback cannot contain HTML tags');
    });

    it('should throw error for value exceeding 500 characters', () => {
      const longText = 'a'.repeat(501);
      expect(() => Feedback.create(longText)).toThrow('Feedback must be at most 500 characters');
    });
  });

  describe('none()', () => {
    it('should create a Feedback with null value', () => {
      const feedback = Feedback.none();
      expect(feedback.getValue()).toBeNull();
    });
  });

  describe('isPresent()', () => {
    it('should return true when feedback has a value', () => {
      const feedback = Feedback.create('Good job');
      expect(feedback.isPresent()).toBe(true);
    });

    it('should return false when feedback is none', () => {
      const feedback = Feedback.none();
      expect(feedback.isPresent()).toBe(false);
    });
  });

  describe('wordCount()', () => {
    it('should count words correctly', () => {
      const feedback = Feedback.create('Great performance in the scene');
      expect(feedback.wordCount()).toBe(5);
    });

    it('should throw error when feedback is not present', () => {
      const feedback = Feedback.none();
      expect(() => feedback.wordCount()).toThrow('Cannot count words when feedback is not present');
    });
  });

  describe('truncate()', () => {
    it('should return the same feedback if within max length', () => {
      const feedback = Feedback.create('Short text');
      const truncated = feedback.truncate(50);
      expect(truncated.getValue()).toBe('Short text');
    });

    it('should truncate text without cutting words', () => {
      const feedback = Feedback.create('This is a long text that should be truncated at some point');
      const truncated = feedback.truncate(24);
      expect(truncated.getValue()).toBe('This is a long text');
    });

    it('should throw error when feedback is not present', () => {
      const feedback = Feedback.none();
      expect(() => feedback.truncate(10)).toThrow('Cannot truncate when feedback is not present');
    });
  });

  describe('equals()', () => {
    it('should return true for equal values', () => {
      const feedback1 = Feedback.create('Good job');
      const feedback2 = Feedback.create('Good job');
      expect(feedback1.equals(feedback2)).toBe(true);
    });

    it('should return false for different values', () => {
      const feedback1 = Feedback.create('Good job');
      const feedback2 = Feedback.create('Bad job');
      expect(feedback1.equals(feedback2)).toBe(false);
    });

    it('should return true when both are none', () => {
      const feedback1 = Feedback.none();
      const feedback2 = Feedback.none();
      expect(feedback1.equals(feedback2)).toBe(true);
    });
  });

  describe('isValid()', () => {
    it('should return true for valid feedback', () => {
      expect(Feedback.isValid('Good performance')).toBe(true);
    });

    it('should return false for empty value', () => {
      expect(Feedback.isValid('')).toBe(false);
    });

    it('should return false for whitespace-only value', () => {
      expect(Feedback.isValid('   ')).toBe(false);
    });

    it('should return false for value exceeding 500 characters', () => {
      const longText = 'a'.repeat(501);
      expect(Feedback.isValid(longText)).toBe(false);
    });

    it('should return false for content with HTML tags', () => {
      expect(Feedback.isValid('Hello <b>world</b>')).toBe(false);
    });

    it('should return true for exactly 500 characters', () => {
      const text = 'a'.repeat(500);
      expect(Feedback.isValid(text)).toBe(true);
    });
  });
});
