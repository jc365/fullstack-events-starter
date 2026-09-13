import Submission from '../../../../backend/src/domain/entities/Submission';
import VideoUrl from '../../../../backend/src/domain/value-objects/VideoUrl';
import Score from '../../../../backend/src/domain/value-objects/Score';
import Feedback from '../../../../backend/src/domain/value-objects/Feedback';

describe('Submission Entity', () => {
  const videoUrl = VideoUrl.create('https://youtube.com/watch?v=abc123def45');

  it('should create a submission with pending status', () => {
    const sub = Submission.create('actor-1', 'round-1', videoUrl, 'sub-1');
    expect(sub.status).toBe('pending');
    expect(sub.score.isPresent()).toBe(false);
    expect(sub.feedback.isPresent()).toBe(false);
  });

  it('should generate an id when not provided', () => {
    const sub = Submission.create('actor-1', 'round-1', videoUrl);
    expect(sub.id).toBeDefined();
    expect(sub.id.startsWith('sub-')).toBe(true);
  });

  describe('review()', () => {
    it('should change status to reviewed', () => {
      const sub = Submission.create('actor-1', 'round-1', videoUrl, 'sub-1');
      const reviewed = sub.review(Score.create(8), Feedback.create('Good job'));
      expect(reviewed.status).toBe('reviewed');
      expect(reviewed.score.getValue()).toBe(8);
      expect(reviewed.feedback.getValue()).toBe('Good job');
    });

    it('should throw if not pending', () => {
      const sub = Submission.create('actor-1', 'round-1', videoUrl, 'sub-1')
        .review(Score.create(5), Feedback.create('ok'))
        .select();
      expect(() => sub.review(Score.create(5), Feedback.create('ok'))).toThrow('Only pending submissions can be reviewed');
    });
  });

  describe('select()', () => {
    it('should change status to selected', () => {
      const sub = Submission.create('actor-1', 'round-1', videoUrl, 'sub-1')
        .review(Score.create(9), Feedback.create('Great'));
      const selected = sub.select();
      expect(selected.status).toBe('selected');
    });

    it('should throw if not reviewed', () => {
      const sub = Submission.create('actor-1', 'round-1', videoUrl, 'sub-1');
      expect(() => sub.select()).toThrow('Only reviewed submissions can be selected');
    });
  });

  describe('reject()', () => {
    it('should change status to rejected from pending', () => {
      const sub = Submission.create('actor-1', 'round-1', videoUrl, 'sub-1');
      const rejected = sub.reject();
      expect(rejected.status).toBe('rejected');
    });

    it('should change status to rejected from reviewed', () => {
      const sub = Submission.create('actor-1', 'round-1', videoUrl, 'sub-1')
        .review(Score.create(3), Feedback.create('Weak'));
      const rejected = sub.reject();
      expect(rejected.status).toBe('rejected');
    });

    it('should throw if selected', () => {
      const sub = Submission.create('actor-1', 'round-1', videoUrl, 'sub-1')
        .review(Score.create(9), Feedback.create('Great'))
        .select();
      expect(() => sub.reject()).toThrow('Selected submissions cannot be rejected');
    });
  });

  it('should preserve immutability across state transitions', () => {
    const original = Submission.create('actor-1', 'round-1', videoUrl, 'sub-1');
    const reviewed = original.review(Score.create(7), Feedback.create('ok'));
    const selected = reviewed.select();
    expect(original.status).toBe('pending');
    expect(reviewed.status).toBe('reviewed');
    expect(selected.status).toBe('selected');
  });
});
