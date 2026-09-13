export type TransferTally = { total: number; count: number; revision: number };

// Initial history, repeated polls, and stale snapshots never produce arrivals.
// A reset changes count but never total, so it cannot replay a success cue.
export function receiveTally(
  previous: TransferTally | null,
  next: TransferTally,
) {
  if (
    previous &&
    (next.revision < previous.revision || next.total < previous.total)
  ) {
    return { tally: previous, arrived: 0, stale: true };
  }
  return {
    tally: next,
    arrived: previous ? Math.max(0, next.total - previous.total) : 0,
    stale: false,
  };
}
