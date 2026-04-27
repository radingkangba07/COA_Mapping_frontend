import { createRefreshQueue } from '@/shared/services/http/refresh-queue';

describe('createRefreshQueue', () => {
  it('runs the function once and returns its result (true)', async () => {
    const fn = jest.fn().mockResolvedValue(true);
    const queue = createRefreshQueue();

    const result = await queue.runOnce(fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it('runs the function once and returns its result (false)', async () => {
    const fn = jest.fn().mockResolvedValue(false);
    const queue = createRefreshQueue();

    const result = await queue.runOnce(fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result).toBe(false);
  });

  it('dedupes concurrent calls', async () => {
    let resolve: (value: boolean) => void;
    const fn = jest.fn(
      () => new Promise<boolean>((r) => { resolve = r; }),
    );
    const queue = createRefreshQueue();

    const p1 = queue.runOnce(fn);
    const p2 = queue.runOnce(fn);
    const p3 = queue.runOnce(fn);
    const p4 = queue.runOnce(fn);
    const p5 = queue.runOnce(fn);

    resolve!(true);

    const results = await Promise.all([p1, p2, p3, p4, p5]);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(results).toEqual([true, true, true, true, true]);
  });

  it('allows a new call after the previous resolves', async () => {
    const fn = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const queue = createRefreshQueue();

    const first = await queue.runOnce(fn);
    const second = await queue.runOnce(fn);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('releases the slot on rejection', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('refresh failed'))
      .mockResolvedValueOnce(true);
    const queue = createRefreshQueue();

    await expect(queue.runOnce(fn)).rejects.toThrow('refresh failed');

    const result = await queue.runOnce(fn);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(result).toBe(true);
  });
});
