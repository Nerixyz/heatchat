import { WorkerRequest, WorkerResponse, dates } from './messages';
import {
  AvailableLog,
  getAllChannelLogs,
  getAllChannelLogsByID,
  getChannelLogs,
  getChannelLogsByID,
  LogMessage,
} from '../justlog';
import { MessageDateRecorder } from './message-date-recorder';
import { RatelimitError, Throttler } from './throttle';
import { dateMonthID, daysInDateMonth, daysInMonth, logMonthID } from '../date';
declare var self: DedicatedWorkerGlobalScope;

self.addEventListener('message', ({ data }) => onMessage(data));

function colorPoint(data: ImageData, date: Date) {
  const y = Math.round((data.height * (date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60)) / (24 * 60));
  const x = date.getDate() - 1;
  const start = (y * data.width + x) * 4;
  data.data[start] = 255;
  data.data[start + 3] = Math.min(255, data.data[start + 3] + 20);
}

async function onMessage({ logs, ...request }: WorkerRequest) {
  if (request.hasArbitraryRangeQuery) {
    return handleArbitraryRange(request);
  }
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
      break inner;
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
  const fetcher = hasUID ? getChannelLogsByID : getChannelLogs;
  const userSpec = hasUID ? userID : user.toLowerCase();

  const logs = await fetcher(justlogUrl, channel, userSpec, log.year, log.month).catch((e) => {
    console.warn(e);
    if (e instanceof RatelimitError && allowRetry) {
      throw e;
    }
    return new Response();
  });

  const days = daysInMonth(log);
  const imageData = new ImageData(days, height);

  for await (const date of dates(logs)) {
    colorPoint(imageData, date);
    dateRecorder.push(date);
  }

  const msg: WorkerResponse = {
    imageBuffer: imageData.data.buffer,
    imageWidth: imageData.width,
    imageHeight: imageData.height,
    recordedDays: dateRecorder.intoResponse(),
    dateID: logMonthID(log),
  };
  self.postMessage(msg, [msg.imageBuffer]);
}

async function handleArbitraryRange({ height, user, userID, channel, justlogUrl }: Omit<WorkerRequest, 'logs'>) {
  const dateRecorder = new MessageDateRecorder();

  const hasUID = userID.length !== 0;
  const fetcher = hasUID ? getAllChannelLogsByID : getAllChannelLogs;
  const userSpec = hasUID ? userID : user.toLowerCase();

  const logs = await fetcher(justlogUrl, channel, userSpec).catch((e) => {
    console.warn(e);
    return new Response();
  });

  let month: { days: number; image: ImageData; date: Date } | null = null;

  const flush = () => {
    if (month === null) {
      return;
    }

    const msg: WorkerResponse = {
      imageBuffer: month.image.data.buffer,
      imageWidth: month.image.width,
      imageHeight: month.image.height,
      recordedDays: dateRecorder.intoResponse(),
      dateID: dateMonthID(month.date),
    };
    self.postMessage(msg, [msg.imageBuffer]);

    month = null;
  };
  const sameMonth = (a: Date, b: Date) =>
    a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();

  for await (const date of dates(logs)) {
    if (month && !sameMonth(month.date, date)) {
      flush();
    }
    if (!month) {
      const days = daysInDateMonth(date);
      month = {
        date,
        days,
        image: new ImageData(days, height),
      };
    }

    colorPoint(month.image, date);
    dateRecorder.push(date);
  }

  flush();
}
