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
