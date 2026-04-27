interface RefreshQueue {
  runOnce: (fn: () => Promise<boolean>) => Promise<boolean>;
}

export function createRefreshQueue(): RefreshQueue {
  let inFlight: Promise<boolean> | null = null;

  return {
    runOnce(fn: () => Promise<boolean>): Promise<boolean> {
      if (inFlight !== null) {
        return inFlight;
      }

      inFlight = fn().finally(() => {
        inFlight = null;
      });

      return inFlight;
    },
  };
}
