import fs from 'node:fs/promises';
import path from 'node:path';
import { getAppDir } from './storage.js';

export type ChatMessage = {
  role: 'user' | 'agent';
  text: string;
};

const HISTORY_FILE = 'history.json';
const MAX_HISTORY = 50;

function getHistoryPath(): string {
  return path.join(getAppDir(), HISTORY_FILE);
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
  const tempPath = `${filePath}.tmp-${Date.now()}`;
  await fs.writeFile(tempPath, payload, 'utf8');
  await fs.rename(tempPath, filePath);
}

export async function loadHistory(): Promise<ChatMessage[]> {
  const historyPath = getHistoryPath();
  const history = await readJson<ChatMessage[]>(historyPath);
  if (!history || !Array.isArray(history)) {
    return [];
  }

  return history.filter((item) => item && typeof item.text === 'string' && item.role).slice(-MAX_HISTORY);
}

export async function saveHistory(messages: ChatMessage[]): Promise<void> {
  const trimmed = messages.slice(-MAX_HISTORY);
  await writeJson(getHistoryPath(), trimmed);
}
