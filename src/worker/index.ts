import { WorkerRequest, WorkerResponse } from './messages';
import { AvailableLog, availableLogNextMonth, availableLogToDate, getChannelLogs, LogMessage } from '../justlog';
import { MessageDateRecorder } from './message-date-recorder';
import { RatelimitError, Throttler } from './throttle';
declare var self: DedicatedWorkerGlobalScope;

self.addEventListener('message', ({ data }) => onMessage(data));

function daysInMonth(log: AvailableLog): number {
  const start = Number(availableLogToDate(log));
  const end = Number(availableLogNextMonth(log));
  return (end - start) / (1000 * 60 * 60 * 24);
}

function colorPoint(data: ImageData, date: Date) {
  const y = Math.round((data.height * (date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60)) / (24 * 60));
  const x = date.getDate() - 1;
  const start = (y * data.width + x) * 4;
  data.data[start] = 255;
  data.data[start + 3] = Math.min(255, data.data[start + 3] + 20);
}

async function onMessage({ logs, ...request }: WorkerRequest) {
  const dateRecorder = new MessageDateRecorder();
  const throttle = new Throttler();
  outer: for (const log of logs) {
    throttle.nextRequest();
    inner: while (throttle.canDelay()) {
      try {
        await throttle.makeDelay();
        await handleMonth({ dateRecorder, log, allowRetry: true, ...request });
        continue outer;
      } catch (e) {
        if (e instanceof RatelimitError) {
          throttle.recordError(e);
          continue inner;
        }
      }
    }

    await handleMonth({ dateRecorder, log, allowRetry: false, ...request }).catch(() => void 0);
  }
}

async function handleMonth({
  log,
  dateRecorder,
  allowRetry,
  height,
  user,
  userID,
  channel,
  justlogUrl,
}: Omit<WorkerRequest, 'logs'> & { log: AvailableLog; dateRecorder: MessageDateRecorder; allowRetry: boolean }) {
  const hasUID = userID.length !== 0;
  const fetcher = hasUID ? getChannelLogs : getChannelLogs;
  const userSpec = hasUID ? userID : user.toLowerCase();

  const logs = await fetcher(justlogUrl, channel, userSpec, log.year, log.month).catch((e) => {
    if (e instanceof RatelimitError && allowRetry) {
      throw e;
    }
    return [] as LogMessage[];
  });

  const days = daysInMonth(log);
  const imageData = new ImageData(days, height);

  for (const message of logs) {
    const date = new Date(message.timestamp);
    colorPoint(imageData, date);
    dateRecorder.push(date);
  }
  const msg: WorkerResponse = {
    imageBuffer: imageData.data.buffer,
    imageWidth: imageData.width,
    imageHeight: imageData.height,
    recordedDays: dateRecorder.intoResponse(),
  };
  self.postMessage(msg, [msg.imageBuffer]);
}
