import { AvailableLog } from './justlog';
import { WorkerRequest, WorkerResponse } from './worker/messages';

export interface LazyWorker {
  worker: Worker | null;
  postMessage: (req: WorkerRequest) => void;
}

export function lazyWorker(onMessage: (msg: WorkerResponse) => void): LazyWorker {
  return {
    worker: null,
    postMessage(req) {
      if (this.worker == null) {
        this.worker = new Worker(new URL('worker/index.ts', import.meta.url), { type: 'module' });
        this.worker.addEventListener('message', ({ data }) => onMessage(data));
      }
      this.worker.postMessage(req);
    },
  };
}
