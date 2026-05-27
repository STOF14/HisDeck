import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { applyProfile, DEFAULT_PLAN, type StudyPlan } from '../data/studyPlan.js';
import { PixelDivider, PixelHeader, PixelKey, THEME } from '../lib/pixel.js';
import {
  getConfigPath,
  getDefaultPlanPath,
  loadPlan,
  saveConfig,
  savePlan,
  type AppConfig,
} from '../lib/storage.js';

type Step =
  | 'welcome'
  | 'name'
  | 'institution'
  | 'term'
  | 'apiKey'
  | 'planChoice'
  | 'planPath'
  | 'saving'
  | 'done'
  | 'error';

type Choice = { label: string; value: 'sample' | 'import' };

const planChoices: Choice[] = [
  { label: 'Use the sample plan', value: 'sample' },
  { label: 'Import an existing plan JSON', value: 'import' },
];

export const Setup = ({ onComplete }: { onComplete: (config: AppConfig, plan: StudyPlan) => void }) => {
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [term, setTerm] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [planPath, setPlanPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedConfig, setSavedConfig] = useState<AppConfig | null>(null);
  const [savedPlan, setSavedPlan] = useState<StudyPlan | null>(null);

  useInput((input, key) => {
    if (step === 'welcome' && key.return) {
      setStep('name');
      return;
    }

    if (step === 'done' && key.return) {
      if (savedConfig && savedPlan) {
        onComplete(savedConfig, savedPlan);
      }
    }

    if (step === 'error' && key.return) {
      setError(null);
      setStep('welcome');
    }
  });

  const handleSavePlan = async (plan: StudyPlan, targetPath: string) => {
    setStep('saving');
    try {
      const config: AppConfig = {
        version: 1,
        planPath: targetPath,
        geminiApiKey: apiKey.trim() || undefined,
        preferredModel: 'gemini-2.5-flash',
        requestLimitPerDay: 1500,
        tokenLimitPerDay: 1000000,
      };
      await savePlan(plan, targetPath);
      await saveConfig(config);
      setSavedConfig(config);
      setSavedPlan(plan);
      setPlanPath(targetPath);
      setStep('done');
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save setup.';
      setError(message);
      setStep('error');
    }
  };

  const handlePlanChoice = async (choice: Choice) => {
    if (choice.value === 'sample') {
      const plan = applyProfile(DEFAULT_PLAN, {
        name: name || 'Student',
        institution: institution.trim() || undefined,
        term: term.trim() || undefined,
      });
      await handleSavePlan(plan, getDefaultPlanPath());
    } else {
      setStep('planPath');
    }
  };

  const handlePlanPath = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Plan path cannot be empty.');
      setStep('error');
      return;
    }

    try {
      const plan = await loadPlan(trimmed);
      await handleSavePlan(plan, trimmed);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load plan.';
      setError(message);
      setStep('error');
    }
  };

  return (
    <Box flexDirection="column" paddingX={2} paddingTop={1}>
      <PixelHeader title="FIRST RUN SETUP" subtitle="per-person config" />
      <PixelDivider tone="light" />

      {step === 'welcome' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.text}>This wizard creates a local profile and plan file.</Text>
          <Text color={THEME.dim}>All data stays on your machine.</Text>
          <Box marginTop={1}>
            <Text color={THEME.dim}>Press </Text>
            <PixelKey label="ENTER" />
            <Text color={THEME.dim}> to start</Text>
          </Box>
        </Box>
      )}

      {step === 'name' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.accent} bold>
            Profile name
          </Text>
          <Text color={THEME.dim}>Used in headers and prompts.</Text>
          <Box marginTop={1}>
            <Text color={THEME.accent}>&gt; </Text>
            <TextInput value={name} onChange={setName} onSubmit={() => setStep('institution')} />
          </Box>
        </Box>
      )}

      {step === 'institution' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.accent} bold>
            Institution (optional)
          </Text>
          <Text color={THEME.dim}>Press Enter to skip.</Text>
          <Box marginTop={1}>
            <Text color={THEME.accent}>&gt; </Text>
            <TextInput value={institution} onChange={setInstitution} onSubmit={() => setStep('term')} />
          </Box>
        </Box>
      )}

      {step === 'term' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.accent} bold>
            Term label (optional)
          </Text>
          <Text color={THEME.dim}>Example: 2026 Semester 1</Text>
          <Box marginTop={1}>
            <Text color={THEME.accent}>&gt; </Text>
            <TextInput value={term} onChange={setTerm} onSubmit={() => setStep('apiKey')} />
          </Box>
        </Box>
      )}

      {step === 'apiKey' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.accent} bold>
            Gemini API key (optional)
          </Text>
          <Text color={THEME.dim}>Leave blank to use offline mode.</Text>
          <Box marginTop={1}>
            <Text color={THEME.accent}>&gt; </Text>
            <TextInput value={apiKey} onChange={setApiKey} onSubmit={() => setStep('planChoice')} />
          </Box>
        </Box>
      )}

      {step === 'planChoice' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.accent} bold>
            Plan source
          </Text>
          <Box marginTop={1}>
            <SelectInput items={planChoices} onSelect={handlePlanChoice} />
          </Box>
        </Box>
      )}

      {step === 'planPath' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.accent} bold>
            Plan JSON path
          </Text>
          <Text color={THEME.dim}>Enter the full path to your plan file.</Text>
          <Box marginTop={1}>
            <Text color={THEME.accent}>&gt; </Text>
            <TextInput value={planPath} onChange={setPlanPath} onSubmit={handlePlanPath} />
          </Box>
        </Box>
      )}

      {step === 'saving' && (
        <Box marginTop={1}>
          <Text color={THEME.dim}>Saving setup files...</Text>
        </Box>
      )}

      {step === 'done' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.text}>Setup complete.</Text>
          <Text color={THEME.dim}>Config saved to {getConfigPath()}.</Text>
          <Text color={THEME.dim}>Plan saved to {planPath || getDefaultPlanPath()}.</Text>
          <Text color={THEME.dim}>Edit config to change usage limits.</Text>
          <Box marginTop={1}>
            <Text color={THEME.dim}>Press </Text>
            <PixelKey label="ENTER" />
            <Text color={THEME.dim}> to continue</Text>
          </Box>
        </Box>
      )}

      {step === 'error' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.warn}>Setup failed</Text>
          <Text color={THEME.dim}>{error ?? 'Unknown error'}</Text>
          <Box marginTop={1}>
            <Text color={THEME.dim}>Press </Text>
            <PixelKey label="ENTER" />
            <Text color={THEME.dim}> to retry</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};
