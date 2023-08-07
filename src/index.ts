import {
  availableLogNextMonth,
  availableLogToDate,
  compareAvailableLog,
  DEFAULT_JUSTLOG_URL,
  getJustlogUrl,
  listLogs,
} from './justlog';
import { lazyWorker } from './lazy-worker';
import { WorkerResponse } from './worker/messages';
import { clearChildren } from './dom';
import { generateMonthNames, generateMonthVisuals, updateDays } from './date';
import { initSuggestions } from './suggestions';

const canvas = document.getElementById('target-canvas') as HTMLCanvasElement;
const canvasCtx = canvas.getContext('2d')!;
const channelInput = document.getElementById('channel-name') as HTMLInputElement;
const usernameInput = document.getElementById('user-name') as HTMLInputElement;
const justlogInput = document.getElementById('justlog-url') as HTMLInputElement;
const monthsEl = document.getElementById('months') as HTMLDivElement;
const hoursEl = document.getElementById('hours') as HTMLDivElement;
const reqForm = document.getElementById('req-form') as HTMLFormElement;
const dayView = document.getElementById('day-view') as HTMLDivElement;
const mainView = document.getElementById('main-view') as HTMLDivElement;
const suggestionsEl = document.getElementById('channel-names') as HTMLDataListElement;

reqForm.addEventListener('submit', (e) => {
  e.preventDefault();
  runWrapper();
});
initSuggestions(suggestionsEl, justlogInput);

let running = false;
function runWrapper() {
  if (running) return;
  running = true;
  run()
    .catch((e) => alert(e))
    .finally(() => (running = false));
}

let workerHandler: (res: WorkerResponse) => void = () => undefined;
const worker = lazyWorker((res) => workerHandler(res));

async function run() {
  const channel = channelInput.value;
  const user = usernameInput.value;
  const justlogUrl = getJustlogUrl(justlogInput.value);

  const logList = (await listLogs(justlogUrl, channel, user)).sort(compareAvailableLog);
  if (logList.length === 0) return;
  const start = availableLogToDate(logList[0]);
  const end = availableLogNextMonth(logList[logList.length - 1]);

  clearChildren(monthsEl);
  generateMonthNames(monthsEl, new Date(start), end);
  clearChildren(dayView);
  const dayElements = generateMonthVisuals(dayView, new Date(start), end);

  canvas.width = (Number(end) - Number(start)) / (1000 * 60 * 60 * 24);
  canvas.height = hoursEl.clientHeight;

  mainView.classList.remove('hidden');

  let xPos = 0;
  workerHandler = ({ imageHeight, imageWidth, imageBuffer, recordedDays }) => {
    const imageData = new ImageData(new Uint8ClampedArray(imageBuffer), imageWidth, imageHeight);
    canvasCtx.putImageData(imageData, xPos, 0);
    xPos += imageWidth;
    updateDays(dayElements, recordedDays);
  };

  worker.postMessage(logList, canvas.height, user, channel, justlogUrl);
}
