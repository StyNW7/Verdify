export function clampStep(requested: number, total: number): number {
  if (total <= 0) return 0;
  if (requested < 0) return 0;
  if (requested > total - 1) return total - 1;
  return requested;
}

export function nextStep(current: number, total: number): number {
  return clampStep(current + 1, total);
}

export function isFinalStep(step: number, total: number): boolean {
  if (total <= 0) return true;
  return step >= total - 1;
}

export type ProgressFlusher = {
  schedule: (stepIndex: number) => void;
  flush: () => void;
  cancel: () => void;
};

type FlusherOptions = {
  patch: (stepIndex: number) => void;
  debounceMs?: number;
};

export function createProgressFlusher({ patch, debounceMs = 500 }: FlusherOptions): ProgressFlusher {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: number | null = null;

  function schedule(stepIndex: number): void {
    pending = stepIndex;
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      if (pending !== null) {
        patch(pending);
        pending = null;
      }
    }, debounceMs);
  }

  function flush(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending !== null) {
      patch(pending);
      pending = null;
    }
  }

  function cancel(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    pending = null;
  }

  return { schedule, flush, cancel };
}
