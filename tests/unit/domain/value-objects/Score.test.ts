import Score from '../../../../backend/src/domain/value-objects/Score';

describe('Score Value Object', () => {
  describe('create()', () => {
    it('should create a valid Score', () => {
      const score = Score.create(7);
      expect(score.getValue()).toBe(7);
    });

    it('should throw error for negative value', () => {
      expect(() => Score.create(-1)).toThrow('Score must be between 0 and 10');
    });

    it('should throw error for value above 10', () => {
      expect(() => Score.create(11)).toThrow('Score must be between 0 and 10');
    });

    it('should throw error for non-integer', () => {
      expect(() => Score.create(5.5)).toThrow('Score must be between 0 and 10');
    });
  });

  describe('none()', () => {
    it('should create a Score with null value', () => {
      const score = Score.none();
      expect(score.getValue()).toBeNull();
    });
  });

  describe('isPresent()', () => {
    it('should return true when score has value', () => {
      expect(Score.create(5).isPresent()).toBe(true);
    });

    it('should return false when score is none', () => {
      expect(Score.none().isPresent()).toBe(false);
    });
  });

  describe('isHigherThan()', () => {
    it('should return true when higher', () => {
      expect(Score.create(8).isHigherThan(Score.create(5))).toBe(true);
    });

    it('should return false when lower', () => {
      expect(Score.create(3).isHigherThan(Score.create(7))).toBe(false);
    });

    it('should throw when either is not present', () => {
      expect(() => Score.none().isHigherThan(Score.create(5))).toThrow('Cannot compare');
    });
  });

  describe('isPassing()', () => {
    it('should return true when above threshold', () => {
      expect(Score.create(7).isPassing()).toBe(true);
    });

    it('should return false when below threshold', () => {
      expect(Score.create(3).isPassing()).toBe(false);
    });

    it('should return false when not present', () => {
      expect(Score.none().isPassing()).toBe(false);
    });

    it('should use custom threshold', () => {
      expect(Score.create(6).isPassing(7)).toBe(false);
    });
  });

  describe('toGrade()', () => {
    it('should return F for 0-5', () => {
      expect(Score.create(0).toGrade()).toBe('F');
      expect(Score.create(5).toGrade()).toBe('F');
    });

    it('should return C for 6-7', () => {
      expect(Score.create(6).toGrade()).toBe('C');
      expect(Score.create(7).toGrade()).toBe('C');
    });

    it('should return B for 8-9', () => {
      expect(Score.create(8).toGrade()).toBe('B');
      expect(Score.create(9).toGrade()).toBe('B');
    });

    it('should return A for 10', () => {
      expect(Score.create(10).toGrade()).toBe('A');
    });

    it('should throw when not present', () => {
      expect(() => Score.none().toGrade()).toThrow('Cannot convert to grade');
    });
  });

  describe('equals()', () => {
    it('should return true for equal scores', () => {
      expect(Score.create(5).equals(Score.create(5))).toBe(true);
    });

    it('should return false for different scores', () => {
      expect(Score.create(5).equals(Score.create(6))).toBe(false);
    });

    it('should return true when both are none', () => {
      expect(Score.none().equals(Score.none())).toBe(true);
    });
  });

  describe('isValid()', () => {
    it('should return true for valid score', () => {
      expect(Score.isValid(5)).toBe(true);
    });

    it('should return false for negative', () => {
      expect(Score.isValid(-1)).toBe(false);
    });

    it('should return false for above 10', () => {
      expect(Score.isValid(11)).toBe(false);
    });

    it('should return false for non-integer', () => {
      expect(Score.isValid(5.5)).toBe(false);
    });
  });
});
