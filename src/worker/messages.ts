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
}

export interface WorkerRequest {
  logs: AvailableLog[];
  height: number;
  user: string;
  userID: string;
  channel: string;
  justlogUrl: string;
}
