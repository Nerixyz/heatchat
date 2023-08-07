import { CustomError } from 'ts-custom-error';

export class RatelimitError extends CustomError {
  retryAfter: null | number = null;

  constructor(retryAfterHeader: null | string) {
    super('Ratelimit exceeded');
    if (!retryAfterHeader) {
      return;
    }

    if (/^\d+$/.test(retryAfterHeader)) {
      this.retryAfter = parseInt(retryAfterHeader);
    } else {
      this.retryAfter = Math.max(Number(new Date(retryAfterHeader)) - Number(new Date()), 0);
    }
  }
}

export class Throttler {
  #delay = 250;

  nextRequest() {
    this.#delay = 250;
  }

  canDelay() {
    return this.#delay < 60 * 1000;
  }

  makeDelay() {
    return new Promise((r) => setTimeout(r, this.#delay));
  }

  recordError(e: RatelimitError) {
    if (e.retryAfter) {
      this.#delay = e.retryAfter;
    } else {
      this.#delay *= 2;
    }
    console.info(`Next delay: ${this.#delay / 1000}s`);
  }
}
