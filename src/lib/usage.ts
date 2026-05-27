import fs from 'node:fs/promises';
import path from 'node:path';
import { getAppDir } from './storage.js';

export type UsageDay = {
  date: string;
  requests: number;
  tokens: number;
};

export type UsageStore = {
  version: 1;
  days: Record<string, UsageDay>;
};

const USAGE_FILE = 'usage.json';

function getUsagePath(): string {
  return path.join(getAppDir(), USAGE_FILE);
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data) as T;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(filePath, payload, 'utf8');
}

export async function loadUsage(): Promise<UsageStore> {
  const usagePath = getUsagePath();
  const store = await readJson<UsageStore>(usagePath);

  if (!store || store.version !== 1 || !store.days) {
    return { version: 1, days: {} };
  }

  return store;
}

export function getUsageDay(store: UsageStore, date: string): UsageDay {
  return store.days[date] ?? { date, requests: 0, tokens: 0 };
}

export async function recordUsage(date: string, tokens: number, requests = 1): Promise<UsageDay> {
  const store = await loadUsage();
  const current = getUsageDay(store, date);
  const next: UsageDay = {
    date,
    requests: current.requests + requests,
    tokens: current.tokens + tokens,
  };

  store.days[date] = next;
  await writeJson(getUsagePath(), store);

  return next;
}

export function estimateTokens(prompt: string, reply: string): number {
  const totalChars = prompt.length + reply.length;
  return Math.max(1, Math.ceil(totalChars / 4));
}
