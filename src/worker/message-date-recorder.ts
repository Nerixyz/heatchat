import { RecordedDays } from './messages';

export class MessageDateRecorder {
  #days = new Map<number, number>();
  #maxAmount = 0;

  push(date: Date) {
    const ts = date.setUTCHours(0, 0, 0, 0);
    const value = (this.#days.get(ts) ?? 0) + 1;
    if (this.#maxAmount < value) this.#maxAmount = value;
    this.#days.set(ts, value);
  }

  intoResponse(): RecordedDays {
    return {
      days: this.#days,
      maxAmount: this.#maxAmount,
    };
  }
}
