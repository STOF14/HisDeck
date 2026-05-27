import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Exam, StudyPlan } from '../data/studyPlan.js';

export type AppConfig = {
  version: 1;
  planPath: string;
  geminiApiKey?: string;
  preferredModel?: string;
  requestLimitPerDay?: number;
  tokenLimitPerDay?: number;
};

const APP_DIR_NAME = '.study-tui';

export function getAppDir(): string {
  return path.join(os.homedir(), APP_DIR_NAME);
}

export function getConfigPath(): string {
  return path.join(getAppDir(), 'config.json');
}

export function getDefaultPlanPath(): string {
  return path.join(getAppDir(), 'plan.json');
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isExam(value: unknown): value is Exam {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const exam = value as Exam;
  return (
    isNonEmptyString(exam.module) &&
    isNonEmptyString(exam.date) &&
    isNonEmptyString(exam.time) &&
    isNonEmptyString(exam.venue) &&
    typeof exam.credits === 'number'
  );
}

function isPlan(value: unknown): value is StudyPlan {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const plan = value as StudyPlan;
  const scheduleValues = plan.schedule ? Object.values(plan.schedule) : [];

  return (
    plan.profile !== undefined &&
    isNonEmptyString(plan.profile.name) &&
    Array.isArray(plan.exams) &&
    plan.exams.every((exam) => isExam(exam)) &&
    typeof plan.schedule === 'object' &&
    plan.schedule !== null &&
    scheduleValues.every((entry) => isStringArray(entry)) &&
    isStringArray(plan.rules)
  );
}

function isConfig(value: unknown): value is AppConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const config = value as AppConfig;

  return config.version === 1 && isNonEmptyString(config.planPath);
}

export async function loadConfig(): Promise<AppConfig | null> {
  const configPath = getConfigPath();
  const config = await readJson<AppConfig>(configPath);

  if (!config) {
    return null;
  }

  if (!isConfig(config)) {
    throw new Error(`Invalid config at ${configPath}`);
  }

  return config;
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await writeJson(getConfigPath(), config);
}

export async function loadPlan(planPath: string): Promise<StudyPlan> {
  const plan = await readJson<StudyPlan>(planPath);

  if (!plan) {
    throw new Error(`Missing plan at ${planPath}`);
  }

  if (!isPlan(plan)) {
    throw new Error(`Invalid plan format at ${planPath}`);
  }

  return plan;
}

export async function savePlan(plan: StudyPlan, planPath: string): Promise<void> {
  await writeJson(planPath, plan);
}
