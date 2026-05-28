import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig, loadPlan } from '../src/lib/storage.js';

const tempRoot = path.join(os.tmpdir(), 'hisdeck-tests');

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

describe('storage migrations', () => {
  const configPath = path.join(tempRoot, 'config.json');
  const planPath = path.join(tempRoot, 'plan.json');

  beforeEach(async () => {
    process.env.HISDECK_CONFIG_PATH = configPath;
    process.env.HISDECK_PLAN_PATH = planPath;
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  afterEach(async () => {
    delete process.env.HISDECK_CONFIG_PATH;
    delete process.env.HISDECK_PLAN_PATH;
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('loads a config without version', async () => {
    await writeJson(configPath, { planPath });
    const config = await loadConfig();
    expect(config?.version).toBe(1);
    expect(config?.planPath).toBe(planPath);
  });

  it('loads a plan without version', async () => {
    await writeJson(planPath, {
      profile: { name: 'Sample' },
      rules: ['rule'],
      exams: [
        {
          module: 'TEST 100',
          date: '2026-05-28',
          time: '09:00',
          venue: 'Hall',
          credits: 10,
        },
      ],
      schedule: { '2026-05-28': ['TEST 100'] },
    });

    const plan = await loadPlan(planPath);
    expect(plan.version).toBe(1);
  });
});
