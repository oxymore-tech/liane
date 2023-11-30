export type None = false;
export type Default = true;
export type Delay = { maxAttempts?: number; delay?: number; backoff?: number };
export type Custom = (error: any, attempt: number) => Promise<RetryStrategy>;

export type RetryStrategy = None | Default | Delay | Custom;

export type RetryLogger = {
  retry: (attempt: number, delay: number, error: any) => void;
  error: (attempt: number, error: any) => void;
};

export type RetryProps<T> = {
  body: () => Promise<T>;
  retryOn?: RetryStrategy;
  logger?: RetryLogger;
};

export const MAX_ATTEMPTS = 5;
export const DEFAULT_DELAY = 500;
export const DEFAULT_BACKOFF = 2;

function isDefault(strategy: RetryStrategy): strategy is Default {
  return typeof strategy === "boolean" && strategy;
}

function isDelay(strategy: RetryStrategy): strategy is Delay {
  return typeof strategy === "object";
}

async function apply_strategy(retryOn: RetryStrategy, error: any, attempt: number, logger?: RetryLogger): Promise<void> {
  if (!retryOn) {
    throw error;
  }
  if (isDefault(retryOn)) {
    return await apply_strategy({}, error, attempt, logger);
  }
  if (isDelay(retryOn)) {
    const maxAttempts = retryOn.maxAttempts === undefined ? MAX_ATTEMPTS : retryOn.maxAttempts;
    const delay = retryOn.delay === undefined ? DEFAULT_DELAY : retryOn.delay;
    const backoff = retryOn.backoff === undefined ? DEFAULT_BACKOFF : retryOn.backoff;
    if (attempt >= maxAttempts) {
      if (logger) {
        logger.error(attempt, error);
      }
      throw error;
    }
    const waitFor = delay * (backoff ? Math.pow(backoff, attempt) : 1);
    if (logger) {
      logger.retry(attempt, waitFor, error);
    }
    await new Promise(resolve => setTimeout(resolve, waitFor));
    return;
  }
  const custom = await retryOn(error, attempt);
  return apply_strategy(custom, error, attempt, logger);
}

export async function retry<T>({ body, retryOn = false, logger }: RetryProps<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await body();
    } catch (error) {
      await apply_strategy(retryOn, error, attempt, logger);
      attempt++;
    }
  }
}
