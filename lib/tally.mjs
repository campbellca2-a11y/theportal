import { readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';

export async function openTally(dataDirectory, records) {
  const path = join(dataDirectory, 'tally.json');
  let saved = { total: records.size, resetTotal: 0, revision: 0 };
  try {
    const value = JSON.parse(await readFile(path, 'utf8'));
    if (
      ![value.total, value.resetTotal, value.revision].every(
        (n) => Number.isSafeInteger(n) && n >= 0,
      ) ||
      value.resetTotal > value.total
    ) {
      throw new Error('Invalid transfer tally; preserved for recovery.');
    }
    saved = value;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      await rename(
        path,
        join(dataDirectory, 'tally-recovery-' + Date.now() + '.json'),
      );
      console.warn(
        'Recovered the transfer tally from completed files. The previous tally was preserved.',
      );
    }
  }
  // Recover a completed file if its metadata committed just before interruption.
  const recoveredTotal = Math.max(
    saved.total,
    ...[...records.values()].map((item) =>
      Number.isSafeInteger(item.sequence) && item.sequence >= 0
        ? item.sequence
        : 0,
    ),
  );
  let state = {
    ...saved,
    total: recoveredTotal,
    revision: saved.revision + (recoveredTotal > saved.total ? 1 : 0),
  };
  let queue = Promise.resolve();
  const snapshot = () => ({
    total: state.total,
    count: state.total - state.resetTotal,
    revision: state.revision,
  });
  // Serializes committed uploads and resets; byte streaming stays concurrent.
  const run = (operation) => {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  };
  const save = async (next) => {
    await writeFile(path + '.part', JSON.stringify(next));
    await rename(path + '.part', path);
    state = next;
    return snapshot();
  };
  await save(state);
  return {
    snapshot,
    run,
    complete: () =>
      save({ ...state, total: state.total + 1, revision: state.revision + 1 }),
    reset: () =>
      run(() =>
        save({
          ...state,
          resetTotal: state.total,
          revision: state.revision + 1,
        }),
      ),
  };
}
