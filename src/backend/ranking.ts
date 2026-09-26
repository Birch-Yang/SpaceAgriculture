/** Competition ranking: 1, 2, 2, 4 for scores sorted descending. */
export function competitionRanks(scores: readonly number[]): number[] {
  let lastRank = 0;
  return scores.map((score, index) => {
    if (index === 0 || score !== scores[index - 1]) lastRank = index + 1;
    return lastRank;
  });
}
