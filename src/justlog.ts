export interface AvailableLog {
  year: string;
  month: string;
}

export interface LogMessage {
  // there are more fields but this is fine
  timestamp: string,
}

export interface JustlogChannel {
  name: string;
}

export interface LogListResponse {
  availableLogs: AvailableLog[];
}

export interface LogResponse {
  messages: LogMessage[];
}

export interface ChannelsResponse {
  channels: JustlogChannel[];
}

export const DEFAULT_JUSTLOG_URL = 'https://logs.ivr.fi';

export async function listLogs(justlogUrl: string, channel: string, user: string): Promise<AvailableLog[]> {
  const res = await fetch(`${ justlogUrl }/list?${ new URLSearchParams({ channel, user }).toString() }`);
  if (!res.ok) {
    throw new Error(await res.text().catch(e => e.toString()));
  }
  const json: LogListResponse = await res.json();
  return json.availableLogs;
}

export function availableLogToDate(log: AvailableLog): Date {
  return new Date(Date.UTC(Number(log.year), Number(log.month) - 1));
}

export function availableLogNextMonth(log: AvailableLog): Date {
  return new Date(Date.UTC(Number(log.year), Number(log.month)));
}

function availableLogMonth(log: AvailableLog) {
  return 12 * Number(log.year) + Number(log.month);
}
export function compareAvailableLog(a: AvailableLog, b: AvailableLog): number  {
  return availableLogMonth(a) - availableLogMonth(b);
}

export async function getChannelLogs(
  justlogUrl: string,
  channel: string,
  user: string,
  year: string | number,
  month: string | number
): Promise<LogMessage[]> {
  const encode = encodeURIComponent;
  const res = await fetch(`${ justlogUrl }/channel/${ encode(channel) }/user/${ encode(user) }/${ encode(year) }/${ encode(month) }?json=1`);
  if (!res.ok) {
    throw new Error(await res.text().catch(e => e.toString()));
  }
  const json: LogResponse = await res.json();
  return json.messages;
}

export async function getAvailableChannels(justlogUrl: string): Promise<JustlogChannel[]> {
  const res = await fetch(`${ justlogUrl }/channels`);
  if (!res.ok) {
    throw new Error(await res.text().catch(e => e.toString()));
  }
  const json: ChannelsResponse = await res.json();
  return json.channels;
}

export function getJustlogUrl(userUrl: string): string {
  return userUrl.startsWith('http') ? userUrl : DEFAULT_JUSTLOG_URL;
}
