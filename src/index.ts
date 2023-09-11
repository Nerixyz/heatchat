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
import {
  dateMonthID,
  daysInDateMonth,
  daysInMonth,
  generateMonthNames,
  generateMonthVisuals,
  months,
  updateDays,
} from './date';
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
initFields();

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
  updateHash();
  const channel = channelInput.value;
  const user = usernameInput.value;
  let userID = '';
  if (user.startsWith('id:')) {
    userID = user.substring(3);
  }

  const justlogUrl = getJustlogUrl(justlogInput.value);

  const { logs, capabilities } = await listLogs(justlogUrl, channel, user, userID);
  const logList = logs.sort(compareAvailableLog);
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

  const dateMap = makeDateMap(start, end);
  workerHandler = ({ imageHeight, imageWidth, imageBuffer, recordedDays, dateID }) => {
    const imageData = new ImageData(new Uint8ClampedArray(imageBuffer), imageWidth, imageHeight);
    canvasCtx.putImageData(imageData, dateMap.get(dateID) ?? 0, 0);
    updateDays(dayElements, recordedDays);
  };

  worker.postMessage({
    logs: logList,
    height: canvas.height,
    user,
    userID,
    channel,
    justlogUrl,
    hasArbitraryRangeQuery: capabilities.includes('arbitrary-range-query'),
  });
}

function makeDateMap(start: Date, end: Date) {
  const map = new Map<number, number>();
  let x = 0;
  for (const month of months(start, end)) {
    map.set(dateMonthID(month), x);
    x += daysInDateMonth(month);
  }
  return map;
}

function initFields() {
  if (location.hash.length < 1) {
    return;
  }
  try {
    const params = new URLSearchParams(location.hash.substring(1));
    const set = (input: HTMLInputElement, key: string) => {
      if (params.has(key)) {
        input.value = params.get(key) ?? '';
      }
    };
    set(justlogInput, 'justlog');
    set(channelInput, 'channel');
    set(usernameInput, 'user');
  } catch (e) {
    console.warn('Failed to parse hash', e);
  }
}

function updateHash() {
  const params = new URLSearchParams();
  const put = (input: HTMLInputElement, key: string) => {
    if (input.value) {
      params.set(key, input.value);
    }
  };
  put(justlogInput, 'justlog');
  put(channelInput, 'channel');
  put(usernameInput, 'user');
  location.hash = `#${params.toString()}`;
}
