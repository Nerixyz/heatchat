import { AvailableLog } from '../justlog';

export interface RecordedDays {
  days: Map<number, number>;
  maxAmount: number;
}

export interface WorkerResponse {
  imageBuffer: ArrayBuffer;
  imageWidth: number;
  imageHeight: number;
  recordedDays: RecordedDays;
  dateID: number;
}

export interface WorkerRequest {
  logs: AvailableLog[];
  height: number;
  user: string;
  userID: string;
  channel: string;
  justlogUrl: string;
}

const NEWLINE_CHAR = '\n'.charCodeAt(0);
const CLOSE_CHAR = ']'.charCodeAt(0);

enum DateState {
  NeedClose,
  NeedNewline,
}

export async function* dates(res: Response) {
  if (!res.body) {
    return;
  }

  const body = res.body;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let result: ReadableStreamReadResult<Uint8Array>;
  let prevPart: null | string = null;
  let state = DateState.NeedClose;

  while (!(result = await reader.read()).done) {
    if (!result.value) {
      break;
    }
    let fromIdx = 0;
    let eolIdx = 0;
    do {
      switch (state) {
        case DateState.NeedClose:
          // fromIdx is the start of a line
          if ((eolIdx = result.value.indexOf(CLOSE_CHAR, fromIdx)) != -1) {
            let dec: string;
            if (prevPart !== null) {
              // restore prev. part
              const slice = result.value.subarray(fromIdx, eolIdx);
              dec = prevPart + decoder.decode(slice);
              prevPart = null;
            } else {
              const slice = result.value.subarray(fromIdx + 1, eolIdx);
              dec = decoder.decode(slice);
            }

            const dateStr = dec + 'Z'; // add Z for UTC
            const date = new Date(dateStr);
            if (Number.isNaN(Number(date))) {
              console.warn('bad date', {
                dateStr,
                view: decoder.decode(result.value.subarray(Math.max(fromIdx - 10, 0), eolIdx + 10)),
              });
            }
            yield date;
            fromIdx = eolIdx + 1;
            state = DateState.NeedNewline;
          }
          break;
        case DateState.NeedNewline:
          if ((eolIdx = result.value.indexOf(NEWLINE_CHAR, fromIdx)) != -1) {
            fromIdx = eolIdx + 1;
            state = DateState.NeedClose;
          }
          break;
      }
    } while (eolIdx != -1);

    // End of chunk - if NeedClose, then we just saw a newline and expect a closing brace
    if (state === DateState.NeedClose && fromIdx < result.value.length) {
      if (fromIdx === result.value.length - 1) {
        // result.value.at(-1) = '[' (last char in this chunk)
        prevPart = '';
      } else {
        // we received a part of the date - save it
        prevPart = decoder.decode(result.value.subarray(fromIdx + 1));
      }
    }
  }
}
