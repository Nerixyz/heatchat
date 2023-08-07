import { AvailableLog } from './justlog';
import { WorkerRequest, WorkerResponse } from './worker/messages';

export interface LazyWorker {
  worker: Worker | null;
  postMessage: (logs: AvailableLog[], height: number, user: string, channel: string, justlogUrl: string) => void;
}

export function lazyWorker(onMessage: (msg: WorkerResponse) => void): LazyWorker {
  return {
    worker: null,
    postMessage(logs, height, user, channel, justlogUrl) {
      if (this.worker == null) {
        this.worker = new Worker(new URL('worker/index.ts', import.meta.url), { type: 'module' });
        this.worker.addEventListener('message', ({ data }) => onMessage(data));
      }
      const req: WorkerRequest = { logs, height, user, channel, justlogUrl };
      this.worker.postMessage(req);
    },
  };
}
