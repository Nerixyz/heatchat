import { WorkerRequest, WorkerResponse } from './messages';
import {
  AvailableLog,
  availableLogNextMonth,
  availableLogToDate,
  getChannelLogs, LogMessage
} from '../justlog';
import { MessageDateRecorder } from './message-date-recorder';
declare var self: DedicatedWorkerGlobalScope;

self.addEventListener('message', ({ data }) => onMessage(data));

function daysInMonth(log: AvailableLog): number {
  const start = Number(availableLogToDate(log));
  const end = Number(availableLogNextMonth(log));
  return (end - start) / (1000 * 60 * 60 * 24);
}

function colorPoint(data: ImageData, date: Date) {
  const y = Math.round(data.height * (date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60) / (24 * 60));
  const x = date.getDate() - 1;
  const start = (y * data.width + x) * 4;
  data.data[start] = 255;
  data.data[start + 3] = Math.min(255, data.data[start + 3] + 20);
}

async function onMessage({logs, height, user, channel, justlogUrl}: WorkerRequest) {
  const dateRecorder = new MessageDateRecorder();
  for(const log of logs) {
    const days = daysInMonth(log);
    const imageData = new ImageData(days, height);

    const logs = await getChannelLogs(justlogUrl, channel, user, log.year,  log.month).catch(() => [] as LogMessage[]);
    for(const message of logs) {
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
}
