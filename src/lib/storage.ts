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

const APP_DIR_NAME = 'hisdeck';
const DEFAULT_REQUEST_LIMIT = 1500;
const DEFAULT_TOKEN_LIMIT = 1000000;
const DEFAULT_MODEL = 'gemini-2.5-flash';

export function getAppDir(): string {
  const override = process.env.HISDECK_HOME;
  if (override && override.trim().length > 0) {
    return override;
  }

  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg && xdg.trim().length > 0) {
    return path.join(xdg, APP_DIR_NAME);
  }

  const appData = process.env.APPDATA;
  if (process.platform === 'win32' && appData && appData.trim().length > 0) {
    return path.join(appData, 'HisDeck');
  }

  return path.join(os.homedir(), `.${APP_DIR_NAME}`);
}

export function getConfigPath(): string {
  const override = process.env.HISDECK_CONFIG_PATH;
  if (override && override.trim().length > 0) {
    return override;
  }

  return path.join(getAppDir(), 'config.json');
}

export function getDefaultPlanPath(): string {
  const override = process.env.HISDECK_PLAN_PATH;
  if (override && override.trim().length > 0) {
    return override;
  }

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
  const tempPath = `${filePath}.tmp-${Date.now()}`;
  await fs.writeFile(tempPath, payload, 'utf8');
  await fs.rename(tempPath, filePath);
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

function migrateConfig(value: unknown, configPath: string): AppConfig {
  if (!value || typeof value !== 'object') {
    throw new Error(`Invalid config at ${configPath}`);
  }

  const raw = value as Partial<AppConfig>;
  const version = raw.version ?? 1;

  if (version !== 1) {
    throw new Error(`Unsupported config version at ${configPath}`);
  }

  if (!raw.planPath) {
    raw.planPath = getDefaultPlanPath();
  }

  if (!isNonEmptyString(raw.planPath)) {
    throw new Error(`Invalid config at ${configPath}`);
  }

  return normalizeConfig({
    version: 1,
    planPath: raw.planPath,
    geminiApiKey: raw.geminiApiKey,
    preferredModel: raw.preferredModel,
    requestLimitPerDay: raw.requestLimitPerDay,
    tokenLimitPerDay: raw.tokenLimitPerDay,
  });
}

function normalizeConfig(config: AppConfig): AppConfig {
  return {
    version: 1,
    planPath: process.env.HISDECK_PLAN_PATH ?? config.planPath ?? getDefaultPlanPath(),
    geminiApiKey: config.geminiApiKey,
    preferredModel: config.preferredModel ?? DEFAULT_MODEL,
    requestLimitPerDay: config.requestLimitPerDay ?? DEFAULT_REQUEST_LIMIT,
    tokenLimitPerDay: config.tokenLimitPerDay ?? DEFAULT_TOKEN_LIMIT,
  };
}

function validatePlan(plan: StudyPlan): string[] {
  const errors: string[] = [];

  if (!plan.profile || !isNonEmptyString(plan.profile.name)) {
    errors.push('profile.name is required');
  }

  if (!Array.isArray(plan.rules) || !isStringArray(plan.rules)) {
    errors.push('rules must be an array of strings');
  }

  if (!Array.isArray(plan.exams) || !plan.exams.every((exam) => isExam(exam))) {
    errors.push('exams must be an array of exam objects');
  }

  if (!plan.schedule || typeof plan.schedule !== 'object') {
    errors.push('schedule must be an object of date keys');
  } else {
    const scheduleValues = Object.values(plan.schedule);
    if (!scheduleValues.every((entry) => isStringArray(entry))) {
      errors.push('schedule entries must be string arrays');
    }
  }

  return errors;
}

function normalizePlan(plan: StudyPlan, planPath: string): StudyPlan {
  if (plan.version && plan.version !== 1) {
    throw new Error(`Unsupported plan version at ${planPath}`);
  }

  return {
    ...plan,
    version: 1,
    profile: {
      name: plan.profile?.name ?? 'Student',
      institution: plan.profile?.institution,
      term: plan.profile?.term,
    },
    rules: plan.rules ?? [],
    exams: plan.exams ?? [],
    schedule: plan.schedule ?? {},
  };
}

export async function loadConfig(): Promise<AppConfig | null> {
  const configPath = getConfigPath();
  const config = await readJson<unknown>(configPath);

  if (!config) {
    return null;
  }

  return migrateConfig(config, configPath);
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

  const normalized = normalizePlan(plan, planPath);
  const errors = validatePlan(normalized);
  if (errors.length > 0) {
    throw new Error(`Invalid plan format at ${planPath}: ${errors.join(', ')}`);
  }

  return normalized;
}

export async function savePlan(plan: StudyPlan, planPath: string): Promise<void> {
  await writeJson(planPath, plan);
}
