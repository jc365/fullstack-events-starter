import VideoUrl from '../../../../backend/src/domain/value-objects/VideoUrl';

describe('VideoUrl Value Object', () => {
  describe('create()', () => {
    it('should create a valid VideoUrl', () => {
      const url = VideoUrl.create('https://www.youtube.com/watch?v=abc123def45');
      expect(url.getValue()).toBe('https://www.youtube.com/watch?v=abc123def45');
    });

    it('should throw error for empty string', () => {
      expect(() => VideoUrl.create('')).toThrow('Video URL cannot be empty');
    });

    it('should throw error for invalid URL', () => {
      expect(() => VideoUrl.create('not-a-url')).toThrow('Invalid video URL');
    });
  });

  describe('platform()', () => {
    it('should detect YouTube', () => {
      const url = VideoUrl.create('https://www.youtube.com/watch?v=abc123def45');
      expect(url.platform()).toBe('youtube');
    });

    it('should detect youtu.be', () => {
      const url = VideoUrl.create('https://youtu.be/abc123def45');
      expect(url.platform()).toBe('youtube');
    });

    it('should detect Vimeo', () => {
      const url = VideoUrl.create('https://vimeo.com/123456789');
      expect(url.platform()).toBe('vimeo');
    });

    it('should return other for unknown platform', () => {
      const url = VideoUrl.create('https://example.com/video.mp4');
      expect(url.platform()).toBe('other');
    });
  });

  describe('videoId()', () => {
    it('should extract YouTube video ID', () => {
      const url = VideoUrl.create('https://www.youtube.com/watch?v=abc123def45');
      expect(url.videoId()).toBe('abc123def45');
    });

    it('should extract Vimeo video ID', () => {
      const url = VideoUrl.create('https://vimeo.com/987654321');
      expect(url.videoId()).toBe('987654321');
    });

    it('should return null for unknown platform', () => {
      const url = VideoUrl.create('https://example.com/video.mp4');
      expect(url.videoId()).toBeNull();
    });
  });

  describe('equals()', () => {
    it('should return true for equal URLs', () => {
      const u1 = VideoUrl.create('https://youtube.com/watch?v=abc');
      const u2 = VideoUrl.create('https://youtube.com/watch?v=abc');
      expect(u1.equals(u2)).toBe(true);
    });

    it('should return false for different URLs', () => {
      const u1 = VideoUrl.create('https://youtube.com/watch?v=abc');
      const u2 = VideoUrl.create('https://youtube.com/watch?v=xyz');
      expect(u1.equals(u2)).toBe(false);
    });
  });

  describe('isValid()', () => {
    it('should return true for valid URL', () => {
      expect(VideoUrl.isValid('https://example.com')).toBe(true);
    });

    it('should return false for invalid URL', () => {
      expect(VideoUrl.isValid('not-a-url')).toBe(false);
    });
  });
});
