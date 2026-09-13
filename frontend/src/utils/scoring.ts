export function scoreToStars(score: number): number {
  if (score <= 0) return 0;
  return Math.round(score / 2);
}
